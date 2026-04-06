import { describe, it } from 'vitest';
import { cleanText } from '../engine';
import { GitHubRuleSet } from '../rules/github';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

describe('Demo file test', () => {
  it('shows diff', () => {
    const input = readFileSync(resolve(__dirname, '../../../demo/github_example_pull.txt'), 'utf8');
    const expected = readFileSync(resolve(__dirname, '../../../demo/github_example_pull_clean.txt'), 'utf8');
    
    const result = cleanText({ rawText: input, sourceTypeHint: 'github_pr' }, GitHubRuleSet);
    
    const resultLines = result.cleanedText.split('\n').filter(l => l.trim());
    const expectedLines = expected.split('\n').filter(l => l.trim());
    
    console.log('Result non-blank lines:', resultLines.length);
    console.log('Expected non-blank lines:', expectedLines.length);
    
    const resultSet = new Set(resultLines.map(l => l.trim()));
    const expectedSet = new Set(expectedLines.map(l => l.trim()));
    
    const extraInResult = resultLines.filter(l => !expectedSet.has(l.trim()));
    const missingFromResult = expectedLines.filter(l => !resultSet.has(l.trim()));
    
    console.log('\n--- Lines in result but NOT in expected (noise not cleaned):');
    extraInResult.forEach(l => console.log('  EXTRA:', JSON.stringify(l)));
    
    console.log('\n--- Lines in expected but NOT in result (content dropped):');
    missingFromResult.forEach(l => console.log('  MISSING:', JSON.stringify(l)));
  });
});
