package com.voku.textcleaner

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.voku.textcleaner.ui.MainScreen
import com.voku.textcleaner.ui.theme.TextCleanerTheme

/**
 * Full-screen launcher activity.
 *
 * Launch modes:
 * 1. Normal launcher tap — user pastes text manually.
 * 2. Escalated from [OverlayActivity] — receives raw text via [EXTRA_INITIAL_TEXT] and
 *    immediately shows the cleaned result in the full-screen UI.
 *
 * Text-selection (`PROCESS_TEXT`) and share (`ACTION_SEND`) intents are now handled by
 * [OverlayActivity] so the user stays in their current app context.
 */
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val initialText = intent?.getStringExtra(EXTRA_INITIAL_TEXT) ?: ""

        setContent {
            TextCleanerTheme {
                MainScreen(
                    initialText = initialText,
                )
            }
        }
    }

    companion object {
        /**
         * Optional string extra carrying raw text to pre-populate the full-screen UI.
         * Set by [OverlayActivity] when the user taps "Open in full app".
         */
        const val EXTRA_INITIAL_TEXT = "com.voku.textcleaner.EXTRA_INITIAL_TEXT"
    }
}
