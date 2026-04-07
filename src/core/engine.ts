import { BlockPattern, CleanedResult, CleanupRuleSet, RawInput, SourceType } from './types';
import { detectSourceType } from './detector';
import { GenericRuleSet } from './rules/generic';
import { GitHubRuleSet } from './rules/github';
import { DocsRuleSet } from './rules/docs';
import { ArticleRuleSet } from './rules/article';
import { ChatRuleSet } from './rules/chat';

export function getRuleSetForType(type: SourceType): CleanupRuleSet {
  if (type === 'github_pr' || type === 'github_issue') {
    return GitHubRuleSet;
  }
  if (type === 'docs') {
    return DocsRuleSet;
  }
  if (type === 'article') {
    return ArticleRuleSet;
  }
  if (type === 'chat') {
    return ChatRuleSet;
  }
  return GenericRuleSet;
}

export function normalizeText(text: string): string[] {
  // Normalize line endings to \n, trim outer whitespace, split into lines.
  // Strip U+FFFC (Object Replacement Character) — web pages replace images/icons
  // with this character when copied as plain text; it is always noise.
  // Normalize U+00A0 (No-Break Space) to a regular space — avoids mismatches
  // against rule strings that use ordinary spaces.
  return text.replace(/\r\n/g, '\n').trim().split('\n')
    .map(line => line.replace(/\uFFFC/g, '').replace(/\u00A0/g, ' '));
}

export function isPreserved(line: string, ruleSet: CleanupRuleSet): boolean {
  return ruleSet.preserveRegexes.some(regex => regex.test(line));
}

export function trimPrefix(lines: string[], ruleSet: CleanupRuleSet): string[] {
  let unrecognizedCount = 0;
  let lastJunkIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') continue;

    let isJunk = false;
    if (ruleSet.prefixExactLines.includes(line)) {
      isJunk = true;
    } else if (ruleSet.prefixRegexes.some(regex => regex.test(line))) {
      isJunk = true;
    }

    if (isJunk) {
      lastJunkIndex = i;
      unrecognizedCount = 0;
    } else {
      if (isPreserved(line, ruleSet)) {
        break;
      }
      unrecognizedCount++;
      if (unrecognizedCount > 5) {
        break;
      }
    }
  }
  
  if (lastJunkIndex >= 0) {
    return lines.slice(lastJunkIndex + 1);
  }
  return lines;
}

export function trimSuffix(lines: string[], ruleSet: CleanupRuleSet): string[] {
  let unrecognizedCount = 0;
  let firstJunkIndex = lines.length;

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line === '') continue;

    let isJunk = false;
    if (ruleSet.suffixExactLines.includes(line)) {
      isJunk = true;
    } else if (ruleSet.suffixRegexes.some(regex => regex.test(line))) {
      isJunk = true;
    }

    if (isJunk) {
      firstJunkIndex = i;
      unrecognizedCount = 0;
    } else {
      if (isPreserved(line, ruleSet)) {
        break;
      }
      unrecognizedCount++;
      if (unrecognizedCount > 5) {
        break;
      }
    }
  }
  
  if (firstJunkIndex < lines.length) {
    return lines.slice(0, firstJunkIndex);
  }
  return lines;
}

/**
 * Pre-compute a set of line indices that must survive all cleanup steps.
 *
 * This is the "protect specific blocks" stage that runs **before** any removal
 * step.  It identifies two categories of protected content:
 *
 *  1. Fenced code blocks (``` … ```) — always protected regardless of rule set.
 *  2. Blocks matching `ruleSet.preserveBlockPatterns` — rule-defined content
 *     that gives the downstream LLM valuable context (e.g. diff hunks, review
 *     explanation paragraphs).
 *
 * Every line whose index is in the returned set is immune from all subsequent
 * removal steps (`removeBlocks`, `cleanMiddle`).
 */
