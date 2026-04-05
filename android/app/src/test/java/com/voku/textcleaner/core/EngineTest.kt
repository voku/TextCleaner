package com.voku.textcleaner.core

import com.voku.textcleaner.core.rules.GenericRuleSet
import com.voku.textcleaner.core.rules.GitHubRuleSet
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Kotlin parity tests for the cleanup engine.
 * Every test here mirrors a test in `src/core/__tests__/engine.test.ts`.
 */
class EngineTest {

    // ── Text Normalization ──────────────────────────────────────────────

    @Test
    fun `normalizes line endings and trims whitespace`() {
        val input = "  \r\nLine 1\r\nLine 2\nLine 3  \n"
        val result = Engine.normalizeText(input)
        assertEquals(listOf("Line 1", "Line 2", "Line 3"), result)
    }

    // ── Prefix Trimming ─────────────────────────────────────────────────

    @Test
    fun `removes exact match prefix lines`() {
        val lines = listOf("Skip to content", "Sign in", "Actual content", "More content")
        val result = Engine.trimPrefix(lines, GenericRuleSet)
        assertEquals(listOf("Actual content", "More content"), result)
    }

    @Test
    fun `stops at preserved lines`() {
        val lines = listOf("Skip to content", "# Heading", "Sign in", "Content")
        val result = Engine.trimPrefix(lines, GenericRuleSet)
        assertEquals(listOf("# Heading", "Sign in", "Content"), result)
    }

    // ── Suffix Trimming ─────────────────────────────────────────────────

    @Test
    fun `removes exact match suffix lines`() {
        val lines = listOf("Content", "More content", "Terms", "Privacy")
        val result = Engine.trimSuffix(lines, GenericRuleSet)
        assertEquals(listOf("Content", "More content"), result)
    }

    @Test
    fun `removes regex match suffix lines`() {
        val lines = listOf("Content", "\u00A9 2024 Company Inc.", "All rights reserved")
        val result = Engine.trimSuffix(lines, GenericRuleSet)
        assertEquals(listOf("Content"), result)
    }

    // ── Middle Cleanup ──────────────────────────────────────────────────

    @Test
    fun `removes exact match anywhere lines`() {
        val lines = listOf("Content", "Advertisement", "More content")
        val result = Engine.cleanMiddle(lines, GenericRuleSet)
        assertEquals(listOf("Content", "More content"), result)
    }

    @Test
    fun `removes contains anywhere lines`() {
        val lines = listOf("Content", "Please Subscribe to our newsletter today", "More content")
        val result = Engine.cleanMiddle(lines, GenericRuleSet)
        assertEquals(listOf("Content", "More content"), result)
    }

    // ── Blank Line Collapsing ───────────────────────────────────────────

    @Test
    fun `collapses multiple blank lines into one`() {
        val lines = listOf("Line 1", "", "", "", "Line 2", "", "Line 3")
        val result = Engine.collapseBlankLines(lines)
        assertEquals(listOf("Line 1", "", "Line 2", "", "Line 3"), result)
    }

    @Test
    fun `trims leading and trailing blank lines`() {
        val lines = listOf("", "", "Line 1", "", "Line 2", "", "")
        val result = Engine.collapseBlankLines(lines)
        assertEquals(listOf("Line 1", "", "Line 2"), result)
    }

    // ── Source Detection ────────────────────────────────────────────────

    @Test
    fun `detects documentation content`() {
        val detected = Detector.detectSourceType(
            """# API Reference
            |
            |This documentation explains the deployment flow in detail.
            |
            |- install dependencies
            |- build the project
            |- deploy the static site""".trimMargin()
        )
        assertEquals(SourceType.DOCS, detected)
    }

    @Test
    fun `detects article content`() {
        val detected = Detector.detectSourceType(
            """# Why clean copied text before prompting
            |
            |Clean input reduces irrelevant context and makes summaries more reliable across long-form article content that has already been stripped of chrome.
            |
            |This article explains how curated excerpts help with better downstream reviews and summaries.""".trimMargin()
        )
        assertEquals(SourceType.ARTICLE, detected)
    }

    @Test
    fun `detects chat transcripts`() {
        val detected = Detector.detectSourceType(
            """John Doe 10:42 AM
            |Can you review the cleaned output?
            |Jane Smith 10:43 AM
            |Yes — send it over.
            |Alex Roe 10:44 AM
            |I will post the link in the channel.""".trimMargin()
        )
        assertEquals(SourceType.CHAT, detected)
    }

    // ── Markdown Output ─────────────────────────────────────────────────

    @Test
    fun `creates a markdown heading for cleaned content`() {
        val markdown = Engine.generateMarkdown("First line\nSecond line", SourceType.ARTICLE)
        assertEquals("# Cleaned Article Excerpt\n\nFirst line\nSecond line", markdown)
    }

    @Test
    fun `formats chat lines as markdown bullets`() {
        val markdown = Engine.generateMarkdown(
            "John Doe 10:42 AM\nPlease review this.\n\nJane Smith 10:43 AM",
            SourceType.CHAT,
        )
        assertEquals(
            "# Cleaned Chat Excerpt\n\n- John Doe 10:42 AM\n- Please review this.\n\n- Jane Smith 10:43 AM",
            markdown,
        )
    }

    @Test
    fun `does not corrupt code fences in non-chat markdown output`() {
        val input = "## Summary\n\nHere is the snippet:\n\n```javascript\nconst x = 1;\n```\n\nEnd of doc."
        val markdown = Engine.generateMarkdown(input, SourceType.DOCS)

        assertTrue(markdown.contains("```javascript"))
        assertTrue(markdown.contains("const x = 1;"))
        assertTrue(markdown.contains("```\n\nEnd of doc."))
    }

    @Test
    fun `does not corrupt code fences in chat markdown output`() {
        // Blind spot fix: normalizeMarkdownBody previously prepended "- " to fence
        // lines, breaking the markdown code block entirely.
        val input = "Alice 10:00 AM\nHere is my code:\n```js\nconst x = 1;\n```\nLooks good?"
        val markdown = Engine.generateMarkdown(input, SourceType.CHAT)

        // Fence lines must be preserved verbatim — not wrapped in "- "
        assertTrue(markdown.contains("```js\n"))
        assertTrue(markdown.contains("\n```"))
        // Code body must not be bullet-prefixed
        assertFalse(markdown.contains("- const x = 1;"))
        // Code body must appear verbatim
        assertTrue(markdown.contains("const x = 1;"))
        // Regular chat lines before and after are still bulleted
        assertTrue(markdown.contains("- Alice 10:00 AM"))
        assertTrue(markdown.contains("- Looks good?"))
    }

    // ── Code Block Preservation ─────────────────────────────────────────

    @Test
    fun `preserves both opening and closing fences in the cleaned output`() {
        val rawText = """
Skip to content
```javascript
const x = 1;
```
Terms
        """
        val result = Engine.cleanText(RawInput(rawText = rawText, sourceTypeHint = SourceType.GENERIC), ruleSetOverride = GenericRuleSet)
        assertTrue(result.cleanedText.contains("```javascript"))
        assertTrue(result.cleanedText.contains("const x = 1;"))
        // Closing fence must survive
        val closingFences = result.cleanedText.lines().count { it.trim() == "```" }
        assertEquals(1, closingFences)
        // Suffix junk stripped
        assertFalse(result.cleanedText.contains("Terms"))
    }

