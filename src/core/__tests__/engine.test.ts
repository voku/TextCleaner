import { describe, it, expect } from 'vitest';
import { cleanText, normalizeText, trimPrefix, trimSuffix, cleanMiddle, collapseBlankLines } from '../engine';
import { GenericRuleSet } from '../rules/generic';
import { GitHubRuleSet } from '../rules/github';

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

gemini-code-assist[bot]
gemini-code-assist bot reviewed 1 hour ago
Contributor
gemini-code-assist bot
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
@gemini-code-assist
gemini-code-assist bot
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
🔀 Gemini Dispatch / debugger (pull_request_review)
🔀 Gemini Dispatch / debugger (pull_request_review)Skipped 1 hour ago
🔀 Gemini Dispatch / debugger (pull_request)
🔀 Gemini Dispatch / debugger (pull_request)Skipped 1 hour ago
🔀 Gemini Dispatch / dispatch (pull_request_review)
🔀 Gemini Dispatch / dispatch (pull_request_review)Skipped 1 hour ago
🔀 Gemini Dispatch / fallthrough (pull_request_review)
🔀 Gemini Dispatch / fallthrough (pull_request_review)Skipped 1 hour ago
🔀 Gemini Dispatch / fallthrough (pull_request)
🔀 Gemini Dispatch / fallthrough (pull_request)Skipped 1 hour ago
🔀 Gemini Dispatch / invoke (pull_request_review)
🔀 Gemini Dispatch / invoke (pull_request_review)Skipped 1 hour ago
🔀 Gemini Dispatch / invoke (pull_request)
🔀 Gemini Dispatch / invoke (pull_request)Skipped 1 hour ago
🔀 Gemini Dispatch / plan-execute (pull_request_review)
🔀 Gemini Dispatch / plan-execute (pull_request_review)Skipped 1 hour ago
🔀 Gemini Dispatch / plan-execute (pull_request)
🔀 Gemini Dispatch / plan-execute (pull_request)Skipped 1 hour ago
🔀 Gemini Dispatch / review (pull_request_review)
🔀 Gemini Dispatch / review (pull_request_review)Skipped 1 hour ago
🔀 Gemini Dispatch / triage (pull_request_review)
🔀 Gemini Dispatch / triage (pull_request_review)Skipped 1 hour ago
🔀 Gemini Dispatch / triage (pull_request)
🔀 Gemini Dispatch / triage (pull_request)Skipped 1 hour ago
neutral checks
Mend Security Check
Mend Security Check — Security Report
successful checks
🔀 Gemini Dispatch / dispatch (pull_request)
🔀 Gemini Dispatch / dispatch (pull_request)Successful in 5s
🔀 Gemini Dispatch / review / review (pull_request)
🔀 Gemini Dispatch / review / review (pull_request)Successful in 7s
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
@gemini-code-assist
gemini-code-assist[bot]

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

gemini-code-assist[bot]
gemini-code-assist bot reviewed 16 minutes ago
Contributor
gemini-code-assist bot
left a comment
Code Review
This pull request strengthens split-manifest validation and integrates held-out signer metrics into few-shot trial reports. Key additions include logic for loading model artifacts and evaluating them against a test pool. Feedback highlights a critical issue where path resolution might fail if a non-default data directory is used, as well as opportunities to improve evaluation logic by excluding training examples and optimizing performance by moving redundant manifest processing out of the inner loop.

server/src/amyserver_tools/train_mlp_fewshot.py
    with tempfile.TemporaryDirectory(prefix="amy-fewshot-heldout-") as temp_dir:
        temp_manifest = Path(temp_dir) / "heldout_test_manifest.json"
        temp_manifest.write_text(json.dumps({"entries": test_pool}, indent=2), encoding="utf-8")
        test_samples, _ = build_samples_from_manifest(temp_manifest, skip_examples=skip_examples)
Contributor
@gemini-code-assist
gemini-code-assist bot
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
@gemini-code-assist
gemini-code-assist bot
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
🔀 Gemini Dispatch / debugger (pull_request_review)
🔀 Gemini Dispatch / debugger (pull_request_review)Skipped 13 minutes ago
🔀 Gemini Dispatch / debugger (pull_request)
🔀 Gemini Dispatch / debugger (pull_request)Skipped 18 minutes ago
🔀 Gemini Dispatch / dispatch (pull_request_review)
🔀 Gemini Dispatch / dispatch (pull_request_review)Skipped 13 minutes ago
🔀 Gemini Dispatch / fallthrough (pull_request_review)
🔀 Gemini Dispatch / fallthrough (pull_request_review)Skipped 13 minutes ago
🔀 Gemini Dispatch / fallthrough (pull_request)
🔀 Gemini Dispatch / fallthrough (pull_request)Skipped 18 minutes ago
🔀 Gemini Dispatch / invoke (pull_request_review)
🔀 Gemini Dispatch / invoke (pull_request_review)Skipped 13 minutes ago
🔀 Gemini Dispatch / invoke (pull_request)
🔀 Gemini Dispatch / invoke (pull_request)Skipped 18 minutes ago
🔀 Gemini Dispatch / plan-execute (pull_request_review)
🔀 Gemini Dispatch / plan-execute (pull_request_review)Skipped 13 minutes ago
🔀 Gemini Dispatch / plan-execute (pull_request)
🔀 Gemini Dispatch / plan-execute (pull_request)Skipped 18 minutes ago
🔀 Gemini Dispatch / review (pull_request_review)
🔀 Gemini Dispatch / review (pull_request_review)Skipped 13 minutes ago
🔀 Gemini Dispatch / triage (pull_request_review)
🔀 Gemini Dispatch / triage (pull_request_review)Skipped 13 minutes ago
🔀 Gemini Dispatch / triage (pull_request)
🔀 Gemini Dispatch / triage (pull_request)Skipped 18 minutes ago
neutral checks
Mend Security Check
Mend Security Check — Security Report
successful checks
🔀 Gemini Dispatch / dispatch (pull_request)
🔀 Gemini Dispatch / dispatch (pull_request)Successful in 7s
🔀 Gemini Dispatch / review / review (pull_request)
🔀 Gemini Dispatch / review / review (pull_request)Successful in 6s
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
@gemini-code-assist
gemini-code-assist[bot]

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
  });
});