export function computeProtectedLines(lines: string[], ruleSet: CleanupRuleSet): Set<number> {
  const protectedSet = new Set<number>();

  // Step 1 — always protect fenced code blocks
  let inCodeBlock = false;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('```')) {
      protectedSet.add(i); // fence line itself is always protected
      inCodeBlock = !inCodeBlock;
    } else if (inCodeBlock) {
      protectedSet.add(i);
    }
  }

  // Step 2 — rule-defined preserve block patterns
  const patterns = ruleSet.preserveBlockPatterns;
  if (!patterns || patterns.length === 0) return protectedSet;

  let i = 0;
  while (i < lines.length) {
    if (protectedSet.has(i)) { i++; continue; }
    const trimmed = lines[i].trim();
    let advanced = false;

    for (const bp of patterns) {
      if (bp.start.test(trimmed)) {
        const maxLen = bp.maxLines ?? 80;
        protectedSet.add(i); // protect the start line itself

        if (bp.end) {
          let j = i + 1;
          while (j < lines.length && (j - i) < maxLen) {
            protectedSet.add(j);
            if (bp.end.test(lines[j].trim())) {
              i = j + 1;
              advanced = true;
              break;
            }
            j++;
          }
          if (!advanced) {
            i = j; // end not found within maxLines — advance past
            advanced = true;
          }
        } else {
          // No end pattern: extend to next blank line (or maxConsecutiveBlankLines)
          const maxBlanks = bp.maxConsecutiveBlankLines ?? 1;
          let j = i + 1;
          let consecutiveBlanks = 0;
          while (j < lines.length && (j - i) < maxLen) {
            if (lines[j].trim() === '') {
              consecutiveBlanks++;
              if (consecutiveBlanks >= maxBlanks) break;
            } else {
              consecutiveBlanks = 0;
            }
            protectedSet.add(j);
            j++;
          }
          i = j;
          advanced = true;
        }
        break;
      }
    }

    if (!advanced) i++;
  }

  return protectedSet;
}


/**
 * Remove structural blocks identified by start/end marker patterns.
 * This enables removing multi-line sections (e.g. CodeRabbit review tables,
 * bot review sections) that individual line matching cannot catch.
 *
 * @param protectedLines - optional pre-computed set from `computeProtectedLines`.
 *   Lines in this set are immune from block removal.  When omitted, code fences
 *   are still protected via inline tracking (backward-compatible fallback).
 */
export function removeBlocks(lines: string[], ruleSet: CleanupRuleSet, protectedLines?: Set<number>): string[] {
  const patterns = ruleSet.blockPatterns;
  if (!patterns || patterns.length === 0) {
    return lines;
  }

  const result: string[] = [];
  let inCodeBlock = false;
  let i = 0;

  while (i < lines.length) {
    // Explicit protection: pre-computed protected lines are always kept and
    // can never trigger a block-removal start pattern.
    if (protectedLines?.has(i)) {
      result.push(lines[i]);
      i++;
      continue;
    }

    const trimmed = lines[i].trim();

    // Fallback code-block tracking (used when protectedLines is not passed)
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      result.push(lines[i]);
      i++;
      continue;
    }

    if (inCodeBlock) {
      result.push(lines[i]);
      i++;
      continue;
    }

    // Try to match a block start
    let matched = false;
    for (const bp of patterns) {
      if (bp.start.test(trimmed)) {
        const maxLen = bp.maxLines ?? 80;
        // Found a block start — scan forward for the end
        if (bp.end) {
          let j = i + 1;
          let found = false;
          while (j < lines.length && (j - i) < maxLen) {
            if (bp.end.test(lines[j].trim())) {
              found = true;
              j++; // skip the end line too
              break;
            }
            j++;
          }
          if (found) {
            i = j; // skip entire block
            matched = true;
          }
          // If end not found within maxLines, don't remove anything
        } else {
          // No end pattern — block extends to the first blank line, or to
          // `maxConsecutiveBlankLines` consecutive blank lines when > 1.
          const maxBlanks = bp.maxConsecutiveBlankLines ?? 1;
          let j = i + 1;
          let consecutiveBlanks = 0;
          while (j < lines.length && (j - i) < maxLen) {
            if (lines[j].trim() === '') {
              consecutiveBlanks++;
              if (consecutiveBlanks >= maxBlanks) {
                break;
              }
            } else {
              consecutiveBlanks = 0;
            }
            j++;
          }
          i = j; // skip block (the terminating blank line is kept on next iteration)
          matched = true;
        }
        break;
      }
    }

    if (!matched) {
      result.push(lines[i]);
      i++;
    }
  }

  return result;
}

/**
 * @param protectedLines - optional pre-computed set from `computeProtectedLines`.
 *   Lines in this set are always kept regardless of any removal rule.  When
 *   omitted, code fences are still protected via inline tracking (backward-
 *   compatible fallback).
 */
export function cleanMiddle(lines: string[], ruleSet: CleanupRuleSet, skipIntensive: boolean = false, protectedLines?: Set<number>): string[] {
  let inCodeBlock = false;

  return lines.filter((line, i) => {
    // Explicit protection: pre-computed protected lines are immune from all rules.
    if (protectedLines?.has(i)) return true;

    const trimmed = line.trim();
    
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      return true;
    }

    if (inCodeBlock) {
      return true;
    }

    if (trimmed === '') return true; // Keep blank lines for now, collapse later
    
    if (isPreserved(trimmed, ruleSet)) {
      return true;
    }

    if (ruleSet.removeAnywhereExactLines.includes(trimmed)) {
      return false;
    }

    if (!skipIntensive) {
      if (ruleSet.removeAnywhereContains.some(str => trimmed.includes(str))) {
        return false;
      }

      if (ruleSet.removeAnywhereRegexes?.some(regex => regex.test(trimmed))) {
        return false;
      }
    }

    return true;
  });
}

