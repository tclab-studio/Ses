import { SesCard } from "@/components/cards/ses-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAuthStore, useUserActivityStore } from "@/stores";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect } from "react";
import { FlatList, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function VotedSessScreen() {
  const { username } = useLocalSearchParams();
  const session = useAuthStore((s) => s.session);
  const { votedSess, fetchVotedSess, isLoading } = useUserActivityStore();

  useEffect(() => {
    if (session?.user?.id) {
      fetchVotedSess(session.user.id);
    }
  }, [session?.user?.id]);

  return (
    <ThemedView className="flex-1">
      <SafeAreaView className="flex-1">
        <FlatList
          data={votedSess}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => session?.user?.id && fetchVotedSess(session.user.id)}
            />
          }
          ListEmptyComponent={
            !isLoading ? (
              <ThemedText className="text-center text-neutral-500 mt-10">
                You haven't voted on anything yet.
              </ThemedText>
            ) : null
          }
          renderItem={({ item }) => <SesCard item={item as any} />}
        />
      </SafeAreaView>
    </ThemedView>
  );
}