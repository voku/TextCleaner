package com.voku.textcleaner.core.rules

import com.voku.textcleaner.core.CleanupRuleSet

/**
 * Generic cleanup rules for common web page chrome.
 * Direct port of `src/core/rules/generic.ts`.
 */
val GenericRuleSet = CleanupRuleSet(
    name = "Generic",
    prefixExactLines = listOf(
        "Skip to content",
        "Sign in",
        "Home",
        "Pricing",
        "Search",
        "Docs",
        "Menu",
        "Navigation",
        "Log in",
        "Sign up",
        "Register",
        "Contact us",
        "About",
        "Blog",
        "Support",
        "FAQ",
    ),
    suffixExactLines = listOf(
        "Terms",
        "Privacy",
        "Contact",
        "Footer",
        "About us",
        "Careers",
        "Cookie Policy",
        "All rights reserved",
        "Terms of Service",
        "Privacy Policy",
        "Sitemap",
        "Help Center",
    ),
    prefixRegexes = listOf(
        Regex("^Sign up for free$", RegexOption.IGNORE_CASE),
        Regex("^Log in$", RegexOption.IGNORE_CASE),
    ),
    suffixRegexes = listOf(
        Regex("^\u00A9 \\d{4} .*$", RegexOption.IGNORE_CASE), // Copyright lines
    ),
    removeAnywhereExactLines = listOf(
        "Advertisement",
        "Share this article",
        "Tweet",
        "Share on Facebook",
        "Share on LinkedIn",
        "Pin it",
        "Email",
        "Print",
        "Subscribe",
        "Leave a comment",
    ),
    removeAnywhereContains = listOf(
        "Subscribe to our newsletter",
        "Join our mailing list",
        "Enter your email",
    ),
    preserveRegexes = listOf(
        Regex("^#+ "),          // Headings
        Regex("^- "),           // Bullets
        Regex("^\\* "),         // Bullets
        Regex("^> "),           // Blockquotes
        Regex("^```"),          // Code blocks
    ),
)
