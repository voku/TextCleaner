package com.voku.textcleaner.ui

import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.material3.TabRowDefaults
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.voku.textcleaner.core.CleanedResult
import com.voku.textcleaner.core.Engine
import com.voku.textcleaner.core.RawInput
import com.voku.textcleaner.core.SourceType
import com.voku.textcleaner.ui.theme.CodePanelBackground
import com.voku.textcleaner.ui.theme.CodePanelBorder
import com.voku.textcleaner.ui.theme.CodePanelContent
import com.voku.textcleaner.ui.theme.CodePanelTitle
import java.text.DateFormat
import java.util.Date
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

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
private val appCardShape = RoundedCornerShape(24.dp)
private val panelShape = RoundedCornerShape(18.dp)
private const val CLEANING_DEBOUNCE_MS = 200L
private const val WARNING_CARD_BACKGROUND_ALPHA = 0.72f
private const val WARNING_CARD_BORDER_ALPHA = 0.35f
private const val MAIN_SCREEN_TAG = "TextCleanerMainScreen"
private const val REPOSITORY_URL = "https://github.com/voku/TextCleaner/"

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(
    initialText: String = "",
    isProcessText: Boolean = false,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var rawText by rememberSaveable { mutableStateOf(initialText) }
    var selectedPreset by rememberSaveable { mutableStateOf<SourceType?>(null) }
    var result by remember { mutableStateOf<CleanedResult?>(null) }
    var selectedTab by rememberSaveable { mutableIntStateOf(0) }
    var history by remember(context) { mutableStateOf(loadHistory(context)) }
    var showHistorySheet by rememberSaveable { mutableStateOf(false) }
    var showCodeSheet by rememberSaveable { mutableStateOf(false) }
    var pendingExport by remember { mutableStateOf<PendingExport?>(null) }
    var isCleaning by rememberSaveable { mutableStateOf(false) }

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

    val requestClean: (String) -> Unit = { text ->
        if (text.isNotBlank() && !isCleaning) {
            scope.launch {
                isCleaning = true
                delay(CLEANING_DEBOUNCE_MS)
                cleanCurrentText(text)
                isCleaning = false
            }
        }
    }

    LaunchedEffect(initialText) {
        if (initialText.isNotBlank() && result == null) {
            cleanCurrentText(initialText)
        }
    }

    val activeExport = currentTabExport(
        selectedTab = selectedTab,
        rawText = rawText,
        result = result,
    )

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = { Text("Text Cleaner") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                    titleContentColor = MaterialTheme.colorScheme.onBackground,
                ),
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp, vertical = 12.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            HeroSection(
                onOpenCode = { showCodeSheet = true },
                onOpenHistory = { showHistorySheet = true },
                onOpenGitHub = { openRepository(context) },
            )

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = appCardShape,
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
            ) {
                Column {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(
                                color = MaterialTheme.colorScheme.surfaceContainerLowest,
                                shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
                            )
                            .padding(16.dp),
                    ) {
                        ControlsSection(
                            selectedPreset = selectedPreset,
                            onPresetSelected = { selectedPreset = it },
                            onLoadSample = {
                                val sample = samplesByPreset[selectedPreset]
                                    ?: requireNotNull(samplesByPreset[null])
                                rawText = sample.text
                                selectedPreset = sample.preset
                            },
                            onReset = {
                                rawText = ""
                                result = null
                                selectedTab = 0
                                selectedPreset = null
                            },
                            onClean = { requestClean(rawText) },
                            canClean = rawText.isNotBlank() && !isCleaning,
                            isCleaning = isCleaning,
                        )
                    }

                    TabRow(
                        selectedTabIndex = selectedTab,
                        containerColor = Color.Transparent,
                        contentColor = MaterialTheme.colorScheme.primary,
                        indicator = { positions ->
                            TabRowDefaults.SecondaryIndicator(
                                modifier = Modifier.tabIndicatorOffset(positions[selectedTab]),
                                color = MaterialTheme.colorScheme.primary,
                            )
                        },
                        divider = {
                            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                        },
                    ) {
                        tabTitles.forEachIndexed { index, title ->
                            Tab(
                                selected = selectedTab == index,
                                onClick = { selectedTab = index },
                                selectedContentColor = MaterialTheme.colorScheme.primary,
                                unselectedContentColor = MaterialTheme.colorScheme.secondary,
                                text = {
                                    Text(
                                        text = title,
                                        fontWeight = if (selectedTab == index) FontWeight.SemiBold else FontWeight.Medium,
                                    )
                                },
                            )
                        }
                    }

                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
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
                                placeholder = "LLM prompt will appear here…",
                                context = context,
                                filename = "llm-prompt.txt",
                                onSave = { text, filename -> launchSave(TabExport(text, filename, "text/plain")) },
                            )
                        }

                        val currentResult = result
                        if (currentResult != null && activeExport != null) {
                            ResultSummaryCard(
                                result = currentResult,
                                export = activeExport,
                                onCopy = { copyText(context, activeExport.filename, activeExport.text) },
                                onShare = { shareText(context, activeExport.text) },
                                onSave = { launchSave(activeExport) },
                                activeTabLabel = tabTitles[selectedTab],
                            )
                        }

                        if (currentResult?.warnings.orEmpty().isNotEmpty()) {
                            WarningCard(warnings = currentResult?.warnings.orEmpty())
                        }
                    }
                }
            }

            if (isProcessText && result != null) {
                Button(
                    onClick = {
                        val data = Intent().apply {
                            putExtra(Intent.EXTRA_PROCESS_TEXT, result?.cleanedText)
                        }
                        (context as? Activity)?.run {
                            setResult(Activity.RESULT_OK, data)
                            finish()
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("Return cleaned text")
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
private fun HeroSection(
    onOpenCode: () -> Unit,
    onOpenHistory: () -> Unit,
    onOpenGitHub: () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = appCardShape,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,
        ),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text(
                text = "Clean noisy text before sending it to an LLM.",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                text = "Strip GitHub chrome, docs sidebars, article boilerplate, and chat clutter while keeping the main content readable.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.secondary,
            )
            Text(
                text = "This Android UI now mirrors the web layout more closely with the same presets, tab flow, history, and cleanup logic viewer.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.secondary,
            )
            BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
                val compact = maxWidth < 460.dp
                if (compact) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(
                            onClick = onOpenCode,
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text("Cleanup logic")
                        }
                        OutlinedButton(
                            onClick = onOpenHistory,
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text("Local history")
                        }
                        TextButton(
                            onClick = onOpenGitHub,
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text("Contribute on GitHub")
                        }
                    }
                } else {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        OutlinedButton(onClick = onOpenCode) {
                            Text("Cleanup logic")
                        }
                        OutlinedButton(onClick = onOpenHistory) {
                            Text("Local history")
                        }
                        Spacer(modifier = Modifier.weight(1f))
                        TextButton(onClick = onOpenGitHub) {
                            Text("Contribute on GitHub")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ControlsSection(
    selectedPreset: SourceType?,
    onPresetSelected: (SourceType?) -> Unit,
    onLoadSample: () -> Unit,
    onReset: () -> Unit,
    onClean: () -> Unit,
    canClean: Boolean,
    isCleaning: Boolean,
) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text(
            text = "Use the same preset-first workflow as the web app, then switch between raw, cleaned, markdown, and prompt-ready output.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.secondary,
        )
        BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
            val compact = maxWidth < 560.dp
            if (compact) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    PresetDropdown(
                        selected = selectedPreset,
                        onSelected = onPresetSelected,
                    )
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = onClean,
                            enabled = canClean,
                            modifier = Modifier
                                .fillMaxWidth()
                                .semantics {
                                    stateDescription = if (isCleaning) {
                                        "Cleaning in progress"
                                    } else {
                                        "Ready to clean text"
                                    }
                                },
                        ) {
                            Text(if (isCleaning) "Cleaning…" else "Clean text")
                        }
                        OutlinedButton(
                            onClick = onLoadSample,
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text("Load sample")
                        }
                        OutlinedButton(
                            onClick = onReset,
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text("Reset")
                        }
                    }
                }
            } else {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(modifier = Modifier.weight(1.2f)) {
                        PresetDropdown(
                            selected = selectedPreset,
                            onSelected = onPresetSelected,
                        )
                    }
                    Row(
                        modifier = Modifier.weight(1f),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        OutlinedButton(
                            onClick = onLoadSample,
                            modifier = Modifier.weight(1f),
                        ) {
                            Text("Sample")
                        }
                        OutlinedButton(
                            onClick = onReset,
                            modifier = Modifier.weight(1f),
                        ) {
                            Text("Reset")
                        }
                        Button(
                            onClick = onClean,
                            enabled = canClean,
                            modifier = Modifier
                                .weight(1f)
                                .semantics {
                                    stateDescription = if (isCleaning) {
                                        "Cleaning in progress"
                                    } else {
                                        "Ready to clean text"
                                    }
                                },
                        ) {
                            Text(if (isCleaning) "Cleaning…" else "Clean text")
                        }
                    }
                }
            }
        }
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
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = panelShape,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLowest,
        ),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(
                        text = "Raw text",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        text = "Paste copied text here and clean it once you're ready.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.secondary,
                    )
                }
                if (text.isNotBlank()) {
                    InlineActionButtons(
                        onCopy = onCopy,
                        onShare = onShare,
                        onSave = onSave,
                    )
                }
            }
            TextField(
                value = text,
                onValueChange = onValueChange,
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 360.dp),
                placeholder = { Text("Paste noisy text here…") },
                textStyle = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace),
                colors = inputFieldColors(),
                shape = panelShape,
            )
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
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = panelShape,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLowest,
        ),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(
                        text = filename,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        text = "Copy, share, or save the active output.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.secondary,
                    )
                }
                if (text.isNotBlank()) {
                    InlineActionButtons(
                        onCopy = { copyText(context, filename, text) },
                        onShare = { shareText(context, text) },
                        onSave = { onSave(text, filename) },
                    )
                }
            }
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 360.dp)
                    .background(
                        color = MaterialTheme.colorScheme.surface,
                        shape = panelShape,
                    )
                    .padding(16.dp),
            ) {
                if (text.isBlank()) {
                    Text(
                        text = placeholder,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.secondary,
                    )
                } else {
                    SelectionContainer {
                        Text(
                            text = text,
                            style = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace),
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ResultSummaryCard(
    result: CleanedResult,
    export: TabExport,
    onCopy: () -> Unit,
    onShare: () -> Unit,
    onSave: () -> Unit,
    activeTabLabel: String,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = panelShape,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLowest,
        ),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
    ) {
        BoxWithConstraints(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
        ) {
            val compact = maxWidth < 560.dp
            if (compact) {
                Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    ResultSummaryText(result = result)
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(
                            text = "Export $activeTabLabel",
                            style = MaterialTheme.typography.labelLarge,
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                        FullWidthActionButtons(
                            onCopy = onCopy,
                            onShare = onShare,
                            onSave = onSave,
                            saveLabel = export.filename.substringAfterLast('.').uppercase(),
                        )
                    }
                }
            } else {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        ResultSummaryText(result = result)
                    }
                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Text(
                            text = "Export $activeTabLabel",
                            style = MaterialTheme.typography.labelLarge,
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                        InlineActionButtons(
                            onCopy = onCopy,
                            onShare = onShare,
                            onSave = onSave,
                            saveLabel = "Save ${export.filename.substringAfterLast('.')}",
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ResultSummaryText(result: CleanedResult) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text = "Detected type: ${labelForSourceType(result.detectedType)}",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface,
        )
        Text(
            text = "Removed lines: ${result.removedLineCount}",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface,
        )
    }
}

@Composable
private fun WarningCard(warnings: List<String>) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = panelShape,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.errorContainer.copy(alpha = WARNING_CARD_BACKGROUND_ALPHA),
        ),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = WARNING_CARD_BORDER_ALPHA)),
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(
                text = "Warnings",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.error,
            )
            warnings.forEach { warning ->
                Text(
                    text = "• $warning",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface,
                )
            }
        }
    }
}

