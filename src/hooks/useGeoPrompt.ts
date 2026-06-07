import { syncIpCity } from "@/utils/geo";
import { supabase } from "@/utils/supabase";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

const GEO_REMIND_KEY = "@geo_remind_later_ts";
const REMIND_DELAY_MS = 3 * 24 * 60 * 60 * 1000;

async function getRemindTs(): Promise<string | null> {
  try {
    if (Platform.OS === "web") return localStorage.getItem(GEO_REMIND_KEY);
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    return AsyncStorage.getItem(GEO_REMIND_KEY);
  } catch {
    return null;
  }
}

async function setRemindTs(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(GEO_REMIND_KEY, String(Date.now()));
      return;
    }
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    await AsyncStorage.setItem(GEO_REMIND_KEY, String(Date.now()));
  } catch {}
}

export function useGeoPrompt(
  userId: string | undefined,
  hasUsername: boolean | null,
) {
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);

  useEffect(() => {
    if (!userId || hasUsername !== true) return;
    maybeAskGeo(userId);
  }, [userId, hasUsername]);

  async function maybeAskGeo(uid: string) {
    if (Platform.OS !== "web") {
      const Location = await import("expo-location");
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === "granted") return;
    }

    const remindRaw = await getRemindTs();
    if (remindRaw) {
      const storedTs = parseInt(remindRaw, 10);
      if (!isNaN(storedTs) && Date.now() - storedTs < REMIND_DELAY_MS) return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("city, ip_city")
      .eq("id", uid)
      .single();

    if (profileData?.city) return;

    await syncIpCity(uid);
    setShowLocationPrompt(true);
  }

  const dismiss = () => setShowLocationPrompt(false);

  const remindLater = async () => {
    dismiss();
    await setRemindTs();
  };

  return { showLocationPrompt, dismiss, remindLater };
}
