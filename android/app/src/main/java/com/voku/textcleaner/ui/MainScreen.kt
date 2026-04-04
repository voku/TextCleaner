package com.voku.textcleaner.ui

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.widget.Toast
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import com.voku.textcleaner.core.CleanedResult
import com.voku.textcleaner.core.Engine
import com.voku.textcleaner.core.RawInput
import com.voku.textcleaner.core.SourceType

/** Preset labels shown in the dropdown. */
private data class PresetOption(val value: SourceType?, val label: String)

private val presetOptions = listOf(
    PresetOption(null, "Auto-detect"),
    PresetOption(SourceType.GENERIC, "Generic text"),
    PresetOption(SourceType.GITHUB_PR, "GitHub pull request"),
    PresetOption(SourceType.GITHUB_ISSUE, "GitHub issue"),
    PresetOption(SourceType.DOCS, "Documentation"),
    PresetOption(SourceType.ARTICLE, "Article"),
    PresetOption(SourceType.CHAT, "Chat transcript"),
)

private val sourceTypeLabels = mapOf(
    SourceType.GENERIC to "Generic text",
    SourceType.GITHUB_PR to "GitHub pull request",
    SourceType.GITHUB_ISSUE to "GitHub issue",
    SourceType.DOCS to "Documentation",
    SourceType.ARTICLE to "Article",
    SourceType.CHAT to "Chat transcript",
)

private val tabTitles = listOf("Raw", "Cleaned", "Markdown", "Prompt")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(
    initialText: String = "",
    isProcessText: Boolean = false,
) {
    val context = LocalContext.current

    var rawText by rememberSaveable { mutableStateOf(initialText) }
    var selectedPreset by rememberSaveable { mutableStateOf<SourceType?>(null) }
    var result by remember { mutableStateOf<CleanedResult?>(null) }
    var selectedTab by rememberSaveable { mutableIntStateOf(0) }

    // Auto-clean when launched via intent with text
    if (initialText.isNotBlank() && result == null) {
        val res = Engine.cleanText(RawInput(rawText = initialText, sourceTypeHint = selectedPreset))
        result = res
        selectedTab = 1 // jump to Cleaned tab
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Text Cleaner") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary,
                ),
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
        ) {
            // ── Preset Selector ─────────────────────────────────────
            PresetDropdown(
                selected = selectedPreset,
                onSelected = { selectedPreset = it },
            )

            Spacer(modifier = Modifier.height(12.dp))

            // ── Action Buttons ──────────────────────────────────────
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Button(
                    onClick = {
                        if (rawText.isNotBlank()) {
                            result = Engine.cleanText(RawInput(rawText = rawText, sourceTypeHint = selectedPreset))
                            selectedTab = 1
                        }
                    },
                    enabled = rawText.isNotBlank(),
                ) {
                    Text("Clean Text")
                }

                OutlinedButton(onClick = {
                    rawText = ""
                    result = null
                    selectedTab = 0
                    selectedPreset = null
                }) {
                    Text("Reset")
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // ── Tabs ────────────────────────────────────────────────
            TabRow(selectedTabIndex = selectedTab) {
                tabTitles.forEachIndexed { index, title ->
                    Tab(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        text = { Text(title) },
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // ── Tab Content ─────────────────────────────────────────
            when (selectedTab) {
                0 -> {
                    OutlinedTextField(
                        value = rawText,
                        onValueChange = { rawText = it },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(300.dp),
                        placeholder = { Text("Paste noisy text here…") },
                        textStyle = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace),
                    )
                }

                1 -> ReadOnlyOutput(
                    text = result?.cleanedText ?: "",
                    placeholder = "Cleaned text will appear here…",
                    context = context,
                )

                2 -> ReadOnlyOutput(
                    text = result?.markdownText ?: "",
                    placeholder = "Markdown will appear here…",
                    context = context,
                )

                3 -> ReadOnlyOutput(
                    text = result?.llmPromptText ?: "",
                    placeholder = "LLM Prompt will appear here…",
                    context = context,
                )
            }

            // ── Status Bar ──────────────────────────────────────────
            val currentResult = result
            if (currentResult != null) {
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "Detected: ${sourceTypeLabels[currentResult.detectedType] ?: "Unknown"} · Removed ${currentResult.removedLineCount} lines",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.secondary,
                )
                for (warning in currentResult.warnings) {
                    Text(
                        text = "⚠ $warning",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error,
                    )
                }
            }

            // If launched via PROCESS_TEXT, offer to return the result
            val processResult = result
            if (isProcessText && processResult != null) {
                Spacer(modifier = Modifier.height(12.dp))
                Button(onClick = {
                    val data = Intent().apply {
                        putExtra(Intent.EXTRA_PROCESS_TEXT, processResult.cleanedText)
                    }
                    (context as? android.app.Activity)?.run {
                        setResult(android.app.Activity.RESULT_OK, data)
                        finish()
                    }
                }) {
                    Text("Return Cleaned Text")
                }
            }
        }
    }
}

@Composable
private fun ReadOnlyOutput(text: String, placeholder: String, context: Context) {
    if (text.isBlank()) {
        Text(
            text = placeholder,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.secondary,
            modifier = Modifier.padding(vertical = 8.dp),
        )
    } else {
        SelectionContainer {
            Text(
                text = text,
                style = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
            )
        }

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = {
                val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                clipboard.setPrimaryClip(ClipData.newPlainText("Cleaned Text", text))
                Toast.makeText(context, "Copied!", Toast.LENGTH_SHORT).show()
            }) {
                Text("Copy")
            }

            OutlinedButton(onClick = {
                val sendIntent = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_TEXT, text)
                }
                context.startActivity(Intent.createChooser(sendIntent, "Share cleaned text"))
            }) {
                Text("Share")
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PresetDropdown(
    selected: SourceType?,
    onSelected: (SourceType?) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    val currentLabel = presetOptions.first { it.value == selected }.label

    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = it },
    ) {
        TextField(
            value = currentLabel,
            onValueChange = {},
            readOnly = true,
            label = { Text("Preset") },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier = Modifier
                .menuAnchor(MenuAnchorType.PrimaryNotEditable)
                .fillMaxWidth(),
        )
        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
        ) {
            presetOptions.forEach { option ->
                DropdownMenuItem(
                    text = { Text(option.label) },
                    onClick = {
                        onSelected(option.value)
                        expanded = false
                    },
                )
            }
        }
    }
}
