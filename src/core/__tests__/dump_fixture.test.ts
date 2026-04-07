import { it } from 'vitest';
import { cleanText } from '../engine';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
const __dirname = fileURLToPath(new URL('.', import.meta.url));

it('dump engine output', () => {
  const input = readFileSync(resolve(__dirname, 'fixtures/github_example_pull.txt'), 'utf-8');
  const result = cleanText({ rawText: input, sourceTypeHint: 'github_pr' });
  writeFileSync('/tmp/engine_output.txt', result.cleanedText, 'utf-8');
  console.log('Lines removed:', result.removedLineCount);
});
