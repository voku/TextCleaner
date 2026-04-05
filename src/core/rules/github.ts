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
    'Assignees',
    'Still in progress?',
    '+1 more reviewer',
    'Reviewers',
    'ProTip! Add comments to specific lines under Files changed.',
    'ProTip! Add .patch or .diff to the end of URLs for Git\u2019s plaintext views.',
    'Remember, contributions to this repository should follow our GitHub Community Guidelines.',
    'Add your comment here...',
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
    /^@.+$/i,
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
    'Read all affected files',
    'Merged',
    'Outdated',
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
  ],
  preserveRegexes: [
    /^#+ /, // Headings
    /^- /, // Bullets
    /^\* /, // Bullets
    /^> /, // Blockquotes
    /^```/, // Code blocks
    /^[a-zA-Z0-9_.-]+\.[a-zA-Z0-9]+$/, // Filenames
    /^\+ /, // Diff additions
    /^- /, // Diff deletions
    /^@@ .* @@/, // Diff headers
  ],
  // Block-aware removal: detect and remove multi-line structural sections
  blockPatterns: [
    // CodeRabbit review table: "Cohort / File(s)  Summary" to next blank line
    {
      start: /^Cohort \/ File\(s\)\tSummary$/i,
      maxLines: 80,
    },
    // CodeRabbit "Finishing Touches" section
    {
      start: /^\u2728 Finishing Touches$/i,
      end: /^$/,
      maxLines: 30,
    },
    // Bot review header block: "[bot]" line to next blank line
    {
      start: /^.*\[bot\]$/i,
      maxLines: 10,
    },
    // CodeRabbit "Suggested fix" block
    {
      start: /^Suggested fix$/i,
      end: /^$/,
      maxLines: 40,
    },
  ],
};