    @Test
    fun `removes junk outside code block but preserves junk-matching lines inside it`() {
        val rawText = """
# PR title
Reply
```python
Reply
left a comment
Copy link
print("hello")
```
Copy link
        """
        val result = Engine.cleanText(RawInput(rawText = rawText, sourceTypeHint = SourceType.GITHUB_PR), ruleSetOverride = GitHubRuleSet)
        val codeStart = result.cleanedText.indexOf("```python")
        val codeEnd = result.cleanedText.lastIndexOf("```") + 3
        val codeSection = result.cleanedText.substring(codeStart, codeEnd)
        // Lines inside the code block preserved
        assertTrue(codeSection.contains("Reply"))
        assertTrue(codeSection.contains("left a comment"))
        assertTrue(codeSection.contains("Copy link"))
        // Same tokens outside the code block are removed
        val beforeCode = result.cleanedText.substring(0, codeStart)
        assertFalse(beforeCode.contains("Reply"))
        val afterCode = result.cleanedText.substring(codeEnd)
        assertFalse(afterCode.contains("Copy link"))
    }

    @Test
    fun `handles multiple code blocks with junk between them`() {
        val rawText = """
# Docs
```js
const a = 1;
```
Advertisement
```ts
const b: number = 2;
```
        """
        val result = Engine.cleanText(RawInput(rawText = rawText, sourceTypeHint = SourceType.GENERIC), ruleSetOverride = GenericRuleSet)
        assertTrue(result.cleanedText.contains("```js"))
        assertTrue(result.cleanedText.contains("const a = 1;"))
        assertTrue(result.cleanedText.contains("```ts"))
        assertTrue(result.cleanedText.contains("const b: number = 2;"))
        // Junk between the two blocks is removed
        assertFalse(result.cleanedText.contains("Advertisement"))
    }

    @Test
    fun `unclosed code block preserves all subsequent lines`() {
        val rawText = """
# Title
Intro text
```python
import os
left a comment
Reply
Copy link
        """
        val result = Engine.cleanText(RawInput(rawText = rawText, sourceTypeHint = SourceType.GENERIC), ruleSetOverride = GenericRuleSet)
        assertTrue(result.cleanedText.contains("```python"))
        assertTrue(result.cleanedText.contains("import os"))
        // These would normally be removed but are inside the unclosed code block
        assertTrue(result.cleanedText.contains("left a comment"))
        assertTrue(result.cleanedText.contains("Reply"))
        assertTrue(result.cleanedText.contains("Copy link"))
    }

    @Test
    fun `trimPrefix stops at an opening code fence`() {
        val lines = listOf("Skip to content", "Navigation Menu", "```javascript", "const x = 1;", "```")
        val result = Engine.trimPrefix(lines, GitHubRuleSet)
        // Everything from the fence onwards must survive
        assertEquals("```javascript", result[0])
        assertTrue(result.contains("const x = 1;"))
        assertEquals("```", result[result.size - 1])
    }

    @Test
    fun `trimSuffix stops at a closing code fence`() {
        val lines = listOf("Real content", "```js", "const y = 2;", "```", "Terms", "Privacy")
        val result = Engine.trimSuffix(lines, GitHubRuleSet)
        // Junk after the closing fence removed
        assertFalse(result.contains("Terms"))
        assertFalse(result.contains("Privacy"))
        // The fence and its content must survive
        assertTrue(result.contains("```js"))
        assertTrue(result.contains("const y = 2;"))
        assertEquals("```", result[result.size - 1])
    }

    @Test
    fun `standalone diff-stat lines outside code block are removed by GitHub rules`() {
        val lines = listOf("```diff", "+1", "-1", "```", "+200", "-95")
        val result = Engine.cleanMiddle(lines, GitHubRuleSet)
        // Inside the code block: preserved
        assertTrue(result.contains("+1"))
        assertTrue(result.contains("-1"))
        // Outside: stripped
        assertFalse(result.contains("+200"))
        assertFalse(result.contains("-95"))
    }

    // ── Full Cleanup Engine ─────────────────────────────────────────────

    @Test
    fun `preserves code blocks entirely`() {
        val rawText = """
Header
Some intro text
```javascript
// A comment
const x = 1;
Tweet
Share on Facebook
console.log(x);
```
Footer
        """
        val result = Engine.cleanText(RawInput(rawText = rawText, sourceTypeHint = SourceType.GENERIC))
        assertTrue(result.cleanedText.contains("Tweet"))
        assertTrue(result.cleanedText.contains("Share on Facebook"))
        assertTrue(result.cleanedText.contains("```javascript"))
    }

    @Test
    fun `cleans a generic article`() {
        val rawText = """
Skip to content
Menu
# My Article
This is the content.
Advertisement
More content.
Subscribe to our newsletter
Footer
Terms
        """
        val result = Engine.cleanText(RawInput(rawText = rawText), ruleSetOverride = GenericRuleSet)
        assertEquals("# My Article\nThis is the content.\nMore content.", result.cleanedText)
    }

    @Test
    fun `skips intensive rules for texts over 100000 characters`() {
        val largeTextChunk = "This is a normal line.\nSubscribe to our newsletter\n"
        val rawText = largeTextChunk.repeat(2500) // > 100k chars

        val result = Engine.cleanText(RawInput(rawText = rawText, sourceTypeHint = SourceType.GENERIC))
        assertTrue(result.cleanedText.contains("Subscribe to our newsletter"))
    }

    @Test
    fun `applies intensive rules for texts under 100000 characters`() {
        val rawText = "This is a normal line.\nSubscribe to our newsletter\n"
        val result = Engine.cleanText(RawInput(rawText = rawText, sourceTypeHint = SourceType.GENERIC))
        assertFalse(result.cleanedText.contains("Subscribe to our newsletter"))
    }

    @Test
    fun `cleans a GitHub PR`() {
        val rawText = """
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
        """
        val result = Engine.cleanText(RawInput(rawText = rawText), ruleSetOverride = GitHubRuleSet)
        assertEquals(
            "# Fix the bug\nThis PR fixes the bug.\nFiles changed\n1\nCommits\n2\nReview\nrequested changes",
            result.cleanedText,
        )
    }

    @Test
    fun `cleans documentation-specific chrome`() {
        val result = Engine.cleanText(
            RawInput(
                rawText = """
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
                """,
                sourceTypeHint = SourceType.DOCS,
            ),
        )
        assertEquals(
            "# Deploying TextCleaner\nRun npm run build before publishing.\n\n## Build output\nThe generated files are written to dist.",
            result.cleanedText,
        )
    }

    @Test
    fun `cleans article-specific chrome`() {
        val result = Engine.cleanText(
            RawInput(
                rawText = """
Latest
8 min read
# Why clean copied text before prompting
Clean input reduces irrelevant context.

Related articles
Sign up for our newsletter
Continue reading
                """,
                sourceTypeHint = SourceType.ARTICLE,
            ),
        )
        assertEquals(
            "# Why clean copied text before prompting\nClean input reduces irrelevant context.",
            result.cleanedText,
        )
    }

    @Test
    fun `cleans chat-specific chrome`() {
        val result = Engine.cleanText(
            RawInput(
                rawText = """
Messages
Jump to present
Today
John Doe 10:42 AM
Can you review the cleaned output?
Jane Smith 10:43 AM
Yes — send it over.
Reply in thread
Typing…
                """,
                sourceTypeHint = SourceType.CHAT,
            ),
        )
        assertEquals(
            "John Doe 10:42 AM\nCan you review the cleaned output?\nJane Smith 10:43 AM\nYes \u2014 send it over.",
            result.cleanedText,
        )
    }

