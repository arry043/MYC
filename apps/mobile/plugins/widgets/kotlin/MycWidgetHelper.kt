package com.myc.app.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import com.myc.app.R

object MycWidgetHelper {
    private const val PREFS_NAME = "myc_widget_prefs"
    private const val KEY_WIDGET_DATA = "widget_data"

    fun saveWidgetData(context: Context, jsonStr: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_WIDGET_DATA, jsonStr).apply()
    }

    fun clearWidgetData(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().remove(KEY_WIDGET_DATA).apply()
    }

    fun getWidgetData(context: Context): MycWidgetSnapshot {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val jsonStr = prefs.getString(KEY_WIDGET_DATA, null)
        return MycWidgetSnapshot.fromJson(jsonStr)
    }

    fun updateAllWidgets(context: Context) {
        val appWidgetManager = AppWidgetManager.getInstance(context)

        // Compact Widget
        val compactComponent = ComponentName(context, CompactWidgetProvider::class.java)
        val compactIds = appWidgetManager.getAppWidgetIds(compactComponent)
        for (id in compactIds) {
            updateCompactWidget(context, appWidgetManager, id)
        }

        // Standard Widget
        val standardComponent = ComponentName(context, StandardWidgetProvider::class.java)
        val standardIds = appWidgetManager.getAppWidgetIds(standardComponent)
        for (id in standardIds) {
            updateStandardWidget(context, appWidgetManager, id)
        }

        // Large Widget
        val largeComponent = ComponentName(context, LargeWidgetProvider::class.java)
        val largeIds = appWidgetManager.getAppWidgetIds(largeComponent)
        for (id in largeIds) {
            updateLargeWidget(context, appWidgetManager, id)
        }
    }

    private fun createDeepLinkIntent(context: Context, uriString: String, requestCode: Int): PendingIntent {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uriString)).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            setPackage(context.packageName)
        }
        return PendingIntent.getActivity(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    // --- WIDGET A: COMPACT ---
    fun updateCompactWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        options: Bundle? = null
    ) {
        try {
            val views = RemoteViews(context.packageName, R.layout.widget_compact)
            val snapshot = getWidgetData(context)

            if (!snapshot.isSignedIn) {
                views.setViewVisibility(R.id.compact_container_signed_in, View.GONE)
                views.setViewVisibility(R.id.compact_container_signed_out, View.VISIBLE)

                val authPendingIntent = createDeepLinkIntent(context, "myc://auth", 201)
                views.setOnClickPendingIntent(R.id.widget_compact_root, authPendingIntent)
                views.setOnClickPendingIntent(R.id.compact_container_signed_out, authPendingIntent)
            } else {
                views.setViewVisibility(R.id.compact_container_signed_out, View.GONE)
                views.setViewVisibility(R.id.compact_container_signed_in, View.VISIBLE)

                val countText = "${snapshot.todayCompleted}/${snapshot.todayExpected}"
                val streakText = "🔥 ${snapshot.streak}d"

                views.setTextViewText(R.id.compact_count, countText)
                views.setTextViewText(R.id.compact_streak, streakText)
                views.setProgressBar(R.id.compact_progress_bar, 100, snapshot.todayPercentage, false)

                val dashPendingIntent = createDeepLinkIntent(context, "myc://dashboard", 101)
                views.setOnClickPendingIntent(R.id.widget_compact_root, dashPendingIntent)
                views.setOnClickPendingIntent(R.id.compact_container_signed_in, dashPendingIntent)
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
        } catch (e: Throwable) {
            Log.e("MycWidgetHelper", "Failed to update compact widget $appWidgetId", e)
        }
    }

    // --- WIDGET B: STANDARD (TODAY'S COMMITMENTS) ---
    fun updateStandardWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        options: Bundle? = null
    ) {
        try {
            val views = RemoteViews(context.packageName, R.layout.widget_standard)
            val snapshot = getWidgetData(context)

            if (!snapshot.isSignedIn) {
                views.setViewVisibility(R.id.standard_container_signed_in, View.GONE)
                views.setViewVisibility(R.id.standard_container_signed_out, View.VISIBLE)

                val authPendingIntent = createDeepLinkIntent(context, "myc://auth", 202)
                views.setOnClickPendingIntent(R.id.widget_standard_root, authPendingIntent)
                views.setOnClickPendingIntent(R.id.standard_btn_sign_in, authPendingIntent)
            } else {
                views.setViewVisibility(R.id.standard_container_signed_out, View.GONE)
                views.setViewVisibility(R.id.standard_container_signed_in, View.VISIBLE)

                // Dynamic layout adaptation based on options
                val opts = options ?: appWidgetManager.getAppWidgetOptions(appWidgetId)
                val minHeight = opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 140)
                val minWidth = opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 250)

                val maxSlots = when {
                    minHeight < 110 -> 2
                    minHeight < 150 -> 3
                    else -> 4
                }

                // Streak formatting
                if (minWidth < 200) {
                    views.setTextViewText(R.id.standard_streak, "🔥 ${snapshot.streak}d")
                    views.setViewVisibility(R.id.standard_header_subtitle, View.GONE)
                } else {
                    views.setTextViewText(R.id.standard_streak, "🔥 ${snapshot.streak} days")
                    views.setViewVisibility(R.id.standard_header_subtitle, View.VISIBLE)
                }

                views.setTextViewText(
                    R.id.standard_progress_badge,
                    "${snapshot.todayCompleted}/${snapshot.todayExpected}"
                )

                // Header click opens Dashboard
                val dashPendingIntent = createDeepLinkIntent(context, "myc://dashboard", 102)
                views.setOnClickPendingIntent(R.id.standard_header, dashPendingIntent)

                val commitments = snapshot.commitments
                if (commitments.isEmpty()) {
                    views.setViewVisibility(R.id.standard_empty_state, View.VISIBLE)
                    views.setViewVisibility(R.id.standard_commitments_container, View.GONE)
                    views.setOnClickPendingIntent(R.id.standard_empty_state, dashPendingIntent)
                } else {
                    views.setViewVisibility(R.id.standard_empty_state, View.GONE)
                    views.setViewVisibility(R.id.standard_commitments_container, View.VISIBLE)

                    val rowIds = listOf(
                        R.id.standard_row_1 to (R.id.standard_check_1 to R.id.standard_title_1),
                        R.id.standard_row_2 to (R.id.standard_check_2 to R.id.standard_title_2),
                        R.id.standard_row_3 to (R.id.standard_check_3 to R.id.standard_title_3),
                        R.id.standard_row_4 to (R.id.standard_check_4 to R.id.standard_title_4)
                    )

                    for (i in 0 until 4) {
                        val (rowId, viewsPair) = rowIds[i]
                        val (checkId, titleId) = viewsPair

                        if (i < maxSlots && i < commitments.size) {
                            val item = commitments[i]
                            views.setViewVisibility(rowId, View.VISIBLE)
                            views.setTextViewText(titleId, item.title)

                            if (item.isCompleted) {
                                views.setImageViewResource(checkId, R.drawable.widget_ic_check)
                            } else {
                                views.setImageViewResource(checkId, R.drawable.widget_ic_circle)
                            }

                            val action = if (item.isCompleted) "detail" else "complete"
                            val itemPendingIntent = createDeepLinkIntent(
                                context,
                                "myc://commitment/${item.id}?action=$action",
                                1000 + item.id.hashCode()
                            )
                            views.setOnClickPendingIntent(rowId, itemPendingIntent)
                        } else {
                            views.setViewVisibility(rowId, View.GONE)
                        }
                    }

                    if (commitments.size > maxSlots) {
                        val overflowCount = commitments.size - maxSlots
                        views.setViewVisibility(R.id.standard_overflow, View.VISIBLE)
                        views.setTextViewText(
                            R.id.standard_overflow,
                            "+$overflowCount more commitment${if (overflowCount > 1) "s" else ""} in app"
                        )
                        views.setOnClickPendingIntent(R.id.standard_overflow, dashPendingIntent)
                    } else {
                        views.setViewVisibility(R.id.standard_overflow, View.GONE)
                    }
                }
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
        } catch (e: Throwable) {
            Log.e("MycWidgetHelper", "Failed to update standard widget $appWidgetId", e)
        }
    }

    // --- WIDGET C: LARGE (CONSISTENCY DASHBOARD) ---
    fun updateLargeWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        options: Bundle? = null
    ) {
        try {
            val views = RemoteViews(context.packageName, R.layout.widget_large)
            val snapshot = getWidgetData(context)

            if (!snapshot.isSignedIn) {
                views.setViewVisibility(R.id.large_container_signed_in, View.GONE)
                views.setViewVisibility(R.id.large_container_signed_out, View.VISIBLE)

                val authPendingIntent = createDeepLinkIntent(context, "myc://auth", 203)
                views.setOnClickPendingIntent(R.id.widget_large_root, authPendingIntent)
                views.setOnClickPendingIntent(R.id.large_btn_sign_in, authPendingIntent)
            } else {
                views.setViewVisibility(R.id.large_container_signed_out, View.GONE)
                views.setViewVisibility(R.id.large_container_signed_in, View.VISIBLE)

                val opts = options ?: appWidgetManager.getAppWidgetOptions(appWidgetId)
                val minHeight = opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 220)
                val minWidth = opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 250)

                val maxSlots = when {
                    minHeight < 190 -> 3
                    minHeight < 240 -> 4
                    else -> 5
                }

                // Streak Badges
                views.setTextViewText(R.id.large_current_streak, "🔥 ${snapshot.streak} days")
                if (minWidth < 220) {
                    views.setViewVisibility(R.id.large_best_streak, View.GONE)
                } else {
                    views.setViewVisibility(R.id.large_best_streak, View.VISIBLE)
                    views.setTextViewText(R.id.large_best_streak, "🏆 ${snapshot.bestStreak}d best")
                }

                // Progress Summary
                views.setTextViewText(
                    R.id.large_progress_text,
                    "${snapshot.todayCompleted} of ${snapshot.todayExpected} (${snapshot.todayPercentage}%)"
                )
                views.setProgressBar(R.id.large_progress_bar, 100, snapshot.todayPercentage, false)

                // Header & Open Button PendingIntent
                val dashPendingIntent = createDeepLinkIntent(context, "myc://dashboard", 103)
                views.setOnClickPendingIntent(R.id.large_header, dashPendingIntent)
                views.setOnClickPendingIntent(R.id.large_btn_open, dashPendingIntent)

                val commitments = snapshot.commitments
                if (commitments.isEmpty()) {
                    views.setViewVisibility(R.id.large_empty_state, View.VISIBLE)
                    views.setViewVisibility(R.id.large_commitments_container, View.GONE)
                    views.setOnClickPendingIntent(R.id.large_empty_state, dashPendingIntent)
                } else {
                    views.setViewVisibility(R.id.large_empty_state, View.GONE)
                    views.setViewVisibility(R.id.large_commitments_container, View.VISIBLE)

                    val rowIds = listOf(
                        R.id.large_row_1 to (R.id.large_check_1 to R.id.large_title_1),
                        R.id.large_row_2 to (R.id.large_check_2 to R.id.large_title_2),
                        R.id.large_row_3 to (R.id.large_check_3 to R.id.large_title_3),
                        R.id.large_row_4 to (R.id.large_check_4 to R.id.large_title_4),
                        R.id.large_row_5 to (R.id.large_check_5 to R.id.large_title_5)
                    )

                    for (i in 0 until 5) {
                        val (rowId, viewsPair) = rowIds[i]
                        val (checkId, titleId) = viewsPair

                        if (i < maxSlots && i < commitments.size) {
                            val item = commitments[i]
                            views.setViewVisibility(rowId, View.VISIBLE)
                            views.setTextViewText(titleId, item.title)

                            if (item.isCompleted) {
                                views.setImageViewResource(checkId, R.drawable.widget_ic_check)
                            } else {
                                views.setImageViewResource(checkId, R.drawable.widget_ic_circle)
                            }

                            val action = if (item.isCompleted) "detail" else "complete"
                            val itemPendingIntent = createDeepLinkIntent(
                                context,
                                "myc://commitment/${item.id}?action=$action",
                                2000 + item.id.hashCode()
                            )
                            views.setOnClickPendingIntent(rowId, itemPendingIntent)
                        } else {
                            views.setViewVisibility(rowId, View.GONE)
                        }
                    }

                    if (commitments.size > maxSlots) {
                        val overflowCount = commitments.size - maxSlots
                        views.setViewVisibility(R.id.large_overflow, View.VISIBLE)
                        views.setTextViewText(
                            R.id.large_overflow,
                            "+$overflowCount more commitment${if (overflowCount > 1) "s" else ""} in app"
                        )
                        views.setOnClickPendingIntent(R.id.large_overflow, dashPendingIntent)
                    } else {
                        views.setViewVisibility(R.id.large_overflow, View.GONE)
                    }
                }
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
        } catch (e: Throwable) {
            Log.e("MycWidgetHelper", "Failed to update large widget $appWidgetId", e)
        }
    }
}

