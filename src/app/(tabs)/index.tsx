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
import { useRouter } from "expo-router";
import React, { memo, useCallback, useEffect, useRef } from "react";
import {
  Animated,
  FlatList,
  RefreshControl,
  ScrollView,
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
      <SesCardSkeleton key={`skeleton-${i}`} />
    ))}
  </View>
);

const EmptyState = memo(() => (
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
));

type FilterOption = {
  key: "all" | "following" | "topics" | "trending";
  label: string;
  icon: string;
};

const FILTERS: FilterOption[] = [
  { key: "all", label: "All", icon: "apps-outline" },
  { key: "following", label: "Following", icon: "people-outline" },
  { key: "topics", label: "Topics", icon: "pricetags-outline" },
  { key: "trending", label: "Trending", icon: "flame-outline" },
];

const FilterButton = memo(
  ({
    filter,
    active,
    isDark,
    onPress,
  }: {
    filter: FilterOption;
    active: boolean;
    isDark: boolean;
    onPress: (key: string) => void;
  }) => {
    return (
      <TouchableOpacity
        onPress={() => onPress(filter.key)}
        activeOpacity={0.75}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          paddingHorizontal: 14,
          paddingVertical: 7,
          borderRadius: 999,
          backgroundColor: active
            ? isDark
              ? "#fff"
              : "#111"
            : isDark
              ? "#171717"
              : "#f3f4f6",
        }}
      >
        <Ionicons
          name={filter.icon as any}
          size={13}
          color={
            active ? (isDark ? "#000" : "#fff") : isDark ? "#555" : "#9ca3af"
          }
        />
        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            color: active
              ? isDark
                ? "#000"
                : "#fff"
              : isDark
                ? "#555"
                : "#6b7280",
          }}
        >
          {filter.label}
        </Text>
      </TouchableOpacity>
    );
  },
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
    selectedFilter,
    setSelectedFilter,
  } = useFeedStore();

  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const [loading, setLoading] = React.useState(feed.length === 0);
  const [refreshing, setRefreshing] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const triggerFadeIn = useCallback(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchNotifications = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", session.user.id)
        .eq("read", false);
      setUnreadCount(count ?? 0);
    };

    fetchNotifications();
  }, [session?.user?.id]);

  const load = useCallback(
    async (force = false) => {
      try {
        if (!force && !isStale()) {
          setLoading(false);
          setRefreshing(false);
          triggerFadeIn();
          return;
        }

        let query = supabase
          .from("ses")
          .select(
            "id, question, description, vote_type, created_at, created_by, end_date, is_anonymous",
          );

        if (selectedFilter === "trending") {
          const cutoff = new Date(Date.now() - 48 * 3600000).toISOString();
          query = query
            .gte("created_at", cutoff)
            .order("vote_count", { ascending: false });
        } else {
          query = query.order("created_at", { ascending: false });
        }

        const { data: sesData } = await query;
        if (!sesData || sesData.length === 0) {
          setFeed([]);
          return;
        }

        let filteredSesData = sesData;

        if (selectedFilter === "following" && session?.user?.id) {
          const { data: follows } = await supabase
            .from("follows")
            .select("following_id")
            .eq("follower_id", session.user.id);

          const followingIds = new Set(
            (follows ?? []).map((f) => f.following_id),
          );
          filteredSesData = sesData.filter((s) =>
            followingIds.has(s.created_by),
          );
        }

        if (selectedFilter === "topics" && session?.user?.id) {
          const { data: userTopics } = await supabase
            .from("user_topics")
            .select("topic_id")
            .eq("user_id", session.user.id);

          const topicIds = (userTopics ?? []).map((t) => t.topic_id);

          if (topicIds.length > 0) {
            const { data: sesTopics } = await supabase
              .from("ses_topics")
              .select("ses_id")
              .in("topic_id", topicIds);

            const sesIdsWithTopics = new Set(
              (sesTopics ?? []).map((t) => t.ses_id),
            );
            filteredSesData = sesData.filter((s) => sesIdsWithTopics.has(s.id));
          } else {
            filteredSesData = [];
          }
        }

        const creatorIds = [
          ...new Set(filteredSesData.map((s) => s.created_by)),
        ];
        const sesIds = filteredSesData.map((s) => s.id);

        if (sesIds.length === 0) {
          setFeed([]);
          return;
        }

        const [optionsRes, votesRes, profilesRes, topicsRes] =
          await Promise.all([
            supabase
              .from("ses_options")
              .select("id, ses_id, text, order")
              .in("ses_id", sesIds)
              .order("order"),
            supabase
              .from("ses_votes")
              .select("ses_id, option_id, user_id")
              .in("ses_id", sesIds),
            supabase
              .from("profiles")
              .select("id, username, avatar_url")
              .in("id", creatorIds),
            supabase
              .from("ses_topics")
              .select("ses_id, topics(id, name, emoji)")
              .in("ses_id", sesIds),
          ]);

        const optionsBySes: Record<string, { id: string; text: string }[]> = {};
        optionsRes.data?.forEach((o) => {
          if (!optionsBySes[o.ses_id]) optionsBySes[o.ses_id] = [];
          optionsBySes[o.ses_id].push({ id: o.id, text: o.text });
        });

        const voteCounts: Record<string, number> = {};
        const userVotedSes = new Set<string>();
        const selectedOptionsBySes: Record<string, string[]> = {};

        votesRes.data?.forEach((v) => {
          voteCounts[v.ses_id] = (voteCounts[v.ses_id] ?? 0) + 1;
          if (v.user_id === session?.user?.id) {
            userVotedSes.add(v.ses_id);
            if (!selectedOptionsBySes[v.ses_id])
              selectedOptionsBySes[v.ses_id] = [];
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

        const topicsBySes: Record<
          string,
          { id: string; name: string; emoji: string | null }[]
        > = {};
        topicsRes.data?.forEach((row: any) => {
          if (!topicsBySes[row.ses_id]) topicsBySes[row.ses_id] = [];
          if (row.topics) topicsBySes[row.ses_id].push(row.topics);
        });

        setFeed(
          filteredSesData.map((s) => ({
            ...s,
            options: optionsBySes[s.id] ?? [],
            option_count: (optionsBySes[s.id] ?? []).length,
            vote_count: voteCounts[s.id] ?? 0,
            has_voted: userVotedSes.has(s.id),
            selected_option_ids: selectedOptionsBySes[s.id] ?? [],
            author: profilesById[s.created_by] ?? null,
            topics: topicsBySes[s.id] ?? [],
          })),
        );
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
        setRefreshing(false);
        triggerFadeIn();
      }
    },
    [session?.user?.id, isStale, selectedFilter, triggerFadeIn],
  );

  useEffect(() => {
    load(true);
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
            if (payload.eventType === "DELETE") markAsUnvoted(sesId, optionId);
            else markAsVoted(sesId, optionId);
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
            description: newSes.description ?? null,
            vote_type: newSes.vote_type,
            created_at: newSes.created_at,
            created_by: newSes.created_by,
            end_date: newSes.end_date ?? null,
            is_anonymous: newSes.is_anonymous ?? false,
            options: optRes.data ?? [],
            option_count: optRes.data?.length ?? 0,
            vote_count: 0,
            has_voted: false,
            selected_option_ids: [],
            author: profileRes.data ?? null,
            topics: [],
          };

          if (newSes.created_by !== session?.user?.id) prependItem(item);
        },
      )
      .subscribe((status) => setRealtimeConnected(status === "SUBSCRIBED"));

    return () => {
      channelRef.current?.unsubscribe();
      setRealtimeConnected(false);
    };
  }, [session?.user?.id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  const handleFilterChange = useCallback(
    (f: string) => {
      if (f !== selectedFilter) {
        setSelectedFilter(f as any);
        setLoading(true);
      }
    },
    [selectedFilter, setSelectedFilter],
  );

  const renderItem = useCallback(
    ({ item, index }: any) => (
      <SesCard item={item} key={`${item.id}-${index}`} />
    ),
    [],
  );

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
          <TouchableOpacity
            className="p-1 active:opacity-70 relative"
            onPress={() => router.push("/notifications" as any)}
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color={colors.text}
            />
            {unreadCount > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: 2,
                  right: 2,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: "#ef4444",
                }}
              />
            )}
          </TouchableOpacity>
        </View>

        <View
          style={{
            backgroundColor: isDark ? "#0a0a0a" : "#fff",
            borderBottomWidth: 1,
            borderBottomColor: isDark ? "#171717" : "#f3f4f6",
          }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              gap: 8,
            }}
          >
            {FILTERS.map((f) => (
              <FilterButton
                key={f.key}
                filter={f}
                active={selectedFilter === f.key}
                isDark={isDark}
                onPress={handleFilterChange}
              />
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <SkeletonList />
        ) : (
          <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
            <FlatList
              data={feed}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              renderItem={renderItem}
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
              initialNumToRender={5}
              maxToRenderPerBatch={5}
              windowSize={5}
              removeClippedSubviews={true}
            />
          </Animated.View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

