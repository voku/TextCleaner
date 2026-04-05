import { CleanedResult, CleanupRuleSet, RawInput, SourceType } from './types';
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
  // Normalize line endings to \n, trim outer whitespace, split into lines
  return text.replace(/\r\n/g, '\n').trim().split('\n');
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
      if (unrecognizedCount > 3) {
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
      if (unrecognizedCount > 3) {
        break;
      }
    }
  }
  
  if (firstJunkIndex < lines.length) {
    return lines.slice(0, firstJunkIndex);
  }
  return lines;
}

export function cleanMiddle(lines: string[], ruleSet: CleanupRuleSet, skipIntensive: boolean = false): string[] {
  let inCodeBlock = false;

  return lines.filter(line => {
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
    currentLines = cleanMiddle(currentLines, ruleSet, isLargeText);
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
