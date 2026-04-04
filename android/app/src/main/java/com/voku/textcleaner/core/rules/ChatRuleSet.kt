package com.voku.textcleaner.core.rules

import com.voku.textcleaner.core.CleanupRuleSet

/**
 * Chat transcript cleanup rules (Slack, Discord, Teams, etc.).
 * Direct port of `src/core/rules/chat.ts`.
 */
val ChatRuleSet = CleanupRuleSet(
    name = "Chat",
    prefixExactLines = GenericRuleSet.prefixExactLines + listOf(
        "Messages",
        "Jump to present",
        "New messages",
        "Thread",
    ),
    suffixExactLines = GenericRuleSet.suffixExactLines + listOf(
        "Type a message",
        "Reply in thread",
        "Add reaction",
        "Seen",
        "Delivered",
    ),
    prefixRegexes = GenericRuleSet.prefixRegexes + listOf(
        Regex("^new messages?$", RegexOption.IGNORE_CASE),
    ),
    suffixRegexes = GenericRuleSet.suffixRegexes + listOf(
        Regex("^Typing(?:\\.\\.\\.|…)?$", RegexOption.IGNORE_CASE),
    ),
    removeAnywhereExactLines = GenericRuleSet.removeAnywhereExactLines + listOf(
        "Reply in thread",
        "Add reaction",
        "Seen",
        "Delivered",
        "Typing\u2026",
        "Typing...",
    ),
    removeAnywhereContains = GenericRuleSet.removeAnywhereContains + listOf(
        "joined the channel",
        "left the channel",
        "started a call",
        "missed a call",
    ),
    removeAnywhereRegexes = listOf(
        Regex("^Today$", RegexOption.IGNORE_CASE),
        Regex("^Yesterday$", RegexOption.IGNORE_CASE),
    ),
    preserveRegexes = GenericRuleSet.preserveRegexes + listOf(
        Regex("^\\[?\\d{1,2}:\\d{2}(?:\\s*[AP]M)?]?\\s*[\\w\\s.-]+:", RegexOption.IGNORE_CASE),
        Regex("^[\\w\\s.-]+\\s+\\d{1,2}:\\d{2}\\s*[AP]M$", RegexOption.IGNORE_CASE),
    ),
)
