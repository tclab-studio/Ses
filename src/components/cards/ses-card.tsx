import { VoteReactionSheet } from "@/components/modals/vote-reaction-sheet";
import { useFollow } from "@/hooks/useFollow";
import { useLike } from "@/hooks/useLike";
import { useVoters } from "@/hooks/useVoters";
import { useAuthStore, useFeedStore } from "@/stores";
import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Image,
  Pressable,
  Animated as RNAnimated,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

export type SesItem = {
  id: string;
  question: string;
  description?: string | null;
  vote_type: "single" | "multiple";
  created_at: string;
  created_by: string;
  option_count: number;
  vote_count: number;
  selected_option_ids: string[] | null | undefined;
  has_voted: boolean;
  options:
    | { id: string; text: string; vote_count?: number }[]
    | null
    | undefined;
  author: { username: string | null; avatar_url: string | null } | null;
  topics?: { id: string; name: string; emoji: string | null }[];
  end_date?: string | null;
  is_anonymous?: boolean;
};

const formatDate = (iso: string) => {
  if (!iso) return "unknown";
  const timestamp = new Date(iso).getTime();
  if (isNaN(timestamp)) return "unknown";
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

const formatCountdown = (iso: string) => {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "closed";
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 24) return `${hrs}h left`;
  return `${Math.floor(hrs / 24)}d left`;
};

const isHot = (voteCount: number, createdAt: string) => {
  const ageHrs = (Date.now() - new Date(createdAt).getTime()) / 3600000;
  return ageHrs < 24 && voteCount >= 50;
};

const OptionRow = React.memo(
  ({
    opt,
    isSelected,
    hasVoted,
    voteType,
    onPress,
    disabled,
    totalVotes,
    agreePercent,
  }: {
    opt: { id: string; text: string; vote_count?: number };
    isSelected: boolean;
    hasVoted: boolean;
    voteType: "single" | "multiple";
    onPress: () => void;
    disabled: boolean;
    totalVotes: number;
    agreePercent: number | null;
  }) => {
    const scale = useSharedValue(1);
    const scheme = useColorScheme();
    const isDark = scheme === "dark";

    const animStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const isLocked = voteType === "single" && hasVoted && !isSelected;
    const pct =
      totalVotes > 0 && opt.vote_count != null
        ? Math.round((opt.vote_count / totalVotes) * 100)
        : 0;

    const borderColor = isSelected
      ? isDark
        ? "rgba(255,255,255,0.5)"
        : "rgba(0,0,0,0.75)"
      : isDark
        ? "rgba(255,255,255,0.07)"
        : "rgba(0,0,0,0.07)";

    return (
      <Pressable
        onPressIn={() => {
          if (!isLocked && !disabled)
            scale.value = withSpring(0.97, { damping: 20 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 20 });
        }}
        onPress={isLocked || disabled ? undefined : onPress}
        style={{
          opacity: isLocked ? 0.35 : 1,
          borderRadius: 14,
          overflow: "hidden",
          borderWidth: 1.5,
          borderColor,
          backgroundColor: isDark ? "#0f0f0f" : "#fafafa",
        }}
      >
        {hasVoted && opt.vote_count != null && (
          <View
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: `${pct}%`,
              backgroundColor: isSelected
                ? isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.055)"
                : isDark
                  ? "rgba(255,255,255,0.025)"
                  : "rgba(0,0,0,0.025)",
            }}
          />
        )}

        <Animated.View
          style={[
            animStyle,
            {
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 14,
              paddingVertical: 13,
              gap: 10,
            },
          ]}
        >
          <View
            style={{
              width: 18,
              height: 18,
              borderRadius: voteType === "multiple" ? 5 : 9,
              borderWidth: 1.5,
              borderColor: isSelected
                ? isDark
                  ? "#fff"
                  : "#000"
                : isDark
                  ? "#333"
                  : "#d0d0d0",
              backgroundColor: isSelected
                ? isDark
                  ? "#fff"
                  : "#000"
                : "transparent",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {isSelected && (
              <Ionicons
                name="checkmark"
                size={10}
                color={isDark ? "#000" : "#fff"}
              />
            )}
          </View>

          <Text
            style={{
              flex: 1,
              fontSize: 13,
              fontWeight: isSelected ? "700" : "500",
              color: isSelected
                ? isDark
                  ? "#fff"
                  : "#000"
                : isDark
                  ? "#aaa"
                  : "#555",
            }}
            numberOfLines={2}
          >
            {opt.text}
          </Text>

          {hasVoted && opt.vote_count != null && (
            <View style={{ alignItems: "flex-end", gap: 3 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "800",
                  color: isSelected
                    ? isDark
                      ? "#fff"
                      : "#000"
                    : isDark
                      ? "#555"
                      : "#aaa",
                  fontVariant: ["tabular-nums"],
                  minWidth: 32,
                  textAlign: "right",
                }}
              >
                {pct}%
              </Text>
              {isSelected && agreePercent !== null && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 3,
                    backgroundColor: isDark
                      ? "rgba(16,185,129,0.14)"
                      : "rgba(16,185,129,0.1)",
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 999,
                  }}
                >
                  <Ionicons name="people-outline" size={9} color="#10b981" />
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: "800",
                      color: "#10b981",
                    }}
                  >
                    {agreePercent}%
                  </Text>
                </View>
              )}
            </View>
          )}
        </Animated.View>
      </Pressable>
    );
  },
);
OptionRow.displayName = "OptionRow";