    @Test
    fun `cleans a real GitHub PR sample`() {
        val rawText = """
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
${'$'}BULLET 
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
${'$'}BULLET 
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

Some comments are outside the diff and can't be posted inline due to platform limitations.

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
You're receiving notifications because you were mentioned.
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
        """.replace("\$BULLET", "\u2022")

        val result = Engine.cleanText(RawInput(rawText = rawText), ruleSetOverride = GitHubRuleSet)

        // Check that the title and description are preserved
        assertTrue(result.cleanedText.contains("Expose runtime diagnosability for gesture detector and surface in status/docs/tests"))
        assertTrue(result.cleanedText.contains("Reduce time-to-root-cause for MediaPipe/gesture runtime incidents"))

        // Check that the footer junk is removed
        assertFalse(result.cleanedText.contains("\u00A9 2026 GitHub, Inc."))
        assertFalse(result.cleanedText.contains("Footer navigation"))
        assertFalse(result.cleanedText.contains("Contact"))

        // Check that the top navigation is removed
        assertFalse(result.cleanedText.contains("Repository navigation"))
        assertFalse(result.cleanedText.contains("Wiki"))

        // Check that specific noisy lines are removed
        assertFalse(result.cleanedText.contains("Conversation6 (6)"))
        assertFalse(result.cleanedText.contains("Commits1 (1)"))
        assertFalse(result.cleanedText.contains("Checks42 (42)"))
        assertFalse(result.cleanedText.contains("Files changed9 (9)"))
        assertFalse(result.cleanedText.contains("Lines changed: 142 additions & 15 deletions"))
        assertFalse(result.cleanedText.contains("wants to merge 1 commit into"))
        assertFalse(result.cleanedText.contains("1 hour ago"))
        assertFalse(result.cleanedText.contains("\u2022"))
        assertFalse(result.cleanedText.contains("left a comment"))
        assertFalse(result.cleanedText.contains("Code Review"))
        assertFalse(result.cleanedText.contains("Walkthrough"))
        assertFalse(result.cleanedText.contains("Changes"))
        assertFalse(result.cleanedText.contains("Estimated code review effort"))
        assertFalse(result.cleanedText.contains("Possibly related PRs"))
        assertFalse(result.cleanedText.contains("\uD83D\uDCA1 Codex Review"))
        assertFalse(result.cleanedText.contains("Here are some automated review suggestions for this pull request."))
        assertFalse(result.cleanedText.contains("\u2139\uFE0F About Codex in GitHub"))
        assertFalse(result.cleanedText.contains("\uD83E\uDD16 Prompt for all review comments with AI agents"))
        assertFalse(result.cleanedText.contains("Comment on lines +532 to +551"))
        assertFalse(result.cleanedText.contains("\u26A0\uFE0F Outside diff range comments (1)"))
        assertFalse(result.cleanedText.contains("Useful? React with \uD83D\uDC4D / \uD83D\uDC4E."))
        assertFalse(result.cleanedText.contains("@voku\tReply..."))
        assertFalse(result.cleanedText.lines().any { it == "+142" })
        assertFalse(result.cleanedText.lines().any { it == "-15" })
        assertFalse(result.cleanedText.contains("Mention @copilot in a comment to make changes to this pull request."))
        // Additional assertions discovered via static analysis of real PR output
        assertFalse(result.cleanedText.contains("Conversation"))
        assertFalse(result.cleanedText.contains("Codex Task"))
        assertFalse(result.cleanedText.contains("Summary by CodeRabbit"))
        assertFalse(result.cleanedText.contains("Release Notes"))
        assertFalse(result.cleanedText.contains("Sequence Diagram(s)"))
        assertFalse(result.cleanedText.contains("Poem"))
        assertFalse(result.cleanedText.contains("\uD83D\uDEA5 Pre-merge checks"))
        assertFalse(result.cleanedText.contains("\uD83C\uDFAF 3 (Moderate)"))
        assertFalse(result.cleanedText.contains("\uD83E\uDD16 Hi @voku"))
        assertFalse(result.cleanedText.contains("P2 Badge Set gesture delegate only after CPU fallback succeeds"))
        assertFalse(result.cleanedText.contains("Comment on lines +146 to 149"))
        assertFalse(result.cleanedText.contains("Some comments are outside the diff"))
        assertFalse(result.cleanedText.contains("CodeRabbit"))
        // Standalone @handle lines must be removed
        assertFalse(result.cleanedText.lines().any { it == "@coderabbitai" })
        assertFalse(result.cleanedText.lines().any { it == "@github-actions" })
        assertFalse(result.cleanedText.lines().any { it == "@chatgpt-codex-connector" })
        // Short commit SHAs must be removed
        assertFalse(result.cleanedText.lines().any { it == "54358d6" })
    }

    @Test
    fun `does not destroy legitimate user content (blind spot fix)`() {
        val rawText = """
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
        """

        val result = Engine.cleanText(RawInput(rawText = rawText), ruleSetOverride = GitHubRuleSet)

        // Prefix/Suffix should be gone
        assertFalse(result.cleanedText.contains("Skip to content"))
        assertFalse(result.cleanedText.contains("Footer navigation"))

        // Legitimate content should remain!
        assertTrue(result.cleanedText.contains("I added the new login button and removed the old one to meet the v2.0 milestone."))
        assertTrue(result.cleanedText.contains("- Labels"))
        assertTrue(result.cleanedText.contains("- Projects"))
    }

    @Test
    fun `cleans another real GitHub PR sample with checks and rate limits`() {
        val rawText = """
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
 ProTip! Add .patch or .diff to the end of URLs for Git's plaintext views.
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
You're receiving notifications because you were mentioned.
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
        """

        val result = Engine.cleanText(RawInput(rawText = rawText), ruleSetOverride = GitHubRuleSet)

        // Check that the title and description are preserved
        assertTrue(result.cleanedText.contains("Add signer-leakage validation and held-out signer evaluation for few-shot trials"))
        assertTrue(result.cleanedText.contains("Prevent signer/profile and bundle leakage in few-shot experiments"))

        // Check that the footer junk is removed
        assertFalse(result.cleanedText.contains("\u00A9 2026 GitHub, Inc."))
        assertFalse(result.cleanedText.contains("Footer navigation"))
        assertFalse(result.cleanedText.contains("Contact"))

        // Check that the top navigation is removed
        assertFalse(result.cleanedText.contains("Repository navigation"))
        assertFalse(result.cleanedText.contains("Wiki"))
        assertFalse(result.cleanedText.contains("Security and quality"))

        // Check that the checks section is removed
        assertFalse(result.cleanedText.contains("This branch has not been deployed"))
        assertFalse(result.cleanedText.contains("CI / build (pull_request)"))

        // Check that specific noisy lines are removed
        assertFalse(result.cleanedText.contains("Conversation5 (5)"))
        assertFalse(result.cleanedText.contains("Commits1 (1)"))
        assertFalse(result.cleanedText.contains("Checks24 (24)"))
        assertFalse(result.cleanedText.contains("Files changed3 (3)"))
        assertFalse(result.cleanedText.contains("Lines changed: 200 additions & 8 deletions"))
        assertFalse(result.cleanedText.contains("wants to merge 1 commit into"))
        assertFalse(result.cleanedText.contains("18 minutes ago"))
        assertFalse(result.cleanedText.contains("\u2022"))
        assertFalse(result.cleanedText.contains("left a comment"))
        assertFalse(result.cleanedText.contains("Code Review"))
        assertFalse(result.cleanedText.contains("Walkthrough"))
        assertFalse(result.cleanedText.contains("Changes"))
        assertFalse(result.cleanedText.contains("Estimated code review effort"))
        assertFalse(result.cleanedText.contains("Possibly related PRs"))
        assertFalse(result.cleanedText.contains("\uD83D\uDCA1 Codex Review"))
        assertFalse(result.cleanedText.contains("Here are some automated review suggestions for this pull request."))
        assertFalse(result.cleanedText.contains("\u2139\uFE0F About Codex in GitHub"))
        assertFalse(result.cleanedText.contains("\uD83E\uDD16 Prompt for all review comments with AI agents"))
        assertFalse(result.cleanedText.contains("Comment on lines +470 to +474"))
        assertFalse(result.cleanedText.contains("\u26A0\uFE0F Outside diff range comments (1)"))
        assertFalse(result.cleanedText.contains("Useful? React with \uD83D\uDC4D / \uD83D\uDC4E."))
        assertFalse(result.cleanedText.contains("@voku\tReply..."))
        assertFalse(result.cleanedText.lines().any { it == "+200" })
        assertFalse(result.cleanedText.lines().any { it == "-8" })
        assertFalse(result.cleanedText.contains("Mention @copilot in a comment to make changes to this pull request."))
        assertFalse(result.cleanedText.contains("1 participant"))
        // Additional assertions discovered via static analysis of real PR output
        assertFalse(result.cleanedText.contains("Conversation"))
        assertFalse(result.cleanedText.contains("Codex Task"))
        assertFalse(result.cleanedText.contains("Summary by CodeRabbit"))
        assertFalse(result.cleanedText.contains("Release Notes"))
        assertFalse(result.cleanedText.contains("Sequence Diagram(s)"))
        assertFalse(result.cleanedText.contains("\uD83E\uDD16 Hi @voku"))
        assertFalse(result.cleanedText.contains("P1 Badge Exclude default examples from held-out evaluation"))
        assertFalse(result.cleanedText.contains("CodeRabbit"))
        assertFalse(result.cleanedText.lines().any { it == "@coderabbitai" })
        assertFalse(result.cleanedText.lines().any { it == "@github-actions" })
        assertFalse(result.cleanedText.lines().any { it == "@review-assist" })
        assertFalse(result.cleanedText.lines().any { it == "@chatgpt-codex-connector" })
        assertFalse(result.cleanedText.lines().any { it == "3721bd8" })
    }

