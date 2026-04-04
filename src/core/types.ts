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
};

export type CleanedResult = {
  detectedType: SourceType;
  cleanedText: string;
  markdownText: string;
  llmPromptText: string;
  removedLineCount: number;
  warnings: string[];
};
