package com.voku.textcleaner.ui

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.OpenInNew
import androidx.compose.material.icons.filled.Reply
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.voku.textcleaner.core.CleanedResult
import com.voku.textcleaner.core.Engine
import com.voku.textcleaner.core.RawInput
import com.voku.textcleaner.core.SourceType
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

private val overlayPanelShape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)

/**
 * Compact bottom-panel that renders inside a translucent [OverlayActivity].
 *
 * Layout:
 *  - Semi-transparent scrim that dismisses the overlay on tap.
 *  - Slide-up white panel with a drag handle, title bar (dismiss + open-in-app icons),
 *    a loading spinner while the engine runs, and — once done — the cleaned-text preview
 *    with Return / Copy / Share action buttons.
 *
 * @param initialText    Text to clean (already extracted from the incoming [Intent]).
 * @param isProcessText  `true` when the activity was launched via `ACTION_PROCESS_TEXT`;
 *                       shows the "Return" button so the caller gets the cleaned text back.
 * @param onDismiss      Called when the user taps the scrim or the ✕ button.
 * @param onReturnText   Called when the user taps "Return"; delivers cleaned text to caller.
 * @param onOpenFullApp  Called when the user taps ⤢; opens [MainActivity] with the raw text.
 */
@Composable
fun OverlayScreen(
    initialText: String,
    isProcessText: Boolean,
    onDismiss: () -> Unit,
    onReturnText: (String) -> Unit,
    onOpenFullApp: (String) -> Unit,
) {
    val context = LocalContext.current
    var result by remember { mutableStateOf<CleanedResult?>(null) }
    var isCleaning by remember { mutableStateOf(true) }

    LaunchedEffect(initialText) {
        isCleaning = true
        result = withContext(Dispatchers.Default) {
            Engine.cleanText(RawInput(rawText = initialText))
        }
        isCleaning = false
    }

    // Outer Box — fills the entire window so the scrim covers everything.
    // Tapping the scrim area (outside the panel) dismisses the overlay.
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.45f))
            .clickable(
                indication = null,
                interactionSource = remember { MutableInteractionSource() },
                onClick = onDismiss,
            ),
    ) {
        // Panel — aligned to the bottom of the screen.
        // The inner clickable (no-op) absorbs touch events so they are NOT forwarded
        // to the scrim Box behind it, preventing accidental dismissal.
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.BottomCenter)
                .clickable(
                    indication = null,
                    interactionSource = remember { MutableInteractionSource() },
                ) { /* absorb — prevents scrim from dismissing while touching the panel */ }
                .background(
                    color = MaterialTheme.colorScheme.surface,
                    shape = overlayPanelShape,
                )
                .navigationBarsPadding()
                .padding(horizontal = 20.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            // Drag handle
            Box(
                modifier = Modifier
                    .width(32.dp)
                    .height(4.dp)
                    .align(Alignment.CenterHorizontally)
                    .background(
                        color = MaterialTheme.colorScheme.outlineVariant,
                        shape = RoundedCornerShape(2.dp),
                    ),
            )

            // Title row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "Text Cleaner",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { onOpenFullApp(initialText) }) {
                        Icon(Icons.Default.OpenInNew, contentDescription = "Open in full app")
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Dismiss")
                    }
                }
            }

            if (isCleaning) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(120.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator()
                }
            } else {
                val currentResult = result
                if (currentResult != null) {
                    // One-line summary
                    Text(
                        text = "${overlaySourceTypeLabel(currentResult.detectedType)} · ${currentResult.removedLineCount} lines removed",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.secondary,
                    )

                    // Scrollable cleaned-text preview (min 80 dp, max 240 dp)
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(min = 80.dp, max = 240.dp)
                            .background(
                                color = MaterialTheme.colorScheme.surfaceContainerLowest,
                                shape = RoundedCornerShape(12.dp),
                            )
                            .verticalScroll(rememberScrollState())
                            .padding(12.dp),
                    ) {
                        SelectionContainer {
                            Text(
                                text = currentResult.cleanedText,
                                style = MaterialTheme.typography.bodySmall
                                    .copy(fontFamily = FontFamily.Monospace),
                                color = MaterialTheme.colorScheme.onSurface,
                            )
                        }
                    }

                    // Action buttons
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        if (isProcessText) {
                            Button(
                                onClick = { onReturnText(currentResult.cleanedText) },
                                modifier = Modifier.weight(1f),
                            ) {
                                Icon(
                                    Icons.Default.Reply,
                                    contentDescription = null,
                                    modifier = Modifier.size(18.dp),
                                )
                                Spacer(Modifier.width(6.dp))
                                Text("Return")
                            }
                        }
                        OutlinedButton(
                            onClick = { overlayCopyText(context, currentResult.cleanedText) },
                            modifier = Modifier.weight(1f),
                        ) {
                            Icon(
                                Icons.Default.ContentCopy,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp),
                            )
                            Spacer(Modifier.width(6.dp))
                            Text("Copy")
                        }
                        OutlinedButton(
                            onClick = { overlayShareText(context, currentResult.cleanedText) },
                            modifier = Modifier.weight(1f),
                        ) {
                            Icon(
                                Icons.Default.Share,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp),
                            )
                            Spacer(Modifier.width(6.dp))
                            Text("Share")
                        }
                    }
                }
            }

            Spacer(Modifier.height(4.dp))
        }
    }
}

private fun overlaySourceTypeLabel(type: SourceType): String = when (type) {
    SourceType.GENERIC -> "Generic text"
    SourceType.GITHUB_PR -> "GitHub PR"
    SourceType.GITHUB_ISSUE -> "GitHub issue"
    SourceType.DOCS -> "Documentation"
    SourceType.ARTICLE -> "Article"
    SourceType.CHAT -> "Chat"
}

private fun overlayCopyText(context: Context, text: String) {
    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    clipboard.setPrimaryClip(ClipData.newPlainText("Cleaned text", text))
    Toast.makeText(context, "Copied!", Toast.LENGTH_SHORT).show()
}

private fun overlayShareText(context: Context, text: String) {
    val sendIntent = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_TEXT, text)
    }
    context.startActivity(Intent.createChooser(sendIntent, "Share cleaned text"))
}
