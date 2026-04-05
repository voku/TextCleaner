export type SourceType =
  | 'generic'
  | 'github_pr'
  | 'github_issue'
  | 'docs'
  | 'article'
  | 'chat';

export type RawInput = {
  rawText: string;
  sourceTypeHint?: SourceType;
  sourceApp?: string;
};

/**
 * Defines a structural block that can be detected and removed as a unit.
 * The engine scans for a line matching `start`, then removes all lines
 * until (and including) a line matching `end`.  If `end` is omitted the
 * block extends until the next blank line.
 */
export type BlockPattern = {
  /** Regex that marks the first line of a removable block. */
  start: RegExp;
  /** Regex that marks the last line of the block (inclusive).
   *  When omitted, the block ends at the next blank line. */
  end?: RegExp;
  /** Maximum number of lines a block may span (safety cap, default 80). */
  maxLines?: number;
};

export type CleanupRuleSet = {
  name: string;
  prefixExactLines: string[];
  suffixExactLines: string[];
  prefixRegexes: RegExp[];
  suffixRegexes: RegExp[];
  removeAnywhereExactLines: string[];
  removeAnywhereContains: string[];
  removeAnywhereRegexes?: RegExp[];
  preserveRegexes: RegExp[];
  /** Optional structural block patterns for block-aware removal. */
  blockPatterns?: BlockPattern[];
};

export type CleanedResult = {
  detectedType: SourceType;
  cleanedText: string;
  markdownText: string;
  llmPromptText: string;
  removedLineCount: number;
  warnings: string[];
};
