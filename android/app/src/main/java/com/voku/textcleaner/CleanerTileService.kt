package com.voku.textcleaner

import android.app.PendingIntent
import android.content.ClipboardManager
import android.content.Intent
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService

/**
 * Quick Settings tile that cleans the current clipboard content via [OverlayActivity].
 *
 * The clipboard is read inside [onClick] while the tile is in the foreground, which satisfies
 * the Android 10+ restriction on background clipboard access. The text is then forwarded to
 * [OverlayActivity] via [Intent.EXTRA_TEXT] so the activity does not need to re-read it.
 */
class CleanerTileService : TileService() {

    override fun onStartListening() {
        super.onStartListening()
        qsTile?.apply {
            state = Tile.STATE_ACTIVE
            updateTile()
        }
    }

    override fun onClick() {
        super.onClick()

        val clipboard = getSystemService(ClipboardManager::class.java)
        val text = clipboard.primaryClip?.getItemAt(0)?.text?.toString()

        if (text.isNullOrBlank()) {
            // Nothing to clean — leave the tile active but do nothing visible.
            return
        }

        val intent = Intent(this, OverlayActivity::class.java).apply {
            action = OverlayActivity.ACTION_CLEAN_CLIPBOARD
            putExtra(Intent.EXTRA_TEXT, text)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            val pendingIntent = PendingIntent.getActivity(
                this,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
            startActivityAndCollapse(pendingIntent)
        } else {
            @Suppress("DEPRECATION")
            startActivityAndCollapse(intent)
        }
    }
}
