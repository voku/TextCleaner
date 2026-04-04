package com.voku.textcleaner.ui

import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.util.Log
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.weight
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import java.text.DateFormat
import java.util.Date

private data class PresetOption(val value: SourceType?, val label: String)
private data class PendingExport(val text: String, val filename: String)
private data class TabExport(val text: String, val filename: String, val mimeType: String)

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
private val maxHistorySheetHeight = 420.dp
private const val mainScreenTag = "TextCleanerMainScreen"

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
    var history by remember(context) { mutableStateOf(loadHistory(context)) }
    var showHistorySheet by rememberSaveable { mutableStateOf(false) }
    var showCodeSheet by rememberSaveable { mutableStateOf(false) }
    var pendingExport by remember { mutableStateOf<PendingExport?>(null) }

    val createDocumentLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult(),
    ) { activityResult ->
        val export = pendingExport
        pendingExport = null
        val uri = activityResult.data?.data
        if (activityResult.resultCode == Activity.RESULT_OK && uri != null && export != null) {
            runCatching {
                context.contentResolver.openOutputStream(uri)?.bufferedWriter().use { writer ->
                    writer?.write(export.text)
                }
            }.onSuccess {
                Toast.makeText(context, "Saved ${export.filename}", Toast.LENGTH_SHORT).show()
            }.onFailure {
                Toast.makeText(context, "Unable to save file", Toast.LENGTH_SHORT).show()
            }
        }
    }

    val launchSave: (TabExport) -> Unit = { export ->
        if (export.text.isNotBlank()) {
            pendingExport = PendingExport(export.text, export.filename)
            createDocumentLauncher.launch(
                Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = export.mimeType
                    putExtra(Intent.EXTRA_TITLE, export.filename)
                },
            )
        }
    }

    val cleanCurrentText: (String) -> Unit = { text ->
        if (text.isNotBlank()) {
            val cleaned = Engine.cleanText(RawInput(rawText = text, sourceTypeHint = selectedPreset))
            rawText = text
            result = cleaned
            selectedTab = 1
            history = appendHistory(
                context = context,
                history = history,
                rawText = text,
                preset = selectedPreset,
                result = cleaned,
            )
        }
    }

    LaunchedEffect(initialText) {
        if (initialText.isNotBlank() && result == null) {
            cleanCurrentText(initialText)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Text Cleaner") },
                actions = {
                    TextButton(onClick = { showCodeSheet = true }) {
                        Text("Code", color = MaterialTheme.colorScheme.onPrimary)
                    }
                    TextButton(onClick = { showHistorySheet = true }) {
                        Text("History", color = MaterialTheme.colorScheme.onPrimary)
                    }
                },
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
            PresetDropdown(
                selected = selectedPreset,
                onSelected = { selectedPreset = it },
            )

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Button(
                    onClick = { cleanCurrentText(rawText) },
                    enabled = rawText.isNotBlank(),
                    modifier = Modifier.weight(1f),
                ) {
                    Text("Clean Text")
                }

                OutlinedButton(
                    onClick = {
                        val sample = samplesByPreset[selectedPreset]
                            ?: requireNotNull(samplesByPreset[null])
                        rawText = sample.text
                        selectedPreset = sample.preset
                    },
                    modifier = Modifier.weight(1f),
                ) {
                    Text("Sample")
                }

                OutlinedButton(
                    onClick = {
                        rawText = ""
                        result = null
                        selectedTab = 0
                        selectedPreset = null
                    },
                    modifier = Modifier.weight(1f),
                ) {
                    Text("Reset")
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

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

            when (selectedTab) {
                0 -> RawTextPanel(
                    text = rawText,
                    onValueChange = { rawText = it },
                    onCopy = { copyText(context, "Raw Text", rawText) },
                    onShare = { shareText(context, rawText) },
                    onSave = { launchSave(TabExport(rawText, "raw-text.txt", "text/plain")) },
                )

                1 -> ReadOnlyOutput(
                    text = result?.cleanedText.orEmpty(),
                    placeholder = "Cleaned text will appear here…",
                    context = context,
                    filename = "cleaned-text.txt",
                    onSave = { text, filename -> launchSave(TabExport(text, filename, "text/plain")) },
                )

                2 -> ReadOnlyOutput(
                    text = result?.markdownText.orEmpty(),
                    placeholder = "Markdown will appear here…",
                    context = context,
                    filename = "formatted-content.md",
                    onSave = { text, filename -> launchSave(TabExport(text, filename, "text/markdown")) },
                )

                3 -> ReadOnlyOutput(
                    text = result?.llmPromptText.orEmpty(),
                    placeholder = "LLM Prompt will appear here…",
                    context = context,
                    filename = "llm-prompt.txt",
                    onSave = { text, filename -> launchSave(TabExport(text, filename, "text/plain")) },
                )
            }

            val currentResult = result
            if (currentResult != null) {
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "Detected: ${labelForSourceType(currentResult.detectedType)} - Removed ${currentResult.removedLineCount} lines",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.secondary,
                )
                currentResult.warnings.forEach { warning ->
                    Text(
                        text = "⚠ $warning",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error,
                    )
                }
            }

            if (isProcessText && currentResult != null) {
                Spacer(modifier = Modifier.height(12.dp))
                Button(onClick = {
                    val data = Intent().apply {
                        putExtra(Intent.EXTRA_PROCESS_TEXT, currentResult.cleanedText)
                    }
                    (context as? Activity)?.run {
                        setResult(Activity.RESULT_OK, data)
                        finish()
                    }
                }) {
                    Text("Return Cleaned Text")
                }
            }
        }
    }

    if (showHistorySheet) {
        HistorySheet(
            history = history,
            onDismiss = { showHistorySheet = false },
            onRestore = { item ->
                rawText = item.rawText
                selectedPreset = item.preset
                result = item.result
                selectedTab = 1
                showHistorySheet = false
            },
            onDelete = { id ->
                history = history.filterNot { it.id == id }
                saveHistory(context, history)
            },
            onClear = {
                history = emptyList()
                saveHistory(context, history)
            },
        )
    }

    if (showCodeSheet) {
        CodeSheet(
            snippets = remember(context) { loadCodeSnippets(context) },
            onDismiss = { showCodeSheet = false },
            onCopy = { title, content -> copyText(context, title, content) },
        )
    }
}