@Composable
private fun InlineActionButtons(
    onCopy: () -> Unit,
    onShare: () -> Unit,
    onSave: () -> Unit,
    saveLabel: String = "Save",
) {
    BoxWithConstraints {
        val compact = maxWidth < 220.dp
        if (compact) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = onCopy, modifier = Modifier.fillMaxWidth()) {
                    Text("Copy")
                }
                OutlinedButton(onClick = onShare, modifier = Modifier.fillMaxWidth()) {
                    Text("Share")
                }
                OutlinedButton(onClick = onSave, modifier = Modifier.fillMaxWidth()) {
                    Text(saveLabel)
                }
            }
        } else {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = onCopy) {
                    Text("Copy")
                }
                OutlinedButton(onClick = onShare) {
                    Text("Share")
                }
                OutlinedButton(onClick = onSave) {
                    Text(saveLabel)
                }
            }
        }
    }
}

@Composable
private fun FullWidthActionButtons(
    onCopy: () -> Unit,
    onShare: () -> Unit,
    onSave: () -> Unit,
    saveLabel: String,
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        OutlinedButton(onClick = onCopy, modifier = Modifier.fillMaxWidth()) {
            Text("Copy")
        }
        OutlinedButton(onClick = onShare, modifier = Modifier.fillMaxWidth()) {
            Text("Share")
        }
        OutlinedButton(onClick = onSave, modifier = Modifier.fillMaxWidth()) {
            Text("Save $saveLabel")
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
            Text("Local History", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
            Text(
                text = "Restore recent cleanups or remove entries you no longer need.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.secondary,
            )
            if (history.isEmpty()) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 24.dp),
                    shape = panelShape,
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceContainerLowest,
                    ),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                ) {
                    Column(
                        modifier = Modifier.padding(20.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Text(
                            text = "No history yet.",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                        )
                        Text(
                            text = "Cleaned texts will appear here after you run the cleaner.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.secondary,
                        )
                    }
                }
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
                            shape = panelShape,
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surfaceContainerLowest,
                            ),
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                        ) {
                            Column(
                                modifier = Modifier.padding(14.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically,
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
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.SemiBold,
                                )
                                Text(
                                    text = "Removed ${item.result.removedLineCount} lines",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.secondary,
                                )
                                Text(
                                    text = item.rawText,
                                    style = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace),
                                    maxLines = 3,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .background(
                                            color = MaterialTheme.colorScheme.surface,
                                            shape = RoundedCornerShape(12.dp),
                                        )
                                        .padding(10.dp),
                                )
                            }
                        }
                    }
                }
                OutlinedButton(
                    onClick = onClear,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("Clear all history")
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
            Text("Cleanup Logic", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
            Text(
                text = "These snippets mirror the native cleanup logic surfaced by the web app code viewer.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.secondary,
            )
            snippets.forEach { snippet ->
                Card(
                    shape = panelShape,
                    colors = CardDefaults.cardColors(containerColor = CodePanelBackground),
                ) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                text = snippet.title,
                                style = MaterialTheme.typography.titleSmall,
                                color = CodePanelTitle,
                                fontWeight = FontWeight.SemiBold,
                            )
                            TextButton(onClick = { onCopy(snippet.title, snippet.content) }) {
                                Text("Copy")
                            }
                        }
                        HorizontalDivider(color = CodePanelBorder)
                        SelectionContainer {
                            Text(
                                text = snippet.content,
                                style = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace),
                                color = CodePanelContent,
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
            colors = inputFieldColors(),
            shape = panelShape,
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

@Composable
private fun inputFieldColors() = TextFieldDefaults.colors(
    focusedContainerColor = MaterialTheme.colorScheme.surface,
    unfocusedContainerColor = MaterialTheme.colorScheme.surface,
    disabledContainerColor = MaterialTheme.colorScheme.surface,
    errorContainerColor = MaterialTheme.colorScheme.surface,
    focusedIndicatorColor = MaterialTheme.colorScheme.primary,
    unfocusedIndicatorColor = MaterialTheme.colorScheme.outlineVariant,
    disabledIndicatorColor = MaterialTheme.colorScheme.outlineVariant,
)

private fun currentTabExport(
    selectedTab: Int,
    rawText: String,
    result: CleanedResult?,
): TabExport? = when (selectedTab) {
    0 -> TabExport(rawText, "raw-text.txt", "text/plain")
    1 -> result?.let { TabExport(it.cleanedText, "cleaned-text.txt", "text/plain") }
    2 -> result?.let { TabExport(it.markdownText, "formatted-content.md", "text/markdown") }
    3 -> result?.let { TabExport(it.llmPromptText, "llm-prompt.txt", "text/plain") }
    else -> null
}

private fun openRepository(context: Context) {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(REPOSITORY_URL)).apply {
        if (context !is Activity) {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
    }
    runCatching { context.startActivity(intent) }.onFailure {
        Toast.makeText(context, "Unable to open repository", Toast.LENGTH_SHORT).show()
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
        Log.w(MAIN_SCREEN_TAG, "Missing source type label for $type")
        formatSourceTypeFallback(type)
    }

private fun formatSourceTypeFallback(type: SourceType): String =
    type.name
        .lowercase()
        .split('_')
        .joinToString(" ") { token -> token.replaceFirstChar(Char::titlecase) }