    // ── GitHub PR — Static Analysis Pattern Coverage ─────────────────────

    @Test
    fun `removes Conversation tab header`() {
        val result = Engine.cleanText(RawInput(rawText = "Conversation\n# PR title\nSome content", sourceTypeHint = SourceType.GITHUB_PR), ruleSetOverride = GitHubRuleSet)
        assertFalse(result.cleanedText.contains("Conversation"))
        assertTrue(result.cleanedText.contains("# PR title"))
    }

    @Test
    fun `removes Codex Task label`() {
        val result = Engine.cleanText(RawInput(rawText = "# PR\nSome content\nCodex Task\n", sourceTypeHint = SourceType.GITHUB_PR), ruleSetOverride = GitHubRuleSet)
        assertFalse(result.cleanedText.contains("Codex Task"))
        assertTrue(result.cleanedText.contains("# PR"))
    }

    @Test
    fun `removes Summary by CodeRabbit section header`() {
        val result = Engine.cleanText(RawInput(rawText = "# PR\nSome content\nSummary by CodeRabbit\n", sourceTypeHint = SourceType.GITHUB_PR), ruleSetOverride = GitHubRuleSet)
        assertFalse(result.cleanedText.contains("Summary by CodeRabbit"))
    }

    @Test
    fun `removes Release Notes standalone CodeRabbit section header`() {
        val result = Engine.cleanText(RawInput(rawText = "# PR\nRelease Notes\nNew content", sourceTypeHint = SourceType.GITHUB_PR), ruleSetOverride = GitHubRuleSet)
        assertFalse(result.cleanedText.contains("Release Notes"))
    }

    @Test
    fun `removes Sequence Diagram(s) section header`() {
        val result = Engine.cleanText(RawInput(rawText = "# PR\nSome content\nSequence Diagram(s)\n", sourceTypeHint = SourceType.GITHUB_PR), ruleSetOverride = GitHubRuleSet)
        assertFalse(result.cleanedText.contains("Sequence Diagram(s)"))
    }

    @Test
    fun `removes Poem header`() {
        val result = Engine.cleanText(RawInput(rawText = "# PR\nPoem\n\uD83D\uDC30 A hop, skip, and delegate trace!\n", sourceTypeHint = SourceType.GITHUB_PR), ruleSetOverride = GitHubRuleSet)
        assertFalse(result.cleanedText.contains("Poem"))
    }

    @Test
    fun `removes Some comments are outside the diff boilerplate`() {
        val result = Engine.cleanText(
            RawInput(
                rawText = "# PR\nSome content\nSome comments are outside the diff and can\u2019t be posted inline due to platform limitations.\n",
                sourceTypeHint = SourceType.GITHUB_PR,
            ),
            ruleSetOverride = GitHubRuleSet,
        )
        assertFalse(result.cleanedText.contains("Some comments are outside the diff"))
    }

    @Test
    fun `removes CodeRabbit standalone bot name`() {
        val result = Engine.cleanText(RawInput(rawText = "# PR\nSome content\nCodeRabbit\n", sourceTypeHint = SourceType.GITHUB_PR), ruleSetOverride = GitHubRuleSet)
        assertFalse(result.cleanedText.contains("CodeRabbit"))
    }

    @Test
    fun `removes pre-merge checks summary line`() {
        val result = Engine.cleanText(RawInput(rawText = "# PR\nSome content\n\uD83D\uDEA5 Pre-merge checks | \u2705 3\n", sourceTypeHint = SourceType.GITHUB_PR), ruleSetOverride = GitHubRuleSet)
        assertFalse(result.cleanedText.contains("Pre-merge checks"))
    }

    @Test
    fun `removes CodeRabbit review effort value line`() {
        val result = Engine.cleanText(RawInput(rawText = "# PR\nEstimated code review effort\n\uD83C\uDFAF 3 (Moderate) | \u23F1\uFE0F ~22 minutes\n", sourceTypeHint = SourceType.GITHUB_PR), ruleSetOverride = GitHubRuleSet)
        assertFalse(result.cleanedText.contains("\uD83C\uDFAF 3 (Moderate)"))
        assertFalse(result.cleanedText.contains("Estimated code review effort"))
    }

    @Test
    fun `removes GitHub Actions bot acknowledgment line`() {
        val result = Engine.cleanText(
            RawInput(
                rawText = "# PR\nSome content\n\uD83E\uDD16 Hi @voku, I\u2019ve received your request, and I\u2019m working on it now! You can track my progress in the logs for more details.\n",
                sourceTypeHint = SourceType.GITHUB_PR,
            ),
            ruleSetOverride = GitHubRuleSet,
        )
        assertFalse(result.cleanedText.contains("\uD83E\uDD16 Hi @voku"))
    }

    @Test
    fun `removes tab-less Reply button variant`() {
        val result = Engine.cleanText(RawInput(rawText = "# PR\nSome content\n@vokuReply...\n", sourceTypeHint = SourceType.GITHUB_PR), ruleSetOverride = GitHubRuleSet)
        assertFalse(result.cleanedText.contains("@vokuReply..."))
    }

    @Test
    fun `removes Codex review priority badge lines`() {
        val result = Engine.cleanText(
            RawInput(
                rawText = "# PR\nP2 Badge Set gesture delegate only after CPU fallback succeeds\nP1 Badge Exclude default examples from held-out evaluation\nSome content",
                sourceTypeHint = SourceType.GITHUB_PR,
            ),
            ruleSetOverride = GitHubRuleSet,
        )
        assertFalse(result.cleanedText.contains("P2 Badge"))
        assertFalse(result.cleanedText.contains("P1 Badge"))
        assertTrue(result.cleanedText.contains("Some content"))
    }

    @Test
    fun `removes standalone @handle lines`() {
        val result = Engine.cleanText(
            RawInput(
                rawText = "# PR\nSome content\n@coderabbitai\n@github-actions\n@review-assist",
                sourceTypeHint = SourceType.GITHUB_PR,
            ),
            ruleSetOverride = GitHubRuleSet,
        )
        assertFalse(result.cleanedText.lines().any { it == "@coderabbitai" })
        assertFalse(result.cleanedText.lines().any { it == "@github-actions" })
        assertFalse(result.cleanedText.lines().any { it == "@review-assist" })
        assertTrue(result.cleanedText.contains("Some content"))
    }

