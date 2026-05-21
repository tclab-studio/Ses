import { SesCard, SesCardSkeleton } from "@/components/cards/ses-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  BottomTabInset,
  Colors,
  MaxContentWidth,
  Spacing,
} from "@/constants/theme";
import { useAuthStore, useFeedStore } from "@/stores";
import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef } from "react";
import {
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SKELETON_COUNT = 4;

const SkeletonList = () => (
  <View
    style={{
      paddingHorizontal: Spacing.four,
      paddingTop: Spacing.four,
      gap: Spacing.four,
    }}
  >
    {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
      <SesCardSkeleton key={i} />
    ))}
  </View>
);

const EmptyState = () => (
  <View className="items-center justify-center pt-32 gap-4">
    <View className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-900 items-center justify-center">
      <Ionicons name="chatbubbles-outline" size={28} color="#9ca3af" />
    </View>
    <View className="items-center gap-1.5">
      <ThemedText className="text-base font-bold text-neutral-800 dark:text-neutral-200">
        Nothing here yet
      </ThemedText>
      <ThemedText className="text-sm text-neutral-400 dark:text-neutral-500 text-center px-8 leading-relaxed">
        Be the very first one to drop an interesting question to this feed!
      </ThemedText>
    </View>
  </View>
);

export default function HomeScreen() {
  const { session } = useAuthStore();
  const {
    feed,
    setFeed,
    isStale,
    setRealtimeConnected,
    updateVoteCount,
    prependItem,
    markAsVoted,
    markAsUnvoted,
  } = useFeedStore();

  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  const [loading, setLoading] = React.useState(feed.length === 0);
  const [refreshing, setRefreshing] = React.useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const load = useCallback(
    async (force = false) => {
      if (!force && !isStale()) return;

      try {
        const { data: sesData } = await supabase
          .from("ses")
          .select("id, question, vote_type, created_at, created_by")
          .order("created_at", { ascending: false });

        if (!sesData) return;

        const creatorIds = [...new Set(sesData.map((s) => s.created_by))];

        const [optionsRes, votesRes, profilesRes] = await Promise.all([
          supabase
            .from("ses_options")
            .select("id, ses_id, text, order")
            .order("order"),
          supabase.from("ses_votes").select("ses_id, option_id, user_id"),
          supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .in("id", creatorIds),
        ]);

        const optionsBySes: Record<string, { id: string; text: string }[]> = {};
        optionsRes.data?.forEach((o) => {
          if (!optionsBySes[o.ses_id]) {
            optionsBySes[o.ses_id] = [];
          }
          optionsBySes[o.ses_id].push({ id: o.id, text: o.text });
        });

        const voteCounts: Record<string, number> = {};
        const userVotedSes = new Set<string>();
        const selectedOptionsBySes: Record<string, string[]> = {};

        votesRes.data?.forEach((v) => {
          voteCounts[v.ses_id] = (voteCounts[v.ses_id] ?? 0) + 1;
          if (v.user_id === session?.user?.id) {
            userVotedSes.add(v.ses_id);
            if (!selectedOptionsBySes[v.ses_id]) {
              selectedOptionsBySes[v.ses_id] = [];
            }
            selectedOptionsBySes[v.ses_id].push(v.option_id);
          }
        });

        const profilesById: Record<
          string,
          { username: string | null; avatar_url: string | null }
        > = {};
        profilesRes.data?.forEach((p) => {
          profilesById[p.id] = {
            username: p.username,
            avatar_url: p.avatar_url,
          };
        });

        setFeed(
          sesData.map((s) => ({
            ...s,
            options: optionsBySes[s.id] ?? [],
            option_count: (optionsBySes[s.id] ?? []).length,
            vote_count: voteCounts[s.id] ?? 0,
            has_voted: userVotedSes.has(s.id),
            selected_option_ids: selectedOptionsBySes[s.id] ?? [],
            author: profilesById[s.created_by] ?? null,
          })),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [session?.user?.id, isStale],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    channelRef.current = supabase
      .channel("public:ses_votes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ses_votes" },
        async (payload) => {
          const sesId =
            (payload.new as any)?.ses_id ?? (payload.old as any)?.ses_id;
          if (!sesId) return;

          const userId =
            (payload.new as any)?.user_id ?? (payload.old as any)?.user_id;
          const optionId =
            (payload.new as any)?.option_id ?? (payload.old as any)?.option_id;

          supabase
            .from("ses_votes")
            .select("ses_id", { count: "exact", head: true })
            .eq("ses_id", sesId)
            .then(({ count }) => {
              if (count != null) updateVoteCount(sesId, count);
            });

          if (userId === session?.user?.id && optionId) {
            if (payload.eventType === "DELETE") {
              markAsUnvoted(sesId, optionId);
            } else {
              markAsVoted(sesId, optionId);
            }
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ses" },
        async (payload) => {
          const newSes = payload.new as any;
          const [optRes, profileRes] = await Promise.all([
            supabase
              .from("ses_options")
              .select("id, text, order")
              .eq("ses_id", newSes.id)
              .order("order"),
            supabase
              .from("profiles")
              .select("username, avatar_url")
              .eq("id", newSes.created_by)
              .single(),
          ]);

          const item = {
            id: newSes.id,
            question: newSes.question,
            vote_type: newSes.vote_type,
            created_at: newSes.created_at,
            created_by: newSes.created_by,
            options: optRes.data ?? [],
            option_count: optRes.data?.length ?? 0,
            vote_count: 0,
            has_voted: false,
            selected_option_ids: [],
            author: profileRes.data ?? null,
          };

          if (newSes.created_by !== session?.user?.id) {
            prependItem(item);
          }
        },
      )
      .subscribe((status) => setRealtimeConnected(status === "SUBSCRIBED"));

    return () => {
      channelRef.current?.unsubscribe();
      setRealtimeConnected(false);
    };
  }, [session?.user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  return (
    <ThemedView className="flex-1 items-center bg-neutral-50 dark:bg-neutral-950">
      <SafeAreaView
        className="flex-1 w-full"
        style={{ maxWidth: MaxContentWidth }}
      >
        <View className="flex-row items-center justify-between px-4 py-3 bg-white dark:bg-neutral-950 border-b border-neutral-100 dark:border-neutral-900">
          <Text className="text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Feed
          </Text>
          <TouchableOpacity className="p-1 active:opacity-70">
            <Ionicons
              name="notifications-outline"
              size={22}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>

        {loading ? (
          <SkeletonList />
        ) : (
          <FlatList
            data={feed}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <SesCard item={item} />}
            contentContainerStyle={{
              paddingHorizontal: Spacing.four,
              paddingTop: Spacing.four,
              paddingBottom: BottomTabInset + Spacing.three,
              gap: Spacing.four,
            }}
            ListEmptyComponent={<EmptyState />}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.text}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}
