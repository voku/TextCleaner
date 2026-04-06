package com.voku.textcleaner.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

private val Indigo600 = Color(0xFF4F46E5)
private val Indigo700 = Color(0xFF4338CA)
internal val CodePanelBackground = Color(0xFF111827)
internal val CodePanelBorder = Color(0xFF374151)
internal val CodePanelTitle = Color(0xFFF9FAFB)
internal val CodePanelContent = Color(0xFFE5E7EB)
internal val WarningBackground = Color(0xFFFFFBEB)
internal val WarningBorder = Color(0xFFFDE68A)
internal val WarningTitle = Color(0xFF92400E)
internal val WarningText = Color(0xFF78350F)

internal val WarningBackgroundDark = Color(0xFF2D2000)
internal val WarningBorderDark = Color(0xFF4D3800)
internal val WarningTitleDark = Color(0xFFFDE68A)
internal val WarningTextDark = Color(0xFFFCD34D)

private val LightColors = lightColorScheme(
    primary = Indigo600,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFE0E7FF),
    onPrimaryContainer = Indigo700,
    secondary = Color(0xFF6B7280),
    background = Color(0xFFF9FAFB),
    surface = Color.White,
    onBackground = Color(0xFF111827),
    onSurface = Color(0xFF111827),
    outlineVariant = Color(0xFFE5E7EB),
    surfaceContainerLowest = Color(0xFFF9FAFB),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF818CF8),
    onPrimary = Color(0xFF1E1B4B),
    primaryContainer = Indigo700,
    onPrimaryContainer = Color(0xFFE0E7FF),
    secondary = Color(0xFF9CA3AF),
    background = Color(0xFF111827),
    surface = Color(0xFF1F2937),
    onBackground = Color(0xFFF9FAFB),
    onSurface = Color(0xFFF9FAFB),
    outlineVariant = Color(0xFF374151),
    surfaceContainerLowest = Color(0xFF111827),
)

@Composable
fun TextCleanerTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit,
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColors
        else -> LightColors
    }

    MaterialTheme(
        colorScheme = colorScheme,
        content = content,
    )
}
