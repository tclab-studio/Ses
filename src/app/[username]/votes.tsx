import { SesCard } from "@/components/cards/ses-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAuthStore, useUserActivityStore } from "@/stores";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect } from "react";
import { FlatList, RefreshControl, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function VotesSessScreen() {
  const router = useRouter();
  const sessionUserId = useAuthStore((s) => s.session?.user?.id);
  const votedSess = useUserActivityStore((s) => s.votedSess);
  const fetchVotedSess = useUserActivityStore((s) => s.fetchVotedSess);
  const isLoading = useUserActivityStore((s) => s.isLoading);

  useEffect(() => {
    if (sessionUserId) {
      fetchVotedSess(sessionUserId);
    }
  }, [sessionUserId]);

  const handleRefresh = useCallback(() => {
    if (sessionUserId) fetchVotedSess(sessionUserId);
  }, [sessionUserId]);

  const renderItem = useCallback(
    ({ item }: any) => <SesCard item={item} />,
    [],
  );
  const keyExtractor = useCallback((item: any) => item.id, []);

  return (
    <ThemedView className="flex-1">
      <SafeAreaView
        className="flex-1"
        edges={["top", "bottom", "left", "right"]}
      >
        <View className="flex-row items-center px-4 py-3.5 border-b border-neutral-100 dark:border-neutral-850">
          <TouchableOpacity
           onPress={() => router.navigate('/profile' as any)}
            activeOpacity={0.7}
            className="p-2 -ml-2 rounded-full active:bg-neutral-100 dark:active:bg-neutral-800"
          >
            <Ionicons name="chevron-back" size={24} color="#9ca3af" />
          </TouchableOpacity>
          <ThemedText className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 ml-1">
            Voted Sessions
          </ThemedText>
        </View>

        <FlatList
          data={votedSess}
          keyExtractor={keyExtractor}
          contentContainerStyle={{ padding: 16, gap: 16 }}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            !isLoading ? (
              <ThemedText className="text-center text-neutral-500 mt-10">
                You haven't voted on anything yet.
              </ThemedText>
            ) : null
          }
          renderItem={renderItem}
        />
      </SafeAreaView>
    </ThemedView>
  );
}
