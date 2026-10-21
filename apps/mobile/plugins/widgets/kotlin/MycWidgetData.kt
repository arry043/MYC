package com.myc.app.widgets

import org.json.JSONArray
import org.json.JSONObject

data class WidgetCommitment(
    val id: String,
    val title: String,
    val isCompleted: Boolean,
    val tone: String
)

data class MycWidgetSnapshot(
    val isSignedIn: Boolean,
    val streak: Int,
    val bestStreak: Int,
    val todayCompleted: Int,
    val todayExpected: Int,
    val todayPercentage: Int,
    val todayDate: String,
    val commitments: List<WidgetCommitment>
) {
    companion object {
        fun fromJson(jsonStr: String?): MycWidgetSnapshot {
            if (jsonStr.isNullOrEmpty()) {
                return signedOutSnapshot()
            }
            return try {
                val obj = JSONObject(jsonStr)
                val isSignedIn = obj.optBoolean("isSignedIn", false)
                if (!isSignedIn) {
                    return signedOutSnapshot()
                }
                val streak = obj.optInt("streak", 0)
                val bestStreak = obj.optInt("bestStreak", 0)
                val todayCompleted = obj.optInt("todayCompleted", 0)
                val todayExpected = obj.optInt("todayExpected", 0)
                val todayPercentage = obj.optInt("todayPercentage", 0)
                val todayDate = obj.optString("todayDate", "")

                val commList = mutableListOf<WidgetCommitment>()
                val arr = obj.optJSONArray("commitments") ?: JSONArray()
                for (i in 0 until arr.length()) {
                    val cObj = arr.optJSONObject(i) ?: continue
                    commList.add(
                        WidgetCommitment(
                            id = cObj.optString("id", ""),
                            title = cObj.optString("title", "Commitment"),
                            isCompleted = cObj.optBoolean("isCompleted", false),
                            tone = cObj.optString("tone", "sky")
                        )
                    )
                }

                MycWidgetSnapshot(
                    isSignedIn = true,
                    streak = streak,
                    bestStreak = bestStreak,
                    todayCompleted = todayCompleted,
                    todayExpected = todayExpected,
                    todayPercentage = todayPercentage,
                    todayDate = todayDate,
                    commitments = commList
                )
            } catch (e: Exception) {
                signedOutSnapshot()
            }
        }

        fun signedOutSnapshot(): MycWidgetSnapshot {
            return MycWidgetSnapshot(
                isSignedIn = false,
                streak = 0,
                bestStreak = 0,
                todayCompleted = 0,
                todayExpected = 0,
                todayPercentage = 0,
                todayDate = "",
                commitments = emptyList()
            )
        }
    }
}

