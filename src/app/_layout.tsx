import { AuthAndGeoGate } from "@/components/gates";
import { useNotifications } from "@/hooks/useNotifications";
import { useTerminalTelemetry } from "@/hooks/useTerminalTelemetry";
import { useAuthStore } from "@/stores";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "../global.css";

if (Platform.OS !== "web") {
  const { configureGoogleSignin } = require("@/utils/googleSignin");
  configureGoogleSignin();
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

function NotificationsBridge() {
  const session = useAuthStore((s) => s.session);
  useNotifications(session?.user?.id ?? null);
  return null;
}

export default function RootLayout() {
  const telegramChecked = useRef(false);
  const [isTelegramValid, setIsTelegramValid] = useState<boolean | null>(null);

  useTerminalTelemetry();

  useEffect(() => {
    if (telegramChecked.current) return;
    telegramChecked.current = true;

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const tg = (window as any).Telegram?.WebApp;
      if (tg && tg.initData) {
        tg.ready();
        tg.expand();
        setIsTelegramValid(true);
      } else {
        setIsTelegramValid(false);
      }
    } else {
      setIsTelegramValid(true);
    }
  }, []);

  if (isTelegramValid === null) return null;

  if (!isTelegramValid && Platform.OS === "web") {
    return (
      <View style={styles.fallbackContainer}>
        <Text style={styles.fallbackText}>
          Please open this app via the Telegram Bot!
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView className="flex-1">
      <BottomSheetModalProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={DefaultTheme}>
            <StatusBar style="dark" />
            <NotificationsBridge />
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
