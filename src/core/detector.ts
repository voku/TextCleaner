import { SourceType } from './types';

const MIN_CHAT_MATCHES = 3;
const MIN_CHAT_TOTAL_LINES = 5;

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
  if ((chatLineCount >= MIN_CHAT_MATCHES && lines.length >= MIN_CHAT_TOTAL_LINES) || slackPattern.test(lowerRaw)) {
    return 'chat';
  }

  // Docs/Article
  // Heuristic: Check the cleaned text for paragraph density and headings
  // We consider a mix of long lines, headings, list items, and docs/article keywords.
  const longLines = lines.filter(l => l.length > 80).length;
  const paragraphLines = lines.filter(l => l.length > 40).length;
  const headings = (textToAnalyze.match(/^#+\s/gm) || []).length;
  const listItems = (textToAnalyze.match(/^[-*]\s/gm) || []).length;
  const docsKeywords = ['api', 'documentation', 'tutorial', 'guide', 'reference', 'install', 'configuration'];
  const articleKeywords = ['article', 'analysis', 'opinion', 'story', 'interview', 'essay'];
  const docsKeywordMatches = docsKeywords.filter(keyword => lowerCleaned.includes(keyword)).length;
  const articleKeywordMatches = articleKeywords.filter(keyword => lowerCleaned.includes(keyword)).length;

  if ((headings > 0 && listItems >= 2) || docsKeywordMatches >= 2) {
    return 'docs';
  }

  if ((headings > 0 && paragraphLines >= 2) || longLines > 3) {
    // Distinguish between docs and article
    if (listItems > 2 || docsKeywordMatches >= articleKeywordMatches + 1) {
      return 'docs';
    }
    return 'article';
  }

  if (paragraphLines >= 3 || articleKeywordMatches > 0) {
    return 'article';
  }

  return 'generic';
}