    @Test
    fun `preserves @handle embedded in sentence`() {
        val result = Engine.cleanText(
            RawInput(
                rawText = "# PR\nThanks to @voku for the fix.\nAnother @reviewer approved it.\n",
                sourceTypeHint = SourceType.GITHUB_PR,
            ),
            ruleSetOverride = GitHubRuleSet,
        )
        assertTrue(result.cleanedText.contains("Thanks to @voku for the fix."))
        assertTrue(result.cleanedText.contains("Another @reviewer approved it."))
    }

    @Test
    fun `removes short commit SHAs as standalone lines`() {
        val result = Engine.cleanText(
            RawInput(
                rawText = "# PR\n54358d6\n3721bd8\nSome content",
                sourceTypeHint = SourceType.GITHUB_PR,
            ),
            ruleSetOverride = GitHubRuleSet,
        )
        assertFalse(result.cleanedText.lines().any { it == "54358d6" })
        assertFalse(result.cleanedText.lines().any { it == "3721bd8" })
        assertTrue(result.cleanedText.contains("Some content"))
    }

    @Test
    fun `removes Comment on lines variant without plus on second number`() {
        val result = Engine.cleanText(
            RawInput(
                rawText = "# PR\nComment on lines +146 to 149\nComment on lines +532 to +551\nSome content",
                sourceTypeHint = SourceType.GITHUB_PR,
            ),
            ruleSetOverride = GitHubRuleSet,
        )
        assertFalse(result.cleanedText.contains("Comment on lines +146 to 149"))
        assertFalse(result.cleanedText.contains("Comment on lines +532 to +551"))
        assertTrue(result.cleanedText.contains("Some content"))
    }

    // ── GitHub — Research-Driven Pattern Coverage ─────────────────────────

    @Test
    fun `removes Type slash to search shortcut hint`() {
        val result = Engine.cleanText(RawInput(rawText = "Type '/' to search\n# PR title\nSome content"), ruleSetOverride = GitHubRuleSet)
        assertFalse(result.cleanedText.contains("Type '/' to search"))
        assertTrue(result.cleanedText.contains("Some content"))
    }

    @Test
    fun `removes Jump to bottom page navigation`() {
        val result = Engine.cleanText(RawInput(rawText = "# Issue title\nSome content\nJump to bottom"), ruleSetOverride = GitHubRuleSet)
        assertFalse(result.cleanedText.contains("Jump to bottom"))
        assertTrue(result.cleanedText.contains("Some content"))
    }

    @Test
    fun `removes opened this issue event line`() {
        val result = Engine.cleanText(RawInput(rawText = "# Issue\ndevuser\nopened this issue\nSome content"), ruleSetOverride = GitHubRuleSet)
        assertFalse(result.cleanedText.contains("opened this issue"))
        assertTrue(result.cleanedText.contains("Some content"))
    }

    @Test
    fun `removes Leave a comment form label`() {
        val result = Engine.cleanText(RawInput(rawText = "# Issue\nSome content\nLeave a comment"), ruleSetOverride = GitHubRuleSet)
        assertFalse(result.cleanedText.contains("Leave a comment"))
    }

    @Test
    fun `removes Lock conversation and Delete issue sidebar actions`() {
        val result = Engine.cleanText(RawInput(rawText = "# Issue\nSome content\nLock conversation\nDelete issue"), ruleSetOverride = GitHubRuleSet)
        assertFalse(result.cleanedText.contains("Lock conversation"))
        assertFalse(result.cleanedText.contains("Delete issue"))
        assertTrue(result.cleanedText.contains("Some content"))
    }

    @Test
    fun `removes Linked pull requests sidebar section`() {
        val result = Engine.cleanText(RawInput(rawText = "# Issue\nSome content\nLinked pull requests"), ruleSetOverride = GitHubRuleSet)
        assertFalse(result.cleanedText.contains("Linked pull requests"))
    }

    @Test
    fun `removes Markdown is supported and file attach hint`() {
        val result = Engine.cleanText(
            RawInput(rawText = "# Issue\nSome content\nMarkdown is supported\nAttach files by dragging & dropping, selecting or pasting them."),
            ruleSetOverride = GitHubRuleSet,
        )
        assertFalse(result.cleanedText.contains("Markdown is supported"))
        assertFalse(result.cleanedText.contains("Attach files by dragging & dropping"))
    }

    @Test
    fun `removes Add a comment to start a discussion empty state`() {
        val result = Engine.cleanText(RawInput(rawText = "# Issue\nSome content\nAdd a comment to start a discussion"), ruleSetOverride = GitHubRuleSet)
        assertFalse(result.cleanedText.contains("Add a comment to start a discussion"))
    }

    @Test
    fun `removes You are not currently watching this repository`() {
        val result = Engine.cleanText(RawInput(rawText = "# Issue\nSome content\nYou are not currently watching this repository"), ruleSetOverride = GitHubRuleSet)
        assertFalse(result.cleanedText.contains("You are not currently watching this repository"))
    }

    @Test
    fun `removes You must be logged in to vote`() {
        val result = Engine.cleanText(RawInput(rawText = "# Issue\nSome content\nYou must be logged in to vote"), ruleSetOverride = GitHubRuleSet)
        assertFalse(result.cleanedText.contains("You must be logged in to vote"))
    }

    @Test
    fun `removes No issues match the current filter empty state`() {
        val result = Engine.cleanText(RawInput(rawText = "# Issues\nFilters\nNo issues match the current filter"), ruleSetOverride = GitHubRuleSet)
        assertFalse(result.cleanedText.contains("No issues match the current filter"))
    }

    @Test
    fun `removes No branches or tags empty state`() {
        val result = Engine.cleanText(RawInput(rawText = "# PR\nSome content\nDevelopment\nNo branches or tags"), ruleSetOverride = GitHubRuleSet)
        assertFalse(result.cleanedText.contains("No branches or tags"))
    }

    @Test
    fun `removes Sponsor this project sidebar link`() {
        val result = Engine.cleanText(RawInput(rawText = "# Repo\nSome content\nSponsor this project"), ruleSetOverride = GitHubRuleSet)
        assertFalse(result.cleanedText.contains("Sponsor this project"))
    }

    @Test
    fun `removes No packages published sidebar empty state`() {
        val result = Engine.cleanText(RawInput(rawText = "# Repo\nSome content\nPackages\nNo packages published"), ruleSetOverride = GitHubRuleSet)
        assertFalse(result.cleanedText.contains("No packages published"))
    }

    @Test
    fun `removes Open in github dot dev and Open with GitHub Desktop buttons`() {
        val result = Engine.cleanText(
            RawInput(rawText = "# Repo\nSome content\nOpen in github.dev\nOpen with GitHub Desktop\nView all files"),
            ruleSetOverride = GitHubRuleSet,
        )
        assertFalse(result.cleanedText.contains("Open in github.dev"))
        assertFalse(result.cleanedText.contains("Open with GitHub Desktop"))
        assertFalse(result.cleanedText.contains("View all files"))
    }

    @Test
    fun `removes View all releases sidebar link`() {
        val result = Engine.cleanText(RawInput(rawText = "# Repo\nSome content\nView all releases"), ruleSetOverride = GitHubRuleSet)
        assertFalse(result.cleanedText.contains("View all releases"))
    }

    @Test
    fun `removes Nothing to show empty state`() {
        val result = Engine.cleanText(RawInput(rawText = "# Repo\nSome content\nNothing to show"), ruleSetOverride = GitHubRuleSet)
        assertFalse(result.cleanedText.contains("Nothing to show"))
    }

    @Test
    fun `removes Used by N users sidebar stat`() {
        val r1 = Engine.cleanText(RawInput(rawText = "# Repo\nSome content\nUsed by 47 users"), ruleSetOverride = GitHubRuleSet)
        val r2 = Engine.cleanText(RawInput(rawText = "# Repo\nSome content\nUsed by 3"), ruleSetOverride = GitHubRuleSet)
        assertFalse(r1.cleanedText.contains("Used by 47 users"))
        assertFalse(r2.cleanedText.contains("Used by 3"))
        assertTrue(r1.cleanedText.contains("Some content"))
    }

