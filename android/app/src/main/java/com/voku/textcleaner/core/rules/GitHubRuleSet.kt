package com.voku.textcleaner.core.rules

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
        "Assignees",
        "Still in progress?",
        "+1 more reviewer",
        "Reviewers",
        "ProTip! Add comments to specific lines under Files changed.",
        "ProTip! Add .patch or .diff to the end of URLs for Git\u2019s plaintext views.",
        "Remember, contributions to this repository should follow our GitHub Community Guidelines.",
        "Add your comment here...",
        "Comment",
        "Add a comment",
        "You can also merge this with the command line.",
        "Merging can be performed automatically.",
        "No conflicts with base branch",
        "Contributor",
        "commented",
    ),
    prefixRegexes = listOf(
        Regex("^(?:- - - )?Skip to content$", RegexOption.IGNORE_CASE),
        Regex("^Search or jump to\\.\\.\\.$", RegexOption.IGNORE_CASE),
        Regex("^\\d+$", RegexOption.IGNORE_CASE),
        Regex("^\\(\\d+\\)$", RegexOption.IGNORE_CASE),
    ),
    suffixRegexes = listOf(
        Regex("^\u00A9 \\d{4} GitHub, Inc\\.$", RegexOption.IGNORE_CASE),
        Regex("^@.+$", RegexOption.IGNORE_CASE),
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
        "Read all affected files",
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
        Regex("^Lines changed: \\d+ additions & \\d+ deletions$", RegexOption.IGNORE_CASE),
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
        Regex("^[a-f0-9]{7}$|^[a-f0-9]{40}$"),                          // short (7) and full (40) commit SHAs only
        // Discovered via analysis of GitHub Issue, Repo, and Files Changed pages
        Regex("^Used by \\d+( users?)?$", RegexOption.IGNORE_CASE),    // GitHub repo sidebar stat
        Regex("^\\d+ contributors?$", RegexOption.IGNORE_CASE),         // GitHub contributors count
        Regex("^Commits \\d+$", RegexOption.IGNORE_CASE),               // Files Changed tab bar (space format)
        Regex("^Checks \\d+$", RegexOption.IGNORE_CASE),                // Files Changed tab bar (space format)
        Regex("^Files changed \\d+$", RegexOption.IGNORE_CASE),         // Files Changed tab bar (space format)
        Regex("^Showing \\d+ changed files? with \\d+ additions? and \\d+ deletions?\\.$", RegexOption.IGNORE_CASE), // diff summary
        Regex("^\u00B7\\s+\\d+ comments?$", RegexOption.IGNORE_CASE),  // "· N comments" middle-dot separator
        Regex("^\u00B7$"),                                               // standalone middle-dot separator
        Regex("^[a-zA-Z0-9][a-zA-Z0-9._-]* changed the title .*$", RegexOption.IGNORE_CASE), // issue title-change (username prefix required)
        Regex("^Some comments are outside the diff and can['\u2019]t be posted inline due to platform limitations\\.$", RegexOption.IGNORE_CASE), // both apostrophe variants
        Regex("^yesterday$", RegexOption.IGNORE_CASE),                  // relative timestamp
        Regex("^last (week|month|year)$", RegexOption.IGNORE_CASE),     // relative timestamp
        Regex("^(a|an) (minute|hour|day|week|month|year) ago$", RegexOption.IGNORE_CASE), // singular relative timestamp
        Regex("^\\d+% of \\d+ files? viewed$", RegexOption.IGNORE_CASE), // Files Changed progress indicator
    ),
    preserveRegexes = listOf(
        Regex("^#+ "),                              // Headings
        Regex("^- "),                               // Bullets
        Regex("^\\* "),                             // Bullets
        Regex("^> "),                               // Blockquotes
        Regex("^```"),                              // Code blocks
        Regex("^[a-zA-Z0-9_.-]+\\.[a-zA-Z0-9]+$"), // Filenames
        Regex("^\\+ "),                             // Diff additions
        Regex("^- "),                               // Diff deletions
        Regex("^@@ .* @@"),                         // Diff headers
    ),
)
