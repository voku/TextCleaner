import { readFileSync } from 'fs';
import { cleanText } from '../engine';
import { GitHubRuleSet } from '../rules/github';

const input = readFileSync('./src/core/__tests__/fixtures/github_example_pull.txt', 'utf8');
const expected = readFileSync('./src/core/__tests__/fixtures/github_example_pull_clean.txt', 'utf8');
const actual = cleanText({ rawText: input }, GitHubRuleSet);

const actualText = actual.cleanedText;
console.log('Actual lines:', actualText.split('\n').length);
console.log('Expected lines:', expected.split('\n').length);

if (actualText === expected) {
  console.log('MATCH: actual === expected');
} else {
  console.log('MISMATCH!');
  const aLines = actualText.split('\n');
  const eLines = expected.split('\n');
  let diffCount = 0;
  for (let i = 0; i < Math.max(aLines.length, eLines.length); i++) {
    if (aLines[i] !== eLines[i]) {
      console.log(`Diff at line ${i+1}:`);
      console.log(`  Expected: ${JSON.stringify(eLines[i])}`);
      console.log(`  Actual:   ${JSON.stringify(aLines[i])}`);
      diffCount++;
      if (diffCount >= 20) { console.log('... (more diffs)'); break; }
    }
  }
}
