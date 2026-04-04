import { SourceType } from './types';

export function detectSourceType(rawText: string, cleanedText?: string): SourceType {
  const lowerRaw = rawText.toLowerCase();
  const textToAnalyze = cleanedText || rawText;
  const lowerCleaned = textToAnalyze.toLowerCase();
  
  // GitHub PR
  // We check raw text for these because UI menus often contain them, 
  // but they are strong indicators of the page type.
  const isGitHubPR = 
    (lowerRaw.includes('pull request') || lowerRaw.includes('files changed') || lowerRaw.includes('commits')) &&
    (lowerRaw.includes('requested changes') || lowerRaw.includes('approved') || lowerRaw.includes('review') || lowerRaw.includes('merge pull request'));
    
  if (isGitHubPR) {
    return 'github_pr';
  }

  // GitHub Issue
  const isGitHubIssue = 
    lowerRaw.includes('issue') &&
    (lowerRaw.includes('labels') || lowerRaw.includes('assignees') || lowerRaw.includes('milestone') || lowerRaw.includes('open issue'));
    
  if (isGitHubIssue) {
    return 'github_issue';
  }

  // Chat (Slack, Discord, Teams)
  // Heuristic: Many short lines starting with names or timestamps
  // e.g., "John Doe 10:42 AM" or "[10:42] John:"
  const chatMessagePattern = /^\[?\d{1,2}:\d{2}(?:\s*[AP]M)?\]?\s*[\w\s]+:/im;
  const chatNameTimePattern = /^[\w\s]+\s+\d{1,2}:\d{2}\s*[AP]M/im;
  const slackPattern = /new messages?\s*since/im;
  
  const lines = textToAnalyze.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  let chatLineCount = 0;
  for (const line of lines) {
    if (chatMessagePattern.test(line) || chatNameTimePattern.test(line)) {
      chatLineCount++;
    }
  }
  if (chatLineCount > 3 || slackPattern.test(lowerRaw)) {
    return 'chat';
  }

  // Docs/Article
  // Heuristic: Check the cleaned text for paragraph density and headings
  // We consider a "long line" as a proxy for a paragraph if lines aren't wrapped
  const longLines = lines.filter(l => l.length > 80).length;
  const headings = (textToAnalyze.match(/^#+\s/gm) || []).length;
  const listItems = (textToAnalyze.match(/^[-*]\s/gm) || []).length;
  
  if (longLines > 3 && headings > 0) {
    // Distinguish between docs and article
    if (listItems > longLines * 2 || lowerCleaned.includes('api') || lowerCleaned.includes('documentation') || lowerCleaned.includes('tutorial')) {
      return 'docs';
    }
    return 'article';
  }
  
  if (longLines > 5) {
    return 'article';
  }

  return 'generic';
}
