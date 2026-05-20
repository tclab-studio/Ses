import { supabase } from "@/utils/supabase";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const url = await Linking.getInitialURL();
      if (!url) return;

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
        router.replace("/");
      } else {
        router.replace("/auth");
      }
    };

    handleCallback();
  }, []);

  return (
    <View className="flex-1 bg-black items-center justify-center">
      <ActivityIndicator color="#ffffff" size="large" />
    </View>
  );
}
