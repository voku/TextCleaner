import { describe, it, expect } from 'vitest';
import { generateMarkdown, cleanMiddle, cleanText, trimPrefix } from '../../engine';
import { GenericRuleSet } from '../../rules/generic';
import { GitHubRuleSet } from '../../rules/github';

describe('Blind Spot Probes (observe-only)', () => {
  it('PROBE: generateMarkdown chat type with code block - does it corrupt fences?', () => {
    const input = 'Alice 10:00 AM\nHere is my code:\n```js\nconst x = 1;\n```\nLooks good?';
    const result = generateMarkdown(input, 'chat');
    console.log('chat markdown with code block:\n', result);
  });

  it('PROBE: cleanMiddle GitHub rules - junk-matching content inside code block', () => {
    const lines = ['```python', 'Reply', 'left a comment', 'Copy link', 'const x = 1;', '```'];
    const result = cleanMiddle(lines, GitHubRuleSet);
    console.log('lines preserved inside code block:', JSON.stringify(result));
  });

  it('PROBE: unclosed code block - everything after fence preserved?', () => {
    const result = cleanText({
      rawText: 'Skip to content\n# Real title\nSome content\n```python\nimport os\nleft a comment\nReply\nCopy link',
      sourceTypeHint: 'generic',
    }, GenericRuleSet);
    console.log('unclosed code block output:', JSON.stringify(result.cleanedText));
  });

  it('PROBE: diff-like +1/-1 inside vs outside code block', () => {
    const lines = ['```diff', '+1', '-1', '```', '+1', '-1'];
    const result = cleanMiddle(lines, GitHubRuleSet);
    console.log('diff probe (inside kept, outside removed):', JSON.stringify(result));
  });

  it('PROBE: trimPrefix stops at code fence', () => {
    const lines = ['Skip to content', 'Navigation Menu', '```javascript', 'const x = 1;', '```'];
    const result = trimPrefix(lines, GitHubRuleSet);
    console.log('prefix trimmed at code fence:', JSON.stringify(result));
  });

  it('PROBE: suffix trimmer stops at closing code fence', () => {
    const { trimSuffix } = require('../../engine');
    const lines = ['Real content', '```js', 'const y = 2;', '```', 'Terms', 'Privacy'];
    const result = trimSuffix(lines, GitHubRuleSet);
    console.log('suffix trimmed at code fence:', JSON.stringify(result));
  });
});
