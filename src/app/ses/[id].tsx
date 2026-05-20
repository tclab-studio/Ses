import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SesDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <ThemedView className="flex-1">
      <SafeAreaView className="flex-1 px-4 items-center justify-center">
        <View className="items-center gap-2">
          <ThemedText className="text-2xl font-bold">Ses</ThemedText>
          <ThemedText className="text-sm text-neutral-400">{id}</ThemedText>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}
