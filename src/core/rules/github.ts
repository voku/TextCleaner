import { CleanupRuleSet } from '../types';

export const GitHubRuleSet: CleanupRuleSet = {
  name: 'GitHub PR/Issue',
  prefixExactLines: [
    'Skip to content',
    'Navigation Menu',
    'Repository navigation',
    'Code',
    'Issues',
    'Pull requests',
    'Agents',
    'Discussions',
    'Actions',
    'Projects',
    'Wiki',
    'Security and quality',
    'Notifications',
    'Fork',
    'Star',
    'Security',
    'Insights',
    'Settings',
    'Sign in',
    'Sign up',
    // Lowercase variants (translation-copy mode where page text is downcased)
    'More repository items',
    'more repository items',
  ],
  suffixExactLines: [
    'Terms',
    'Privacy',
    'Docs',
    'Contact GitHub',
    'Contact',
    'Pricing',
    'API',
    'Training',
    'Blog',
    'About',
    'Status',
    'Security',
    'Manage cookies',
    'Do not share my personal information',
    'Community',
    'Footer navigation',
    'Footer',
    '1 participant',
    'You\u2019re receiving notifications because you were mentioned.',
    'You\u2019re receiving notifications because you were assigned.',
    'You\u2019re receiving notifications because you are watching this repository.',
    'You\u2019re receiving notifications because you modified the open/close state.',
    'Unsubscribe',
    'Customize',
    'Notifications',
    'None yet',
    'Successfully merging this pull request may close these issues.',
    'Development',
    'No milestone',
    'Milestone',
    'Projects',
    'Labels',
    'No one\u2014',
    'No one\u2014assign yourself',
    'Assignees',
    'Still in progress?',
    '+1 more reviewer',
    'Reviewers',
    'ProTip! Add comments to specific lines under Files changed.',
    'ProTip! Add .patch or .diff to the end of URLs for Git\u2019s plaintext views.',
    'Remember, contributions to this repository should follow our GitHub Community Guidelines.',
    'Add your comment here...',
    'Paste, drop, or click to add files',
    'Comment',
    'Add a comment',
    'You can also merge this with the command line.',
    'Merging can be performed automatically.',
    'No conflicts with base branch',
    'Contributor',
    'commented',
  ],
  prefixRegexes: [
    /^(?:- )*Skip to content$/i,
    /^Search or jump to\.\.\.$/i,
    /^\d+$/i,
    /^\(\d+\)$/i,
  ],
  suffixRegexes: [
    /^\u00A9 \d{4} GitHub, Inc\.$/i,
    /^@(?!@).+$/i, // @handle lines — note: ^@ not ^@@ so diff headers (@@ ... @@) are NOT matched
    /^\+?\d+ more reviewers?$/i,
  ],
  removeAnywhereExactLines: [
    'Copy link',
    'Quote reply',
    'Reply',
    'Edit',
    'Delete',
    'Show options',
    'Hide options',
    'Add reaction',
    'React',
    'Rate limit exceeded',
    '\u231B How to resolve this issue?',
    '\uD83D\uDEA6 How do rate limits work?',
    '\u2139\uFE0F Review info',
    '\u2728 Finishing Touches',
    'Thanks for using CodeRabbit! It\'s free for OSS, and your support helps us grow. If you like it, consider giving us a shout-out.',
    '\u2764\uFE0F Share',
    'Comment @coderabbitai help to get the list of available commands and usage tips.',
    'This branch has not been deployed',
    'No deployments',
    'Merge info',
    'Some checks were not successful',
    'failing checks',
    'skipped checks',
    'neutral checks',
    'successful checks',
    '\u2022',
    'left a comment',
    'Code Review',
    'Walkthrough',
    'Changes',
    'Cohort / File(s)\tSummary',
    'Estimated code review effort',
    'Possibly related PRs',
    '\uD83D\uDCA1 Codex Review',
    'Here are some automated review suggestions for this pull request.',
    '\u2139\uFE0F About Codex in GitHub',
    '\uD83E\uDD16 Prompt for all review comments with AI agents',
    'Owner',
    'commented',
    'Contributor',
    'Review requested',
    'Copilot code review',
    'Copilot requested your review on this pull request.',
    'Copilot uses AI. Check for mistakes.',
    'Mention @copilot in a comment to make changes to this pull request.',
    'Copilot AI',
    'Review has been requested on this pull request. It is not required to merge. Learn more about requesting a pull request review.',
    'Read all affected files',
    'Merged',
    'Outdated',
    // PR header / status chrome (appear after prefix cut-off in copy-mode pastes)
    'code',     // PR tab label (lowercase copy-mode variant)
    'merged',   // PR status badge (lowercase)
    'from',     // connector word from "merged N commits into main from branch"
    // CodeRabbit section separators and meta-labels
    '---',                  // horizontal rule separator between review sections
    // Code review tool section labels (general — any structured review tool uses these)
    'Inline comments:',     // structural divider within consolidated review output
    'Nitpick comments:',    // structural divider (minor-suggestions section label)
    // Discovered via static analysis of real PR samples
    'Conversation',
    'Conversations',
    'Codex Task',
    'Summary by CodeRabbit',
    'Sequence Diagram(s)',
    'Poem',
    'CodeRabbit',
    'Release Notes',
    // Discovered via analysis of GitHub Issue, Repo, and Files Changed pages
    'Type \'/\' to search',
    'Sponsor this project',
    'No packages published',
    'Open in github.dev',
    'Open with GitHub Desktop',
    'View all files',
    'View all releases',
    'Nothing to show',
    // Files Changed tab UI chrome
    'Filter changed files',
    'Show file tree',
    'Hide file tree',
    'Expand all',
    'Collapse all',
    'Jump to file',
    'Load diff',
    'Viewed',
    'This file was deleted.',
    // Issue / PR page chrome
    'Jump to bottom',
    'opened this issue',
    'Leave a comment',
    'Lock conversation',
    'Delete issue',
    'Linked pull requests',
    'Markdown is supported',
    'Attach files by dragging & dropping, selecting or pasting them.',
    'Add a comment to start a discussion',
    'You are not currently watching this repository',
    'You must be logged in to vote',
    'No issues match the current filter',
    'No branches or tags',
    'Label issues and pull requests for new contributors',
    // GitHub sign-in / auth prompts
    'Have a question about this project? Sign up for a free GitHub account to open an issue and contact its maintainers and the community.',
    'Sign up for GitHub',
    'Already on GitHub? Sign in to your account',
    'Pick a username',
    // Mid-body noise (blind-spot analysis: merge metadata, status banners, review states)
    'Caution',
    'Review failed',
    'The pull request is closed.',
    'The pull request is closed',
    'This pull request is closed.',
    'This pull request is closed',
    'Open',
    'Closed',
    'Draft',
    'Suggested change',
    'Suggested changes',
    'Show resolved',
    'Hide resolved',
    'Resolve conversation',
    'Unresolve conversation',
    'Approved',
    'Changes requested',
    'Dismissed',
    'Pending',
    'Review required',
    'All checks have passed',
    'All checks have failed',
    'Some checks haven\u2019t completed yet',
    'Merging is blocked',
    'This branch has no conflicts with the base branch',
    'This branch is out-of-date with the base branch',
    'Rebase and merge',
    'Squash and merge',
    'Create a merge commit',
    'Confirm merge',
    'Confirm squash and merge',
    'Confirm rebase and merge',
    'This branch is up to date with the base branch.',
    // Discovered via demo file analysis (real PR page with bot reviews and CodeRabbit)
    'View reviewed changes',
    'Commit suggestion',
    '\uD83D\uDCDD Committable suggestion',
    '\u203C\uFE0F IMPORTANT',
    'Carefully review the code before committing. Ensure that it accurately replaces the highlighted code, contains no missing lines, and has no issues with indentation. Thoroughly test & benchmark the code to ensure it meets the requirements.',
    'Verify each finding against the current code and only fix it if needed.',
    '\uD83C\uDFC1 Script executed:',
    '\uD83E\uDDE9 Analysis chain',
    '\uD83E\uDDF0 Tools',
    '\uD83E\uDE9B LanguageTool',
    'Pull request successfully merged and closed',
    'Delete branch',
    '\uD83E\uDE84 Autofix (Beta)',
    'Fix all unresolved CodeRabbit comments on this PR:',
    'Push a commit to this branch (recommended)',
    'Create a new PR with the fixes',
    '\u2699\uFE0F Run configuration',
    // Codex bot introduction lines
    'Your team has set up Codex to review pull requests in this repo. Reviews are triggered when you',
    'Open a pull request for review',
    'Mark a draft as ready',
    'Comment "@codex review".',
    'If Codex has suggestions, it will comment; otherwise it will react with \uD83D\uDC4D.',
    'Codex can also answer questions or update the PR. Try commenting "@codex address that feedback".',
    // Single-word UI labels
    'edited',
    'Revert',
  ],
  removeAnywhereContains: [],
  removeAnywhereRegexes: [
    /^.* commented on .*$/i,
    /^.* requested a review from .*$/i,
    /^.* assigned .* to .*$/i,
    /^.* added the .* label .*$/i,
    /^.* removed the .* label .*$/i,
    /^.* modified the milestones: .*$/i,
    /^.* mentioned this issue .*$/i,
    /^@.+ has exceeded the limit for the number of commits that can be reviewed per hour.*$/i,
    /^Your organization is not enrolled in usage-based pricing.*$/i,
    /^\d+ failing, \d+ neutral, \d+ skipped, \d+ successful checks$/i,
    /^.*\(pull_request\).*$/i,
    /^.*\(pull_request_review\).*$/i,
    /^.*Successful in \d+[sm].*$/i,
    /^.*Failing after \d+[sm].*$/i,
    /^.*Skipped \d+ (minutes|hours|days) ago.*$/i,
    /^Code scanning results \/ CodeQL.*$/i,
    /^CodeQL \/ Analyze.*$/i,
    /^CodeRabbit \S+ Review.*$/i,
    /^Mend Security Check.*$/i,
    /^Conversation\d+ \(\d+\)$/i,
    /^Commits\d+ \(\d+\)$/i,
    /^Checks\d+ \(\d+\)$/i,
    /^Files changed\d+ \(\d+\)$/i,
    /^Lines changed: \d+ additions (?:&|&amp;) \d+ deletions$/i,
    /^#\d+$/i,
    /^merged \d+ commits? into$/i,
    /^wants to merge \d+ commits? into$/i,
    /^.* wants to merge \d+ commits? into .*$/i,
    /^Reviewed commit: [a-f0-9]+$/i,
    /^Comment on lines \+\d+ to \+?\d+$/i,
    /^\u26A0\uFE0F Outside diff range comments \(\d+\)$/i,
    /^DGS Integration Tests \/ .*$/i,
    /^\d+ (minute|hour|day|month|year)s? ago$/i,
    /^.* reviewed \d+ (minute|hour|day|month|year)s? ago$/i,
    /^.*\[bot\]$/i,
    /^.* bot$/i,
    /^Useful\? React with \uD83D\uDC4D \/ \uD83D\uDC4E\.$/i,
    /^Reply\.\.\.$/i,
    /^@.+\s+Reply\.\.\.$/i,
    /^\+\d+$/,
    /^-\d+$/,
    /^\d+ participants?$/i,
    // Discovered via static analysis of real PR samples
    /^\uD83D\uDEA5 Pre-merge checks.*$/,                   // pre-merge checks summary line
    /^\uD83C\uDFAF \d+.*\u23F1\uFE0F.*$/,                 // CodeRabbit review effort value
    /^\uD83E\uDD16 Hi @.+/i,                               // GitHub Actions bot acknowledgment
    /^@.+Reply\.\.\.$/i,                                    // tab-less "Reply..." button variant
    /^P[0-9] Badge .+/i,                                    // Codex/review priority badge lines
    /^@[a-zA-Z0-9][a-zA-Z0-9._-]*$/i,                      // standalone @handle lines (nav chrome)
    /^(?:[a-f0-9]{7}|[a-f0-9]{40})$/,                     // short (7) and full (40) commit SHAs only
    // Discovered via analysis of GitHub Issue, Repo, and Files Changed pages
    /^Used by \d+( users?)?$/i,                             // GitHub repo sidebar stat
    /^\d+ contributors?$/i,                                 // GitHub repo contributors count
    /^Commits \d+$/i,                                       // Files Changed tab bar (space format)
    /^Checks \d+$/i,                                        // Files Changed tab bar (space format)
    /^Files changed \d+$/i,                                 // Files Changed tab bar (space format)
    /^Showing \d+ changed files? with \d+ additions? and \d+ deletions?\.$/i, // diff summary
    /^\u00B7\s+\d+ comments?$/i,                            // middle-dot separator (U+00B7)
    /^\u00B7$/,                                              // standalone middle-dot separator
    /^[a-zA-Z0-9][a-zA-Z0-9._-]* changed the title .*$/i,  // issue title-change event
    /^Some comments are outside the diff and can['\u2019]t be posted inline due to platform limitations\.$/i,
    /^yesterday$/i,                                         // relative timestamp
    /^last (week|month|year)$/i,                            // relative timestamp
    /^(a|an) (minute|hour|day|week|month|year) ago$/i,     // singular relative timestamp
    /^\d+% of \d+ files? viewed$/i,                        // Files Changed progress indicator
    // Mid-body noise (blind-spot analysis: merge events, review events, severity labels)
    /^.* approved these changes$/i,                         // "username approved these changes"
    /^.* dismissed .* review$/i,                            // "username dismissed someone's review"
    /^.* requested changes$/i,                              // "username requested changes"
    /^.* merged commit [a-f0-9]+ into .*$/i,               // "user merged commit abc123 into main"
    /^.* deleted the .* branch$/i,                          // "user deleted the feature branch"
    /^.* added \d+ commits? .*$/i,                          // "user added 3 commits month ago"
    /^.* force-pushed the .* branch from .* to .*$/i,      // force-push event
    /^\d+ checks? (passed|failed|pending|skipped)$/i,      // "3 checks passed"
    /^This was referenced .*$/i,                            // "This was referenced Oct 3"
    /^.* referenced this .*$/i,                             // "user referenced this pull request"
    /^This comment was marked as .*$/i,                     // "This comment was marked as resolved"
    /^Suggested fix$/i,                                     // CodeRabbit suggested fix header
    /^medium$/i,                                            // standalone severity label
    /^low$/i,                                               // standalone severity label
    /^high$/i,                                              // standalone severity label
    /^critical$/i,                                          // standalone severity label
    /^informational$/i,                                     // standalone severity label
    // Copilot agent lifecycle events
    /^Copilot AI .+$/i,                                     // "Copilot AI assigned X and Y N ago", "Copilot AI reviewed..."
    /^Copilot (?:created|started|finished) .+$/i,           // "Copilot created this pull request...", "Copilot started/finished work..."
    /^.+ marked this pull request as (?:ready for review|draft).*$/i, // "user marked this pull request as ready for review"
    // Discovered via demo file analysis (real PR with bot reviews and CodeRabbit analysis)
    /^.+ bot reviewed\b/i,                                  // "gemini-code-assist bot reviewed", "coderabbitai bot reviewed"
    /^Repository: .+$/,                                     // CodeRabbit script-analysis metadata
    /^Length of output: \d+$/,                              // CodeRabbit script-analysis metadata
    /^\d+ of \d+ checks (?:passed|failed)$/i,               // "146 of 148 checks passed"
    /^\u26A0\uFE0F Potential issue.*$/,                     // ⚠️ Potential issue | 🟠 Major / 🟡 Minor
    /^\uD83E\uDDF9 Nitpick comments.*$/,                    // 🧹 Nitpick comments (N)
    /^Actionable comments posted: \d+$/i,                   // CodeRabbit review summary
    /^\u270F\uFE0F Tip: /,                                  // ✏️ Tip: ... (CodeRabbit/LanguageTool tips)
    /^You're all set[—\u2014\s].*/i,                        // "You're all set — the branch can be safely deleted."
    /^Configuration used: .+$/,                             // CodeRabbit run config
    /^Review profile: \w+$/i,                               // CodeRabbit run config
    /^Plan: (?:Pro|Free|Team|Enterprise)$/i,                // CodeRabbit plan info
    /^Run ID: [a-f0-9-]+$/,                                 // CodeRabbit run ID
    /^\uD83D\uDCE5 Commits$/,                               // 📥 Commits section header
    /^Reviewing files that changed from the base of the PR and between [a-f0-9]+ and [a-f0-9]+\.$/i, // CodeRabbit commit range
    /^.+ #\d+: .+$/,                                        // Cross-PR references in CodeRabbit "Possibly related PRs" section
    /^[+-]\d+\.\d{3}$/,                                     // European thousands-separator change counts (e.g. -6.106)
    // Discovered via double-pass blind-spot analysis
    /^\d+$/,                                                 // standalone numeric badges (commit count, PR number, etc.)
    /^\[grammar\] ~\d+.*$/i,                                 // LanguageTool grammar annotation
    /^\[uncategorized\] ~\d+.*$/i,                           // LanguageTool uncategorized annotation
    /^Context: \.\.\..+$/,                                   // LanguageTool context line
    /^\([A-Z][A-Z0-9_]{5,}\)$/,                             // LanguageTool/CodeRabbit error code (e.g. (QB_NEW_EN_...) (GITHUB))
    /^Also applies to: \d+-\d+$/i,                          // CodeRabbit cross-reference annotation
    /^Based on learnings: .+$/i,                             // CodeRabbit self-instruction line
    // General code review tool annotation formats (tool-agnostic)
    /^\d+-\d+: .+$/,                                         // line-range annotation title (e.g. "30-30: Prefer fail-fast...")
    /^[^\s]+\.[a-z0-9]+\s+\(\d+\)$/i,                       // file-with-count header (e.g. "run-tests.mjs (1)") emitted by any code review tool before per-file comments
  ],
  preserveRegexes: [
    /^#+ /, // Headings
    /^- /, // Bullets
    /^\* /, // Bullets
    /^> /, // Blockquotes
    /^```/, // Code blocks
    /^[a-zA-Z0-9][a-zA-Z0-9_.-]*\.[a-zA-Z0-9]+$/, // Filenames (must start with letter/digit to avoid matching -6.106)
    /^\+ /, // Diff additions
    /^- /, // Diff deletions
    /^@@ .* @@/, // Diff headers
  ],
  // Block-aware removal: detect and remove multi-line structural sections
  blockPatterns: [
    // CodeRabbit review table: "Cohort / File(s)  Summary" to next blank line
    {
      start: /^Cohort \/ File\(s\)\s+Summary$/i,
      maxLines: 80,
    },
    // CodeRabbit "Finishing Touches" section
    {
      start: /^\u2728 Finishing Touches$/i,
      end: /^$/,
      maxLines: 30,
    },
    // Bot review header block: "[bot]" line to next blank line (maxLines 30 to catch longer reviews)
    {
      start: /^.*\[bot\]$/i,
      maxLines: 30,
    },
    // CodeRabbit "Suggested fix" block (plain header, ends at 📝 Committable suggestion)
    // Using the committable-suggestion line as end marker handles blank lines inside the code.
    {
      start: /^Suggested fix$/i,
      end: /^\uD83D\uDCDD Committable suggestion$/,
      maxLines: 60,
    },
    // CodeRabbit "💡 Suggested fix" inline diff block (ends at next blank line)
    {
      start: /^\uD83D\uDCA1 Suggested fix$/i,
      end: /^$/,
      maxLines: 50,
    },
    // "📝 Committable suggestion" + boilerplate block (‼️ IMPORTANT, Carefully review...) to blank line
    {
      start: /^\uD83D\uDCDD Committable suggestion$/,
      end: /^$/,
      maxLines: 30,
    },
    // CodeRabbit summary block: "Summary by CodeRabbit" spans multiple paragraphs
    // (New Features / Improvements / Chores each separated by a single blank line).
    // maxConsecutiveBlankLines:2 lets the block skip single-blank separators and
    // only terminates when it hits the double-blank gap after the last section.
    {
      start: /^Summary by CodeRabbit$/i,
      maxLines: 40,
      maxConsecutiveBlankLines: 2,
    },
    // CodeRabbit "Walkthrough" section to next blank line
    {
      start: /^Walkthrough$/i,
      maxLines: 60,
    },
    // CodeRabbit "Poem" section to next blank line
    {
      start: /^Poem$/i,
      maxLines: 20,
    },
    // "Sequence Diagram(s)" section to next blank line
    {
      start: /^Sequence Diagram\(s\)$/i,
      maxLines: 60,
    },
    // "Suggested change(s)" UI block: header + original/replacement, maxLines covers long diff blocks
    {
      start: /^(?:\uD83D\uDCA1 )?Suggested changes?$/i,
      maxLines: 25,
    },
    // CodeRabbit script execution trace: "🏁 Script executed:" to "Length of output: N"
    // This removes the entire shell-script body including bash commands that would
    // otherwise be preserved by the preserve-regexes (e.g. lines starting with #).
    {
      start: /^\uD83C\uDFC1 Script executed:$/,
      end: /^Length of output: \d+$/,
      maxLines: 80,
    },
    // "🚥 Pre-merge checks" table: removes the failed/passed check table block
    {
      start: /^\uD83D\uDEA5 Pre-merge checks/,
      end: /^$/,
      maxLines: 20,
    },
    // "❤️ Share" social-share section: removes X / Mastodon / Reddit / LinkedIn buttons
    {
      start: /^\u2764\uFE0F Share$/,
      end: /^$/,
      maxLines: 10,
    },
    // "🤖 Prompt for AI Agents" paragraph: header line plus its instruction text to next blank
    {
      start: /^\uD83E\uDD16 Prompt for AI Agents$/i,
      end: /^$/,
      maxLines: 25,
    },
    // "📥 Commits" reviewing section header + range description
    {
      start: /^\uD83D\uDCE5 Commits$/,
      end: /^$/,
      maxLines: 5,
    },
  ],
  // Block-aware protection: content blocks that must survive all cleanup rules.
  // Code fences are always protected by the engine; these patterns protect
  // additional valuable LLM-context blocks that could otherwise be hit by
  // future removal rules.
  preserveBlockPatterns: [
    // Diff hunks: @@ header + the entire diff body until the next blank line.
    // preserveRegexes already protects '+'/'-' diff lines individually, but
    // context lines (starting with a space) are not — this block pattern
    // guarantees the whole hunk survives as a unit.
    {
      start: /^@@ .* @@/,
      maxLines: 80,
    },
  ],
};
