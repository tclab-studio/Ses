import { useAuth } from "@/hooks/useAuth";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const OK_HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

const appVersion =
  Constants.expoConfig?.version ?? Constants.manifest?.version ?? "1.0.0";

type RowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  label: string;
  value?: string;
  onPress?: () => void;
  last?: boolean;
  destructive?: boolean;
};

function SettingsRow({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  onPress,
  last,
  destructive,
}: RowProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={OK_HIT_SLOP}
      className={`flex-row items-center justify-between px-4 py-3.5 active:bg-neutral-50 dark:active:bg-zinc-800/40 ${
        !last ? "border-b border-neutral-100 dark:border-zinc-800/60" : ""
      }`}
    >
      <View className="flex-row items-center gap-3.5">
        <View
          className="w-8 h-8 rounded-xl items-center justify-center"
          style={{ backgroundColor: iconBg }}
        >
          <Ionicons name={icon} size={15} color={iconColor} />
        </View>
        <Text
          className={`text-sm font-semibold ${
            destructive
              ? "text-red-500"
              : "text-neutral-800 dark:text-neutral-200"
          }`}
        >
          {label}
        </Text>
      </View>
      <View className="flex-row items-center gap-2">
        {value ? (
          <Text className="text-xs text-neutral-400 dark:text-zinc-500 font-medium">
            {value}
          </Text>
        ) : null}
        {onPress && !destructive && (
          <Ionicons name="chevron-forward" size={14} color="#a3a3a3" />
        )}
      </View>
    </Pressable>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <Text className="text-[10px] font-bold text-neutral-400 dark:text-zinc-500 uppercase tracking-widest px-1 mb-2 mt-6">
      {label}
    </Text>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert("Sign out", "You sure you wanna dip?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: signOut },
    ]);
  };

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-zinc-950">
      <SafeAreaView className="flex-1" edges={["top", "left", "right"]}>
        <View className="flex-row items-center justify-between px-6 py-4 bg-neutral-50 dark:bg-zinc-950">
          <Pressable
            onPress={() => router.back()}
            hitSlop={OK_HIT_SLOP}
            className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-900 border border-neutral-200/60 dark:border-zinc-800 items-center justify-center active:opacity-70"
          >
            <Ionicons name="chevron-back" size={18} color="#a3a3a3" />
          </Pressable>
          <Text className="text-base font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Settings
          </Text>
          <View className="w-9" />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }}
        >
          <SectionLabel label="Account" />
          <View className="bg-white dark:bg-zinc-900 rounded-2xl border border-neutral-200/60 dark:border-zinc-800 overflow-hidden">
            <SettingsRow
              icon="person-outline"
              iconBg="rgba(59,130,246,0.1)"
              iconColor="#3b82f6"
              label="Edit Profile"
              onPress={() => router.push("/settings/user" as any)}
            />
            <SettingsRow
              icon="notifications-outline"
              iconBg="rgba(249,115,22,0.1)"
              iconColor="#f97316"
              label="Notifications"
              value="Coming soon"
              last
            />
          </View>

          <SectionLabel label="Legal" />
          <View className="bg-white dark:bg-zinc-900 rounded-2xl border border-neutral-200/60 dark:border-zinc-800 overflow-hidden">
            <SettingsRow
              icon="shield-checkmark-outline"
              iconBg="rgba(16,185,129,0.1)"
              iconColor="#10b981"
              label="Privacy Policy"
              onPress={() =>
                router.push({
                  pathname: "/settings/legal",
                  params: { section: "privacy" },
                } as any)
              }
            />
            <SettingsRow
              icon="document-text-outline"
              iconBg="rgba(99,102,241,0.1)"
              iconColor="#6366f1"
              label="Terms of Service"
              onPress={() =>
                router.push({
                  pathname: "/settings/legal",
                  params: { section: "terms" },
                } as any)
              }
              last
            />
          </View>

          <SectionLabel label="App" />
          <View className="bg-white dark:bg-zinc-900 rounded-2xl border border-neutral-200/60 dark:border-zinc-800 overflow-hidden">
            <SettingsRow
              icon="information-circle-outline"
              iconBg="rgba(107,114,128,0.1)"
              iconColor="#6b7280"
              label="Version"
              value={`v${appVersion}`}
              last
            />
          </View>

          <SectionLabel label="Danger Zone" />
          <View className="bg-white dark:bg-zinc-900 rounded-2xl border border-neutral-200/60 dark:border-zinc-800 overflow-hidden">
            <SettingsRow
              icon="log-out-outline"
              iconBg="rgba(239,68,68,0.1)"
              iconColor="#ef4444"
              label="Sign Out"
              onPress={handleSignOut}
              destructive
              last
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
