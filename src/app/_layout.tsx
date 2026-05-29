import { useAuthStore, useProfileStore } from "@/stores";
import { supabase } from "@/utils/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import {
  DarkTheme,
  DefaultTheme,
  Slot,
  ThemeProvider,
  useRouter,
  useSegments,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { ActivityIndicator, useColorScheme, View } from "react-native";
import "../global.css";

WebBrowser.maybeCompleteAuthSession();

const HAS_LAUNCHED_KEY = "@has_launched";

function AuthGate() {
  const { session, initializing, init } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const [hasUsername, setHasUsername] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);

  useEffect(() => {
    const unsub = init();
    return unsub;
  }, []);

  useEffect(() => {
    async function checkOnboardingStatus() {
      try {
        const hasLaunched = await AsyncStorage.getItem(HAS_LAUNCHED_KEY);
        setIsFirstLaunch(hasLaunched !== "true");
      } catch {
        setIsFirstLaunch(false);
      } finally {
        setCheckingOnboarding(false);
      }
    }
    checkOnboardingStatus();
  }, []);

  useEffect(() => {
    const handleUrl = async (url: string) => {
      if (!url.includes("auth/callback")) return;
      const fragment = url.includes("#")
        ? url.split("#")[1]
        : url.split("?")[1];
      if (!fragment) return;
      const params = new URLSearchParams(fragment);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      }
    };
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });
    const sub = Linking.addEventListener("url", ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setHasUsername(null);
      return;
    }
    setCheckingUsername(true);
    supabase
      .from("profiles")
      .select("username")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        setHasUsername(!!data?.username);
        setCheckingUsername(false);
      });
  }, [session?.user?.id]);

  const sessionUserId = useAuthStore((s) => s.session?.user?.id);
  const fetchBookmarks = useProfileStore((s) => s.fetchBookmarks);

  useEffect(() => {
    if (sessionUserId) fetchBookmarks(sessionUserId);
  }, [sessionUserId]);

  useEffect(() => {
    if (initializing || checkingUsername || checkingOnboarding) return;

    const inOnboarding = segments[0] === "onboard";
    const inAuthGroup = segments[0] === "auth";
    const inUsernameSetup = segments[0] === "username-setup";

    if (isFirstLaunch) {
      if (!inOnboarding) router.replace("/onboard");
      return;
    }

    if (!session) {
      if (!inAuthGroup) router.replace("/auth");
      return;
    }

    if (hasUsername === false && !inUsernameSetup) {
      router.replace("/username-setup");
      return;
    }

    if (
      hasUsername === true &&
      (inAuthGroup || inUsernameSetup || inOnboarding)
    ) {
      router.replace("/");
    }
  }, [
    session,
    initializing,
    segments,
    hasUsername,
    checkingUsername,
    checkingOnboarding,
    isFirstLaunch,
  ]);

  useEffect(() => {
    if (!checkingOnboarding && isFirstLaunch) {
      const interval = setInterval(async () => {
        try {
          const hasLaunched = await AsyncStorage.getItem(HAS_LAUNCHED_KEY);
          if (hasLaunched === "true") {
            setIsFirstLaunch(false);
            clearInterval(interval);
          }
        } catch {}
      }, 300);
      return () => clearInterval(interval);
    }
  }, [checkingOnboarding, isFirstLaunch]);

  useEffect(() => {
    if (!session?.user?.id || hasUsername !== false) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", session.user.id)
        .maybeSingle();
      if (data?.username) {
        setHasUsername(true);
        clearInterval(interval);
      }
    }, 400);
    return () => clearInterval(interval);
  }, [session?.user?.id, hasUsername]);

  if (initializing || checkingOnboarding || (session && checkingUsername)) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator color="#000" size="large" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <AuthGate />
    </ThemeProvider>
  );
}

