import { AuthAndGeoGate } from "@/components/gates";
import { useTerminalTelemetry } from "@/hooks/useTerminalTelemetry";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, useColorScheme, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "../global.css";

if (Platform.OS !== "web") {
  const { configureGoogleSignin } = require("@/utils/googleSignin");
  configureGoogleSignin();
}

const queryClient = new QueryClient();

export default function RootLayout() {
  const systemColorScheme = useColorScheme();
  const [colorScheme, setColorScheme] = useState(systemColorScheme);
  const [isTelegramValid, setIsTelegramValid] = useState<boolean | null>(null);

  useTerminalTelemetry();

  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const tg = (window as any).Telegram?.WebApp;

      if (tg && tg.initData) {
        tg.ready();
        tg.expand();
        setColorScheme(tg.colorScheme || systemColorScheme);
        setIsTelegramValid(true);

        const handleThemeChange = () => setColorScheme(tg.colorScheme);
        tg.onEvent("themeChanged", handleThemeChange);
        return () => tg.offEvent("themeChanged", handleThemeChange);
      } else {
        setIsTelegramValid(false);
      }
    } else {
      setIsTelegramValid(true);
    }
  }, [systemColorScheme]);

  if (isTelegramValid === null) {
    return null;
  }

  if (!isTelegramValid && Platform.OS === "web") {
    return (
      <View style={styles.fallbackContainer}>
        <Text style={styles.fallbackText}>
          Please open this app via the Telegram Bot!
        </Text>
      </View>
    );
  }

  const activeTheme = colorScheme === "dark" ? DarkTheme : DefaultTheme;

  return (
    <GestureHandlerRootView className="flex-1">
      <BottomSheetModalProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={activeTheme}>
            <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
            <AuthAndGeoGate />
          </ThemeProvider>
        </QueryClientProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fallbackContainer: {
    flex: 1,
    backgroundColor: "#17212b",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  fallbackText: {
    color: "#ffffff",
    fontSize: 18,
    textAlign: "center",
    fontWeight: "bold",
  },
});
