package com.myc.app.widgets

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class MycWidgetBridgeModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "MycWidgetBridge"

    @ReactMethod
    fun setWidgetData(jsonString: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            MycWidgetHelper.saveWidgetData(context, jsonString)
            MycWidgetHelper.updateAllWidgets(context)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("WIDGET_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun clearWidgetData(promise: Promise) {
        try {
            val context = reactApplicationContext
            MycWidgetHelper.clearWidgetData(context)
            MycWidgetHelper.updateAllWidgets(context)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("WIDGET_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun reloadAllWidgets(promise: Promise) {
        try {
            val context = reactApplicationContext
            MycWidgetHelper.updateAllWidgets(context)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("WIDGET_ERROR", e.message, e)
        }
    }
}

