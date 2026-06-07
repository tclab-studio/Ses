import { useGeoPrompt } from "@/hooks/useGeoPrompt";
import { useEnvironment } from "@/hooks/useEnvironment";
import { useAuthStore, useProfileStore } from "@/stores";
import { syncDeviceCity } from "@/utils/geo";
import { supabase } from "@/utils/supabase";
import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native";

const HAS_LAUNCHED_KEY = "@has_launched";

async function getStorageItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
  return AsyncStorage.getItem(key);
}

export function AuthAndGeoGate() {
  const { session, initializing, init } = useAuthStore();
  const { isTelegram } = useEnvironment();
  const segments = useSegments();
  const router = useRouter();

  const [hasUsername, setHasUsername] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  const [hasTopics, setHasTopics] = useState<boolean | null>(null);
  const [checkingTopics, setCheckingTopics] = useState(false);

  const userId = session?.user?.id;
  const { showLocationPrompt, dismiss } = useGeoPrompt(userId, hasUsername);

  useEffect(() => {
    const unsub = init();
    return unsub;
  }, []);

  useEffect(() => {
    async function checkOnboardingStatus() {
      try {
        if (isTelegram) {
          setIsFirstLaunch(false);
          setCheckingOnboarding(false);
          return;
        }
        const hasLaunched = await getStorageItem(HAS_LAUNCHED_KEY);
        setIsFirstLaunch(hasLaunched !== "true");
      } catch {
        setIsFirstLaunch(false);
      } finally {
        setCheckingOnboarding(false);
      }
    }
    checkOnboardingStatus();
  }, [isTelegram]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    let sub: any;
    const setup = async () => {
      const Linking = await import("expo-linking");

      const handleUrl = async (url: string) => {
        if (!url.includes("auth/callback")) return;
        const fragment = url.includes("#") ? url.split("#")[1] : url.split("?")[1];
        if (!fragment) return;
        const params = new URLSearchParams(fragment);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        }
      };

      Linking.getInitialURL().then((url) => {
        if (url) handleUrl(url);
      });

      sub = Linking.addEventListener("url", ({ url }) => handleUrl(url));
    };

    setup();
    return () => sub?.remove();
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setHasUsername(null);
      setHasTopics(null);
      return;
    }
    setCheckingUsername(true);
    setCheckingTopics(true);

    Promise.all([
      supabase.from("profiles").select("username").eq("id", session.user.id).maybeSingle(),
      supabase.from("user_topics").select("topic_id").eq("user_id", session.user.id).limit(1)
    ]).then(([{ data: profileData }, { data: topicsData }]) => {
      setHasUsername(!!profileData?.username);
      setCheckingUsername(false);
      setHasTopics(!!topicsData && topicsData.length > 0);
      setCheckingTopics(false);
    });
  }, [session?.user?.id]);

  const fetchLikes = useProfileStore((s) => s.fetchLikes);
  useEffect(() => {
    if (userId) fetchLikes(userId);
  }, [userId]);

  useEffect(() => {
    if (initializing || checkingUsername || checkingOnboarding || checkingTopics) return;

    const inOnboarding = segments[0] === "onboard";
    const inAuthGroup = segments[0] === "auth";
    const inUsernameSetup = segments[0] === "username-setup";
    const inTopics = segments[0] === "topics";
    const isTargetingLegal = segments.join("/") === "settings/legal";

    if (isFirstLaunch && !isTelegram) {
      if (!inOnboarding && !isTargetingLegal) {
        router.replace("/onboard");
      }
      return;
    }

    if (!session) {
      if (!inAuthGroup && !isTargetingLegal) {
        router.replace("/auth");
      }
      return;
    }

    if (hasUsername === false && !inUsernameSetup) {
      if (!isTargetingLegal) {
        router.replace("/username-setup");
      }
      return;
    }

    if (hasUsername === true && hasTopics === false && !inTopics) {
      if (!isTargetingLegal) {
        router.replace("/topics");
      }
      return;
    }

    if (hasUsername === true && hasTopics === true && (inAuthGroup || inUsernameSetup || inOnboarding || inTopics)) {
      router.replace("/");
    }
  }, [
    session,
    initializing,
    segments,
    hasUsername,
    checkingUsername,
    hasTopics,
    checkingTopics,
    checkingOnboarding,
    isFirstLaunch,
    isTelegram,
  ]);

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

  useEffect(() => {
    if (showLocationPrompt && userId) {
      dismiss();
      if (Platform.OS !== "web") {
        syncDeviceCity(userId).catch(() => {});
      }
    }
  }, [showLocationPrompt, userId]);

  if (initializing || checkingOnboarding || (session && (checkingUsername || checkingTopics))) {
    return (
      <View className="flex-1 bg-white dark:bg-zinc-950 items-center justify-center">
        <ActivityIndicator
          color={Platform.OS === "ios" ? "#000000" : "gray"}
          size="small"
        />
      </View>
    );
  }

  return <Slot />;
}