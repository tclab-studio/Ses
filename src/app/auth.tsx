import { GoogleButton } from "@/components/google-button";
import { useAuth } from "@/hooks/useAuth";
import { useEnvironment } from "@/hooks/useEnvironment";
import { useAuthStore } from "@/stores";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

function TelegramButton({
  onPress,
  loading,
}: {
  onPress: () => void;
  loading: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#2AABEE",
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 20,
        opacity: loading ? 0.6 : 1,
        gap: 10,
      }}
    >
      <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>
        {loading ? "Signing in…" : "Continue with Telegram"}
      </Text>
    </TouchableOpacity>
  );
}

export default function AuthScreen() {
  const { loading, signInWithGoogle, signInWithTelegram } = useAuth();
  const { isTelegram } = useEnvironment();
  const session = useAuthStore((s) => s.session);
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (isTelegram) {
      if (session) {
        router.replace("/");
        return;
      }
      signInWithTelegram();
      return;
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isTelegram, session]);

  if (isTelegram) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#fff",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "#000000", fontSize: 16 }}>
          Signing in with Telegram…
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />

      <Animated.View
        className="flex-1 justify-between px-8 pt-24 pb-16"
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        <View>
          <Text className="text-black text-4xl font-bold tracking-tight leading-tight">
            Ses
          </Text>
          <Text className="text-neutral-400 text-base mt-3 leading-relaxed">
            Vote on anything.{"\n"}See what people really think.
          </Text>
        </View>

        <View className="gap-3">
          {Platform.OS !== "web" ? (
            <GoogleButton onPress={signInWithGoogle} loading={loading} />
          ) : (
            <GoogleButton onPress={signInWithGoogle} loading={loading} />
          )}

          <Text className="text-center text-neutral-400 text-2xs leading-relaxed">
            By continuing you agree to our{" "}
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/settings/legal",
                  params: { section: "terms" },
                } as any)
              }
            >
              <Text className="text-neutral-800 font-bold underline">
                Terms
              </Text>
            </Pressable>
            {" & "}
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/settings/legal",
                  params: { section: "privacy" },
                } as any)
              }
            >
              <Text className="text-neutral-800 font-bold underline">
                Privacy Policy
              </Text>
            </Pressable>
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

