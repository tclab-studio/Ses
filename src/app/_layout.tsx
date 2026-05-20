import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import * as Linking from "expo-linking";
import { Slot, useRouter, useSegments } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, useColorScheme, View } from "react-native";
import "../global.css";

import { useAuthStore } from "@/stores";
import { supabase } from "@/utils/supabase";

WebBrowser.maybeCompleteAuthSession();

function AuthGate() {
  const { session, initializing, init } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const [hasUsername, setHasUsername] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  useEffect(() => {
    const unsub = init();
    return unsub;
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

  useEffect(() => {
    if (initializing || checkingUsername) return;
    const inAuthGroup = segments[0] === "auth";
    const inUsernameSetup = segments[0] === "username-setup";
    if (!session) {
      if (!inAuthGroup) router.replace("/auth");
      return;
    }
    if (hasUsername === false && !inUsernameSetup) {
      router.replace("/username-setup");
      return;
    }
    if (hasUsername === true && (inAuthGroup || inUsernameSetup))
      router.replace("/");
  }, [session, initializing, segments, hasUsername, checkingUsername]);

  if (initializing || (session && checkingUsername)) {
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
      <AuthGate />
    </ThemeProvider>
  );
}

