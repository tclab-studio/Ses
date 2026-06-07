import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

const OK_HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

const LEGAL_URL =
  "https://tclab-studio.github.io/Ses-Privacy-Policy-Terms-of-Service";

const SECTION_ANCHORS: Record<string, string> = {
  privacy: "#privacy",
  terms: "#terms",
};

const SECTION_TITLES: Record<string, string> = {
  privacy: "Privacy Policy",
  terms: "Terms of Service",
};

export default function LegalScreen() {
  const router = useRouter();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const webRef = useRef<WebView>(null);

  const anchor = section ? (SECTION_ANCHORS[section] ?? "") : "";
  const title = section ? (SECTION_TITLES[section] ?? "Legal") : "Legal";
  const uri = `${LEGAL_URL}${anchor}`;

  return (
    <View className="flex-1 bg-white dark:bg-zinc-950">
      <SafeAreaView className="flex-1" edges={["top", "left", "right"]}>
        <View className="flex-row items-center justify-between px-6 py-4 bg-white dark:bg-zinc-950 border-b border-neutral-100 dark:border-zinc-900">
          <Pressable
            onPress={() => router.back()}
            hitSlop={OK_HIT_SLOP}
            className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-zinc-800 items-center justify-center active:opacity-70"
          >
            <Ionicons name="chevron-back" size={18} color="#a3a3a3" />
          </Pressable>
          <Text className="text-base font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            {title}
          </Text>
          <View className="w-9" />
        </View>

        <WebView
          ref={webRef}
          source={{ uri }}
          startInLoadingState
          renderLoading={() => (
            <View className="flex-1 items-center justify-center bg-white dark:bg-zinc-950">
              <ActivityIndicator color="#a3a3a3" />
            </View>
          )}
          style={{ flex: 1 }}
        />
      </SafeAreaView>
    </View>
  );
}
