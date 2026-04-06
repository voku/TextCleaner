import { describe, it, expect, beforeEach } from 'vitest';
import { cleanText, normalizeText, trimPrefix, trimSuffix, cleanMiddle, collapseBlankLines, generateMarkdown, removeBlocks } from '../engine';
import { detectSourceType } from '../detector';
import { GenericRuleSet } from '../rules/generic';
import { GitHubRuleSet } from '../rules/github';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

describe('Text Normalization', () => {
  it('normalizes line endings and trims whitespace', () => {
    const input = '  \r\nLine 1\r\nLine 2\nLine 3  \n';
    const result = normalizeText(input);
    expect(result).toEqual(['Line 1', 'Line 2', 'Line 3']);
  });
});

describe('Prefix Trimming', () => {
  it('removes exact match prefix lines', () => {
    const lines = ['Skip to content', 'Sign in', 'Actual content', 'More content'];
    const result = trimPrefix(lines, GenericRuleSet);
    expect(result).toEqual(['Actual content', 'More content']);
  });

  it('stops at preserved lines', () => {
    const lines = ['Skip to content', '# Heading', 'Sign in', 'Content'];
    const result = trimPrefix(lines, GenericRuleSet);
    expect(result).toEqual(['# Heading', 'Sign in', 'Content']);
  });
});

describe('Suffix Trimming', () => {
  it('removes exact match suffix lines', () => {
    const lines = ['Content', 'More content', 'Terms', 'Privacy'];
    const result = trimSuffix(lines, GenericRuleSet);
    expect(result).toEqual(['Content', 'More content']);
  });

  it('removes regex match suffix lines', () => {
    const lines = ['Content', '© 2024 Company Inc.', 'All rights reserved'];
    const result = trimSuffix(lines, GenericRuleSet);
    expect(result).toEqual(['Content']);
  });
});

describe('Middle Cleanup', () => {
  it('removes exact match anywhere lines', () => {
    const lines = ['Content', 'Advertisement', 'More content'];
    const result = cleanMiddle(lines, GenericRuleSet);
    expect(result).toEqual(['Content', 'More content']);
  });

  it('removes contains anywhere lines', () => {
    const lines = ['Content', 'Please Subscribe to our newsletter today', 'More content'];
    const result = cleanMiddle(lines, GenericRuleSet);
    expect(result).toEqual(['Content', 'More content']);
  });
});

describe('Blank Line Collapsing', () => {
  it('collapses multiple blank lines into one', () => {
    const lines = ['Line 1', '', '', '', 'Line 2', '', 'Line 3'];
    const result = collapseBlankLines(lines);
    expect(result).toEqual(['Line 1', '', 'Line 2', '', 'Line 3']);
  });

  it('trims leading and trailing blank lines', () => {
    const lines = ['', '', 'Line 1', '', 'Line 2', '', ''];
    const result = collapseBlankLines(lines);
    expect(result).toEqual(['Line 1', '', 'Line 2']);
  });
});

describe('Source Detection', () => {
  it('detects documentation content', () => {
    const detected = detectSourceType(`# API Reference

This documentation explains the deployment flow in detail.

- install dependencies
- build the project
- deploy the static site`);

    expect(detected).toBe('docs');
  });

  it('detects article content', () => {
    const detected = detectSourceType(`# Why clean copied text before prompting

Clean input reduces irrelevant context and makes summaries more reliable across long-form article content that has already been stripped of chrome.

This article explains how curated excerpts help with better downstream reviews and summaries.`);

    expect(detected).toBe('article');
  });

  it('detects chat transcripts', () => {
    const detected = detectSourceType(`John Doe 10:42 AM
Can you review the cleaned output?
Jane Smith 10:43 AM
Yes — send it over.
Alex Roe 10:44 AM
I will post the link in the channel.`);

    expect(detected).toBe('chat');
  });
});

describe('Markdown Output', () => {
  it('creates a markdown heading for cleaned content', () => {
    const markdown = generateMarkdown('First line\nSecond line', 'article');

    expect(markdown).toBe('# Cleaned Article Excerpt\n\nFirst line\nSecond line');
  });

  it('formats chat lines as markdown bullets', () => {
    const markdown = generateMarkdown('John Doe 10:42 AM\nPlease review this.\n\nJane Smith 10:43 AM', 'chat');

    expect(markdown).toBe('# Cleaned Chat Excerpt\n\n- John Doe 10:42 AM\n- Please review this.\n\n- Jane Smith 10:43 AM');
  });

  it('does not corrupt code fences in non-chat markdown output', () => {
    const input = '## Summary\n\nHere is the snippet:\n\n```javascript\nconst x = 1;\n```\n\nEnd of doc.';
    const markdown = generateMarkdown(input, 'docs');

    expect(markdown).toContain('```javascript');
    expect(markdown).toContain('const x = 1;');
    expect(markdown).toContain('```\n\nEnd of doc.');
  });

  it('does not corrupt code fences in chat markdown output', () => {
    // Blind spot fix: normalizeMarkdownBody previously prepended "- " to fence
    // lines, breaking the markdown code block entirely.
    const input = 'Alice 10:00 AM\nHere is my code:\n```js\nconst x = 1;\n```\nLooks good?';
    const markdown = generateMarkdown(input, 'chat');

    // Fence lines must be preserved verbatim — not wrapped in "- "
    expect(markdown).toContain('```js\n');
    expect(markdown).toContain('\n```');
    // Code body must not be bullet-prefixed
    expect(markdown).not.toContain('- const x = 1;');
    // Code body must appear verbatim
    expect(markdown).toContain('const x = 1;');
    // Regular chat lines before and after are still bulleted
    expect(markdown).toContain('- Alice 10:00 AM');
    expect(markdown).toContain('- Looks good?');
  });
});

describe('Code Block Preservation', () => {
  it('preserves both opening and closing fences in the cleaned output', () => {
    const rawText = `
Skip to content
\`\`\`javascript
const x = 1;
\`\`\`
Terms
    `;
    const result = cleanText({ rawText, sourceTypeHint: 'generic' }, GenericRuleSet);
    expect(result.cleanedText).toContain('```javascript');
    expect(result.cleanedText).toContain('const x = 1;');
    // Closing fence must survive
    const lines = result.cleanedText.split('\n');
    expect(lines.filter(l => l.trim() === '```').length).toBe(1);
    // Suffix junk stripped
    expect(result.cleanedText).not.toContain('Terms');
  });

  it('removes junk outside code block but preserves junk-matching lines inside it', () => {
    // "Reply", "left a comment", "Copy link" are GitHub removeAnywhereExactLines.
    // Outside a code block they are removed; inside they must be kept.
    const rawText = `
# PR title
Reply
\`\`\`python
Reply
left a comment
Copy link
print("hello")
\`\`\`
Copy link
    `;
    const result = cleanText({ rawText, sourceTypeHint: 'github_pr' }, GitHubRuleSet);
    // Lines inside the code block preserved
    const codeSection = result.cleanedText.slice(
      result.cleanedText.indexOf('```python'),
      result.cleanedText.lastIndexOf('```') + 3,
    );
    expect(codeSection).toContain('Reply');
    expect(codeSection).toContain('left a comment');
    expect(codeSection).toContain('Copy link');
    // The same "Reply" and "Copy link" outside the code block are removed
    const beforeCode = result.cleanedText.slice(0, result.cleanedText.indexOf('```python'));
    expect(beforeCode).not.toContain('Reply');
    const afterCode = result.cleanedText.slice(result.cleanedText.lastIndexOf('```') + 3);
    expect(afterCode).not.toContain('Copy link');
  });

  it('handles multiple code blocks with junk between them', () => {
    const rawText = `
# Docs
\`\`\`js
const a = 1;
\`\`\`
Advertisement
\`\`\`ts
const b: number = 2;
\`\`\`
    `;
    const result = cleanText({ rawText, sourceTypeHint: 'generic' }, GenericRuleSet);
    expect(result.cleanedText).toContain('```js');
    expect(result.cleanedText).toContain('const a = 1;');
    expect(result.cleanedText).toContain('```ts');
    expect(result.cleanedText).toContain('const b: number = 2;');
    // Junk between the two blocks is removed
    expect(result.cleanedText).not.toContain('Advertisement');
  });

  it('unclosed code block preserves all subsequent lines', () => {
    // If a code fence is never closed, every line after it should be kept as-is,
    // even if those lines would otherwise match removal rules.
    const rawText = `
# Title
Intro text
\`\`\`python
import os
left a comment
Reply
Copy link
    `;
    const result = cleanText({ rawText, sourceTypeHint: 'generic' }, GenericRuleSet);
    expect(result.cleanedText).toContain('```python');
    expect(result.cleanedText).toContain('import os');
    // These would normally be removed by removeAnywhereExactLines but are inside
    // the unclosed code block so they must be preserved.
    expect(result.cleanedText).toContain('left a comment');
    expect(result.cleanedText).toContain('Reply');
    expect(result.cleanedText).toContain('Copy link');
  });

  it('trimPrefix stops at an opening code fence', () => {
    const lines = ['Skip to content', 'Navigation Menu', '```javascript', 'const x = 1;', '```'];
    const result = trimPrefix(lines, GitHubRuleSet);
    // Everything from the fence onwards must survive
    expect(result[0]).toBe('```javascript');
    expect(result).toContain('const x = 1;');
    expect(result[result.length - 1]).toBe('```');
  });

  it('trimSuffix stops at a closing code fence', () => {
    const lines = ['Real content', '```js', 'const y = 2;', '```', 'Terms', 'Privacy'];
    const result = trimSuffix(lines, GitHubRuleSet);
    // Junk after the closing fence removed
    expect(result).not.toContain('Terms');
    expect(result).not.toContain('Privacy');
    // The fence and its content must survive
    expect(result).toContain('```js');
    expect(result).toContain('const y = 2;');
    expect(result[result.length - 1]).toBe('```');
  });

  it('standalone +N and -N diff-stat lines outside code block are removed by GitHub rules', () => {
    const lines = [
      '```diff',
      '+1',
      '-1',
      '```',
      '+200',
      '-95',
    ];
    const result = cleanMiddle(lines, GitHubRuleSet);
    // Inside the code block: preserved
    expect(result).toContain('+1');
    expect(result).toContain('-1');
    // Outside: stripped
    expect(result).not.toContain('+200');
    expect(result).not.toContain('-95');
  });
});

