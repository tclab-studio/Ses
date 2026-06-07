import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

export const OK_HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

export default function DemographicsBanner({
  onPress,
}: {
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={OK_HIT_SLOP}
      className="flex-row items-center justify-between p-4 rounded-2xl bg-neutral-100 dark:bg-zinc-900 border border-neutral-200/40 dark:border-zinc-800/50 active:opacity-80"
    >
      <View className="flex-row items-center gap-3 flex-1">
        <Ionicons
          name="sparkles-outline"
          size={18}
          className="text-amber-500"
        />
        <View className="flex-1">
          <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-200">
            Personalize your profile
          </Text>
          <Text className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
            Add your age and gender to customize experience.
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} className="text-neutral-400" />
    </Pressable>
  );
}