    @Test
    fun `removes N contributors sidebar stat`() {
        val result = Engine.cleanText(RawInput(rawText = "# Repo\nSome content\n3 contributors\n1 contributor"), ruleSetOverride = GitHubRuleSet)
        assertFalse(result.cleanedText.contains("3 contributors"))
        assertFalse(result.cleanedText.contains("1 contributor"))
        assertTrue(result.cleanedText.contains("Some content"))
    }

    @Test
    fun `removes Conversations plural tab label`() {
        val result = Engine.cleanText(RawInput(rawText = "# PR\nConversations\nSome content"), ruleSetOverride = GitHubRuleSet)
        assertFalse(result.cleanedText.contains("Conversations"))
        assertTrue(result.cleanedText.contains("Some content"))
    }

    @Test
    fun `removes Files Changed tab bar space-separated format`() {
        val result = Engine.cleanText(
            RawInput(rawText = "# PR\nCommits 1\nChecks 24\nFiles changed 3\nSome content"),
            ruleSetOverride = GitHubRuleSet,
        )
        assertFalse(result.cleanedText.contains("Commits 1"))
        assertFalse(result.cleanedText.contains("Checks 24"))
        assertFalse(result.cleanedText.contains("Files changed 3"))
        assertTrue(result.cleanedText.contains("Some content"))
    }

    @Test
    fun `removes Showing N changed files diff summary`() {
        val r1 = Engine.cleanText(RawInput(rawText = "# PR\nShowing 3 changed files with 200 additions and 8 deletions.\nSome content"), ruleSetOverride = GitHubRuleSet)
        val r2 = Engine.cleanText(RawInput(rawText = "# PR\nShowing 1 changed file with 1 addition and 0 deletions.\nSome content"), ruleSetOverride = GitHubRuleSet)
        assertFalse(r1.cleanedText.contains("Showing 3 changed files"))
        assertFalse(r2.cleanedText.contains("Showing 1 changed file"))
        assertTrue(r1.cleanedText.contains("Some content"))
    }

    @Test
    fun `removes Files Changed UI controls`() {
        val result = Engine.cleanText(
            RawInput(rawText = "# PR\nFilter changed files\nShow file tree\nHide file tree\nExpand all\nCollapse all\nJump to file\nLoad diff\nSome content"),
            ruleSetOverride = GitHubRuleSet,
        )
        assertFalse(result.cleanedText.contains("Filter changed files"))
        assertFalse(result.cleanedText.contains("Show file tree"))
        assertFalse(result.cleanedText.contains("Hide file tree"))
        assertFalse(result.cleanedText.contains("Expand all"))
        assertFalse(result.cleanedText.contains("Collapse all"))
        assertFalse(result.cleanedText.contains("Jump to file"))
        assertFalse(result.cleanedText.contains("Load diff"))
        assertTrue(result.cleanedText.contains("Some content"))
    }

    @Test
    fun `removes Viewed checkbox label and This file was deleted diff note`() {
        val result = Engine.cleanText(RawInput(rawText = "# PR\nSome content\nViewed\nThis file was deleted."), ruleSetOverride = GitHubRuleSet)
        assertFalse(result.cleanedText.contains("Viewed"))
        assertFalse(result.cleanedText.contains("This file was deleted."))
        assertTrue(result.cleanedText.contains("Some content"))
    }

    @Test
    fun `removes N percent of N files viewed progress indicator`() {
        val result = Engine.cleanText(RawInput(rawText = "# PR\nSome content\n50% of 6 files viewed"), ruleSetOverride = GitHubRuleSet)
        assertFalse(result.cleanedText.contains("50% of 6 files viewed"))
        assertTrue(result.cleanedText.contains("Some content"))
    }

    @Test
    fun `removes relative timestamps not covered by digit-based rule`() {
        val result = Engine.cleanText(
            RawInput(rawText = "# PR\nSome content\nyesterday\nlast week\nlast month\nlast year\na minute ago\nan hour ago\na day ago"),
            ruleSetOverride = GitHubRuleSet,
        )
        assertFalse(result.cleanedText.contains("yesterday"))
        assertFalse(result.cleanedText.contains("last week"))
        assertFalse(result.cleanedText.contains("last month"))
        assertFalse(result.cleanedText.contains("last year"))
        assertFalse(result.cleanedText.contains("a minute ago"))
        assertFalse(result.cleanedText.contains("an hour ago"))
        assertFalse(result.cleanedText.contains("a day ago"))
        assertTrue(result.cleanedText.contains("Some content"))
    }

    @Test
    fun `removes middle-dot separator N comments line`() {
        val result = Engine.cleanText(RawInput(rawText = "# Issue\n\u00B7 3 comments\nSome content"), ruleSetOverride = GitHubRuleSet)
        assertFalse(result.cleanedText.contains("\u00B7 3 comments"))
        assertTrue(result.cleanedText.contains("Some content"))
    }

    @Test
    fun `removes standalone middle-dot separator`() {
        val result = Engine.cleanText(RawInput(rawText = "# Issue\ndevuser\n\u00B7\nedited\nSome content"), ruleSetOverride = GitHubRuleSet)
        assertFalse(result.cleanedText.lines().any { it == "\u00B7" })
    }

    @Test
    fun `removes title-change event lines`() {
        val result = Engine.cleanText(
            RawInput(rawText = "# Issue\ndevuser changed the title Old title New title\nSome content"),
            ruleSetOverride = GitHubRuleSet,
        )
        assertFalse(result.cleanedText.contains("changed the title"))
        assertTrue(result.cleanedText.contains("Some content"))
    }

    @Test
    fun `removes GitHub sign-in prompts`() {
        val result = Engine.cleanText(
            RawInput(
                rawText = "# Issues\nHave a question about this project? Sign up for a free GitHub account to open an issue and contact its maintainers and the community.\nSign up for GitHub\nAlready on GitHub? Sign in to your account\nPick a username\nSome content",
            ),
            ruleSetOverride = GitHubRuleSet,
        )
        assertFalse(result.cleanedText.contains("Have a question about this project?"))
        assertFalse(result.cleanedText.contains("Sign up for GitHub"))
        assertFalse(result.cleanedText.contains("Already on GitHub?"))
        assertFalse(result.cleanedText.contains("Pick a username"))
        assertTrue(result.cleanedText.contains("Some content"))
    }

    @Test
    fun `removes over-dashed Skip to content prefix while preserving PR title`() {
        val result = Engine.cleanText(
            RawInput(
                rawText = "- - - - - - - - - - - - - - - Skip to content\nvoku\nAmysEcho\nRepository navigation\nCode\nIssues\n12\n(12)\nExpose runtime diagnosability for gesture detector and surface in status/docs/tests",
                sourceTypeHint = SourceType.GITHUB_PR,
            ),
            ruleSetOverride = GitHubRuleSet,
        )
        assertEquals("Expose runtime diagnosability for gesture detector and surface in status/docs/tests", result.cleanedText)
    }

    @Test
    fun `removes standalone PR header metadata lines from copied PR page`() {
        val result = Engine.cleanText(
            RawInput(
                rawText = "#1123\nMerged\nmerged 3 commits into\nmain\nfrom\ncodex/work-on-todos-autonomously\nLines changed: 146 additions &amp; 16 deletions\nSome content",
                sourceTypeHint = SourceType.GITHUB_PR,
            ),
            ruleSetOverride = GitHubRuleSet,
        )
        assertFalse(result.cleanedText.contains("#1123"))
        assertFalse(result.cleanedText.contains("Merged"))
        assertFalse(result.cleanedText.contains("merged 3 commits into"))
        assertFalse(result.cleanedText.contains("Lines changed: 146 additions"))
        assertTrue(result.cleanedText.contains("Some content"))
    }

