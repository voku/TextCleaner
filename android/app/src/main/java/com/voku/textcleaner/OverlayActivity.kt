package com.voku.textcleaner

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.voku.textcleaner.ui.OverlayScreen
import com.voku.textcleaner.ui.theme.TextCleanerTheme

/**
 * Transparent overlay activity that handles:
 *  - `ACTION_PROCESS_TEXT` — text selected in another app via the context menu
 *  - `ACTION_SEND`         — text shared into TextCleaner via the share sheet
 *  - [ACTION_CLEAN_CLIPBOARD] — text passed in by [CleanerTileService] from the clipboard
 *
 * The window is translucent (`Theme.TextCleaner.Overlay`), so the originating app stays
 * visible behind the Compose scrim + slide-up panel. No `SYSTEM_ALERT_WINDOW` permission
 * is required.
 */
class OverlayActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val (text, isProcessText) = extractText(intent)

        if (text.isBlank()) {
            Toast.makeText(this, "No text to clean", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        setContent {
            TextCleanerTheme {
                OverlayScreen(
                    initialText = text,
                    isProcessText = isProcessText,
                    onDismiss = { finish() },
                    onReturnText = { cleaned ->
                        val data = Intent().apply {
                            putExtra(Intent.EXTRA_PROCESS_TEXT, cleaned)
                        }
                        setResult(RESULT_OK, data)
                        finish()
                    },
                    onOpenFullApp = { rawText ->
                        startActivity(
                            Intent(this, MainActivity::class.java).apply {
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                                putExtra(MainActivity.EXTRA_INITIAL_TEXT, rawText)
                            },
                        )
                        finish()
                    },
                )
            }
        }
    }

    private fun extractText(intent: Intent?): Pair<String, Boolean> {
        if (intent == null) return "" to false
        return when (intent.action) {
            Intent.ACTION_PROCESS_TEXT -> {
                val text = intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT)?.toString() ?: ""
                text to true
            }
            // Both ACTION_SEND and ACTION_CLEAN_CLIPBOARD carry their text in EXTRA_TEXT.
            // For ACTION_CLEAN_CLIPBOARD the text is passed explicitly from CleanerTileService
            // to avoid clipboard-access timing issues on Android 10+.
            Intent.ACTION_SEND, ACTION_CLEAN_CLIPBOARD -> {
                val text = intent.getStringExtra(Intent.EXTRA_TEXT) ?: ""
                text to false
            }
            else -> "" to false
        }
    }

    companion object {
        /** Fired by [CleanerTileService] to clean the current clipboard content. */
        const val ACTION_CLEAN_CLIPBOARD = "com.voku.textcleaner.ACTION_CLEAN_CLIPBOARD"
    }
}
