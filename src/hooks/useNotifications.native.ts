import { supabase } from "@/utils/supabase";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("follows", {
      name: "Follows",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#000000",
    });
  }

  const { data } = await Notifications.getExpoPushTokenAsync({
    projectId: "39ab4997-67e0-4b5e-bc02-c859e50f203d",
  });

  return data;
}

export function useNotifications(userId: string | null) {
  const receivedRef = useRef<Notifications.EventSubscription | null>(null);
  const responseRef = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!userId) return;

    registerForPushNotifications().then(async (token) => {
      if (!token) return;
      await supabase.from("push_tokens").upsert(
        {
          user_id: userId,
          token,
          platform: Platform.OS,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    });

    receivedRef.current = Notifications.addNotificationReceivedListener(() => {});

    responseRef.current = Notifications.addNotificationResponseReceivedListener(() => {});

    return () => {
      receivedRef.current?.remove();
      responseRef.current?.remove();
    };
  }, [userId]);
}
