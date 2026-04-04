package com.voku.textcleaner

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.voku.textcleaner.ui.MainScreen
import com.voku.textcleaner.ui.theme.TextCleanerTheme

/**
 * Single-activity entry point for TextCleaner.
 *
 * Handles three launch modes:
 * 1. Normal launcher tap — user pastes text manually.
 * 2. `PROCESS_TEXT` — user selects text in another app and chooses TextCleaner from the context menu.
 * 3. `ACTION_SEND` — user shares text into TextCleaner via the system share sheet.
 */
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val (incomingText, isProcessText) = extractIncomingText(intent)

        setContent {
            TextCleanerTheme {
                MainScreen(
                    initialText = incomingText,
                    isProcessText = isProcessText,
                )
            }
        }
    }

    /**
     * Extract text from PROCESS_TEXT or SEND intents.
     * Returns a pair of (text, isProcessText).
     */
    private fun extractIncomingText(intent: Intent?): Pair<String, Boolean> {
        if (intent == null) return "" to false

        return when (intent.action) {
            Intent.ACTION_PROCESS_TEXT -> {
                val text = intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT)?.toString() ?: ""
                text to true
            }

            Intent.ACTION_SEND -> {
                val text = intent.getStringExtra(Intent.EXTRA_TEXT) ?: ""
                text to false
            }

            else -> "" to false
        }
    }
}