@Composable
private fun RawTextPanel(
    text: String,
    onValueChange: (String) -> Unit,
    onCopy: () -> Unit,
    onShare: () -> Unit,
    onSave: () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        TextField(
            value = text,
            onValueChange = onValueChange,
            modifier = Modifier
                .fillMaxWidth()
                .height(300.dp),
            placeholder = { Text("Paste noisy text here…") },
            textStyle = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace),
        )
        if (text.isNotBlank()) {
            ExportActions(onCopy = onCopy, onShare = onShare, onSave = onSave)
        }
    }
}

@Composable
private fun ReadOnlyOutput(
    text: String,
    placeholder: String,
    context: Context,
    filename: String,
    onSave: (String, String) -> Unit,
) {
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

        ExportActions(
            onCopy = { copyText(context, filename, text) },
            onShare = { shareText(context, text) },
            onSave = { onSave(text, filename) },
        )
    }
}

@Composable
private fun ExportActions(
    onCopy: () -> Unit,
    onShare: () -> Unit,
    onSave: () -> Unit,
) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        OutlinedButton(onClick = onCopy) {
            Text("Copy")
        }
        OutlinedButton(onClick = onShare) {
            Text("Share")
        }
        OutlinedButton(onClick = onSave) {
            Text("Save")
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun HistorySheet(
    history: List<HistoryItem>,
    onDismiss: () -> Unit,
    onRestore: (HistoryItem) -> Unit,
    onDelete: (String) -> Unit,
    onClear: () -> Unit,
) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text("Local History", style = MaterialTheme.typography.titleLarge)
            if (history.isEmpty()) {
                Text(
                    text = "No history yet. Cleaned texts will appear here.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.secondary,
                    modifier = Modifier.padding(bottom = 24.dp),
                )
            } else {
                LazyColumn(
                    modifier = Modifier.heightIn(max = maxHistorySheetHeight),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(history, key = { it.id }) { item ->
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onRestore(item) },
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surfaceContainerLowest,
                            ),
                        ) {
                            Column(
                                modifier = Modifier.padding(12.dp),
                                verticalArrangement = Arrangement.spacedBy(6.dp),
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                ) {
                                    Text(
                                        text = DateFormat.getDateTimeInstance(
                                            DateFormat.MEDIUM,
                                            DateFormat.SHORT,
                                        ).format(Date(item.timestamp)),
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.secondary,
                                    )
                                    TextButton(onClick = { onDelete(item.id) }) {
                                        Text("Delete")
                                    }
                                }
                                Text(
                                    text = labelForSourceType(item.result.detectedType),
                                    style = MaterialTheme.typography.bodyMedium,
                                )
                                Text(
                                    text = item.rawText,
                                    style = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace),
                                    maxLines = 3,
                                )
                            }
                        }
                    }
                }
                OutlinedButton(
                    onClick = onClear,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("Clear All History")
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CodeSheet(
    snippets: List<LoadedCodeSnippet>,
    onDismiss: () -> Unit,
    onCopy: (String, String) -> Unit,
) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text("Cleanup Logic", style = MaterialTheme.typography.titleLarge)
            Text(
                text = "These snippets mirror the cleanup logic shipped in the native app.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.secondary,
            )
            snippets.forEach { snippet ->
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceContainerLowest,
                    ),
                ) {
                    Column(
                        modifier = Modifier.padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Text(snippet.title, style = MaterialTheme.typography.titleSmall)
                            TextButton(onClick = { onCopy(snippet.title, snippet.content) }) {
                                Text("Copy")
                            }
                        }
                        HorizontalDivider()
                        SelectionContainer {
                            Text(
                                text = snippet.content,
                                style = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace),
                            )
                        }
                    }
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
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

private fun copyText(context: Context, label: String, text: String) {
    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    clipboard.setPrimaryClip(ClipData.newPlainText(label, text))
    Toast.makeText(context, "Copied!", Toast.LENGTH_SHORT).show()
}

private fun shareText(context: Context, text: String) {
    val sendIntent = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_TEXT, text)
    }
    context.startActivity(Intent.createChooser(sendIntent, "Share cleaned text"))
}

private fun labelForSourceType(type: SourceType): String =
    sourceTypeLabels[type] ?: run {
        Log.w(mainScreenTag, "Missing source type label for $type")
        formatSourceTypeFallback(type)
    }

private fun formatSourceTypeFallback(type: SourceType): String =
    type.name
        .lowercase()
        .split('_')
        .joinToString(" ") { token -> token.replaceFirstChar(Char::titlecase) }
