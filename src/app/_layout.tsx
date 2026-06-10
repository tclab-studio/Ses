import { AuthAndGeoGate } from "@/components/gates";
import { useNotifications } from "@/hooks/useNotifications";
import { useTerminalTelemetry } from "@/hooks/useTerminalTelemetry";
import { useAuthStore } from "@/stores";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { ObserveRoot, useObserve } from "expo-observe";
import { DefaultTheme, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "../global.css";

if (Platform.OS !== "web") {
  const { configureGoogleSignin } = require("@/utils/googleSignin");
  configureGoogleSignin();
}

SplashScreen.preventAutoHideAsync().catch(() => {});

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

function RootLayout() {
  const [isTelegramValid, setIsTelegramValid] = useState<boolean | null>(null);

  const [fontsLoaded] = useFonts({
    "DMSans-Bold": require("@/assets/fonts/DMSans-Bold.ttf"),
    "DMSans-BoldItalic": require("@/assets/fonts/DMSans-BoldItalic.ttf"),
    "DMSans-Italic": require("@/assets/fonts/DMSans-Italic.ttf"),
    "DMSans-Medium": require("@/assets/fonts/DMSans-Medium.ttf"),
    "DMSans-MediumItalic": require("@/assets/fonts/DMSans-MediumItalic.ttf"),
    "DMSans-Regular": require("@/assets/fonts/DMSans-Regular.ttf"),
  });

  const { markInteractive } = useObserve();

  useTerminalTelemetry();

  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const tg = (window as any).Telegram?.WebApp;

      if (tg?.initData) {
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

  useEffect(() => {
    if (fontsLoaded && isTelegramValid !== null) {
      SplashScreen.hideAsync().catch(console.warn);
      markInteractive();
    }
  }, [fontsLoaded, isTelegramValid, markInteractive]);

  if (!fontsLoaded || isTelegramValid === null) {
    return null;
  }

  if (Platform.OS === "web" && !isTelegramValid) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#17212b",
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontSize: 18,
            textAlign: "center",
            fontWeight: "bold",
          }}
        >
          Please open this app from Telegram.
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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

export default ObserveRoot.wrap(RootLayout);