    @Test
    fun `keeps valuable PR body and review details from raw GitHub sample while dropping obvious chrome`() {
        val rawText =
            """
            - - - - - - - - - - - - - - - Skip to content
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
            Privacy
            """.trimIndent()

        val result = Engine.cleanText(
            RawInput(rawText = rawText, sourceTypeHint = SourceType.GITHUB_PR),
            ruleSetOverride = GitHubRuleSet,
        )

        assertFalse(result.cleanedText.contains("Skip to content"))
        assertFalse(result.cleanedText.contains("Repository navigation"))
        assertFalse(result.cleanedText.contains("#1123"))
        assertFalse(result.cleanedText.contains("Merged"))
        assertFalse(result.cleanedText.contains("merged 3 commits into"))
        assertFalse(result.cleanedText.contains("Footer navigation"))

        assertTrue(result.cleanedText.contains("Expose runtime diagnosability for gesture detector and surface in status/docs/tests"))
        assertTrue(result.cleanedText.contains("Motivation"))
        assertTrue(result.cleanedText.contains("Description"))
        assertTrue(result.cleanedText.contains("Testing"))
        assertTrue(result.cleanedText.contains("getRuntimeDiagnostics(): {"))
        assertTrue(result.cleanedText.contains("The return type for getRuntimeDiagnostics is complex and duplicated"))
    }

    @Test
    fun `preserves real content lines that look like stat lines`() {
        val result = Engine.cleanText(
            RawInput(rawText = "# PR\nCommits 1\nI reviewed commits 1 through 5 in detail.\nShowing 3 changed files with 200 additions and 8 deletions."),
            ruleSetOverride = GitHubRuleSet,
        )
        assertFalse(result.cleanedText.lines().any { it == "Commits 1" })
        assertTrue(result.cleanedText.contains("I reviewed commits 1 through 5 in detail."))
        assertFalse(result.cleanedText.contains("Showing 3 changed files"))
    }

    // ── Block-aware removal ──────────────────────────────────────────────

    @Test
    fun `removeBlocks removes CodeRabbit review table block (Cohort to blank line)`() {
        val result = Engine.cleanText(
            RawInput(
                rawText = "Motivation\nFix the bug in auth.\nCohort / File(s)\tSummary\nsrc/auth.ts\tFixed token refresh logic\nsrc/api.ts\tUpdated error handling\n\nDescription\nThis PR fixes token refresh.",
                sourceTypeHint = SourceType.GITHUB_PR,
            ),
            ruleSetOverride = GitHubRuleSet,
        )
        assertFalse(result.cleanedText.contains("Cohort / File(s)"))
        assertFalse(result.cleanedText.contains("Fixed token refresh logic"))
        assertTrue(result.cleanedText.contains("Motivation"))
        assertTrue(result.cleanedText.contains("Description"))
        assertTrue(result.cleanedText.contains("This PR fixes token refresh."))
    }

    @Test
    fun `removeBlocks removes bot review header block up to blank line`() {
        val result = Engine.cleanText(
            RawInput(
                rawText = "Description\nThis is the PR description.\n\nreview-assist[bot]\nreview-assist bot reviewed 1 hour ago\nContributor\nreview-assist bot\nleft a comment\nCode Review\n\nThe code looks good but needs more tests.\n\nHowever, the auth module should also handle token expiry.\nConsider adding a retry mechanism for failed requests.",
                sourceTypeHint = SourceType.GITHUB_PR,
            ),
            ruleSetOverride = GitHubRuleSet,
        )
        assertFalse(result.cleanedText.contains("review-assist[bot]"))
        assertTrue(result.cleanedText.contains("This is the PR description."))
        assertTrue(result.cleanedText.contains("The code looks good but needs more tests."))
        assertTrue(result.cleanedText.contains("Consider adding a retry mechanism for failed requests."))
    }

    @Test
    fun `removeBlocks removes Summary by CodeRabbit block body up to blank line`() {
        val result = Engine.cleanText(
            RawInput(
                rawText = "# PR\nSome content\nSummary by CodeRabbit\nRelease Notes\nNew Features\nGesture recognition improved.\n\nMore real content.",
                sourceTypeHint = SourceType.GITHUB_PR,
            ),
            ruleSetOverride = GitHubRuleSet,
        )
        assertFalse(result.cleanedText.contains("Summary by CodeRabbit"))
        assertFalse(result.cleanedText.contains("Release Notes"))
        assertFalse(result.cleanedText.contains("Gesture recognition improved."))
        assertTrue(result.cleanedText.contains("Some content"))
        assertTrue(result.cleanedText.contains("More real content."))
    }

    @Test
    fun `removeBlocks removes Walkthrough section body up to blank line`() {
        val result = Engine.cleanText(
            RawInput(
                rawText = "# PR\nSome content\nWalkthrough\nThis PR adds feature X.\nAll tests pass.\n\nMore real content.",
                sourceTypeHint = SourceType.GITHUB_PR,
            ),
            ruleSetOverride = GitHubRuleSet,
        )
        assertFalse(result.cleanedText.contains("Walkthrough"))
        assertFalse(result.cleanedText.contains("This PR adds feature X."))
        assertTrue(result.cleanedText.contains("Some content"))
        assertTrue(result.cleanedText.contains("More real content."))
    }

    @Test
    fun `removeBlocks removes Poem section body up to blank line`() {
        val result = Engine.cleanText(
            RawInput(
                rawText = "# PR\nSome content\nPoem\n\uD83D\uDC30 A hop, skip, and delegate trace!\nRuntime wisdom shows its face.\n\nMore real content.",
                sourceTypeHint = SourceType.GITHUB_PR,
            ),
            ruleSetOverride = GitHubRuleSet,
        )
        assertFalse(result.cleanedText.contains("Poem"))
        assertFalse(result.cleanedText.contains("A hop, skip, and delegate trace!"))
        assertTrue(result.cleanedText.contains("Some content"))
        assertTrue(result.cleanedText.contains("More real content."))
    }

    @Test
    fun `removeBlocks removes Sequence Diagrams section body up to blank line`() {
        val result = Engine.cleanText(
            RawInput(
                rawText = "# PR\nSome content\nSequence Diagram(s)\nsequenceDiagram\nA->>B: call\nB-->>A: response\n\nMore real content.",
                sourceTypeHint = SourceType.GITHUB_PR,
            ),
            ruleSetOverride = GitHubRuleSet,
        )
        assertFalse(result.cleanedText.contains("Sequence Diagram(s)"))
        assertFalse(result.cleanedText.contains("sequenceDiagram"))
        assertTrue(result.cleanedText.contains("Some content"))
        assertTrue(result.cleanedText.contains("More real content."))
    }

    @Test
    fun `removeBlocks preserves code block content even when it matches junk patterns`() {
        val result = Engine.cleanText(
            RawInput(
                rawText = "# PR\n```\nreview-assist[bot]\nSummary by CodeRabbit\nPoem\n```\nReal content.",
                sourceTypeHint = SourceType.GITHUB_PR,
            ),
            ruleSetOverride = GitHubRuleSet,
        )
        assertTrue(result.cleanedText.contains("review-assist[bot]"))
        assertTrue(result.cleanedText.contains("Summary by CodeRabbit"))
        assertTrue(result.cleanedText.contains("Real content."))
    }

    // ── Golden fixture integration test ─────────────────────────────────
    // Mirrors the TypeScript golden fixture at engine.test.ts:1815+

