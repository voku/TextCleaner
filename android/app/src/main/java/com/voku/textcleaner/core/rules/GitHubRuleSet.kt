package com.voku.textcleaner.core.rules

import com.voku.textcleaner.core.BlockPattern
import com.voku.textcleaner.core.CleanupRuleSet

/**
 * GitHub PR/Issue cleanup rules.
 * Direct port of `src/core/rules/github.ts`.
 */
val GitHubRuleSet = CleanupRuleSet(
    name = "GitHub PR/Issue",
    prefixExactLines = listOf(
        "Skip to content",
        "Navigation Menu",
        "Repository navigation",
        "Code",
        "Issues",
        "Pull requests",
        "Agents",
        "Discussions",
        "Actions",
        "Projects",
        "Wiki",
        "Security and quality",
        "Notifications",
        "Fork",
        "Star",
        "Security",
        "Insights",
        "Settings",
        "Sign in",
        "Sign up",
        // Lowercase variants (translation-copy mode where page text is downcased)
        "More repository items",
        "more repository items",
    ),
    suffixExactLines = listOf(
        "Terms",
        "Privacy",
        "Docs",
        "Contact GitHub",
        "Contact",
        "Pricing",
        "API",
        "Training",
        "Blog",
        "About",
        "Status",
        "Security",
        "Manage cookies",
        "Do not share my personal information",
        "Community",
        "Footer navigation",
        "Footer",
        "1 participant",
        "You\u2019re receiving notifications because you were mentioned.",
        "You\u2019re receiving notifications because you were assigned.",
        "You\u2019re receiving notifications because you are watching this repository.",
        "You\u2019re receiving notifications because you modified the open/close state.",
        "Unsubscribe",
        "Customize",
        "Notifications",
        "None yet",
        "Successfully merging this pull request may close these issues.",
        "Development",
        "No milestone",
        "Milestone",
        "Projects",
        "Labels",
        "No one\u2014",
        "No one\u2014assign yourself",
        "Assignees",
        "Still in progress?",
        "+1 more reviewer",
        "Reviewers",
        "ProTip! Add comments to specific lines under Files changed.",
        "ProTip! Add .patch or .diff to the end of URLs for Git\u2019s plaintext views.",
        "Remember, contributions to this repository should follow our GitHub Community Guidelines.",
        "Add your comment here...",
        "Paste, drop, or click to add files",
        "Comment",
        "Add a comment",
        "You can also merge this with the command line.",
        "Merging can be performed automatically.",
        "No conflicts with base branch",
        "Contributor",
        "commented",
    ),
    prefixRegexes = listOf(
        Regex("^(?:- )*Skip to content$", RegexOption.IGNORE_CASE),
        Regex("^Search or jump to\\.\\.\\.$", RegexOption.IGNORE_CASE),
        Regex("^\\d+$", RegexOption.IGNORE_CASE),
        Regex("^\\(\\d+\\)$", RegexOption.IGNORE_CASE),
    ),
    suffixRegexes = listOf(
        Regex("^\u00A9 \\d{4} GitHub, Inc\\.$", RegexOption.IGNORE_CASE),
        Regex("^@(?!@).+$", RegexOption.IGNORE_CASE), // @handle lines — note: not ^@@ so diff headers are NOT matched
        Regex("^\\+?\\d+ more reviewers?$", RegexOption.IGNORE_CASE),
    ),
    removeAnywhereExactLines = listOf(
        "Copy link",
        "Quote reply",
        "Reply",
        "Edit",
        "Delete",
        "Show options",
        "Hide options",
        "Add reaction",
        "React",
        "Rate limit exceeded",
        "\u231B How to resolve this issue?",
        "\uD83D\uDEA6 How do rate limits work?",
        "\u2139\uFE0F Review info",
        "\u2728 Finishing Touches",
        "Thanks for using CodeRabbit! It's free for OSS, and your support helps us grow. If you like it, consider giving us a shout-out.",
        "\u2764\uFE0F Share",
        "Comment @coderabbitai help to get the list of available commands and usage tips.",
        "This branch has not been deployed",
        "No deployments",
        "Merge info",
        "Some checks were not successful",
        "failing checks",
        "skipped checks",
        "neutral checks",
        "successful checks",
        "\u2022",
        "left a comment",
        "Code Review",
        "Walkthrough",
        "Changes",
        "Cohort / File(s)\tSummary",
        "Estimated code review effort",
        "Possibly related PRs",
        "\uD83D\uDCA1 Codex Review",
        "Here are some automated review suggestions for this pull request.",
        "\u2139\uFE0F About Codex in GitHub",
        "\uD83E\uDD16 Prompt for all review comments with AI agents",
        "Owner",
        "commented",
        "Contributor",
        "Review requested",
        "Copilot code review",
        "Copilot requested your review on this pull request.",
        "Copilot uses AI. Check for mistakes.",
        "Mention @copilot in a comment to make changes to this pull request.",
        "Copilot AI",
        "Review has been requested on this pull request. It is not required to merge. Learn more about requesting a pull request review.",
        "Read all affected files",
        "Merged",
        "Outdated",
        // PR header / status chrome (appear after prefix cut-off in copy-mode pastes)
        "code",     // PR tab label (lowercase copy-mode variant)
        "merged",   // PR status badge (lowercase)
        "from",     // connector word from "merged N commits into main from branch"
        // CodeRabbit section separators and meta-labels
        "---",                  // horizontal rule separator between review sections
        // Code review tool section labels (general — any structured review tool uses these)
        "Inline comments:",     // structural divider within consolidated review output
        "Nitpick comments:",    // structural divider (minor-suggestions section label)
        // Discovered via static analysis of real PR samples
        "Conversation",
        "Conversations",
        "Codex Task",
        "Summary by CodeRabbit",
        "Sequence Diagram(s)",
        "Poem",
        "CodeRabbit",
        "Release Notes",
        // Discovered via analysis of GitHub Issue, Repo, and Files Changed pages
        "Type '/' to search",
        "Sponsor this project",
        "No packages published",
        "Open in github.dev",
        "Open with GitHub Desktop",
        "View all files",
        "View all releases",
        "Nothing to show",
        // Files Changed tab UI chrome
        "Filter changed files",
        "Show file tree",
        "Hide file tree",
        "Expand all",
        "Collapse all",
        "Jump to file",
        "Load diff",
        "Viewed",
        "This file was deleted.",
        // Issue / PR page chrome
        "Jump to bottom",
        "opened this issue",
        "Leave a comment",
        "Lock conversation",
        "Delete issue",
        "Linked pull requests",
        "Markdown is supported",
        "Attach files by dragging & dropping, selecting or pasting them.",
        "Add a comment to start a discussion",
        "You are not currently watching this repository",
        "You must be logged in to vote",
        "No issues match the current filter",
        "No branches or tags",
        "Label issues and pull requests for new contributors",
        // GitHub sign-in / auth prompts
        "Have a question about this project? Sign up for a free GitHub account to open an issue and contact its maintainers and the community.",
        "Sign up for GitHub",
        "Already on GitHub? Sign in to your account",
        "Pick a username",
        // Mid-body noise (blind-spot analysis: merge metadata, status banners, review states)
        "Caution",
        "Review failed",
        "The pull request is closed.",
        "The pull request is closed",
        "This pull request is closed.",
        "This pull request is closed",
        "Open",
        "Closed",
        "Draft",
        "Suggested change",
        "Suggested changes",
        "Show resolved",
        "Hide resolved",
        "Resolve conversation",
        "Unresolve conversation",
        "Approved",
        "Changes requested",
        "Dismissed",
        "Pending",
        "Review required",
        "All checks have passed",
        "All checks have failed",
        "Some checks haven\u2019t completed yet",
        "Merging is blocked",
        "This branch has no conflicts with the base branch",
        "This branch is out-of-date with the base branch",
        "Rebase and merge",
        "Squash and merge",
        "Create a merge commit",
        "Confirm merge",
        "Confirm squash and merge",
        "Confirm rebase and merge",
        "This branch is up to date with the base branch.",
        // Discovered via demo file analysis (real PR page with bot reviews and CodeRabbit)
        "View reviewed changes",
        "Commit suggestion",
        "\uD83D\uDCDD Committable suggestion",
        "\u203C\uFE0F IMPORTANT",
        "Carefully review the code before committing. Ensure that it accurately replaces the highlighted code, contains no missing lines, and has no issues with indentation. Thoroughly test & benchmark the code to ensure it meets the requirements.",
        "Verify each finding against the current code and only fix it if needed.",
        "\uD83C\uDFC1 Script executed:",
        "\uD83E\uDDE9 Analysis chain",
        "\uD83E\uDDF0 Tools",
        "\uD83E\uDE9B LanguageTool",
        "Pull request successfully merged and closed",
        "Delete branch",
        "\uD83E\uDE84 Autofix (Beta)",
        "Fix all unresolved CodeRabbit comments on this PR:",
        "Push a commit to this branch (recommended)",
        "Create a new PR with the fixes",
        "\u2699\uFE0F Run configuration",
        // Codex bot introduction lines
        "Your team has set up Codex to review pull requests in this repo. Reviews are triggered when you",
        "Open a pull request for review",
        "Mark a draft as ready",
        "Comment \"@codex review\".",
        "If Codex has suggestions, it will comment; otherwise it will react with \uD83D\uDC4D.",
        "Codex can also answer questions or update the PR. Try commenting \"@codex address that feedback\".",
        // Single-word UI labels
        "edited",
        "Revert",
    ),
    removeAnywhereContains = emptyList(),
    removeAnywhereRegexes = listOf(
        Regex("^.* commented on .*$", RegexOption.IGNORE_CASE),
        Regex("^.* requested a review from .*$", RegexOption.IGNORE_CASE),
        Regex("^.* assigned .* to .*$", RegexOption.IGNORE_CASE),
        Regex("^.* added the .* label .*$", RegexOption.IGNORE_CASE),
        Regex("^.* removed the .* label .*$", RegexOption.IGNORE_CASE),
        Regex("^.* modified the milestones: .*$", RegexOption.IGNORE_CASE),
        Regex("^.* mentioned this issue .*$", RegexOption.IGNORE_CASE),
        Regex("^@.+ has exceeded the limit for the number of commits that can be reviewed per hour.*$", RegexOption.IGNORE_CASE),
        Regex("^Your organization is not enrolled in usage-based pricing.*$", RegexOption.IGNORE_CASE),
        Regex("^\\d+ failing, \\d+ neutral, \\d+ skipped, \\d+ successful checks$", RegexOption.IGNORE_CASE),
        Regex("^.*\\(pull_request\\).*$", RegexOption.IGNORE_CASE),
        Regex("^.*\\(pull_request_review\\).*$", RegexOption.IGNORE_CASE),
        Regex("^.*Successful in \\d+[sm].*$", RegexOption.IGNORE_CASE),
        Regex("^.*Failing after \\d+[sm].*$", RegexOption.IGNORE_CASE),
        Regex("^.*Skipped \\d+ (minutes|hours|days) ago.*$", RegexOption.IGNORE_CASE),
        Regex("^Code scanning results / CodeQL.*$", RegexOption.IGNORE_CASE),
        Regex("^CodeQL / Analyze.*$", RegexOption.IGNORE_CASE),
        Regex("^CodeRabbit \\S+ Review.*$", RegexOption.IGNORE_CASE),
        Regex("^Mend Security Check.*$", RegexOption.IGNORE_CASE),
        Regex("^Conversation\\d+ \\(\\d+\\)$", RegexOption.IGNORE_CASE),
        Regex("^Commits\\d+ \\(\\d+\\)$", RegexOption.IGNORE_CASE),
        Regex("^Checks\\d+ \\(\\d+\\)$", RegexOption.IGNORE_CASE),
        Regex("^Files changed\\d+ \\(\\d+\\)$", RegexOption.IGNORE_CASE),
        Regex("^Lines changed: \\d+ additions (?:&|&amp;) \\d+ deletions$", RegexOption.IGNORE_CASE),
        Regex("^#\\d+$", RegexOption.IGNORE_CASE),
        Regex("^merged \\d+ commits? into$", RegexOption.IGNORE_CASE),
        Regex("^wants to merge \\d+ commits? into$", RegexOption.IGNORE_CASE),
        Regex("^.* wants to merge \\d+ commits? into .*$", RegexOption.IGNORE_CASE),
        Regex("^Reviewed commit: [a-f0-9]+$", RegexOption.IGNORE_CASE),
        Regex("^Comment on lines \\+\\d+ to \\+?\\d+$", RegexOption.IGNORE_CASE),
        Regex("^\u26A0\uFE0F Outside diff range comments \\(\\d+\\)$", RegexOption.IGNORE_CASE),
        Regex("^DGS Integration Tests / .*$", RegexOption.IGNORE_CASE),
        Regex("^\\d+ (minute|hour|day|month|year)s? ago$", RegexOption.IGNORE_CASE),
        Regex("^.* reviewed \\d+ (minute|hour|day|month|year)s? ago$", RegexOption.IGNORE_CASE),
        Regex("^.*\\[bot]$", RegexOption.IGNORE_CASE),
        Regex("^.* bot$", RegexOption.IGNORE_CASE),
        Regex("^Useful\\? React with \uD83D\uDC4D / \uD83D\uDC4E\\.$", RegexOption.IGNORE_CASE),
        Regex("^Reply\\.\\.\\.$", RegexOption.IGNORE_CASE),
        Regex("^@.+\\s+Reply\\.\\.\\.$", RegexOption.IGNORE_CASE),
        Regex("^\\+\\d+$"),
        Regex("^-\\d+$"),
        Regex("^\\d+ participants?$", RegexOption.IGNORE_CASE),
        // Discovered via static analysis of real PR samples
        Regex("^\uD83D\uDEA5 Pre-merge checks.*$"),              // pre-merge checks summary line
        Regex("^\uD83C\uDFAF \\d+.*\u23F1\uFE0F.*$"),           // CodeRabbit review effort value
        Regex("^\uD83E\uDD16 Hi @.+", RegexOption.IGNORE_CASE), // GitHub Actions bot acknowledgment
        Regex("^@.+Reply\\.\\.\\.$", RegexOption.IGNORE_CASE),   // tab-less "Reply..." button variant
        Regex("^P[0-9] Badge .+", RegexOption.IGNORE_CASE),      // Codex/review priority badge lines
        Regex("^@[a-zA-Z0-9][a-zA-Z0-9._-]*$", RegexOption.IGNORE_CASE), // standalone @handle lines
        Regex("^(?:[a-f0-9]{7}|[a-f0-9]{40})$"),                       // short (7) and full (40) commit SHAs only
        // Discovered via analysis of GitHub Issue, Repo, and Files Changed pages
        Regex("^Used by \\d+( users?)?$", RegexOption.IGNORE_CASE),    // GitHub repo sidebar stat
        Regex("^\\d+ contributors?$", RegexOption.IGNORE_CASE),         // GitHub contributors count
        Regex("^Commits \\d+$", RegexOption.IGNORE_CASE),               // Files Changed tab bar (space format)
        Regex("^Checks \\d+$", RegexOption.IGNORE_CASE),                // Files Changed tab bar (space format)
        Regex("^Files changed \\d+$", RegexOption.IGNORE_CASE),         // Files Changed tab bar (space format)
        Regex("^Showing \\d+ changed files? with \\d+ additions? and \\d+ deletions?\\.$", RegexOption.IGNORE_CASE), // diff summary
        Regex("^\u00B7\\s+\\d+ comments?$", RegexOption.IGNORE_CASE),  // "· N comments" middle-dot separator
        Regex("^\u00B7$"),                                               // standalone middle-dot separator
        Regex("^[a-zA-Z0-9][a-zA-Z0-9._-]* changed the title .*$", RegexOption.IGNORE_CASE), // issue title-change (username ≥1 char)
        Regex("^Some comments are outside the diff and can['\u2019]t be posted inline due to platform limitations\\.$", RegexOption.IGNORE_CASE), // both apostrophe variants
        Regex("^yesterday$", RegexOption.IGNORE_CASE),                  // relative timestamp
        Regex("^last (week|month|year)$", RegexOption.IGNORE_CASE),     // relative timestamp
        Regex("^(a|an) (minute|hour|day|week|month|year) ago$", RegexOption.IGNORE_CASE), // singular relative timestamp
        Regex("^\\d+% of \\d+ files? viewed$", RegexOption.IGNORE_CASE), // Files Changed progress indicator
        // Mid-body noise (blind-spot analysis: merge events, review events, severity labels)
        Regex("^.* approved these changes$", RegexOption.IGNORE_CASE),          // "username approved these changes"
        Regex("^.* dismissed .* review$", RegexOption.IGNORE_CASE),             // "username dismissed someone's review"
        Regex("^.* requested changes$", RegexOption.IGNORE_CASE),               // "username requested changes"
        Regex("^.* merged commit [a-f0-9]+ into .*$", RegexOption.IGNORE_CASE), // "user merged commit abc123 into main"
        Regex("^.* deleted the .* branch$", RegexOption.IGNORE_CASE),           // "user deleted the feature branch"
        Regex("^.* added \\d+ commits? .*$", RegexOption.IGNORE_CASE),          // "user added 3 commits month ago"
        Regex("^.* force-pushed the .* branch from .* to .*$", RegexOption.IGNORE_CASE), // force-push event
        Regex("^\\d+ checks? (passed|failed|pending|skipped)$", RegexOption.IGNORE_CASE), // "3 checks passed"
        Regex("^This was referenced .*$", RegexOption.IGNORE_CASE),             // "This was referenced Oct 3"
        Regex("^.* referenced this .*$", RegexOption.IGNORE_CASE),              // "user referenced this pull request"
        Regex("^This comment was marked as .*$", RegexOption.IGNORE_CASE),      // "This comment was marked as resolved"
        Regex("^Suggested fix$", RegexOption.IGNORE_CASE),                      // CodeRabbit suggested fix header
        Regex("^medium$", RegexOption.IGNORE_CASE),                             // standalone severity label
        Regex("^low$", RegexOption.IGNORE_CASE),                                // standalone severity label
        Regex("^high$", RegexOption.IGNORE_CASE),                               // standalone severity label
        Regex("^critical$", RegexOption.IGNORE_CASE),                           // standalone severity label
        Regex("^informational$", RegexOption.IGNORE_CASE),                      // standalone severity label
        // Copilot agent lifecycle events (discovered via real mobile PR page paste)
        Regex("^Copilot AI .+$", RegexOption.IGNORE_CASE),                       // "Copilot AI assigned X and Y N ago", "Copilot AI reviewed..."
        Regex("^Copilot (?:created|started|finished) .+$", RegexOption.IGNORE_CASE), // "Copilot created/started/finished work..."
        Regex("^.+ marked this pull request as (?:ready for review|draft).*$", RegexOption.IGNORE_CASE), // PR state change
        // Discovered via demo file analysis (real PR with bot reviews and CodeRabbit analysis)
        Regex("^.+ bot reviewed\\b", RegexOption.IGNORE_CASE),                   // "gemini-code-assist bot reviewed", "coderabbitai bot reviewed"
        Regex("^Repository: .+$"),                                                // CodeRabbit script-analysis metadata
        Regex("^Length of output: \\d+$"),                                        // CodeRabbit script-analysis metadata
        Regex("^\\d+ of \\d+ checks (?:passed|failed)$", RegexOption.IGNORE_CASE), // "146 of 148 checks passed"
        Regex("^\u26A0\uFE0F Potential issue.*$"),                               // ⚠️ Potential issue | 🟠 Major / 🟡 Minor
        Regex("^\uD83E\uDDF9 Nitpick comments.*$"),                              // 🧹 Nitpick comments (N)
        Regex("^Actionable comments posted: \\d+$", RegexOption.IGNORE_CASE),    // CodeRabbit review summary
        Regex("^\u270F\uFE0F Tip: "),                                             // ✏️ Tip: ... (CodeRabbit/LanguageTool tips)
        Regex("^You're all set[—\u2014\\s].*", RegexOption.IGNORE_CASE),         // "You're all set — the branch can be safely deleted."
        Regex("^Configuration used: .+$"),                                        // CodeRabbit run config
        Regex("^Review profile: \\w+$", RegexOption.IGNORE_CASE),                // CodeRabbit run config
        Regex("^Plan: (?:Pro|Free|Team|Enterprise)$", RegexOption.IGNORE_CASE),  // CodeRabbit plan info
        Regex("^Run ID: [a-f0-9-]+$"),                                            // CodeRabbit run ID
        Regex("^\uD83D\uDCE5 Commits$"),                                          // 📥 Commits section header
        Regex("^Reviewing files that changed from the base of the PR and between [a-f0-9]+ and [a-f0-9]+\\.$", RegexOption.IGNORE_CASE), // CodeRabbit commit range
        Regex("^.+ #\\d+: .+$"),                                                  // Cross-PR references in CodeRabbit "Possibly related PRs" section
        Regex("^[+-]\\d+\\.\\d{3}$"),                                             // European thousands-separator change counts (e.g. -6.106)
        // Discovered via double-pass blind-spot analysis
        Regex("^\\d+$"),                                                             // standalone numeric badges (commit count, PR number, etc.)
        Regex("^\\[grammar\\] ~\\d+.*$", RegexOption.IGNORE_CASE),                 // LanguageTool grammar annotation
        Regex("^\\[uncategorized\\] ~\\d+.*$", RegexOption.IGNORE_CASE),           // LanguageTool uncategorized annotation
        Regex("^Context: \\.\\.\\..*$"),                                             // LanguageTool context line
        Regex("^\\([A-Z][A-Z0-9_]{5,}\\)$"),                                       // LanguageTool/CodeRabbit error code (e.g. (QB_NEW_EN_...) (GITHUB))
        Regex("^Also applies to: \\d+-\\d+$", RegexOption.IGNORE_CASE),            // CodeRabbit cross-reference annotation
        Regex("^Based on learnings: .+$", RegexOption.IGNORE_CASE),                // CodeRabbit self-instruction line
        // General code review tool annotation formats (tool-agnostic)
        Regex("^\\d+-\\d+: .+$"),                                                   // line-range annotation title (e.g. "30-30: Prefer fail-fast...")
        Regex("^[^\\s]+\\.[a-zA-Z0-9]+\\s+\\(\\d+\\)$", RegexOption.IGNORE_CASE), // file-with-count header (e.g. "run-tests.mjs (1)") emitted by any code review tool
    ),
    preserveRegexes = listOf(
        Regex("^#+ "),                              // Headings
        Regex("^- "),                               // Bullets
        Regex("^\\* "),                             // Bullets
        Regex("^> "),                               // Blockquotes
        Regex("^```"),                              // Code blocks
        Regex("^[a-zA-Z0-9][a-zA-Z0-9_.-]*\\.[a-zA-Z0-9]+$"), // Filenames (must start with letter/digit to avoid matching -6.106)
        Regex("^\\+ "),                             // Diff additions
        Regex("^- "),                               // Diff deletions
        Regex("^@@ .* @@"),                         // Diff headers
    ),
    // Block-aware removal: detect and remove multi-line structural sections
    blockPatterns = listOf(
        // CodeRabbit review table: "Cohort / File(s)  Summary" to next blank line
        BlockPattern(
            start = Regex("^Cohort / File\\(s\\)\\s+Summary$", RegexOption.IGNORE_CASE),
            maxLines = 80,
        ),
        // CodeRabbit "Finishing Touches" section
        BlockPattern(
            start = Regex("^\u2728 Finishing Touches$", RegexOption.IGNORE_CASE),
            end = Regex("^$"),
            maxLines = 30,
        ),
        // Bot review header block: "[bot]" line to next blank line (maxLines 30 to catch longer reviews)
        BlockPattern(
            start = Regex("^.*\\[bot]$", RegexOption.IGNORE_CASE),
            maxLines = 30,
        ),
        // CodeRabbit "Suggested fix" block (plain header, ends at 📝 Committable suggestion)
        // Using the committable-suggestion line as end marker handles blank lines inside the code.
        BlockPattern(
            start = Regex("^Suggested fix$", RegexOption.IGNORE_CASE),
            end = Regex("^\uD83D\uDCDD Committable suggestion$"),
            maxLines = 60,
        ),
        // CodeRabbit "💡 Suggested fix" inline diff block (ends at next blank line)
        BlockPattern(
            start = Regex("^\uD83D\uDCA1 Suggested fix$", RegexOption.IGNORE_CASE),
            end = Regex("^$"),
            maxLines = 50,
        ),
        // "📝 Committable suggestion" + boilerplate block (‼️ IMPORTANT, Carefully review...) to blank line
        BlockPattern(
            start = Regex("^\uD83D\uDCDD Committable suggestion$"),
            end = Regex("^$"),
            maxLines = 30,
        ),
        // CodeRabbit summary block: "Summary by CodeRabbit" spans multiple paragraphs
        // (New Features / Improvements / Chores each separated by a single blank line).
        // maxConsecutiveBlankLines=2 lets the block skip single-blank separators and
        // only terminates when it hits the double-blank gap after the last section.
        BlockPattern(
            start = Regex("^Summary by CodeRabbit$", RegexOption.IGNORE_CASE),
            maxLines = 40,
            maxConsecutiveBlankLines = 2,
        ),
        // CodeRabbit "Walkthrough" section to next blank line
        BlockPattern(
            start = Regex("^Walkthrough$", RegexOption.IGNORE_CASE),
            maxLines = 60,
        ),
        // CodeRabbit "Poem" section to next blank line
        BlockPattern(
            start = Regex("^Poem$", RegexOption.IGNORE_CASE),
            maxLines = 20,
        ),
        // "Sequence Diagram(s)" section to next blank line
        BlockPattern(
            start = Regex("^Sequence Diagram\\(s\\)$", RegexOption.IGNORE_CASE),
            maxLines = 60,
        ),
        // "Suggested change(s)" UI block: header + original/replacement, maxLines covers long diff blocks
        BlockPattern(
            start = Regex("^(?:\uD83D\uDCA1 )?Suggested changes?$", RegexOption.IGNORE_CASE),
            maxLines = 25,
        ),
        // CodeRabbit script execution trace: "🏁 Script executed:" to "Length of output: N"
        // This removes the entire shell-script body including bash commands that would
        // otherwise be preserved by the preserve-regexes (e.g. lines starting with #).
        BlockPattern(
            start = Regex("^\uD83C\uDFC1 Script executed:$"),
            end = Regex("^Length of output: \\d+$"),
            maxLines = 80,
        ),
        // "🚥 Pre-merge checks" table: removes the failed/passed check table block
        BlockPattern(
            start = Regex("^\uD83D\uDEA5 Pre-merge checks"),
            end = Regex("^$"),
            maxLines = 20,
        ),
        // "❤️ Share" social-share section: removes X / Mastodon / Reddit / LinkedIn buttons
        BlockPattern(
            start = Regex("^\u2764\uFE0F Share$"),
            end = Regex("^$"),
            maxLines = 10,
        ),
        // "🤖 Prompt for AI Agents" paragraph: header line plus its instruction text to next blank
        BlockPattern(
            start = Regex("^\uD83E\uDD16 Prompt for AI Agents$", RegexOption.IGNORE_CASE),
            end = Regex("^$"),
            maxLines = 25,
        ),
        // "📥 Commits" reviewing section header + range description
        BlockPattern(
            start = Regex("^\uD83D\uDCE5 Commits$"),
            end = Regex("^$"),
            maxLines = 5,
        ),
    ),
    // Block-aware protection: content blocks that must survive all cleanup rules.
    // Code fences are always protected by the engine; these patterns protect
    // additional valuable LLM-context blocks that could otherwise be hit by
    // future removal rules.
    preserveBlockPatterns = listOf(
        // Diff hunks: @@ header + the entire diff body until the next blank line.
        // preserveRegexes already protects '+'/'-' diff lines individually, but
        // context lines (starting with a space) are not — this block pattern
        // guarantees the whole hunk survives as a unit.
        BlockPattern(
            start = Regex("^@@ .* @@"),
            maxLines = 80,
        ),
    ),
)
