import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

// Development-only diagnostics. Required inside a `__DEV__` branch so Metro
// strips the module from production bundles entirely.
const devTools: typeof import("@/dev/SupabaseStatus") | null = __DEV__
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports -- a static import would ship to production
    require("@/dev/SupabaseStatus")
  : null;

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>MYC</Text>
      <Text style={styles.subtitle}>Make Yourself Consistent</Text>
      {devTools && <devTools.SupabaseStatus />}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#ffffff",
  },
  title: {
    fontSize: 40,
    fontWeight: "600",
    color: "#0a0a0a",
  },
  subtitle: {
    fontSize: 16,
    color: "#737373",
  },
});