function SkeletonBox({
  width,
  height,
  borderRadius = 8,
  style,
}: {
  width?: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}) {
  const scheme = useColorScheme();
  const shimmer = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const loop = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        RNAnimated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.9],
  });
  const bgColor =
    scheme === "dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";

  return (
    <RNAnimated.View
      style={[
        {
          width: width ?? "100%",
          height,
          borderRadius,
          backgroundColor: bgColor,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SesCardSkeleton() {
  return (
    <View className="bg-white dark:bg-neutral-900 rounded-3xl p-5 mb-1 shadow-sm shadow-black/[0.03]">
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center gap-2.5">
          <SkeletonBox width={36} height={36} borderRadius={18} />
          <View style={{ gap: 5 }}>
            <SkeletonBox width={80} height={10} borderRadius={6} />
            <SkeletonBox width={48} height={8} borderRadius={6} />
          </View>
        </View>
        <SkeletonBox width={60} height={24} borderRadius={999} />
      </View>
      <View className="mb-4 gap-1.5">
        <SkeletonBox width="90%" height={18} borderRadius={8} />
        <SkeletonBox width="65%" height={18} borderRadius={8} />
      </View>
      <View className="gap-2 mb-4">
        <SkeletonBox height={44} borderRadius={14} />
        <SkeletonBox height={44} borderRadius={14} />
        <SkeletonBox height={44} borderRadius={14} />
      </View>
      <View className="flex-row items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800">
        <SkeletonBox width={80} height={12} borderRadius={6} />
        <SkeletonBox width={64} height={28} borderRadius={999} />
      </View>
    </View>
  );
}

function LikeButton({
  sesId,
  userId,
}: {
  sesId: string;
  userId: string | null;
}) {
  const session = useAuthStore((s) => s.session);
  const { liked, likeCount, toggleLike } = useLike(sesId, userId);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotation.value}deg` }],
  }));

  function handlePress() {
    if (!session?.user?.id) return;
    scale.value = withSequence(
      withSpring(1.4, { damping: 6, stiffness: 300 }),
      withSpring(1, { damping: 10, stiffness: 200 }),
    );
    rotation.value = withSequence(
      withTiming(-12, { duration: 80 }),
      withTiming(12, { duration: 80 }),
      withTiming(0, { duration: 80 }),
    );
    toggleLike();
  }

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800/80"
      onPress={handlePress}
    >
      <Animated.View style={animStyle}>
        <Ionicons
          name={liked ? "heart" : "heart-outline"}
          size={14}
          color={liked ? "#ef4444" : "#9ca3af"}
        />
      </Animated.View>
      <Text
        className={`text-xs font-bold ${liked ? "text-red-500" : "text-neutral-400 dark:text-neutral-500"}`}
      >
        {likeCount > 0 ? likeCount : "0"}
      </Text>
    </TouchableOpacity>
  );
}

function BookmarkButton({
  sesId,
  userId,
}: {
  sesId: string;
  userId: string | null;
}) {
  const { bookmarkedSessIds, bookmarkSes, unbookmarkSes } =
    useFeedStore() as any;
  const isBookmarked = bookmarkedSessIds?.includes(sesId) ?? false;
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePress() {
    if (!userId) return;
    scale.value = withSequence(
      withSpring(1.3, { damping: 8 }),
      withSpring(1, { damping: 12 }),
    );
    if (isBookmarked) {
      unbookmarkSes?.(sesId);
      supabase
        .from("ses_bookmarks")
        .delete()
        .eq("ses_id", sesId)
        .eq("user_id", userId);
    } else {
      bookmarkSes?.(sesId);
      supabase.from("ses_bookmarks").insert({ ses_id: sesId, user_id: userId });
    }
  }

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      className="w-8 h-8 items-center justify-center"
      onPress={handlePress}
    >
      <Animated.View style={animStyle}>
        <Ionicons
          name={isBookmarked ? "bookmark" : "bookmark-outline"}
          size={16}
          color={isBookmarked ? "#f59e0b" : "#9ca3af"}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

function FollowPill({
  targetUserId,
  currentUserId,
}: {
  targetUserId: string;
  currentUserId: string | null;
}) {
  const { following, toggleFollow, loading } = useFollow(
    targetUserId,
    currentUserId,
  );

  if (following) return null;

  return (
    <TouchableOpacity
      onPress={toggleFollow}
      activeOpacity={0.75}
      disabled={loading}
      style={{
        height: 24,
        paddingHorizontal: 10,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "transparent",
        borderWidth: 1,
        borderColor: "#d1d5db",
        opacity: loading ? 0.5 : 1,
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: "700", color: "#6b7280" }}>
        {loading ? "···" : "Follow"}
      </Text>
    </TouchableOpacity>
  );
}

function Avatar({
  uri,
  name,
  size = 40,
}: {
  uri: string | null;
  name: string;
  size?: number;
}) {
  const initial = name.charAt(0).toUpperCase();
  const palette = ["#3B5BDB", "#7048e8", "#0ca678", "#e8590c", "#d6336c"];
  const bgColor = palette[name.charCodeAt(0) % palette.length];

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bgColor,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: size * 0.38, fontWeight: "800", color: "#fff" }}>
        {initial}
      </Text>
    </View>
  );
}

function FollowingVoterAvatars({
  sesId,
  userId,
  totalVotes,
  isDark,
  onPress,
}: {
  sesId: string;
  userId: string;
  totalVotes: number;
  isDark: boolean;
  onPress: () => void;
}) {
  const { data } = useVoters(sesId, userId);
  const followingVoters = data?.followingVoters ?? [];

  if (followingVoters.length === 0 && totalVotes === 0) return null;

  const extraCount =
    (data?.voters
      ? new Set(data.voters.map((v) => v.user_id)).size
      : totalVotes) - followingVoters.length;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
    >
      {followingVoters.length > 0 && (
        <View style={{ flexDirection: "row" }}>
          {followingVoters.map((voter, i) => (
            <View
              key={voter.user_id}
              style={{
                marginLeft: i === 0 ? 0 : -8,
                borderWidth: 2,
                borderColor: isDark ? "#000" : "#fff",
                borderRadius: 999,
                zIndex: followingVoters.length - i,
              }}
            >
              <Avatar
                key={`${voter.user_id}-${voter.option_id ?? i}-${i}`}
                uri={voter.avatar_url}
                name={voter.username ?? "anon"}
              />
            </View>
          ))}
        </View>
      )}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
        <Ionicons
          name="stats-chart-outline"
          size={12}
          color={isDark ? "#444" : "#ccc"}
        />
        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            color: isDark ? "#444" : "#bbb",
          }}
        >
          {totalVotes}
        </Text>
        {extraCount > 0 && followingVoters.length > 0 && (
          <Text
            style={{
              fontSize: 10,
              fontWeight: "600",
              color: isDark ? "#333" : "#ccc",
            }}
          >
            +{extraCount} more
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export const SesCard = React.memo(
  ({ item }: { item: SesItem }) => {
    const router = useRouter();
    const scheme = useColorScheme();
    const isDark = scheme === "dark";
    const sessionUserId = useAuthStore((s) => s.session?.user?.id);
    const { optimisticVote, optimisticUnvote } = useFeedStore();
    const isOwn = sessionUserId === item.created_by;
    const [descExpanded, setDescExpanded] = useState(false);
    const [voting, setVoting] = useState(false);
    const [reactionSheet, setReactionSheet] = useState<{
      visible: boolean;
      optionId: string;
    }>({ visible: false, optionId: "" });

    const displayName = item.is_anonymous
      ? "anon"
      : (item.author?.username ?? "anonymous");
    const avatar = item.is_anonymous ? null : (item.author?.avatar_url ?? null);
    const hot = isHot(item.vote_count, item.created_at);

    const agreePercent = useMemo(() => {
      if (!item.has_voted || item.vote_count < 5) return null;
      const safeSelectedIds = item.selected_option_ids ?? [];
      const myVotedOptions = (item.options ?? []).filter((o) =>
        safeSelectedIds.includes(o.id),
      );
      if (myVotedOptions.length === 0) return null;
      const myVoteTotal = myVotedOptions.reduce(
        (acc, o) => acc + (o.vote_count ?? 0),
        0,
      );
      return Math.round((myVoteTotal / item.vote_count) * 100);
    }, [
      item.has_voted,
      item.vote_count,
      item.selected_option_ids,
      item.options,
    ]);

    const handleVote = useCallback(
      async (optionId: string) => {
        if (!sessionUserId || voting) return;
        const isSelected = (item.selected_option_ids ?? []).includes(optionId);

        if (item.vote_type === "single") {
          if (item.has_voted) return;
          optimisticVote(item.id, optionId);
          setVoting(true);
          await supabase.from("ses_votes").insert({
            ses_id: item.id,
            option_id: optionId,
            user_id: sessionUserId,
          });
          setVoting(false);
          setReactionSheet({ visible: true, optionId });
        } else {
          if (isSelected) {
            optimisticUnvote(item.id, optionId);
            setVoting(true);
            await supabase
              .from("ses_votes")
              .delete()
              .eq("ses_id", item.id)
              .eq("option_id", optionId)
              .eq("user_id", sessionUserId);
            setVoting(false);
          } else {
            optimisticVote(item.id, optionId);
            setVoting(true);
            await supabase.from("ses_votes").insert({
              ses_id: item.id,
              option_id: optionId,
              user_id: sessionUserId,
            });
            setVoting(false);
            setReactionSheet({ visible: true, optionId });
          }
        }
      },
      [sessionUserId, voting, item],
    );

    const totalVotes = item.vote_count ?? 0;
    const safeOptions = item?.options ?? [];

    const renderedOptions = useMemo(() => {
      const safeSelectedIds = item?.selected_option_ids ?? [];
      return safeOptions
        .slice(0, 3)
        .map((opt) => (
          <OptionRow
            key={opt.id}
            opt={opt}
            isSelected={safeSelectedIds.includes(opt.id)}
            hasVoted={item.has_voted}
            voteType={item.vote_type}
            onPress={() => handleVote(opt.id)}
            disabled={voting}
            totalVotes={totalVotes}
            agreePercent={
              safeSelectedIds.includes(opt.id) ? agreePercent : null
            }
          />
        ));
    }, [
      safeOptions,
      item?.selected_option_ids,
      item.has_voted,
      item.vote_type,
      voting,
      handleVote,
      totalVotes,
      agreePercent,
    ]);

    const displayTime = useMemo(
      () => formatDate(item.created_at),
      [item.created_at],
    );

    const cardBg = isDark ? "#0d0d0d" : "#ffffff";
    const borderColor = isDark ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.06)";

    return (
      <>
        <View
          style={{
            backgroundColor: cardBg,
            borderRadius: 20,
            borderWidth: 1,
            borderColor,
            overflow: "hidden",
          }}
        >
          <View style={{ padding: 16 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
                gap: 8,
              }}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  if (!item.is_anonymous && item.author?.username) {
                    router.push(`/${item.author.username}/page` as any);
                  }
                }}
                style={{ flexDirection: "row", alignItems: "center", gap: 9 }}
              >
                <Avatar uri={avatar} name={displayName} size={34} />
                <View style={{ gap: 1 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: isDark ? "#e8e8e8" : "#111",
                    }}
                  >
                    @{displayName}
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: isDark ? "#555" : "#aaa",
                      fontWeight: "500",
                    }}
                  >
                    {displayTime}
                  </Text>
                </View>
              </TouchableOpacity>

              <View
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 6,
                }}
              >
                {hot && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 3,
                      backgroundColor: isDark
                        ? "rgba(251,146,60,0.12)"
                        : "rgba(251,146,60,0.1)",
                      paddingHorizontal: 7,
                      paddingVertical: 3,
                      borderRadius: 999,
                    }}
                  >
                    <Text style={{ fontSize: 9 }}>🔥</Text>
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "800",
                        color: "#f97316",
                      }}
                    >
                      hot
                    </Text>
                  </View>
                )}
                {item.end_date && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 3,
                      backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5",
                      paddingHorizontal: 7,
                      paddingVertical: 3,
                      borderRadius: 999,
                    }}
                  >
                    <Ionicons
                      name="time-outline"
                      size={9}
                      color={isDark ? "#555" : "#aaa"}
                    />
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "600",
                        color: isDark ? "#555" : "#aaa",
                      }}
                    >
                      {formatCountdown(item.end_date)}
                    </Text>
                  </View>
                )}
                <View
                  style={{
                    paddingHorizontal: 7,
                    paddingVertical: 3,
                    borderRadius: 6,
                    backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: "800",
                      color: isDark ? "#444" : "#bbb",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    {item.vote_type === "single" ? "single" : "multi"}
                  </Text>
                </View>
                {!isOwn && (
                  <FollowPill
                    targetUserId={item.created_by}
                    currentUserId={sessionUserId ?? null}
                  />
                )}
              </View>
            </View>

            <TouchableOpacity
              onPress={() => router.push(`/ses/${item.id}` as any)}
              activeOpacity={0.8}
              style={{ marginBottom: item.description ? 6 : 12 }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "800",
                  letterSpacing: -0.3,
                  lineHeight: 21,
                  color: isDark ? "#f0f0f0" : "#0a0a0a",
                }}
              >
                {item.question}
              </Text>
            </TouchableOpacity>

            {item.description ? (
              <Pressable
                onPress={() => setDescExpanded((v) => !v)}
                style={{ marginBottom: 10 }}
              >
                <Text
                  numberOfLines={descExpanded ? undefined : 2}
                  style={{
                    fontSize: 12,
                    color: isDark ? "#555" : "#999",
                    lineHeight: 18,
                  }}
                >
                  {item.description}
                </Text>
                {item.description.length > 80 && (
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: isDark ? "#444" : "#bbb",
                      marginTop: 2,
                    }}
                  >
                    {descExpanded ? "less" : "more"}
                  </Text>
                )}
              </Pressable>
            ) : null}

            {item.topics && item.topics.length > 0 && (
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 5,
                  marginBottom: 10,
                }}
              >
                {item.topics.map((t) => (
                  <View
                    key={t.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 3,
                      backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5",
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 999,
                    }}
                  >
                    {t.emoji ? (
                      <Text style={{ fontSize: 9 }}>{t.emoji}</Text>
                    ) : null}
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "600",
                        color: isDark ? "#555" : "#999",
                      }}
                    >
                      {t.name}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={{ gap: 6, marginBottom: 10 }}>
              {renderedOptions}
              {item.option_count > 3 && (
                <TouchableOpacity
                  onPress={() => router.push(`/ses/${item.id}` as any)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: isDark ? "#444" : "#bbb",
                      paddingLeft: 4,
                      marginTop: 2,
                    }}
                  >
                    +{item.option_count - 3} more options
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {item.vote_count < 5 && !item.has_voted && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  marginBottom: 8,
                }}
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={11}
                  color="#f59e0b"
                />
                <Text
                  style={{ fontSize: 11, fontWeight: "600", color: "#f59e0b" }}
                >
                  needs more opinions
                </Text>
              </View>
            )}
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderTopWidth: 1,
              borderTopColor: isDark
                ? "rgba(255,255,255,0.04)"
                : "rgba(0,0,0,0.05)",
              backgroundColor: isDark
                ? "rgba(255,255,255,0.015)"
                : "rgba(0,0,0,0.015)",
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              {sessionUserId ? (
                <FollowingVoterAvatars
                  sesId={item.id}
                  userId={sessionUserId}
                  totalVotes={totalVotes}
                  isDark={isDark}
                  onPress={() => router.push(`/ses/${item.id}/voters` as any)}
                />
              ) : (
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
                >
                  <Ionicons
                    name="stats-chart-outline"
                    size={12}
                    color={isDark ? "#444" : "#ccc"}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: isDark ? "#444" : "#bbb",
                    }}
                  >
                    {totalVotes}
                  </Text>
                </View>
              )}
            </View>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 2 }}
            >
              <BookmarkButton sesId={item.id} userId={sessionUserId ?? null} />
              <LikeButton sesId={item.id} userId={sessionUserId ?? null} />
            </View>
          </View>
        </View>

        {sessionUserId && (
          <VoteReactionSheet
            visible={reactionSheet.visible}
            sesId={item.id}
            optionId={reactionSheet.optionId}
            userId={sessionUserId}
            onDone={() => setReactionSheet({ visible: false, optionId: "" })}
          />
        )}
      </>
    );
  },
  () => false,
);
SesCard.displayName = "SesCard";