export function collapseBlankLines(lines: string[]): string[] {
  const result: string[] = [];
  let previousWasBlank = false;

  for (const line of lines) {
    const isBlank = line.trim() === '';
    if (isBlank) {
      if (!previousWasBlank) {
        result.push(line);
        previousWasBlank = true;
      }
    } else {
      result.push(line);
      previousWasBlank = false;
    }
  }

  // Trim leading/trailing blank lines
  while (result.length > 0 && result[0].trim() === '') {
    result.shift();
  }
  while (result.length > 0 && result[result.length - 1].trim() === '') {
    result.pop();
  }

  return result;
}

function formatSourceTypeLabel(type: SourceType): string {
  switch (type) {
    case 'github_pr':
      return 'GitHub Pull Request';
    case 'github_issue':
      return 'GitHub Issue';
    case 'docs':
      return 'Documentation';
    case 'article':
      return 'Article';
    case 'chat':
      return 'Chat';
    default:
      return 'Text';
  }
}

function normalizeMarkdownBody(lines: string[], type: SourceType): string[] {
  if (type === 'chat') {
    let inCodeBlock = false;
    return lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) {
        return '';
      }

      if (trimmed.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        return trimmed;
      }

      if (inCodeBlock) {
        return trimmed;
      }

      if (
        trimmed.startsWith('- ') ||
        trimmed.startsWith('* ') ||
        trimmed.startsWith('> ') ||
        trimmed.startsWith('#')
      ) {
        return trimmed;
      }

      return `- ${trimmed}`;
    });
  }

  return lines;
}

export function generateMarkdown(text: string, type: SourceType): string {
  const lines = normalizeText(text);
  if (lines.length === 0) {
    return '';
  }

  const title = `# Cleaned ${formatSourceTypeLabel(type)} Excerpt`;
  const body = normalizeMarkdownBody(lines, type).join('\n');

  return `${title}\n\n${body}`.trim();
}

export function generatePrompt(text: string, type: SourceType): string {
  const typeLabel = formatSourceTypeLabel(type);

  return [
    `Review the following cleaned ${typeLabel.toLowerCase()} excerpt.`,
    'Focus on the substantive content and ignore any residual site chrome.',
    '',
    text,
    '',
  ].join('\n');
}

export function cleanText(input: RawInput, ruleSetOverride?: CleanupRuleSet): CleanedResult {
  const isLargeText = input.rawText.length > 100000;
  const originalLines = normalizeText(input.rawText);
  
  let detectedType = input.sourceTypeHint;
  let preliminaryCleanedLines = originalLines;
  
  // If no hint is provided, we do a preliminary generic clean to help detection
  if (!detectedType) {
    preliminaryCleanedLines = trimPrefix(originalLines, GenericRuleSet);
    preliminaryCleanedLines = trimSuffix(preliminaryCleanedLines, GenericRuleSet);
    preliminaryCleanedLines = cleanMiddle(preliminaryCleanedLines, GenericRuleSet, isLargeText);
    preliminaryCleanedLines = collapseBlankLines(preliminaryCleanedLines);
    
    detectedType = detectSourceType(input.rawText, preliminaryCleanedLines.join('\n'));
  }

  const ruleSet = ruleSetOverride || getRuleSetForType(detectedType);
  
  let currentLines = originalLines;
  
  // If the ruleSet is GenericRuleSet, we already did the work!
  if (ruleSet === GenericRuleSet && !ruleSetOverride && !input.sourceTypeHint) {
    currentLines = preliminaryCleanedLines;
  } else {
    currentLines = trimPrefix(originalLines, ruleSet);
    currentLines = trimSuffix(currentLines, ruleSet);
    // Pipeline step 3: pre-compute protected lines BEFORE any removal step.
    // This guarantees that valuable context blocks (code fences, diff hunks,
    // rule-defined preserveBlockPatterns) can never be stripped by cleanup rules.
    const protectedLines = computeProtectedLines(currentLines, ruleSet);
    currentLines = removeBlocks(currentLines, ruleSet, protectedLines);
    currentLines = cleanMiddle(currentLines, ruleSet, isLargeText, protectedLines);
    currentLines = collapseBlankLines(currentLines);
  }

  const cleanedText = currentLines.join('\n');
  const removedLineCount = originalLines.length - currentLines.length;

  return {
    detectedType,
    cleanedText,
    markdownText: generateMarkdown(cleanedText, detectedType),
    llmPromptText: generatePrompt(cleanedText, detectedType),
    removedLineCount,
    warnings: removedLineCount === 0 && originalLines.length > 10 ? ['Low confidence: No lines were removed.'] : [],
  };
}