    @Test
    fun `golden fixture cleans a complete real PR paste to expected output`() {
        val fullPagePaste = listOf(
            "- - - - - - - - - - - - - - - Skip to content",
            "voku",
            "AmysEcho",
            "Repository navigation",
            "Code",
            "Issues",
            "2",
            "(2)",
            "Pull requests",
            "12",
            "(12)",
            "Agents",
            "Discussions",
            "Actions",
            "Projects",
            "Wiki",
            // PR title
            "Expose runtime diagnosability for gesture detector and surface in status/docs/tests",
            // PR metadata
            "#1123",
            "Merged",
            "voku",
            "merged 3 commits into",
            "main",
            "from",
            "codex/work-on-todos-autonomously",
            "yesterday",
            "+146",
            "-16",
            "Lines changed: 146 additions &amp; 16 deletions",
            "Conversation6 (6)",
            "Commits3 (3)",
            "Checks14 (14)",
            "Files changed9 (9)",
            "Conversation",
            "@voku",
            "Owner",
            "voku",
            "commented",
            "2 days ago",
            "\u2022",
            // PR body — the content that matters
            "Motivation",
            "Reduce time-to-root-cause for MediaPipe/gesture runtime incidents.",
            "",
            "Description",
            "Added runtime diagnostics to GestureDetector including runtimeDelegates.",
            "",
            "Testing",
            "Ran unit tests for the gesture module.",
            "",
            // Bot review block
            "review-assist[bot]",
            "review-assist bot reviewed 1 hour ago",
            "Contributor",
            "review-assist bot",
            "left a comment",
            "Code Review",
            "",
            "This pull request implements runtime diagnosability enhancements.",
            "",
            // CodeRabbit metadata
            "Codex Task",
            "Summary by CodeRabbit",
            "Release Notes",
            "",
            // Inline review comment
            "webapp/src/gesture/core/GestureDetector.ts",
            "Outdated",
            "Comment on lines +532 to +551",
            "  getRuntimeDiagnostics(): {",
            "    running: boolean;",
            "  } {",
            "The return type is complex and duplicated.",
            "",
            // Merge UI noise
            "Caution",
            "Review failed",
            "The pull request is closed.",
            "All checks have passed",
            "Squash and merge",
            "Confirm squash and merge",
            "",
            // Sidebar
            "Reviewers",
            "+1 more reviewer",
            "Assignees",
            "No one\u2014",
            "Labels",
            "None yet",
            "Projects",
            "Milestone",
            "No milestone",
            "Development",
            "Successfully merging this pull request may close these issues.",
            "",
            // Footer
            "Footer",
            "\u00A9 2026 GitHub, Inc.",
            "Footer navigation",
            "Terms",
            "Privacy",
        ).joinToString("\n")

        val result = Engine.cleanText(
            RawInput(rawText = fullPagePaste, sourceTypeHint = SourceType.GITHUB_PR),
            ruleSetOverride = GitHubRuleSet,
        )

        // ── Must be present (the meaningful content) ─────────────────────
        assertTrue(result.cleanedText.contains("Expose runtime diagnosability for gesture detector and surface in status/docs/tests"))
        assertTrue(result.cleanedText.contains("Motivation"))
        assertTrue(result.cleanedText.contains("Reduce time-to-root-cause for MediaPipe/gesture runtime incidents."))
        assertTrue(result.cleanedText.contains("Description"))
        assertTrue(result.cleanedText.contains("Added runtime diagnostics to GestureDetector including runtimeDelegates."))
        assertTrue(result.cleanedText.contains("Testing"))
        assertTrue(result.cleanedText.contains("Ran unit tests for the gesture module."))
        assertTrue(result.cleanedText.contains("This pull request implements runtime diagnosability enhancements."))
        // Code review comment preserved
        assertTrue(result.cleanedText.contains("webapp/src/gesture/core/GestureDetector.ts"))
        assertTrue(result.cleanedText.contains("getRuntimeDiagnostics(): {"))
        assertTrue(result.cleanedText.contains("The return type is complex and duplicated."))

        // ── Must NOT be present (the noise) ──────────────────────────────
        // Header chrome
        assertFalse(result.cleanedText.contains("Skip to content"))
        assertFalse(result.cleanedText.contains("Repository navigation"))
        assertFalse(result.cleanedText.contains("AmysEcho"))
        // PR metadata
        assertFalse(result.cleanedText.contains("#1123"))
        assertFalse(result.cleanedText.contains("merged 3 commits into"))
        assertFalse(result.cleanedText.contains("Lines changed: 146 additions"))
        assertFalse(result.cleanedText.contains("Conversation6 (6)"))
        // Bot review block header
        assertFalse(result.cleanedText.contains("review-assist[bot]"))
        // CodeRabbit metadata
        assertFalse(result.cleanedText.contains("Codex Task"))
        assertFalse(result.cleanedText.contains("Summary by CodeRabbit"))
        assertFalse(result.cleanedText.contains("Release Notes"))
        // Merge UI noise
        assertFalse(result.cleanedText.contains("Caution"))
        assertFalse(result.cleanedText.contains("Review failed"))
        assertFalse(result.cleanedText.contains("The pull request is closed."))
        assertFalse(result.cleanedText.contains("All checks have passed"))
        assertFalse(result.cleanedText.contains("Squash and merge"))
        // Sidebar
        assertFalse(result.cleanedText.contains("No one\u2014"))
        assertFalse(result.cleanedText.contains("No milestone"))
        // Footer
        assertFalse(result.cleanedText.contains("Footer navigation"))
        assertFalse(result.cleanedText.contains("\u00A9 2026 GitHub, Inc."))
        assertFalse(result.cleanedText.contains("Terms"))

        // ── Line count sanity check ───────────────────────────────────────
        // Meaningful content is ~15-25 lines; >35 non-blank lines means noise leakage.
        val nonBlankLines = result.cleanedText.lines().filter { it.trim().isNotEmpty() }
        assertTrue("Expected ≥5 non-blank lines but got ${nonBlankLines.size}", nonBlankLines.size >= 5)
        assertTrue("Expected ≤35 non-blank lines but got ${nonBlankLines.size}", nonBlankLines.size <= 35)
    }

    // ── Content preservation / over-removal protection ───────────────────

    @Test
    fun `does not over-remove PR body with markdown headings, bullets, and multi-paragraph content`() {
        val input = """
            # Fix authentication token refresh
            
            ## Motivation
            Users are being logged out unexpectedly when their token expires during an active session.
            The root cause is the refresh handler not being invoked on 401 responses.
            
            ## Description
            - Added a retry interceptor in `api/client.ts` that catches 401s and calls `refreshToken()`
            - Updated `AuthService.refresh()` to return the new token and store it in session storage
            - Patched the token expiry check in `SessionManager` to use server time, not local clock
            
            ## Testing
            - Unit tests added for the retry interceptor (3 new test cases)
            - Integration test verifies that a 401 mid-session triggers refresh and retries the original request
            - Manual test on staging: token expiry now seamlessly refreshes without logout
            
            ## Notes
            > This change requires the server to return a `Retry-After` header on 401 responses.
            > Without it, the interceptor falls back to a fixed 1-second delay.
        """.trimIndent()

        val result = Engine.cleanText(
            RawInput(rawText = input, sourceTypeHint = SourceType.GITHUB_PR),
            ruleSetOverride = GitHubRuleSet,
        )

        // All section headings preserved
        assertTrue(result.cleanedText.contains("# Fix authentication token refresh"))
        assertTrue(result.cleanedText.contains("## Motivation"))
        assertTrue(result.cleanedText.contains("## Description"))
        assertTrue(result.cleanedText.contains("## Testing"))
        assertTrue(result.cleanedText.contains("## Notes"))

        // Substantive content preserved
        assertTrue(result.cleanedText.contains("Users are being logged out unexpectedly"))
        assertTrue(result.cleanedText.contains("Added a retry interceptor"))
        assertTrue(result.cleanedText.contains("Unit tests added for the retry interceptor"))
        assertTrue(result.cleanedText.contains("Retry-After"))

        // At least N non-blank lines preserved (lower bound)
        val nonBlankLines = result.cleanedText.lines().filter { it.trim().isNotEmpty() }
        assertTrue("Expected at least 10 non-blank lines preserved but got ${nonBlankLines.size}", nonBlankLines.size >= 10)
    }
}