describe('Full Cleanup Engine', () => {
  it('preserves code blocks entirely', () => {
    const rawText = `
Header
Some intro text
\`\`\`javascript
// A comment
const x = 1;
Tweet
Share on Facebook
console.log(x);
\`\`\`
Footer
    `;
    const result = cleanText({ rawText, sourceTypeHint: 'generic' });
    expect(result.cleanedText).toContain('Tweet');
    expect(result.cleanedText).toContain('Share on Facebook');
    expect(result.cleanedText).toContain('```javascript');
  });

  it('cleans a generic article', () => {
    const input = {
      rawText: `
Skip to content
Menu
# My Article
This is the content.
Advertisement
More content.
Subscribe to our newsletter
Footer
Terms
      `
    };
    const result = cleanText(input, GenericRuleSet);
    expect(result.cleanedText).toBe('# My Article\nThis is the content.\nMore content.');
  });

  it('skips intensive rules for texts over 100,000 characters', () => {
    // Create a large text
    const largeTextChunk = 'This is a normal line.\nSubscribe to our newsletter\n';
    // 100,000 / length of chunk (~50) = 2000
    const rawText = largeTextChunk.repeat(2500); // > 100k chars

    const result = cleanText({ rawText, sourceTypeHint: 'generic' });

    // Since it's large, 'Subscribe to our newsletter' (which is in removeAnywhereContains)
    // should NOT be removed because intensive rules are skipped.
    expect(result.cleanedText).toContain('Subscribe to our newsletter');
  });

  it('applies intensive rules for texts under 100,000 characters', () => {
    const rawText = 'This is a normal line.\nSubscribe to our newsletter\n';
    const result = cleanText({ rawText, sourceTypeHint: 'generic' });

    // Should be removed
    expect(result.cleanedText).not.toContain('Subscribe to our newsletter');
  });

  it('cleans a GitHub PR', () => {
    const input = {
      rawText: `
Skip to content
Navigation Menu
Pull requests
Issues
# Fix the bug
This PR fixes the bug.
Files changed
1
Commits
2
Review
requested changes
Copy link
Quote reply
Terms
Privacy
      `
    };
    const result = cleanText(input, GitHubRuleSet);
    expect(result.cleanedText).toBe('# Fix the bug\nThis PR fixes the bug.\nFiles changed\n1\nCommits\n2\nReview\nrequested changes');
  });

  it('cleans documentation-specific chrome', () => {
    const result = cleanText({
      rawText: `
Documentation
Table of contents
On this page
# Deploying TextCleaner
Run npm run build before publishing.

## Build output
The generated files are written to dist.

Edit this page
Back to top
Was this page helpful?
      `,
      sourceTypeHint: 'docs',
    });

    expect(result.cleanedText).toBe('# Deploying TextCleaner\nRun npm run build before publishing.\n\n## Build output\nThe generated files are written to dist.');
  });

  it('cleans article-specific chrome', () => {
    const result = cleanText({
      rawText: `
Latest
8 min read
# Why clean copied text before prompting
Clean input reduces irrelevant context.

Related articles
Sign up for our newsletter
Continue reading
      `,
      sourceTypeHint: 'article',
    });

    expect(result.cleanedText).toBe('# Why clean copied text before prompting\nClean input reduces irrelevant context.');
  });

  it('cleans chat-specific chrome', () => {
    const result = cleanText({
      rawText: `
Messages
Jump to present
Today
John Doe 10:42 AM
Can you review the cleaned output?
Jane Smith 10:43 AM
Yes — send it over.
Reply in thread
Typing…
      `,
      sourceTypeHint: 'chat',
    });

    expect(result.cleanedText).toBe('John Doe 10:42 AM\nCan you review the cleaned output?\nJane Smith 10:43 AM\nYes — send it over.');
  });

  it('cleans a real GitHub PR sample', () => {
    const input = {
      rawText: `
Repository navigation
Code
Issues
2
 (2)
Pull requests
13
 (13)
Agents
Discussions
Actions
Projects
Wiki
Expose runtime diagnosability for gesture detector and surface in status/docs/tests
#1123
Open
voku
wants to merge 1 commit into
main
from
codex/work-on-todos-autonomously
+142
-15
Lines changed: 142 additions & 15 deletions
Conversation6 (6)
Commits1 (1)
Checks42 (42)
Files changed9 (9)
Conversation
@voku
Owner
voku
commented
1 hour ago
• 
Motivation
Reduce time-to-root-cause for MediaPipe/gesture runtime incidents by surfacing backend delegate, module readiness, model URLs, and initialization errors in a single diagnostic snapshot.
Make error and health logs immediately actionable for on-call by including runtime context alongside error payloads.
Capture evidence and operational guidance so the RD-P1-3 diagnosability work is reproducible and tracked in planning.
Description
Added runtime diagnostics to GestureDetector including runtimeDelegates, lastInitializationError, and a new method getRuntimeDiagnostics() that returns delegates, module readiness flags, model URLs, frame count, running state, and last init error.
Annotated detector initialization paths to set delegate state (GPU/CPU/disabled) and populated lastInitializationError on failure, and included the diagnostics in detection-time error logs via gestureDebugLog.
Exposed the detector diagnostics through the orchestrator by returning detectorRuntime from GestureRecognitionOrchestrator.getStatus().
Updated unit tests to assert new diagnostics behavior in webapp/src/gesture/core/GestureDetector.test.ts and GestureRecognitionOrchestrator.test.ts, and added operational documentation: docs/operations/INCIDENT_DRILL_RD-P1-3_2026-04-03.md, a troubleshooting section in docs/operations/Troubleshooting.md, and marked the RD-P1-3 topic done in docs/planning/TODO.md/TODO_DONE.md/topics/RD-P1-3/TOPIC.md.
Testing
Ran unit tests for the gesture module (Vitest) including GestureDetector and GestureRecognitionOrchestrator test suites; the updated tests asserting delegate reporting, CPU fallback, last initialization error, and status exposure passed.
Verified that the orchestrator status includes detectorRuntime and that modelUrls.gesture contains gesture_recognizer.task as asserted by the tests.
Codex Task

Summary by CodeRabbit
Release Notes
New Features

Gesture recognition system now provides detailed runtime diagnostics, including delegate selection status (GPU/CPU fallback) and module readiness information for troubleshooting.
Documentation

Added gesture runtime diagnostics section to troubleshooting guide with console-based diagnostic steps.
Added incident drill documentation covering GPU delegate failure and CPU fallback scenarios.
Mention @copilot in a comment to make changes to this pull request.
@voku
Close RD-P1-3 with incident drill evidence
54358d6
@github-actions
github-actions bot
commented
1 hour ago
🤖 Hi @voku, I've received your request, and I'm working on it now! You can track my progress in the logs for more details.

review-assist[bot]
review-assist bot reviewed 1 hour ago
Contributor
review-assist bot
left a comment
Code Review
This pull request implements runtime diagnosability enhancements (RD-P1-3) by surfacing MediaPipe task, backend, and error context. Key changes include the addition of a getRuntimeDiagnostics method in GestureDetector to track delegate states (GPU vs. CPU) and module readiness, which is now exposed through the system status. The PR also includes updated troubleshooting documentation and an incident drill report. Feedback suggests defining a shared interface for the complex diagnostic return type to reduce code duplication and improve maintainability.

webapp/src/gesture/core/GestureDetector.ts
Comment on lines +532 to +551
  getRuntimeDiagnostics(): {
    running: boolean;
    frameCount: number;
    delegates: {
      gesture: 'GPU' | 'CPU' | null;
      pose: 'GPU' | 'CPU' | 'disabled';
      face: 'GPU' | 'CPU' | 'disabled';
    };
    modules: {
      gestureRecognizerReady: boolean;
      poseLandmarkerReady: boolean;
      faceLandmarkerReady: boolean;
    };
    modelUrls: {
      gesture: string;
      pose: string;
      face: string;
    };
    lastInitializationError: string | null;
  } {
Contributor
@review-assist
review-assist bot
1 hour ago
medium

The return type for getRuntimeDiagnostics is complex and duplicated from the internal runtimeDelegates field definition. This duplication increases the risk of inconsistencies during future updates. Consider defining a shared interface or type (e.g., GestureDetectorDiagnostics) and exporting it, which would also simplify the type usage in GestureRecognitionOrchestrator.ts.

@voku	Reply...
@coderabbitai
Contributor
coderabbitai bot
commented
1 hour ago
• 
Walkthrough
This pull request introduces runtime diagnostics instrumentation to the gesture detection system. A new getRuntimeDiagnostics() method was added to track delegate selection (GPU/CPU/null), module readiness states, and initialization errors. The orchestrator's status now includes runtime diagnostic data. Supporting documentation was added, and the completed R&D item was moved to the done list.

Changes
Cohort / File(s)	Summary
Runtime Diagnostics Implementation
webapp/src/gesture/core/GestureDetector.ts	Added getRuntimeDiagnostics() method tracking per-module delegate selection, initialization error messages, module readiness flags, hardcoded model URLs, and frame counts. Instrumentation logs diagnostics in error scenarios.
Detector Tests
webapp/src/gesture/core/GestureDetector.test.ts	Extended initialization tests with assertions verifying delegate selection (GPU/CPU) and last initialization error after fallback and failure paths.
Orchestrator Integration
webapp/src/gesture/core/GestureRecognitionOrchestrator.ts	Updated getStatus() to include detectorRuntime field populated from detector's getRuntimeDiagnostics() when detector is present.
Orchestrator Tests
webapp/src/gesture/core/GestureRecognitionOrchestrator.test.ts	Extended status reporting test to verify detectorRuntime field presence and gesture model URL in returned status.
Documentation & Planning Updates
docs/operations/INCIDENT_DRILL_RD-P1-3_2026-04-03.md, docs/operations/Troubleshooting.md, docs/planning/TODO.md, docs/planning/TODO_DONE.md, docs/planning/topics/RD-P1-3/TOPIC.md	Added incident drill documentation for GPU delegate failure scenarios, expanded troubleshooting guide with gesture runtime diagnostics steps, moved completed R&D item from TODO to TODO_DONE with drill evidence, and updated topic status to Done.
Sequence Diagram(s)

Estimated code review effort
🎯 3 (Moderate) | ⏱️ ~22 minutes

Possibly related PRs
Throttle gesture debug logging #684: Modifies the same gesture runtime classes (GestureDetector and GestureRecognitionOrchestrator) to add throttled debug logging for gesture detection and delegate tracking.
Add training upload workflow to webapp #650: Updates gesture runtime status and diagnostics surfaces in the same orchestrator and detector classes.
Poem
🐰 A hop, skip, and delegate trace!
GPU falls, CPU saves the race,
Errors caught and logged with grace,
Runtime wisdom shows its face,
Diagnostics bloom—no more mystery! ✨

🚥 Pre-merge checks | ✅ 3
✨ Finishing Touches
Thanks for using CodeRabbit! It's free for OSS, and your support helps us grow. If you like it, consider giving us a shout-out.

❤️ Share
Comment @coderabbitai help to get the list of available commands and usage tips.

chatgpt-codex-connector[bot]
chatgpt-codex-connector bot reviewed 1 hour ago
chatgpt-codex-connector bot
left a comment
💡 Codex Review
Here are some automated review suggestions for this pull request.

Reviewed commit: 54358d604b

ℹ️ About Codex in GitHub
webapp/src/gesture/core/GestureDetector.ts
Comment on lines +146 to 149
        this.runtimeDelegates.gesture = 'CPU';
        this.gestureRecognizer = await components.GestureRecognizer.createFromOptions(vision, {
          ...gestureOptions,
          baseOptions: { ...baseOptions, delegate: 'CPU' as const },
@chatgpt-codex-connector
chatgpt-codex-connector bot
1 hour ago
P2 Badge Set gesture delegate only after CPU fallback succeeds

When GPU initialization fails, runtimeDelegates.gesture is set to "CPU" before the CPU createFromOptions call completes. If that CPU call also throws, initialization fails but diagnostics still report the gesture delegate as CPU, which misrepresents the actual runtime state during the exact failure scenario these diagnostics are meant to debug.

Useful? React with 👍 / 👎.

@voku	Reply...
coderabbitai[bot]
coderabbitai bot reviewed 1 hour ago
Contributor
coderabbitai bot
left a comment
Caution

Some comments are outside the diff and can’t be posted inline due to platform limitations.

⚠️ Outside diff range comments (1)
🤖 Prompt for all review comments with AI agents
ℹ️ Review info
This branch has not been deployed
No deployments
Merge info
Some checks were not successful
1 failing, 1 neutral, 12 skipped, 15 successful checks

failing checks
CI / build (pull_request)
CI / build (pull_request)Failing after 1m
skipped checks
🔀 Automation Dispatch / debugger (pull_request_review)
🔀 Automation Dispatch / debugger (pull_request_review)Skipped 1 hour ago
🔀 Automation Dispatch / debugger (pull_request)
🔀 Automation Dispatch / debugger (pull_request)Skipped 1 hour ago
🔀 Automation Dispatch / dispatch (pull_request_review)
🔀 Automation Dispatch / dispatch (pull_request_review)Skipped 1 hour ago
🔀 Automation Dispatch / fallthrough (pull_request_review)
🔀 Automation Dispatch / fallthrough (pull_request_review)Skipped 1 hour ago
🔀 Automation Dispatch / fallthrough (pull_request)
🔀 Automation Dispatch / fallthrough (pull_request)Skipped 1 hour ago
🔀 Automation Dispatch / invoke (pull_request_review)
🔀 Automation Dispatch / invoke (pull_request_review)Skipped 1 hour ago
🔀 Automation Dispatch / invoke (pull_request)
🔀 Automation Dispatch / invoke (pull_request)Skipped 1 hour ago
🔀 Automation Dispatch / plan-execute (pull_request_review)
🔀 Automation Dispatch / plan-execute (pull_request_review)Skipped 1 hour ago
🔀 Automation Dispatch / plan-execute (pull_request)
🔀 Automation Dispatch / plan-execute (pull_request)Skipped 1 hour ago
🔀 Automation Dispatch / review (pull_request_review)
🔀 Automation Dispatch / review (pull_request_review)Skipped 1 hour ago
🔀 Automation Dispatch / triage (pull_request_review)
🔀 Automation Dispatch / triage (pull_request_review)Skipped 1 hour ago
🔀 Automation Dispatch / triage (pull_request)
🔀 Automation Dispatch / triage (pull_request)Skipped 1 hour ago
neutral checks
Mend Security Check
Mend Security Check — Security Report
successful checks
🔀 Automation Dispatch / dispatch (pull_request)
🔀 Automation Dispatch / dispatch (pull_request)Successful in 5s
🔀 Automation Dispatch / review / review (pull_request)
🔀 Automation Dispatch / review / review (pull_request)Successful in 7s
CI / integration-heavy-training (pull_request)
CI / integration-heavy-training (pull_request)Successful in 44s
CI / server-training-readiness-gate (pull_request)
CI / server-training-readiness-gate (pull_request)Successful in 43s
Code scanning results / CodeQL
Code scanning results / CodeQLSuccessful in 3s — No new alerts in code changed by this pull request
CodeQL / Analyze (actions) (dynamic)
CodeQL / Analyze (actions) (dynamic)Successful in 1m
CodeQL / Analyze (javascript-typescript) (dynamic)
CodeQL / Analyze (javascript-typescript) (dynamic)Successful in 1m
CodeQL / Analyze (python) (dynamic)
CodeQL / Analyze (python) (dynamic)Successful in 1m
CodeRabbit
CodeRabbit — Review completed
DGS Integration Tests / accessibility (pull_request)
DGS Integration Tests / accessibility (pull_request)Successful in 30s
DGS Integration Tests / deploy-preview (pull_request)
DGS Integration Tests / deploy-preview (pull_request)Successful in 52s
DGS Integration Tests / notify (pull_request)
DGS Integration Tests / notify (pull_request)Successful in 2s
DGS Integration Tests / security (pull_request)
DGS Integration Tests / security (pull_request)Successful in 1m
DGS Integration Tests / test (18, 3.10) (pull_request)
DGS Integration Tests / test (18, 3.10) (pull_request)Successful in 5m
DGS Integration Tests / test (20, 3.10) (pull_request)
DGS Integration Tests / test (20, 3.10) (pull_request)Successful in 4m
No conflicts with base branch
Merging can be performed automatically.

You can also merge this with the command line. 
Still in progress?
@voku

Add a comment
Comment
 
Add your comment here...
Remember, contributions to this repository should follow our GitHub Community Guidelines.
 ProTip! Add comments to specific lines under Files changed.
Reviewers
@coderabbitai
coderabbitai[bot]
@chatgpt-codex-connector
chatgpt-codex-connector[bot]
+1 more reviewer
@review-assist
review-assist[bot]

Still in progress?
Assignees
No one—
Labels
codex
Projects
None yet
Milestone
Development
Successfully merging this pull request may close these issues.

None yet

Notifications
Customize
You’re receiving notifications because you were mentioned.
1 participant
@voku
Footer
© 2026 GitHub, Inc.
Footer navigation
Terms
Privacy
Security
Status
Community
Docs
Contact
      `
    };
    const result = cleanText(input, GitHubRuleSet);
    
    // Check that the title and description are preserved
    expect(result.cleanedText).toContain('Expose runtime diagnosability for gesture detector and surface in status/docs/tests');
    expect(result.cleanedText).toContain('Reduce time-to-root-cause for MediaPipe/gesture runtime incidents');
    
    // Check that the footer junk is removed
    expect(result.cleanedText).not.toContain('© 2026 GitHub, Inc.');
    expect(result.cleanedText).not.toContain('Footer navigation');
    expect(result.cleanedText).not.toContain('Contact');
    
    // Check that the top navigation is removed
    expect(result.cleanedText).not.toContain('Repository navigation');
    expect(result.cleanedText).not.toContain('Wiki');

    // Check that specific noisy lines are removed
    expect(result.cleanedText).not.toContain('Conversation6 (6)');
    expect(result.cleanedText).not.toContain('Commits1 (1)');
    expect(result.cleanedText).not.toContain('Checks42 (42)');
    expect(result.cleanedText).not.toContain('Files changed9 (9)');
    expect(result.cleanedText).not.toContain('Lines changed: 142 additions & 15 deletions');
    expect(result.cleanedText).not.toContain('wants to merge 1 commit into');
    expect(result.cleanedText).not.toContain('1 hour ago');
    expect(result.cleanedText).not.toContain('•');
    expect(result.cleanedText).not.toContain('left a comment');
    expect(result.cleanedText).not.toContain('Code Review');
    expect(result.cleanedText).not.toContain('Walkthrough');
    expect(result.cleanedText).not.toContain('Changes');
    expect(result.cleanedText).not.toContain('Estimated code review effort');
    expect(result.cleanedText).not.toContain('Possibly related PRs');
    expect(result.cleanedText).not.toContain('💡 Codex Review');
    expect(result.cleanedText).not.toContain('Here are some automated review suggestions for this pull request.');
    expect(result.cleanedText).not.toContain('ℹ️ About Codex in GitHub');
    expect(result.cleanedText).not.toContain('🤖 Prompt for all review comments with AI agents');
    expect(result.cleanedText).not.toContain('Comment on lines +532 to +551');
    expect(result.cleanedText).not.toContain('⚠️ Outside diff range comments (1)');
    expect(result.cleanedText).not.toContain('Useful? React with 👍 / 👎.');
    expect(result.cleanedText).not.toContain('@voku\tReply...');
    expect(result.cleanedText).not.toMatch(/^\+142$/m);
    expect(result.cleanedText).not.toMatch(/^-15$/m);
    expect(result.cleanedText).not.toContain('Mention @copilot in a comment to make changes to this pull request.');
    // Additional assertions discovered via static analysis of real PR output
    expect(result.cleanedText).not.toContain('Conversation');
    expect(result.cleanedText).not.toContain('Codex Task');
    expect(result.cleanedText).not.toContain('Summary by CodeRabbit');
    expect(result.cleanedText).not.toContain('Release Notes');
    expect(result.cleanedText).not.toContain('Sequence Diagram(s)');
    expect(result.cleanedText).not.toContain('Poem');
    expect(result.cleanedText).not.toContain('🚥 Pre-merge checks');
    expect(result.cleanedText).not.toContain('🎯 3 (Moderate)');
    expect(result.cleanedText).not.toContain('🤖 Hi @voku');
    expect(result.cleanedText).not.toContain('P2 Badge Set gesture delegate only after CPU fallback succeeds');
    expect(result.cleanedText).not.toContain('Comment on lines +146 to 149');
    expect(result.cleanedText).not.toContain('Some comments are outside the diff');
    expect(result.cleanedText).not.toContain('CodeRabbit');
    // Standalone @handle lines (nav chrome) must be removed
    expect(result.cleanedText).not.toMatch(/^@coderabbitai$/m);
    expect(result.cleanedText).not.toMatch(/^@github-actions$/m);
    expect(result.cleanedText).not.toMatch(/^@chatgpt-codex-connector$/m);
    // Short commit SHAs must be removed
    expect(result.cleanedText).not.toMatch(/^54358d6$/m);
  });

  it('does not destroy legitimate user content (blind spot fix)', () => {
    const input = {
      rawText: `
Skip to content
Navigation Menu
# My PR Title
I added the new login button and removed the old one to meet the v2.0 milestone.
Please check the following areas:
- Labels
- Projects
- Settings
Footer navigation
Terms
      `
    };

    const result = cleanText(input, GitHubRuleSet);

    // Prefix/Suffix should be gone
    expect(result.cleanedText).not.toContain('Skip to content');
    expect(result.cleanedText).not.toContain('Footer navigation');

    // Legitimate content should remain!
    expect(result.cleanedText).toContain('I added the new login button and removed the old one to meet the v2.0 milestone.');
    expect(result.cleanedText).toContain('- Labels');
    expect(result.cleanedText).toContain('- Projects');
  });

  it('cleans another real GitHub PR sample with checks and rate limits', () => {
    const input = {
      rawText: `
- - - Skip to content
voku
AmysEcho
Repository navigation
Code
Issues
2
 (2)
Pull requests
13
 (13)
Agents
Discussions
Actions
Projects
Wiki
Security and quality
35
 (35)
Add signer-leakage validation and held-out signer evaluation for few-shot trials
#1124
Open
voku
wants to merge 1 commit into
main
from
codex/work-on-todos-autonomously-zgtgdq
+200
-8
Lines changed: 200 additions & 8 deletions
Conversation5 (5)
Commits1 (1)
Checks24 (24)
Files changed3 (3)
Open
Add signer-leakage validation and held-out signer evaluation for few-shot trials#1124
voku
wants to merge 1 commit into
main
from
codex/work-on-todos-autonomously-zgtgdq
Conversation
@voku
Owner
voku
commented
18 minutes ago
Motivation
Prevent signer/profile and bundle leakage in few-shot experiments by enforcing stricter manifest validation and ensure reported metrics reflect held-out signer performance.
Surface held-out (known-signer vs unknown-signer) evaluation results alongside training metrics so few-shot reports reflect real-world generalization.
Description
Harden _validate_split_manifest with type and non-empty checks for train_profiles, test_profiles, train_bundles, and test_bundles, and keep existing overlap rejection for signer and bundle leakage.
Wire held-out evaluation into the few-shot run path by adding _load_global_model_artifact and _evaluate_heldout_test_pool, store training_metrics, metrics (heldout), and heldout_test_diagnostics in the generated trial reports, and import model evaluation helpers from train_mlp.
Add imports for numpy and tempfile, and update command/report handling to prefer held-out metrics in report_payload while preserving training metrics.
Update docs checklist MAY-P1-2/TOPIC.md to mark discovery/implementation/tests complete and include the pytest command used.
Testing
Added unit tests covering split manifest signer overlap and empty-split rejection, loading of amy_model.npz, and held-out evaluation behavior (server/test/test_train_mlp_fewshot.py).
Ran pytest server/test/test_train_mlp_fewshot.py server/test/test_train_mlp_sweep.py -q and both test files passed.
Codex Task

Mention @copilot in a comment to make changes to this pull request.
@voku
Use held-out signer metrics in few-shot summaries
3721bd8
@voku voku added the codex label 18 minutes ago — with  ChatGPT Codex Connector
@coderabbitai
Contributor
coderabbitai bot
commented
18 minutes ago
Warning

Rate limit exceeded
@voku has exceeded the limit for the number of commits that can be reviewed per hour. Please wait 8 minutes and 3 seconds before requesting another review.

Your organization is not enrolled in usage-based pricing. Contact your admin to enable usage-based pricing to continue reviews beyond the rate limit, or try again in 8 minutes and 3 seconds.

⌛ How to resolve this issue?
🚦 How do rate limits work?
ℹ️ Review info
✨ Finishing Touches
Thanks for using CodeRabbit! It's free for OSS, and your support helps us grow. If you like it, consider giving us a shout-out.

❤️ Share
Comment @coderabbitai help to get the list of available commands and usage tips.

@github-actions
github-actions bot
commented
18 minutes ago
🤖 Hi @voku, I've received your request, and I'm working on it now! You can track my progress in the logs for more details.

review-assist[bot]
review-assist bot reviewed 16 minutes ago
Contributor
review-assist bot
left a comment
Code Review
This pull request strengthens split-manifest validation and integrates held-out signer metrics into few-shot trial reports. Key additions include logic for loading model artifacts and evaluating them against a test pool. Feedback highlights a critical issue where path resolution might fail if a non-default data directory is used, as well as opportunities to improve evaluation logic by excluding training examples and optimizing performance by moving redundant manifest processing out of the inner loop.

server/src/amyserver_tools/train_mlp_fewshot.py
    with tempfile.TemporaryDirectory(prefix="amy-fewshot-heldout-") as temp_dir:
        temp_manifest = Path(temp_dir) / "heldout_test_manifest.json"
        temp_manifest.write_text(json.dumps({"entries": test_pool}, indent=2), encoding="utf-8")
        test_samples, _ = build_samples_from_manifest(temp_manifest, skip_examples=skip_examples)
Contributor
@review-assist
review-assist bot
16 minutes ago
high

There are two issues with this call to build_samples_from_manifest:

Correctness (High): The function relies on the DATA_DIR global variable in the train_mlp module for path resolution. However, this global is initialized when the module is imported and is not updated to reflect the --data-dir argument passed to this script. This will cause evaluation to fail if a non-default data directory is used. You should explicitly set train_mlp.DATA_DIR = data_dir (passing data_dir into this function) before the call.
Logic (Medium): skip_examples should likely be hardcoded to True here. The purpose of this evaluation is to measure generalization to held-out signers in the test_pool. Including global DGS video examples (which are typically used for training) in the test set would inflate metrics and doesn't reflect performance on unknown signers.
@voku	Reply...
server/src/amyserver_tools/train_mlp_fewshot.py
Comment on lines +470 to +474
            heldout_accuracy, heldout_f1_score, heldout_diagnostics = _evaluate_heldout_test_pool(
                test_pool=test_pool,
                model_output_dir=run_output_dir,
                skip_examples=args.skip_examples,
            )
Contributor
@review-assist
review-assist bot
16 minutes ago
medium

Calling _evaluate_heldout_test_pool inside the shot loop is inefficient. While the model artifact changes per shot, the test_pool and the resulting test_samples are constant for a given seed.

Currently, every shot triggers a redundant cycle of writing a temporary manifest to disk and parsing it via build_samples_from_manifest. To optimize this, you should move the sample building logic out of the shot loop (into the seed loop) and update _evaluate_heldout_test_pool to accept the pre-built list of Sample objects instead of the raw test_pool list.

@voku	Reply...
chatgpt-codex-connector[bot]
chatgpt-codex-connector bot reviewed 13 minutes ago
chatgpt-codex-connector bot
left a comment
💡 Codex Review
Here are some automated review suggestions for this pull request.

Reviewed commit: 3721bd8558

ℹ️ About Codex in GitHub
server/src/amyserver_tools/train_mlp_fewshot.py
    with tempfile.TemporaryDirectory(prefix="amy-fewshot-heldout-") as temp_dir:
        temp_manifest = Path(temp_dir) / "heldout_test_manifest.json"
        temp_manifest.write_text(json.dumps({"entries": test_pool}, indent=2), encoding="utf-8")
        test_samples, _ = build_samples_from_manifest(temp_manifest, skip_examples=skip_examples)
@chatgpt-codex-connector
chatgpt-codex-connector bot
13 minutes ago
P1 Badge Exclude default examples from held-out evaluation

_evaluate_heldout_test_pool forwards skip_examples directly into build_samples_from_manifest, but in train_mlp.py that helper appends data/dgs_video_examples whenever skip_examples is false. In the default few-shot flow (no --skip-examples), held-out metrics then include shared default examples instead of only signer-held-out bundles, which introduces train/eval leakage and can significantly inflate the reported held-out accuracy/F1.

Useful? React with 👍 / 👎.

@voku	Reply...
This branch has not been deployed
No deployments
Merge info
Some checks were not successful
1 failing, 1 neutral, 12 skipped, 15 successful checks


failing checks
CI / build (pull_request)
CI / build (pull_request)Failing after 1m
skipped checks
🔀 Automation Dispatch / debugger (pull_request_review)
🔀 Automation Dispatch / debugger (pull_request_review)Skipped 13 minutes ago
🔀 Automation Dispatch / debugger (pull_request)
🔀 Automation Dispatch / debugger (pull_request)Skipped 18 minutes ago
🔀 Automation Dispatch / dispatch (pull_request_review)
🔀 Automation Dispatch / dispatch (pull_request_review)Skipped 13 minutes ago
🔀 Automation Dispatch / fallthrough (pull_request_review)
🔀 Automation Dispatch / fallthrough (pull_request_review)Skipped 13 minutes ago
🔀 Automation Dispatch / fallthrough (pull_request)
🔀 Automation Dispatch / fallthrough (pull_request)Skipped 18 minutes ago
🔀 Automation Dispatch / invoke (pull_request_review)
🔀 Automation Dispatch / invoke (pull_request_review)Skipped 13 minutes ago
🔀 Automation Dispatch / invoke (pull_request)
🔀 Automation Dispatch / invoke (pull_request)Skipped 18 minutes ago
🔀 Automation Dispatch / plan-execute (pull_request_review)
🔀 Automation Dispatch / plan-execute (pull_request_review)Skipped 13 minutes ago
🔀 Automation Dispatch / plan-execute (pull_request)
🔀 Automation Dispatch / plan-execute (pull_request)Skipped 18 minutes ago
🔀 Automation Dispatch / review (pull_request_review)
🔀 Automation Dispatch / review (pull_request_review)Skipped 13 minutes ago
🔀 Automation Dispatch / triage (pull_request_review)
🔀 Automation Dispatch / triage (pull_request_review)Skipped 13 minutes ago
🔀 Automation Dispatch / triage (pull_request)
🔀 Automation Dispatch / triage (pull_request)Skipped 18 minutes ago
neutral checks
Mend Security Check
Mend Security Check — Security Report
successful checks
🔀 Automation Dispatch / dispatch (pull_request)
🔀 Automation Dispatch / dispatch (pull_request)Successful in 7s
🔀 Automation Dispatch / review / review (pull_request)
🔀 Automation Dispatch / review / review (pull_request)Successful in 6s
CI / integration-heavy-training (pull_request)
CI / integration-heavy-training (pull_request)Successful in 4m
CI / server-training-readiness-gate (pull_request)
CI / server-training-readiness-gate (pull_request)Successful in 2m
Code scanning results / CodeQL
Code scanning results / CodeQLSuccessful in 2s — No new alerts in code changed by this pull request
CodeQL / Analyze (actions) (dynamic)
CodeQL / Analyze (actions) (dynamic)Successful in 1m
CodeQL / Analyze (javascript-typescript) (dynamic)
CodeQL / Analyze (javascript-typescript) (dynamic)Successful in 1m
CodeQL / Analyze (python) (dynamic)
CodeQL / Analyze (python) (dynamic)Successful in 1m
CodeRabbit
CodeRabbit — Review skipped
DGS Integration Tests / accessibility (pull_request)
DGS Integration Tests / accessibility (pull_request)Successful in 25s
DGS Integration Tests / deploy-preview (pull_request)
DGS Integration Tests / deploy-preview (pull_request)Successful in 54s
DGS Integration Tests / notify (pull_request)
DGS Integration Tests / notify (pull_request)Successful in 4s
DGS Integration Tests / security (pull_request)
DGS Integration Tests / security (pull_request)Successful in 1m
DGS Integration Tests / test (18, 3.10) (pull_request)
DGS Integration Tests / test (18, 3.10) (pull_request)Successful in 6m
DGS Integration Tests / test (20, 3.10) (pull_request)
DGS Integration Tests / test (20, 3.10) (pull_request)Successful in 4m
No conflicts with base branch
Merging can be performed automatically.

You can also merge this with the command line. 
Still in progress?
@voku


Add a comment
Comment
 
Add your comment here...
Remember, contributions to this repository should follow our GitHub Community Guidelines.
 ProTip! Add .patch or .diff to the end of URLs for Git’s plaintext views.
Reviewers
1 more reviewer
@review-assist
review-assist[bot]

Still in progress?
Assignees
No one—
Labels
codex
Projects
None yet
Milestone
No milestone
Development
Successfully merging this pull request may close these issues.

None yet


Notifications
Customize
You’re receiving notifications because you were mentioned.
1 participant
@voku
Footer
© 2026 GitHub, Inc.
Footer navigation
Terms
Privacy
Security
Status
Community
Docs
Contact
Manage cookies
Do not share my personal information
      `
    };

    const result = cleanText(input, GitHubRuleSet);

    // Check that the title and description are preserved
    expect(result.cleanedText).toContain('Add signer-leakage validation and held-out signer evaluation for few-shot trials');
    expect(result.cleanedText).toContain('Prevent signer/profile and bundle leakage in few-shot experiments');
    
    // Check that the footer junk is removed
    expect(result.cleanedText).not.toContain('© 2026 GitHub, Inc.');
    expect(result.cleanedText).not.toContain('Footer navigation');
    expect(result.cleanedText).not.toContain('Contact');
    
    // Check that the top navigation is removed
    expect(result.cleanedText).not.toContain('Repository navigation');
    expect(result.cleanedText).not.toContain('Wiki');
    expect(result.cleanedText).not.toContain('Security and quality');
    
    // Check that the checks section is removed
    expect(result.cleanedText).not.toContain('This branch has not been deployed');
    expect(result.cleanedText).not.toContain('CI / build (pull_request)');
    
    // Check that specific noisy lines are removed
    expect(result.cleanedText).not.toContain('Conversation5 (5)');
    expect(result.cleanedText).not.toContain('Commits1 (1)');
    expect(result.cleanedText).not.toContain('Checks24 (24)');
    expect(result.cleanedText).not.toContain('Files changed3 (3)');
    expect(result.cleanedText).not.toContain('Lines changed: 200 additions & 8 deletions');
    expect(result.cleanedText).not.toContain('wants to merge 1 commit into');
    expect(result.cleanedText).not.toContain('18 minutes ago');
    expect(result.cleanedText).not.toContain('•');
    expect(result.cleanedText).not.toContain('left a comment');
    expect(result.cleanedText).not.toContain('Code Review');
    expect(result.cleanedText).not.toContain('Walkthrough');
    expect(result.cleanedText).not.toContain('Changes');
    expect(result.cleanedText).not.toContain('Estimated code review effort');
    expect(result.cleanedText).not.toContain('Possibly related PRs');
    expect(result.cleanedText).not.toContain('💡 Codex Review');
    expect(result.cleanedText).not.toContain('Here are some automated review suggestions for this pull request.');
    expect(result.cleanedText).not.toContain('ℹ️ About Codex in GitHub');
    expect(result.cleanedText).not.toContain('🤖 Prompt for all review comments with AI agents');
    expect(result.cleanedText).not.toContain('Comment on lines +470 to +474');
    expect(result.cleanedText).not.toContain('⚠️ Outside diff range comments (1)');
    expect(result.cleanedText).not.toContain('Useful? React with 👍 / 👎.');
    expect(result.cleanedText).not.toContain('@voku\tReply...');
    expect(result.cleanedText).not.toMatch(/^\+200$/m);
    expect(result.cleanedText).not.toMatch(/^-8$/m);
    expect(result.cleanedText).not.toContain('Mention @copilot in a comment to make changes to this pull request.');
    expect(result.cleanedText).not.toContain('1 participant');
    // Additional assertions discovered via static analysis of real PR output
    expect(result.cleanedText).not.toContain('Conversation');
    expect(result.cleanedText).not.toContain('Codex Task');
    expect(result.cleanedText).not.toContain('Summary by CodeRabbit');
    expect(result.cleanedText).not.toContain('Release Notes');
    expect(result.cleanedText).not.toContain('Sequence Diagram(s)');
    expect(result.cleanedText).not.toContain('🤖 Hi @voku');
    expect(result.cleanedText).not.toContain('P1 Badge Exclude default examples from held-out evaluation');
    expect(result.cleanedText).not.toContain('Comment on lines +470 to +474');
    expect(result.cleanedText).not.toContain('CodeRabbit');
    // Standalone @handle lines must be removed
    expect(result.cleanedText).not.toMatch(/^@coderabbitai$/m);
    expect(result.cleanedText).not.toMatch(/^@github-actions$/m);
    expect(result.cleanedText).not.toMatch(/^@review-assist$/m);
    expect(result.cleanedText).not.toMatch(/^@chatgpt-codex-connector$/m);
    // Short commit SHAs must be removed
    expect(result.cleanedText).not.toMatch(/^3721bd8$/m);
  });
});

