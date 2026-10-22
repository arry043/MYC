const fs = require("fs");
const path = require("path");

const {
  withAndroidManifest,
  withMainApplication,
  withDangerousMod,
  withGradleProperties,
  withAppBuildGradle,
  createRunOncePlugin,
} = require("@expo/config-plugins");

function copyFolderSync(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach((element) => {
    const fromPath = path.join(from, element);
    const toPath = path.join(to, element);
    if (fs.lstatSync(fromPath).isDirectory()) {
      copyFolderSync(fromPath, toPath);
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  });
}

function modifyAndroidManifest(config) {
  return withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application?.[0];
    if (!mainApplication) return config;

    mainApplication.receiver = mainApplication.receiver || [];

    const widgetReceivers = [
      {
        $: {
          "android:name": ".widgets.CompactWidgetProvider",
          "android:exported": "true",
          "android:label": "MYC Compact",
        },
        "intent-filter": [
          {
            action: [
              { $: { "android:name": "android.appwidget.action.APPWIDGET_UPDATE" } },
              { $: { "android:name": "com.myc.app.widgets.ACTION_REFRESH" } },
            ],
          },
        ],
        "meta-data": [
          {
            $: {
              "android:name": "android.appwidget.provider",
              "android:resource": "@xml/compact_widget_info",
            },
          },
        ],
      },
      {
        $: {
          "android:name": ".widgets.StandardWidgetProvider",
          "android:exported": "true",
          "android:label": "MYC Today",
        },
        "intent-filter": [
          {
            action: [
              { $: { "android:name": "android.appwidget.action.APPWIDGET_UPDATE" } },
              { $: { "android:name": "com.myc.app.widgets.ACTION_REFRESH" } },
            ],
          },
        ],
        "meta-data": [
          {
            $: {
              "android:name": "android.appwidget.provider",
              "android:resource": "@xml/standard_widget_info",
            },
          },
        ],
      },
      {
        $: {
          "android:name": ".widgets.LargeWidgetProvider",
          "android:exported": "true",
          "android:label": "MYC Dashboard",
        },
        "intent-filter": [
          {
            action: [
              { $: { "android:name": "android.appwidget.action.APPWIDGET_UPDATE" } },
              { $: { "android:name": "com.myc.app.widgets.ACTION_REFRESH" } },
            ],
          },
        ],
        "meta-data": [
          {
            $: {
              "android:name": "android.appwidget.provider",
              "android:resource": "@xml/large_widget_info",
            },
          },
        ],
      },
    ];

    for (const receiver of widgetReceivers) {
      const name = receiver.$["android:name"];
      const exists = mainApplication.receiver.some((r) => r.$ && r.$["android:name"] === name);
      if (!exists) {
        mainApplication.receiver.push(receiver);
      }
    }

    return config;
  });
}

function modifyMainApplication(config) {
  return withMainApplication(config, (config) => {
    const contents = config.modResults.contents;
    const target = "com.myc.app.widgets.MycWidgetPackage()";

    if (!contents.includes(target)) {
      const anchor = "PackageList(this).packages.apply {";
      if (contents.includes(anchor)) {
        config.modResults.contents = contents.replace(
          anchor,
          `${anchor}\n          add(${target})`,
        );
      }
    }
    return config;
  });
}

function copyWidgetFiles(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const pluginDir = path.join(projectRoot, "plugins", "widgets");

      // 1. Copy res files to android/app/src/main/res/
      const srcRes = path.join(pluginDir, "res");
      const destRes = path.join(projectRoot, "android", "app", "src", "main", "res");
      copyFolderSync(srcRes, destRes);

      // 2. Copy kotlin files to android/app/src/main/java/com/myc/app/widgets/
      const srcKotlin = path.join(pluginDir, "kotlin");
      const destKotlin = path.join(
        projectRoot,
        "android",
        "app",
        "src",
        "main",
        "java",
        "com",
        "myc",
        "app",
        "widgets",
      );
      copyFolderSync(srcKotlin, destKotlin);

      return config;
    },
  ]);
}

function modifyGradleProperties(config) {
  return withGradleProperties(config, (config) => {
    const properties = config.modResults;
    const jvmArgsProp = properties.find((p) => p.key === "org.gradle.jvmargs");
    if (jvmArgsProp) {
      jvmArgsProp.value = "-Xmx4096m -XX:MaxMetaspaceSize=1024m";
    } else {
      properties.push({
        type: "property",
        key: "org.gradle.jvmargs",
        value: "-Xmx4096m -XX:MaxMetaspaceSize=1024m",
      });
    }
    return config;
  });
}

function modifyAppBuildGradle(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;
    const targetSnippet =
      "if (findProperty('bundleInDebug') == 'true') { debuggableVariants = [] }";
    if (!contents.includes(targetSnippet)) {
      const anchor = "react {";
      if (contents.includes(anchor)) {
        contents = contents.replace(anchor, `${anchor}\n    ${targetSnippet}`);
        config.modResults.contents = contents;
      }
    }
    return config;
  });
}

function withAndroidWidgets(config) {
  config = modifyAndroidManifest(config);
  config = modifyMainApplication(config);
  config = modifyGradleProperties(config);
  config = modifyAppBuildGradle(config);
  config = copyWidgetFiles(config);
  return config;
}

module.exports = createRunOncePlugin(withAndroidWidgets, "withAndroidWidgets", "1.0.0");
