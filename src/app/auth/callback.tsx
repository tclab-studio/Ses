import { supabase } from "@/utils/supabase";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Platform, View } from "react-native";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      if (Platform.OS === "web") {
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get("code");

        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
          router.replace("/");
          return;
        }

        const hash = window.location.hash;
        const fragment = hash.startsWith("#") ? hash.slice(1) : "";

        if (fragment) {
          const params = new URLSearchParams(fragment);
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          }
        } else {
          await supabase.auth.getSession();
        }

        router.replace("/");
        return;
      }

      const Linking = await import("expo-linking");
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

