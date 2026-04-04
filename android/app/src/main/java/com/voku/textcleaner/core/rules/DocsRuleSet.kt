package com.voku.textcleaner.core.rules

import com.voku.textcleaner.core.CleanupRuleSet

/**
 * Documentation page cleanup rules.
 * Direct port of `src/core/rules/docs.ts`.
 */
val DocsRuleSet = CleanupRuleSet(
    name = "Documentation",
    prefixExactLines = GenericRuleSet.prefixExactLines + listOf(
        "Table of contents",
        "On this page",
        "Contents",
        "Search docs",
        "Search documentation",
        "Documentation",
    ),
    suffixExactLines = GenericRuleSet.suffixExactLines + listOf(
        "Back to top",
        "Was this page helpful?",
        "Was this helpful?",
        "Edit this page",
        "Open on GitHub",
        "Copy page",
        "Previous",
        "Next",
    ),
    prefixRegexes = GenericRuleSet.prefixRegexes + listOf(
        Regex("^Breadcrumbs$", RegexOption.IGNORE_CASE),
        Regex("^Version \\d+(?:\\.\\d+)*$", RegexOption.IGNORE_CASE),
    ),
    suffixRegexes = GenericRuleSet.suffixRegexes + listOf(
        Regex("^Last updated .*$", RegexOption.IGNORE_CASE),
        Regex("^Updated .* ago$", RegexOption.IGNORE_CASE),
    ),
    removeAnywhereExactLines = GenericRuleSet.removeAnywhereExactLines + listOf(
        "Table of contents",
        "On this page",
        "Contents",
        "Edit this page",
        "Open on GitHub",
        "Copy page",
        "Back to top",
        "Previous",
        "Next",
        "Was this page helpful?",
        "Was this helpful?",
    ),
    removeAnywhereContains = GenericRuleSet.removeAnywhereContains + listOf(
        "Edit this page",
        "Back to top",
        "Was this page helpful",
        "Ask AI",
    ),
    removeAnywhereRegexes = listOf(
        Regex("^Copy page$", RegexOption.IGNORE_CASE),
        Regex("^\\d+\\s+min read$", RegexOption.IGNORE_CASE),
    ),
    preserveRegexes = GenericRuleSet.preserveRegexes + listOf(
        Regex("^\\d+\\.\\s+"),
    ),
)
