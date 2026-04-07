import { cleanText } from '../engine';
import { GitHubRuleSet } from '../rules/github';

const result = cleanText({ rawText: '+599\n-6.106\nlines changed: 599 additions & 6106 deletions\n' }, GitHubRuleSet);
console.log('Output:', JSON.stringify(result.cleanedText));