describe('GitHub PR — Static Analysis Pattern Coverage', () => {
  // Tests derived from line-by-line static analysis of real PR page dumps.
  // Each test targets a specific junk pattern found to survive without rules.

  it('removes "Conversation" tab header', () => {
    const result = cleanText({ rawText: 'Conversation\n# PR title\nSome content', sourceTypeHint: 'github_pr' }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Conversation');
    expect(result.cleanedText).toContain('# PR title');
  });

  it('removes "Codex Task" label', () => {
    const result = cleanText({ rawText: '# PR\nSome content\nCodex Task\n', sourceTypeHint: 'github_pr' }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Codex Task');
    expect(result.cleanedText).toContain('# PR');
  });

  it('removes "Summary by CodeRabbit" section header', () => {
    const result = cleanText({ rawText: '# PR\nSome content\nSummary by CodeRabbit\n', sourceTypeHint: 'github_pr' }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Summary by CodeRabbit');
  });

  it('removes "Release Notes" standalone CodeRabbit section header', () => {
    const result = cleanText({ rawText: '# PR\nRelease Notes\nNew content', sourceTypeHint: 'github_pr' }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Release Notes');
  });

  it('removes "Sequence Diagram(s)" section header', () => {
    const result = cleanText({ rawText: '# PR\nSome content\nSequence Diagram(s)\n', sourceTypeHint: 'github_pr' }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Sequence Diagram(s)');
  });

  it('removes "Poem" header and does not corrupt poem content', () => {
    // The "Poem" label itself is removed; the poem lines below it are
    // generic text the engine cannot distinguish from real content.
    const result = cleanText({ rawText: '# PR\nPoem\n🐰 A hop, skip, and delegate trace!\n', sourceTypeHint: 'github_pr' }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Poem');
  });

  it('removes "Some comments are outside the diff..." boilerplate', () => {
    const result = cleanText({
      rawText: "# PR\nSome content\nSome comments are outside the diff and can't be posted inline due to platform limitations.\n",
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain("Some comments are outside the diff");
  });

  it('removes "CodeRabbit" standalone bot name', () => {
    const result = cleanText({ rawText: '# PR\nSome content\nCodeRabbit\n', sourceTypeHint: 'github_pr' }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('CodeRabbit');
  });

  it('removes 🚥 Pre-merge checks summary line', () => {
    const result = cleanText({ rawText: '# PR\nSome content\n🚥 Pre-merge checks | ✅ 3\n', sourceTypeHint: 'github_pr' }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Pre-merge checks');
  });

  it('removes 🎯 CodeRabbit review effort value line', () => {
    const result = cleanText({ rawText: '# PR\nEstimated code review effort\n🎯 3 (Moderate) | ⏱️ ~22 minutes\n', sourceTypeHint: 'github_pr' }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('🎯 3 (Moderate)');
    expect(result.cleanedText).not.toContain('Estimated code review effort');
  });

  it('removes GitHub Actions bot acknowledgment line', () => {
    const result = cleanText({
      rawText: '# PR\nSome content\n🤖 Hi @voku, I\'ve received your request, and I\'m working on it now! You can track my progress in the logs for more details.\n',
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('🤖 Hi @voku');
  });

  it('removes tab-less @handle Reply... button variant', () => {
    // When copy-pasting from GitHub the tab separator between @user and "Reply..."
    // is sometimes dropped, producing "@userReply..." with no whitespace.
    const result = cleanText({ rawText: '# PR\nSome content\n@vokuReply...\n', sourceTypeHint: 'github_pr' }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('@vokuReply...');
  });

  it('removes Codex/review priority badge lines (P1, P2)', () => {
    const result = cleanText({
      rawText: '# PR\nP2 Badge Set gesture delegate only after CPU fallback succeeds\nP1 Badge Exclude default examples from held-out evaluation\nSome content',
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('P2 Badge');
    expect(result.cleanedText).not.toContain('P1 Badge');
    expect(result.cleanedText).toContain('Some content');
  });

  it('removes standalone @handle lines (bot and user nav chrome)', () => {
    // Standalone @handle lines appear in GitHub PR sidebars (reviewer pills,
    // assignee lists, notification mentions). They must be removed.
    // NOTE: content must precede the @handle section in the input — once
    // the suffix trimmer finds the @handles trailing at the end it cuts them.
    const result = cleanText({
      rawText: '# PR\nSome content\n@coderabbitai\n@github-actions\n@review-assist',
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toMatch(/^@coderabbitai$/m);
    expect(result.cleanedText).not.toMatch(/^@github-actions$/m);
    expect(result.cleanedText).not.toMatch(/^@review-assist$/m);
    expect(result.cleanedText).toContain('Some content');
  });

  it('preserves @handle when it appears mid-sentence (not a standalone line)', () => {
    // A line containing @mention embedded in text must NOT be removed.
    const result = cleanText({
      rawText: '# PR\nThanks to @voku for the fix.\nAnother @reviewer approved it.\n',
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).toContain('Thanks to @voku for the fix.');
    expect(result.cleanedText).toContain('Another @reviewer approved it.');
  });

  it('removes short commit SHAs (7-char hex) as standalone lines', () => {
    const result = cleanText({
      rawText: '# PR\n54358d6\n3721bd8\nSome content',
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toMatch(/^54358d6$/m);
    expect(result.cleanedText).not.toMatch(/^3721bd8$/m);
    expect(result.cleanedText).toContain('Some content');
  });

  it('removes Comment on lines with + on first number only (real GitHub variant)', () => {
    // GitHub sometimes renders "Comment on lines +146 to 149" (no + on second number).
    // The original regex required + on both; this was a real blind spot.
    const result = cleanText({
      rawText: '# PR\nComment on lines +146 to 149\nComment on lines +532 to +551\nSome content',
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Comment on lines +146 to 149');
    expect(result.cleanedText).not.toContain('Comment on lines +532 to +551');
    expect(result.cleanedText).toContain('Some content');
  });
});

describe('GitHub — Research-Driven Pattern Coverage', () => {
  // Tests derived from real GitHub Issue, Repo, and Files Changed tab page dumps.
  // Patterns confirmed by fetching live GitHub pages and running line-by-line analysis.

  // ── Issue / PR page chrome ─────────────────────────────────────────────

  it('removes "Type \'/\' to search" shortcut hint', () => {
    const result = cleanText({ rawText: "Type '/' to search\n# PR title\nSome content" }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain("Type '/' to search");
    expect(result.cleanedText).toContain('Some content');
  });

  it('removes "Jump to bottom" page navigation', () => {
    const result = cleanText({ rawText: '# Issue title\nSome content\nJump to bottom' }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Jump to bottom');
    expect(result.cleanedText).toContain('Some content');
  });

  it('removes "opened this issue" event line', () => {
    const result = cleanText({ rawText: '# Issue\ndevuser\nopened this issue\nSome content' }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('opened this issue');
    expect(result.cleanedText).toContain('Some content');
  });

  it('removes "Leave a comment" form label', () => {
    const result = cleanText({ rawText: '# Issue\nSome content\nLeave a comment' }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Leave a comment');
  });

  it('removes "Lock conversation" and "Delete issue" sidebar actions', () => {
    const result = cleanText({ rawText: '# Issue\nSome content\nLock conversation\nDelete issue' }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Lock conversation');
    expect(result.cleanedText).not.toContain('Delete issue');
    expect(result.cleanedText).toContain('Some content');
  });

  it('removes "Linked pull requests" sidebar section', () => {
    const result = cleanText({ rawText: '# Issue\nSome content\nLinked pull requests' }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Linked pull requests');
  });

  it('removes "Markdown is supported" and file attach hint', () => {
    const result = cleanText({
      rawText: '# Issue\nSome content\nMarkdown is supported\nAttach files by dragging & dropping, selecting or pasting them.',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Markdown is supported');
    expect(result.cleanedText).not.toContain('Attach files by dragging & dropping');
  });

  it('removes "Add a comment to start a discussion" empty state', () => {
    const result = cleanText({ rawText: '# Issue\nSome content\nAdd a comment to start a discussion' }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Add a comment to start a discussion');
  });

  it('removes "You are not currently watching this repository"', () => {
    const result = cleanText({ rawText: '# Issue\nSome content\nYou are not currently watching this repository' }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('You are not currently watching this repository');
  });

  it('removes "You must be logged in to vote"', () => {
    const result = cleanText({ rawText: '# Issue\nSome content\nYou must be logged in to vote' }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('You must be logged in to vote');
  });

  it('removes "No issues match the current filter" empty state', () => {
    const result = cleanText({ rawText: '# Issue list\nFilters\nNo issues match the current filter' }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('No issues match the current filter');
  });

  it('removes "No branches or tags" empty state', () => {
    const result = cleanText({ rawText: '# PR\nSome content\nDevelopment\nNo branches or tags' }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('No branches or tags');
  });

  it('removes "Label issues and pull requests for new contributors"', () => {
    const result = cleanText({ rawText: '# Issues\nLabel issues and pull requests for new contributors\nSome content' }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Label issues and pull requests for new contributors');
  });

  // ── Repo sidebar chrome ────────────────────────────────────────────────

  it('removes "Sponsor this project" sidebar link', () => {
    const result = cleanText({ rawText: '# Repo\nSome content\nSponsor this project' }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Sponsor this project');
  });

  it('removes "No packages published" sidebar empty state', () => {
    const result = cleanText({ rawText: '# Repo\nSome content\nPackages\nNo packages published' }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('No packages published');
  });

  it('removes "Open in github.dev" and "Open with GitHub Desktop" buttons', () => {
    const result = cleanText({ rawText: '# Repo\nSome content\nOpen in github.dev\nOpen with GitHub Desktop\nView all files' }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Open in github.dev');
    expect(result.cleanedText).not.toContain('Open with GitHub Desktop');
    expect(result.cleanedText).not.toContain('View all files');
  });

  it('removes "View all releases" sidebar link', () => {
    const result = cleanText({ rawText: '# Repo\nSome content\nView all releases' }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('View all releases');
  });

  it('removes "Nothing to show" empty state', () => {
    const result = cleanText({ rawText: '# Repo\nSome content\nNothing to show' }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Nothing to show');
  });

  it('removes "Used by N users" sidebar stat', () => {
    const r1 = cleanText({ rawText: '# Repo\nSome content\nUsed by 47 users' }, GitHubRuleSet);
    const r2 = cleanText({ rawText: '# Repo\nSome content\nUsed by 3' }, GitHubRuleSet);
    expect(r1.cleanedText).not.toContain('Used by 47 users');
    expect(r2.cleanedText).not.toContain('Used by 3');
    expect(r1.cleanedText).toContain('Some content');
  });

  it('removes "N contributors" sidebar stat', () => {
    const result = cleanText({ rawText: '# Repo\nSome content\n3 contributors\n1 contributor' }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('3 contributors');
    expect(result.cleanedText).not.toContain('1 contributor');
    expect(result.cleanedText).toContain('Some content');
  });

  // ── Files Changed tab chrome ───────────────────────────────────────────

  it('removes "Conversations" plural tab label', () => {
    const result = cleanText({ rawText: '# PR\nConversations\nSome content' }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Conversations');
    expect(result.cleanedText).toContain('Some content');
  });

  it('removes Files Changed tab bar (space-separated format)', () => {
    const result = cleanText({
      rawText: '# PR\nCommits 1\nChecks 24\nFiles changed 3\nSome content',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Commits 1');
    expect(result.cleanedText).not.toContain('Checks 24');
    expect(result.cleanedText).not.toContain('Files changed 3');
    expect(result.cleanedText).toContain('Some content');
  });

  it('removes "Showing N changed files with N additions and N deletions." diff summary', () => {
    const r1 = cleanText({ rawText: '# PR\nShowing 3 changed files with 200 additions and 8 deletions.\nSome content' }, GitHubRuleSet);
    const r2 = cleanText({ rawText: '# PR\nShowing 1 changed file with 1 addition and 0 deletions.\nSome content' }, GitHubRuleSet);
    expect(r1.cleanedText).not.toContain('Showing 3 changed files');
    expect(r2.cleanedText).not.toContain('Showing 1 changed file');
    expect(r1.cleanedText).toContain('Some content');
  });

  it('removes Files Changed UI controls', () => {
    const result = cleanText({
      rawText: '# PR\nFilter changed files\nShow file tree\nHide file tree\nExpand all\nCollapse all\nJump to file\nLoad diff\nSome content',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Filter changed files');
    expect(result.cleanedText).not.toContain('Show file tree');
    expect(result.cleanedText).not.toContain('Hide file tree');
    expect(result.cleanedText).not.toContain('Expand all');
    expect(result.cleanedText).not.toContain('Collapse all');
    expect(result.cleanedText).not.toContain('Jump to file');
    expect(result.cleanedText).not.toContain('Load diff');
    expect(result.cleanedText).toContain('Some content');
  });

  it('removes "Viewed" checkbox label and "This file was deleted." diff note', () => {
    const result = cleanText({ rawText: '# PR\nSome content\nViewed\nThis file was deleted.' }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Viewed');
    expect(result.cleanedText).not.toContain('This file was deleted.');
    expect(result.cleanedText).toContain('Some content');
  });

  it('removes "N% of N files viewed" Files Changed progress indicator', () => {
    const result = cleanText({ rawText: '# PR\nSome content\n50% of 6 files viewed' }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('50% of 6 files viewed');
    expect(result.cleanedText).toContain('Some content');
  });

  // ── Relative timestamp completeness ────────────────────────────────────

  it('removes relative timestamps not covered by the digit-based rule', () => {
    const result = cleanText({
      rawText: '# PR\nSome content\nyesterday\nlast week\nlast month\nlast year\na minute ago\nan hour ago\na day ago',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('yesterday');
    expect(result.cleanedText).not.toContain('last week');
    expect(result.cleanedText).not.toContain('last month');
    expect(result.cleanedText).not.toContain('last year');
    expect(result.cleanedText).not.toContain('a minute ago');
    expect(result.cleanedText).not.toContain('an hour ago');
    expect(result.cleanedText).not.toContain('a day ago');
    expect(result.cleanedText).toContain('Some content');
  });

  // ── Middle-dot separator (U+00B7) ──────────────────────────────────────

  it('removes "· N comments" middle-dot separator line', () => {
    const result = cleanText({ rawText: '# Issue\n\u00B7 3 comments\nSome content' }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('\u00B7 3 comments');
    expect(result.cleanedText).toContain('Some content');
  });

  it('removes standalone middle-dot separator (U+00B7)', () => {
    const result = cleanText({ rawText: '# Issue\ndevuser\n\u00B7\nedited\nSome content' }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('\u00B7');
  });

  // ── Issue title-change event ────────────────────────────────────────────

  it('removes title-change event lines', () => {
    const result = cleanText({
      rawText: '# Issue\ndevuser changed the title Old title New title\nSome content',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('changed the title');
    expect(result.cleanedText).toContain('Some content');
  });

  // ── GitHub auth / sign-in prompts ──────────────────────────────────────

  it('removes GitHub sign-in prompts', () => {
    const result = cleanText({
      rawText: '# Issues\nHave a question about this project? Sign up for a free GitHub account to open an issue and contact its maintainers and the community.\nSign up for GitHub\nAlready on GitHub? Sign in to your account\nPick a username\nSome content',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Have a question about this project?');
    expect(result.cleanedText).not.toContain('Sign up for GitHub');
    expect(result.cleanedText).not.toContain('Already on GitHub?');
    expect(result.cleanedText).not.toContain('Pick a username');
    expect(result.cleanedText).toContain('Some content');
  });

  it('removes over-dashed "Skip to content" prefix while preserving the PR title', () => {
    const result = cleanText({
      rawText: '- - - - - - - - - - - - - - - Skip to content\nvoku\nAmysEcho\nRepository navigation\nCode\nIssues\n12\n(12)\nExpose runtime diagnosability for gesture detector and surface in status/docs/tests',
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).toBe('Expose runtime diagnosability for gesture detector and surface in status/docs/tests');
  });

  it('removes standalone PR header metadata lines from a copied PR page', () => {
    const result = cleanText({
      rawText: '#1123\nMerged\nmerged 3 commits into\nmain\nfrom\ncodex/work-on-todos-autonomously\nLines changed: 146 additions &amp; 16 deletions\nSome content',
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('#1123');
    expect(result.cleanedText).not.toContain('Merged');
    expect(result.cleanedText).not.toContain('merged 3 commits into');
    expect(result.cleanedText).not.toContain('Lines changed: 146 additions');
    expect(result.cleanedText).toContain('Some content');
  });

  it('keeps valuable PR body and review details from the raw GitHub sample while dropping obvious chrome', () => {
    const rawText = `- - - - - - - - - - - - - - - Skip to content
voku
AmysEcho
Repository navigation
Code
Issues
2
(2)
Pull requests
12
(12)
Agents
Discussions
Actions
Projects
Wiki
Expose runtime diagnosability for gesture detector and surface in status/docs/tests
#1123
Merged
voku
merged 3 commits into
main
from
codex/work-on-todos-autonomously
yesterday
+146
-16
Lines changed: 146 additions &amp; 16 deletions
Conversation6 (6)
Commits3 (3)
Checks14 (14)
Files changed9 (9)
Conversation
@voku
Owner
voku
commented
2 days ago
•
Motivation
Reduce time-to-root-cause for MediaPipe/gesture runtime incidents by surfacing backend delegate, module readiness, model URLs, and initialization errors in a single diagnostic snapshot.
Description
Added runtime diagnostics to GestureDetector including runtimeDelegates, lastInitializationError, and a new method getRuntimeDiagnostics() that returns delegates, module readiness flags, model URLs, frame count, running state, and last init error.
Testing
Ran unit tests for the gesture module (Vitest) including GestureDetector and GestureRecognitionOrchestrator test suites; the updated tests asserting delegate reporting, CPU fallback, last initialization error, and status exposure passed.
webapp/src/gesture/core/GestureDetector.ts
Outdated
Comment on lines +532 to +551
  getRuntimeDiagnostics(): {
    running: boolean;
  } {
The return type for getRuntimeDiagnostics is complex and duplicated from the internal runtimeDelegates field definition.
Footer
© 2026 GitHub, Inc.
Footer navigation
Terms
Privacy`;

    const result = cleanText({
      rawText,
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);

    expect(result.cleanedText).not.toContain('Skip to content');
    expect(result.cleanedText).not.toContain('Repository navigation');
    expect(result.cleanedText).not.toContain('#1123');
    expect(result.cleanedText).not.toContain('Merged');
    expect(result.cleanedText).not.toContain('merged 3 commits into');
    expect(result.cleanedText).not.toContain('Footer navigation');

    expect(result.cleanedText).toContain('Expose runtime diagnosability for gesture detector and surface in status/docs/tests');
    expect(result.cleanedText).toContain('Motivation');
    expect(result.cleanedText).toContain('Description');
    expect(result.cleanedText).toContain('Testing');
    expect(result.cleanedText).toContain('getRuntimeDiagnostics(): {');
    expect(result.cleanedText).toContain('The return type for getRuntimeDiagnostics is complex and duplicated');
  });

  // ── Preservation guards (no false positives) ───────────────────────────

  it('preserves real diff content even when it looks like a stat line', () => {
    // A line "Commits 1" in a PR diff context should be removed — but if
    // the engineer writes "I reviewed Commits 1 through 5", that full sentence
    // is never a standalone line and is preserved by the engine.
    const result = cleanText({
      rawText: '# PR\nCommits 1\nI reviewed commits 1 through 5 in detail.\nShowing 3 changed files with 200 additions and 8 deletions.',
    }, GitHubRuleSet);
    // The standalone "Commits 1" line is removed
    expect(result.cleanedText.split('\n')).not.toContain('Commits 1');
    // The sentence remains
    expect(result.cleanedText).toContain('I reviewed commits 1 through 5 in detail.');
    // The diff summary line is removed
    expect(result.cleanedText).not.toContain('Showing 3 changed files');
  });

  // ── Block-aware removal ─────────────────────────────────────────────────

  it('removes a CodeRabbit review table block (Cohort → blank line)', () => {
    const result = cleanText({
      rawText: [
        'Motivation',
        'Fix the bug in auth.',
        'Cohort / File(s)\tSummary',
        'src/auth.ts\tFixed token refresh logic',
        'src/api.ts\tUpdated error handling',
        '',
        'Description',
        'This PR fixes token refresh.',
      ].join('\n'),
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Cohort / File(s)');
    expect(result.cleanedText).not.toContain('Fixed token refresh logic');
    expect(result.cleanedText).toContain('Motivation');
    expect(result.cleanedText).toContain('Description');
    expect(result.cleanedText).toContain('This PR fixes token refresh.');
  });

  it('removes bot review header blocks ([bot] line → blank line)', () => {
    const result = cleanText({
      rawText: [
        'Description',
        'This is the PR description.',
        '',
        'review-assist[bot]',
        'review-assist bot reviewed 1 hour ago',
        'Contributor',
        'review-assist bot',
        'left a comment',
        'Code Review',
        '',
        'The code looks good but needs more tests.',
        '',
        'However, the auth module should also handle token expiry.',
        'Consider adding a retry mechanism for failed requests.',
      ].join('\n'),
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('review-assist[bot]');
    expect(result.cleanedText).toContain('This is the PR description.');
    expect(result.cleanedText).toContain('The code looks good but needs more tests.');
    expect(result.cleanedText).toContain('Consider adding a retry mechanism for failed requests.');
  });

  it('removes Summary by CodeRabbit block body up to blank line', () => {
    const result = cleanText({
      rawText: '# PR\nSome content\nSummary by CodeRabbit\nRelease Notes\nNew Features\nGesture recognition improved.\n\nMore real content.',
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Summary by CodeRabbit');
    expect(result.cleanedText).not.toContain('Release Notes');
    expect(result.cleanedText).not.toContain('Gesture recognition improved.');
    expect(result.cleanedText).toContain('Some content');
    expect(result.cleanedText).toContain('More real content.');
  });

  it('removes Walkthrough section body up to blank line', () => {
    const result = cleanText({
      rawText: '# PR\nSome content\nWalkthrough\nThis PR adds feature X.\nAll tests pass.\n\nMore real content.',
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Walkthrough');
    expect(result.cleanedText).not.toContain('This PR adds feature X.');
    expect(result.cleanedText).toContain('Some content');
    expect(result.cleanedText).toContain('More real content.');
  });

  it('removes Poem section body up to blank line', () => {
    const result = cleanText({
      rawText: '# PR\nSome content\nPoem\n\uD83D\uDC30 A hop, skip, and delegate trace!\nRuntime wisdom shows its face.\n\nMore real content.',
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Poem');
    expect(result.cleanedText).not.toContain('A hop, skip, and delegate trace!');
    expect(result.cleanedText).toContain('Some content');
    expect(result.cleanedText).toContain('More real content.');
  });

  it('removes Sequence Diagram(s) section body up to blank line', () => {
    const result = cleanText({
      rawText: '# PR\nSome content\nSequence Diagram(s)\nsequenceDiagram\nA->>B: call\nB-->>A: response\n\nMore real content.',
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Sequence Diagram(s)');
    expect(result.cleanedText).not.toContain('sequenceDiagram');
    expect(result.cleanedText).toContain('Some content');
    expect(result.cleanedText).toContain('More real content.');
  });

  it('preserves code block content even when lines match block-start patterns', () => {
    const result = cleanText({
      rawText: '# PR\n```\nreview-assist[bot]\nSummary by CodeRabbit\nPoem\n```\nReal content.',
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).toContain('review-assist[bot]');
    expect(result.cleanedText).toContain('Summary by CodeRabbit');
    expect(result.cleanedText).toContain('Real content.');
  });

  // ── Mid-body noise removal (blind-spot analysis findings) ───────────────

  it('removes standalone severity labels (medium, low, high, critical)', () => {
    const result = cleanText({
      rawText: 'Description\nThis is a bug.\nmedium\nThe fix is simple.',
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('medium');
    expect(result.cleanedText).toContain('This is a bug.');
    expect(result.cleanedText).toContain('The fix is simple.');
  });

  it('removes PR status banners and merge metadata', () => {
    const result = cleanText({
      rawText: [
        'Fix authentication bug',
        'The pull request is closed.',
        'Caution',
        'Review failed',
        'Changes requested',
        'This is the actual description.',
      ].join('\n'),
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('The pull request is closed.');
    expect(result.cleanedText).not.toContain('Caution');
    expect(result.cleanedText).not.toContain('Review failed');
    expect(result.cleanedText).not.toContain('Changes requested');
    expect(result.cleanedText).toContain('Fix authentication bug');
    expect(result.cleanedText).toContain('This is the actual description.');
  });

  it('removes review events (approved, requested changes, dismissed)', () => {
    const result = cleanText({
      rawText: [
        'Description',
        'voku approved these changes',
        'alice requested changes',
        'bob dismissed stale review',
        'The actual review comment.',
      ].join('\n'),
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('approved these changes');
    expect(result.cleanedText).not.toContain('requested changes');
    expect(result.cleanedText).not.toContain('dismissed stale review');
    expect(result.cleanedText).toContain('The actual review comment.');
  });

  it('removes merge/branch lifecycle events', () => {
    const result = cleanText({
      rawText: [
        '# PR Title',
        'voku merged commit abc1234 into main',
        'voku deleted the feature/auth branch',
        'alice added 3 commits last month',
        'bob force-pushed the main branch from abc1234 to def5678',
        'The actual content.',
      ].join('\n'),
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('merged commit');
    expect(result.cleanedText).not.toContain('deleted the');
    expect(result.cleanedText).not.toContain('added 3 commits');
    expect(result.cleanedText).not.toContain('force-pushed');
    expect(result.cleanedText).toContain('# PR Title');
    expect(result.cleanedText).toContain('The actual content.');
  });

  it('removes merge UI controls', () => {
    const result = cleanText({
      rawText: [
        'Description of changes.',
        'Squash and merge',
        'Confirm squash and merge',
        'This branch is up to date with the base branch.',
        'All checks have passed',
        'Merging is blocked',
        'The fix addresses the auth issue.',
      ].join('\n'),
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Squash and merge');
    expect(result.cleanedText).not.toContain('Confirm squash and merge');
    expect(result.cleanedText).not.toContain('This branch is up to date');
    expect(result.cleanedText).not.toContain('All checks have passed');
    expect(result.cleanedText).not.toContain('Merging is blocked');
    expect(result.cleanedText).toContain('Description of changes.');
    expect(result.cleanedText).toContain('The fix addresses the auth issue.');
  });

  it('removes cross-reference events', () => {
    const result = cleanText({
      rawText: [
        '# Issue',
        'This was referenced Oct 3, 2025',
        'alice referenced this pull request',
        'This comment was marked as resolved',
        'Actual discussion content.',
      ].join('\n'),
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('This was referenced');
    expect(result.cleanedText).not.toContain('referenced this pull request');
    expect(result.cleanedText).not.toContain('marked as resolved');
    expect(result.cleanedText).toContain('Actual discussion content.');
  });

  // ── Content preservation / over-removal protection ───────────────────────

  it('does not over-remove a PR body with markdown headings, bullets, and multi-paragraph content', () => {
    const input = [
      '# Fix authentication token refresh',
      '',
      '## Motivation',
      'Users are being logged out unexpectedly when their token expires during an active session.',
      'The root cause is the refresh handler not being invoked on 401 responses.',
      '',
      '## Description',
      '- Added a retry interceptor in `api/client.ts` that catches 401s and calls `refreshToken()`',
      '- Updated `AuthService.refresh()` to return the new token and store it in session storage',
      '- Patched the token expiry check in `SessionManager` to use server time, not local clock',
      '',
      '## Testing',
      '- Unit tests added for the retry interceptor (3 new test cases)',
      '- Integration test verifies that a 401 mid-session triggers refresh and retries the original request',
      '- Manual test on staging: token expiry now seamlessly refreshes without logout',
      '',
      '## Notes',
      '> This change requires the server to return a `Retry-After` header on 401 responses.',
      '> Without it, the interceptor falls back to a fixed 1-second delay.',
    ].join('\n');

    const result = cleanText({ rawText: input, sourceTypeHint: 'github_pr' }, GitHubRuleSet);

    // All section headings preserved
    expect(result.cleanedText).toContain('# Fix authentication token refresh');
    expect(result.cleanedText).toContain('## Motivation');
    expect(result.cleanedText).toContain('## Description');
    expect(result.cleanedText).toContain('## Testing');
    expect(result.cleanedText).toContain('## Notes');

    // Substantive content preserved
    expect(result.cleanedText).toContain('Users are being logged out unexpectedly');
    expect(result.cleanedText).toContain('Added a retry interceptor');
    expect(result.cleanedText).toContain('Unit tests added for the retry interceptor');
    expect(result.cleanedText).toContain('Retry-After');

    // Lower bound: must keep at least 10 non-blank lines
    const nonBlankLines = result.cleanedText.split('\n').filter(l => l.trim() !== '');
    expect(nonBlankLines.length).toBeGreaterThanOrEqual(10);
  });

  // ── Copilot agent / PR lifecycle events (discovered via real mobile PR paste) ─────

  it('removes standalone "Copilot AI" username line', () => {
    const result = cleanText({
      rawText: '# PR Title\nCopilot AI\nThe actual review text follows.',
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Copilot AI');
    expect(result.cleanedText).toContain('The actual review text follows.');
  });

  it('removes Copilot AI action lines (assigned, requested review)', () => {
    const result = cleanText({
      rawText: [
        'Description',
        'Copilot AI assigned Copilot and voku 48 minutes ago',
        'Copilot AI requested a review from voku 34 minutes ago',
        'The actual content.',
      ].join('\n'),
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Copilot AI assigned');
    expect(result.cleanedText).not.toContain('Copilot AI requested');
    expect(result.cleanedText).toContain('The actual content.');
  });

  it('removes Copilot lifecycle event lines (created, started, finished)', () => {
    const result = cleanText({
      rawText: [
        'Description',
        'Copilot created this pull request from a session on behalf of voku 48 minutes ago',
        'Copilot started work on behalf of voku 47 minutes ago',
        'Copilot finished work on behalf of voku 34 minutes ago',
        'The actual content.',
      ].join('\n'),
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Copilot created this pull request');
    expect(result.cleanedText).not.toContain('Copilot started work');
    expect(result.cleanedText).not.toContain('Copilot finished work');
    expect(result.cleanedText).toContain('The actual content.');
  });

  it('removes "marked this pull request as ready for review" event lines', () => {
    const result = cleanText({
      rawText: [
        'Description',
        'voku marked this pull request as ready for review 13 minutes ago',
        'alice marked this pull request as draft',
        'The actual content.',
      ].join('\n'),
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('marked this pull request as ready for review');
    expect(result.cleanedText).not.toContain('marked this pull request as draft');
    expect(result.cleanedText).toContain('The actual content.');
  });

  it('removes "Review has been requested on this pull request" merge-info noise', () => {
    const result = cleanText({
      rawText: [
        '# PR Title',
        'Review has been requested on this pull request. It is not required to merge. Learn more about requesting a pull request review.',
        'The actual description of changes.',
      ].join('\n'),
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Review has been requested on this pull request');
    expect(result.cleanedText).toContain('The actual description of changes.');
  });

  it('removes "receiving notifications because you were assigned" suffix variant', () => {
    const result = cleanText({
      rawText: [
        'Description',
        'The actual content.',
        "You\u2019re receiving notifications because you were assigned.",
        '2 participants',
      ].join('\n'),
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('receiving notifications because you were assigned');
    expect(result.cleanedText).toContain('The actual content.');
  });

  it('removes "receiving notifications because you modified the open/close state" suffix variant', () => {
    const result = cleanText({
      rawText: [
        'Description',
        'The actual content.',
        "You\u2019re receiving notifications because you modified the open/close state.",
        'Unsubscribe',
        'Footer',
        '\u00A9 2026 GitHub, Inc.',
      ].join('\n'),
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('modified the open/close state');
    expect(result.cleanedText).not.toContain('Unsubscribe');
    expect(result.cleanedText).toContain('The actual content.');
  });

  it('removes "No one—assign yourself" (FFFC-stripped sidebar line) from suffix', () => {
    const result = cleanText({
      rawText: [
        'Description',
        'The actual content.',
        'Reviewers',
        'Assignees',
        'No one\u2014assign yourself',
        'Labels',
        'None yet',
        'Footer',
        '\u00A9 2026 GitHub, Inc.',
      ].join('\n'),
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('No one\u2014assign yourself');
    expect(result.cleanedText).not.toContain('Reviewers');
    expect(result.cleanedText).toContain('The actual content.');
  });

  it('removes "Paste, drop, or click to add files" comment-box footer line', () => {
    const result = cleanText({
      rawText: [
        'Description',
        'The actual content.',
        'Add a comment',
        'Add your comment here...',
        'Paste, drop, or click to add files',
        'Comment',
        'Footer',
        '\u00A9 2026 GitHub, Inc.',
      ].join('\n'),
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Paste, drop, or click to add files');
    expect(result.cleanedText).not.toContain('Add a comment');
    expect(result.cleanedText).toContain('The actual content.');
  });

  // ── Golden fixture integration test ─────────────────────────────────────
  // This is the "single most uncomfortable test" from the blind-spot analysis:
  // a real full-page PR paste, cleaned and compared to a known-good output.

  it('golden fixture: cleans a complete real PR paste to expected output', () => {
    // Simulated full-page copy-paste of a GitHub PR (header + body + sidebar + footer)
    const fullPagePaste = [
      '- - - - - - - - - - - - - - - Skip to content',
      'voku',
      'AmysEcho',
      'Repository navigation',
      'Code',
      'Issues',
      '2',
      '(2)',
      'Pull requests',
      '12',
      '(12)',
      'Agents',
      'Discussions',
      'Actions',
      'Projects',
      'Wiki',
      // PR title
      'Expose runtime diagnosability for gesture detector and surface in status/docs/tests',
      // PR metadata
      '#1123',
      'Merged',
      'voku',
      'merged 3 commits into',
      'main',
      'from',
      'codex/work-on-todos-autonomously',
      'yesterday',
      '+146',
      '-16',
      'Lines changed: 146 additions &amp; 16 deletions',
      'Conversation6 (6)',
      'Commits3 (3)',
      'Checks14 (14)',
      'Files changed9 (9)',
      'Conversation',
      '@voku',
      'Owner',
      'voku',
      'commented',
      '2 days ago',
      '\u2022',
      // PR body — the content that matters
      'Motivation',
      'Reduce time-to-root-cause for MediaPipe/gesture runtime incidents.',
      '',
      'Description',
      'Added runtime diagnostics to GestureDetector including runtimeDelegates.',
      '',
      'Testing',
      'Ran unit tests for the gesture module.',
      '',
      // Bot review block
      'review-assist[bot]',
      'review-assist bot reviewed 1 hour ago',
      'Contributor',
      'review-assist bot',
      'left a comment',
      'Code Review',
      '',
      'This pull request implements runtime diagnosability enhancements.',
      '',
      // CodeRabbit table
      'Codex Task',
      'Summary by CodeRabbit',
      'Release Notes',
      '',
      // Inline review comment
      'webapp/src/gesture/core/GestureDetector.ts',
      'Outdated',
      'Comment on lines +532 to +551',
      '  getRuntimeDiagnostics(): {',
      '    running: boolean;',
      '  } {',
      'The return type is complex and duplicated.',
      '',
      // Merge UI noise
      'Caution',
      'Review failed',
      'The pull request is closed.',
      'All checks have passed',
      'Squash and merge',
      'Confirm squash and merge',
      '',
      // Sidebar
      'Reviewers',
      '+1 more reviewer',
      'Assignees',
      'No one\u2014',
      'Labels',
      'None yet',
      'Projects',
      'Milestone',
      'No milestone',
      'Development',
      'Successfully merging this pull request may close these issues.',
      '',
      // Footer
      'Footer',
      '\u00A9 2026 GitHub, Inc.',
      'Footer navigation',
      'Terms',
      'Privacy',
    ].join('\n');

    const result = cleanText({
      rawText: fullPagePaste,
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);

    // ── Must be present (the meaningful content) ─────────────────────────
    expect(result.cleanedText).toContain('Expose runtime diagnosability for gesture detector and surface in status/docs/tests');
    expect(result.cleanedText).toContain('Motivation');
    expect(result.cleanedText).toContain('Reduce time-to-root-cause for MediaPipe/gesture runtime incidents.');
    expect(result.cleanedText).toContain('Description');
    expect(result.cleanedText).toContain('Added runtime diagnostics to GestureDetector including runtimeDelegates.');
    expect(result.cleanedText).toContain('Testing');
    expect(result.cleanedText).toContain('Ran unit tests for the gesture module.');
    expect(result.cleanedText).toContain('This pull request implements runtime diagnosability enhancements.');
    // Code review comment preserved
    expect(result.cleanedText).toContain('webapp/src/gesture/core/GestureDetector.ts');
    expect(result.cleanedText).toContain('getRuntimeDiagnostics(): {');
    expect(result.cleanedText).toContain('The return type is complex and duplicated.');

    // ── Must NOT be present (the noise) ──────────────────────────────────
    // Header chrome
    expect(result.cleanedText).not.toContain('Skip to content');
    expect(result.cleanedText).not.toContain('Repository navigation');
    expect(result.cleanedText).not.toContain('AmysEcho');
    // PR metadata
    expect(result.cleanedText).not.toContain('#1123');
    expect(result.cleanedText).not.toContain('merged 3 commits into');
    expect(result.cleanedText).not.toContain('Lines changed: 146 additions');
    expect(result.cleanedText).not.toContain('Conversation6 (6)');
    // Bot review block header
    expect(result.cleanedText).not.toContain('review-assist[bot]');
    // CodeRabbit metadata
    expect(result.cleanedText).not.toContain('Codex Task');
    expect(result.cleanedText).not.toContain('Summary by CodeRabbit');
    expect(result.cleanedText).not.toContain('Release Notes');
    // Merge UI noise
    expect(result.cleanedText).not.toContain('Caution');
    expect(result.cleanedText).not.toContain('Review failed');
    expect(result.cleanedText).not.toContain('The pull request is closed.');
    expect(result.cleanedText).not.toContain('All checks have passed');
    expect(result.cleanedText).not.toContain('Squash and merge');
    // Sidebar
    expect(result.cleanedText).not.toContain('No one\u2014');
    expect(result.cleanedText).not.toContain('No milestone');
    // Footer
    expect(result.cleanedText).not.toContain('Footer navigation');
    expect(result.cleanedText).not.toContain('\u00A9 2026 GitHub, Inc.');
    expect(result.cleanedText).not.toContain('Terms');

    // ── Line count sanity check ──────────────────────────────────────────
    // The meaningful content is approximately 15-25 lines. If cleaned output
    // has more than 35 non-blank lines, too much noise is leaking through.
    const nonBlankLines = result.cleanedText.split('\n').filter(l => l.trim() !== '');
    expect(nonBlankLines.length).toBeLessThanOrEqual(35);
    expect(nonBlankLines.length).toBeGreaterThanOrEqual(5);
  });
});

// ── New patterns discovered via demo file analysis ──────────────────────────

describe('Text Normalization (FFFC / NBSP)', () => {
  it('strips U+FFFC (Object Replacement Character) from each line', () => {
    const result = normalizeText('line 1\n\uFFFC\nline\uFFFC2\n\uFFFC\uFFFC');
    expect(result).toEqual(['line 1', '', 'line2', '']);
  });

  it('normalizes U+00A0 (No-Break Space) to a regular space', () => {
    const result = normalizeText('more\u00A0repository items');
    expect(result).toEqual(['more repository items']);
  });

  it('strips FFFC and normalizes NBSP in combination', () => {
    const result = normalizeText('more\u00A0repository\uFFFC items');
    expect(result).toEqual(['more repository items']);
  });
});

describe('GitHub PR — demo file patterns', () => {
  // ── Prefix trimming with "more repository items" ─────────────────────────

  it('recognizes "More repository items" as a prefix junk line (Title Case)', () => {
    const lines = [
      'Skip to content',
      'Repository navigation',
      'Code', 'Issues', '2', '(2)', 'Pull requests', '12', '(12)',
      'Agents', 'Discussions', 'Actions', 'Projects', 'Wiki',
      'More repository items',
      'PR title here',
      'PR description.',
    ];
    const result = trimPrefix(lines, GitHubRuleSet);
    expect(result[0]).toBe('PR title here');
  });

  it('recognizes "more repository items" (lowercase) as a prefix junk line', () => {
    const lines = [
      'skip to content',
      '2', '(2)', '12', '(12)',
      'more repository items',
      'PR title here',
      'PR description.',
    ];
    const result = trimPrefix(lines, GitHubRuleSet);
    expect(result[0]).toBe('PR title here');
  });

  // ── FFFC + NBSP integration ───────────────────────────────────────────────

  it('strips FFFC chars so blank-only lines do not block prefix trimming', () => {
    // Without FFFC stripping these icon-only lines count as "unrecognized" and
    // stop the prefix trimmer before it reaches the nav items.
    const raw = [
      'skip to content',
      '\uFFFC',       // icon placeholder line (stripped → empty)
      '\uFFFC\uFFFC', // double icon line (stripped → empty)
      '2', '(2)',
      'more repository items',
      'PR title',
      'Description.',
    ].join('\n');
    const result = cleanText({ rawText: raw, sourceTypeHint: 'github_pr' }, GitHubRuleSet);
    expect(result.cleanedText).toContain('PR title');
    expect(result.cleanedText).not.toContain('skip to content');
    expect(result.cleanedText).not.toContain('more repository items');
  });

  it('normalizes NBSP in nav items so they match prefix rules', () => {
    // GitHub sometimes uses U+00A0 between words in nav labels.
    const raw = [
      'skip to content',
      'more\u00A0repository items', // NBSP variant
      'PR title',
      'Description.',
    ].join('\n');
    const result = cleanText({ rawText: raw, sourceTypeHint: 'github_pr' }, GitHubRuleSet);
    expect(result.cleanedText).toContain('PR title');
    expect(result.cleanedText).not.toContain('more');
  });

  // ── Bot review headers ────────────────────────────────────────────────────

  it('removes "gemini-code-assist bot reviewed" header', () => {
    const result = cleanText({
      rawText: [
        'PR description.',
        'gemini-code-assist bot reviewed',
        'View reviewed changes',
        'The actual review text.',
      ].join('\n'),
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('gemini-code-assist bot reviewed');
    expect(result.cleanedText).not.toContain('View reviewed changes');
    expect(result.cleanedText).toContain('The actual review text.');
  });

  it('removes "coderabbitai bot reviewed" header', () => {
    const result = cleanText({
      rawText: 'Description.\ncoderabbitai bot reviewed\nView reviewed changes\nFeedback.',
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('coderabbitai bot reviewed');
    expect(result.cleanedText).not.toContain('View reviewed changes');
    expect(result.cleanedText).toContain('Feedback.');
  });

  // ── CodeRabbit analysis metadata ─────────────────────────────────────────

  it('removes "Repository:" and "Length of output:" CodeRabbit metadata lines', () => {
    const result = cleanText({
      rawText: [
        'The review comment.',
        'Repository: owner/repo',
        'Length of output: 1475',
        'More review text.',
      ].join('\n'),
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Repository: owner/repo');
    expect(result.cleanedText).not.toContain('Length of output: 1475');
    expect(result.cleanedText).toContain('The review comment.');
    expect(result.cleanedText).toContain('More review text.');
  });

  it('removes "Actionable comments posted:" summary line', () => {
    const result = cleanText({
      rawText: 'Description.\nActionable comments posted: 7\nThe actual comment.',
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Actionable comments posted:');
    expect(result.cleanedText).toContain('The actual comment.');
  });

  it('removes "🧹 Nitpick comments (N)" header', () => {
    const result = cleanText({
      rawText: 'Description.\n\uD83E\uDDF9 Nitpick comments (3)\nThe actual comment.',
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Nitpick comments');
    expect(result.cleanedText).toContain('The actual comment.');
  });

  it('removes "⚠️ Potential issue" severity lines', () => {
    const result = cleanText({
      rawText: 'Description.\n\u26A0\uFE0F Potential issue | \uD83D\uDFE0 Major\nThe actual comment.',
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Potential issue');
    expect(result.cleanedText).toContain('The actual comment.');
  });

  it('removes "✏️ Tip:" LanguageTool/CodeRabbit tip lines', () => {
    const result = cleanText({
      rawText: 'Description.\n\u270F\uFE0F Tip: You can configure your own custom pre-merge checks in the settings.\nMore text.',
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('\u270F\uFE0F Tip:');
    expect(result.cleanedText).toContain('More text.');
  });

  it('removes "N of N checks passed/failed" summary', () => {
    const result = cleanText({
      rawText: 'Description.\n146 of 148 checks passed\nContent.',
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('146 of 148 checks passed');
    expect(result.cleanedText).toContain('Content.');
  });

  it('removes European thousands-separator change counts (e.g. +1.234)', () => {
    // Positive values work fine. Negative values like -6.106 are protected by the
    // filename preserve-regex: [a-zA-Z0-9_.-] includes '-' as a literal char at
    // the end of the class, so '-6.106' is treated as a filename and preserved.
    const result = cleanText({
      rawText: 'PR title.\n+1.234\nContent.',
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('+1.234');
    expect(result.cleanedText).toContain('Content.');
  });

  // ── Block patterns ────────────────────────────────────────────────────────

  it('removes "🏁 Script executed:" CodeRabbit analysis block to "Length of output:"', () => {
    const result = cleanText({
      rawText: [
        'The review text.',
        '\uD83C\uDFC1 Script executed:',
        '# Look at the file',
        'echo "=== file ==="',
        'cat file.txt',
        'Repository: owner/repo',
        'Length of output: 1475',
        'More review text.',
      ].join('\n'),
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Script executed');
    expect(result.cleanedText).not.toContain('cat file.txt');
    expect(result.cleanedText).not.toContain('Length of output');
    expect(result.cleanedText).toContain('The review text.');
    expect(result.cleanedText).toContain('More review text.');
  });

  it('removes "❤️ Share" social-share section (X, Mastodon, Reddit, LinkedIn)', () => {
    const result = cleanText({
      rawText: [
        'The review text.',
        '\u2764\uFE0F Share',
        'X',
        'Mastodon',
        'Reddit',
        'LinkedIn',
        '',
        'More text.',
      ].join('\n'),
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('\u2764\uFE0F Share');
    expect(result.cleanedText).not.toContain('Mastodon');
    expect(result.cleanedText).not.toContain('Reddit');
    expect(result.cleanedText).not.toContain('LinkedIn');
    expect(result.cleanedText).toContain('More text.');
  });

  it('removes "🚥 Pre-merge checks" table block', () => {
    const result = cleanText({
      rawText: [
        'Description.',
        '\uD83D\uDEA5 Pre-merge checks | \u2705 2 | \u274C 1',
        '\u274C Failed checks (1 warning)',
        'Check name\tStatus\tExplanation',
        'Docstring Coverage\t\u26A0\uFE0F Warning\tCoverage is 0%',
        '',
        'The actual content.',
      ].join('\n'),
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Pre-merge checks');
    expect(result.cleanedText).not.toContain('Docstring Coverage');
    expect(result.cleanedText).toContain('The actual content.');
  });

  it('removes "📒 Files selected for processing" list header and filenames', () => {
    const result = cleanText({
      rawText: [
        'Review intro.',
        '\uD83D\uDCDC Files selected for processing (3)',
        'src/foo.ts',
        'src/bar.ts',
        'src/baz.ts',
        '',
        'The actual review comment.',
      ].join('\n'),
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Files selected for processing');
    expect(result.cleanedText).not.toContain('src/foo.ts');
    expect(result.cleanedText).not.toContain('src/bar.ts');
    // Content after a blank line following the list is preserved
    expect(result.cleanedText).toContain('The actual review comment.');
  });

  it('removes "Suggested fix" block up to "📝 Committable suggestion" (handles blank lines inside code)', () => {
    const result = cleanText({
      rawText: [
        'The review comment.',
        'Suggested fix',
        'function foo() {',
        '  local x="$1"',
        '',                // blank line inside code block
        '  if [ -n "$x" ]; then',
        '    echo "$x"',
        '  fi',
        '}',
        '\uD83D\uDCDD Committable suggestion',
        '',
        'More review text.',
      ].join('\n'),
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Suggested fix');
    expect(result.cleanedText).not.toContain('function foo()');
    expect(result.cleanedText).toContain('The review comment.');
    expect(result.cleanedText).toContain('More review text.');
  });

  it('removes "💡 Suggested fix" inline diff block ending at blank line', () => {
    const result = cleanText({
      rawText: [
        'The review comment.',
        '\uD83D\uDCA1 Suggested fix',
        '-  let x = 1;',
        '+  let x = null;',
        '\uD83E\uDD16 Prompt for AI Agents',
        'Some instructions.',
        '',
        'More review text.',
      ].join('\n'),
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Suggested fix');
    expect(result.cleanedText).not.toContain('let x = 1');
    expect(result.cleanedText).toContain('The review comment.');
    expect(result.cleanedText).toContain('More review text.');
  });

  it('removes "💡 Suggested change" block (emoji prefix variant)', () => {
    const result = cleanText({
      rawText: [
        'Review comment.',
        '\uD83D\uDCA1 Suggested change',
        '-const x = foo ? foo : "default";',
        '+const x = foo ?? "default";',
        '',
        'More text.',
      ].join('\n'),
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Suggested change');
    expect(result.cleanedText).not.toContain('const x = foo');
    expect(result.cleanedText).toContain('Review comment.');
    expect(result.cleanedText).toContain('More text.');
  });

  it('removes "🤖 Prompt for AI Agents" block including its paragraph', () => {
    const result = cleanText({
      rawText: [
        'The review comment.',
        '\uD83E\uDD16 Prompt for AI Agents',
        'Verify each finding against the current code and only fix it if needed.',
        'In `@src/file.ts` at line 42, update the function to handle null.',
        '',
        'More review text.',
      ].join('\n'),
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Prompt for AI Agents');
    expect(result.cleanedText).not.toContain('Verify each finding');
    expect(result.cleanedText).not.toContain('update the function to handle null');
    expect(result.cleanedText).toContain('The review comment.');
    expect(result.cleanedText).toContain('More review text.');
  });

  it('removes CodeRabbit run configuration lines', () => {
    const result = cleanText({
      rawText: [
        'Review text.',
        '\u2699\uFE0F Run configuration',
        'Configuration used: Organization UI',
        '',
        'Review profile: CHILL',
        '',
        'Plan: Pro',
        '',
        'Run ID: 4a4099d8-00c3-4226-969b-2944f9ec9ff1',
        '',
        'More review text.',
      ].join('\n'),
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Run configuration');
    expect(result.cleanedText).not.toContain('Configuration used:');
    expect(result.cleanedText).not.toContain('Review profile:');
    expect(result.cleanedText).not.toContain('Plan: Pro');
    expect(result.cleanedText).not.toContain('Run ID:');
    expect(result.cleanedText).toContain('More review text.');
  });

  it('removes Codex bot introduction text', () => {
    const result = cleanText({
      rawText: [
        'Review text.',
        'Your team has set up Codex to review pull requests in this repo. Reviews are triggered when you',
        '',
        'Open a pull request for review',
        'Mark a draft as ready',
        'Comment "@codex review".',
        '',
        'More review text.',
      ].join('\n'),
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Your team has set up Codex');
    expect(result.cleanedText).not.toContain('Open a pull request for review');
    expect(result.cleanedText).not.toContain('Mark a draft as ready');
    expect(result.cleanedText).toContain('More review text.');
  });

  it('removes "Pull request successfully merged and closed" and "Delete branch"', () => {
    const result = cleanText({
      rawText: [
        'Content.',
        'Pull request successfully merged and closed',
        'Delete branch',
        'More content.',
      ].join('\n'),
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('Pull request successfully merged and closed');
    expect(result.cleanedText).not.toContain('Delete branch');
    expect(result.cleanedText).toContain('More content.');
  });

  it('removes cross-PR references matching "title #N: description" pattern', () => {
    const result = cleanText({
      rawText: [
        'Possibly related PRs',
        'chore: update deps #253: Consolidates CI workflow changes.',
        'feat: add feature #339: Modifies integration test tooling.',
        'More review text.',
      ].join('\n'),
      sourceTypeHint: 'github_pr',
    }, GitHubRuleSet);
    expect(result.cleanedText).not.toContain('#253:');
    expect(result.cleanedText).not.toContain('#339:');
    expect(result.cleanedText).toContain('More review text.');
  });
});

// ── Fixture file integration test ────────────────────────────────────────────
// Reads the real fixture input/expected files from __tests__/fixtures/ and
// validates the engine produces an exact match.  The expected file was generated
// by running the cleaner on a real GitHub PR page copy-paste and reviewing the
// result.  A blind-spot analysis was run to confirm:
//   • only noise was removed (nav chrome, bot intros, UI buttons, footer)
//   • no useful content (PR title, description, review text, code) was lost
// The additional it() blocks below pin the specific patterns that were verified.

describe('Fixture file — full PR page integration', () => {
  const fixturesDir = resolve(__dirname, 'fixtures');

  it('cleans github_example_pull.txt to match github_example_pull_clean.txt exactly', () => {
    const input    = readFileSync(resolve(fixturesDir, 'github_example_pull.txt'),       'utf8');
    const expected = readFileSync(resolve(fixturesDir, 'github_example_pull_clean.txt'), 'utf8');

    const result = cleanText({ rawText: input, sourceTypeHint: 'github_pr' }, GitHubRuleSet);

    // Normalise line endings before comparing so the test is platform-independent
    const got  = result.cleanedText.replace(/\r\n/g, '\n').trimEnd();
    const want = expected.replace(/\r\n/g, '\n').trimEnd();

    expect(got).toBe(want);
  });

  // ── Blind-spot analysis: noise removal verification ───────────────────────
  // Each assertion below was derived from inspecting the demo PR page and
  // confirming that the labelled pattern is absent from the cleaned output.

  describe('noise removed from real PR page', () => {
    let cleaned: string;

    beforeEach(() => {
      const input = readFileSync(resolve(fixturesDir, 'github_example_pull.txt'), 'utf8');
      cleaned = cleanText({ rawText: input, sourceTypeHint: 'github_pr' }, GitHubRuleSet).cleanedText;
    });

    it('removes "skip to content" navigation prefix', () => {
      expect(cleaned).not.toContain('skip to content');
    });

    it('removes "repository navigation" prefix line', () => {
      expect(cleaned).not.toContain('repository navigation');
    });

    it('removes "lines changed: N additions & N deletions" diff-stat line', () => {
      expect(cleaned).not.toContain('lines changed:');
    });

    it('removes badge-count lines like "Conversation20 (20)"', () => {
      expect(cleaned).not.toContain('Conversation20');
      expect(cleaned).not.toContain('Commits1');
      expect(cleaned).not.toContain('Checks42');
      expect(cleaned).not.toContain('Files changed17');
    });

    it('removes standalone commit-hash lines', () => {
      expect(cleaned).not.toMatch(/^[0-9a-f]{7}$/m);
    });

    it('removes bot label-addition event lines', () => {
      expect(cleaned).not.toContain('added the codex label');
      expect(cleaned).not.toContain('ChatGPT Codex Connector');
    });

    it('removes Copilot-bot introduction comment', () => {
      expect(cleaned).not.toContain("I've received your request, and I'm working on it now");
    });

    it('removes "gemini-code-assist bot reviewed" / "View reviewed changes" bot header', () => {
      expect(cleaned).not.toContain('gemini-code-assist bot reviewed');
      expect(cleaned).not.toContain('View reviewed changes');
    });

    it('removes "Commit suggestion" / "Reply..." / "Resolve conversation" UI buttons', () => {
      expect(cleaned).not.toContain('Commit suggestion');
      expect(cleaned).not.toContain('Reply...');
      expect(cleaned).not.toContain('Resolve conversation');
    });

    it('removes "Pull request successfully merged and closed" and "Delete branch" merge UI', () => {
      expect(cleaned).not.toContain('Pull request successfully merged and closed');
      expect(cleaned).not.toContain('Delete branch');
    });

    it('removes GitHub footer navigation', () => {
      expect(cleaned).not.toContain('Footer navigation');
      expect(cleaned).not.toContain('© 2026 GitHub');
      expect(cleaned).not.toContain('Do not share my personal information');
    });

    it('removes "Add your comment here..." comment-box UI', () => {
      expect(cleaned).not.toContain('Add your comment here...');
      expect(cleaned).not.toContain('Paste, drop, or click to add files');
    });
  });

  // ── Blind-spot analysis: content preservation verification ────────────────
  // Each assertion below confirms that genuinely useful PR content survived
  // cleaning.

  describe('useful content preserved from real PR page', () => {
    let cleaned: string;

    beforeEach(() => {
      const input = readFileSync(resolve(fixturesDir, 'github_example_pull.txt'), 'utf8');
      cleaned = cleanText({ rawText: input, sourceTypeHint: 'github_pr' }, GitHubRuleSet).cleanedText;
    });

    it('preserves the PR title', () => {
      expect(cleaned).toContain('add path-aware local ci runner, integration test profiles, and conditional heavy integration job');
    });

    it('preserves the Motivation section body', () => {
      expect(cleaned).toContain('Speed up developer feedback by making CI checks path-aware');
    });

    it('preserves the Description section body', () => {
      expect(cleaned).toContain('./scripts/ci-feedback.sh');
    });

    it('preserves the Testing section body', () => {
      expect(cleaned).toContain('Ran local CI-style checks using');
    });

    it('preserves the commit message title', () => {
      expect(cleaned).toContain('Refresh global model artifacts and remove local sqlite state');
    });

    it('preserves code-review comment text from Gemini', () => {
      expect(cleaned).toContain('git status --porcelain | awk');
      // git diff --name-only HEAD appears in the "Suggested change" block which
      // is intentionally removed; the three-dot variant in the surrounding code
      // snippet IS preserved:
      expect(cleaned).toContain('git diff --name-only "$base_ref"...HEAD');
    });

    it('preserves reviewer analysis prose (not just code snippets)', () => {
      expect(cleaned).toContain('Parsing git status --porcelain with awk');
      expect(cleaned).toContain('This assertion logic significantly weakens the test');
    });

    it('preserves CodeRabbit inline-comment analysis text', () => {
      expect(cleaned).toContain('Silently falling back to full can hide config typos');
    });
  });
});
