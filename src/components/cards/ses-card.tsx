import { ThemedText } from "@/components/themed-text";
import { useFollow } from "@/hooks/useFollow";
import { useLike } from "@/hooks/useLike";
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
  Platform,
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
  options: { id: string; text: string }[] | null | undefined;
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
  }: {
    opt: { id: string; text: string };
    isSelected: boolean;
    hasVoted: boolean;
    voteType: "single" | "multiple";
    onPress: () => void;
    disabled: boolean;
  }) => {
    const scale = useSharedValue(1);

    useEffect(() => {}, [isSelected]);

    const animStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const isLocked = voteType === "single" && hasVoted && !isSelected;

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
        className={`flex-row items-center justify-between px-4 py-3.5 rounded-2xl ${
          isSelected
            ? "bg-neutral-900 dark:bg-white"
            : "bg-neutral-50 dark:bg-neutral-800/60"
        }`}
        style={{ opacity: isLocked ? 0.45 : 1 }}
      >
        <Animated.View
          style={animStyle}
          className="flex-row items-center flex-1"
        >
          <Text
            className={`text-sm font-medium flex-1 pr-4 ${
              isSelected
                ? "text-white dark:text-black font-semibold"
                : "text-neutral-800 dark:text-neutral-200"
            }`}
            numberOfLines={2}
          >
            {opt.text}
          </Text>
          {isSelected && (
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={
                hasVoted ? "#10b981" : Platform.OS === "ios" ? "#fff" : "#000"
              }
            />
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
        <SkeletonBox width={80} height={26} borderRadius={999} />
      </View>
      <View className="mb-4 gap-1.5">
        <SkeletonBox width="90%" height={18} borderRadius={8} />
        <SkeletonBox width="65%" height={18} borderRadius={8} />
      </View>
      <View className="gap-2 mb-4">
        <SkeletonBox height={48} borderRadius={16} />
        <SkeletonBox height={48} borderRadius={16} />
        <SkeletonBox height={48} borderRadius={16} />
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
      className="flex-row items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800 px-3 py-2 rounded-full"
      onPress={handlePress}
    >
      <Animated.View style={animStyle}>
        <Ionicons
          name={liked ? "heart" : "heart-outline"}
          size={16}
          color={liked ? "#ef4444" : "#9ca3af"}
        />
      </Animated.View>
      <Text
        className={`text-xs font-semibold ${liked ? "text-red-500" : "text-neutral-500 dark:text-neutral-400"}`}
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
          size={17}
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

  return (
    <TouchableOpacity
      onPress={toggleFollow}
      activeOpacity={0.75}
      disabled={loading}
      style={{
        height: 28,
        minWidth: 90,
        paddingHorizontal: 12,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: following ? "transparent" : "#000",
        borderWidth: 1.5,
        borderColor: following ? "#d1d5db" : "#000",
        opacity: loading ? 0.6 : 1,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          color: following ? "#6b7280" : "#fff",
        }}
      >
        {loading ? "..." : following ? "Following" : "Subscribe"}
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

function OpinionMatchBadge({
  sesId,
  userId,
}: {
  sesId: string;
  userId: string;
}) {
  const [pct, setPct] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("ses_votes")
      .select("option_id")
      .eq("ses_id", sesId)
      .then(({ data }) => {
        if (!data || data.length < 5) return;
        supabase
          .from("ses_votes")
          .select("option_id")
          .eq("ses_id", sesId)
          .eq("user_id", userId)
          .then(({ data: myVotes }) => {
            if (!myVotes?.length) return;
            const myOptionIds = myVotes.map((v) => v.option_id);
            const matching = data.filter((v) =>
              myOptionIds.includes(v.option_id),
            ).length;
            setPct(Math.round((matching / data.length) * 100));
          });
      });
  }, [sesId, userId]);

  if (pct === null) return null;

  return (
    <View className="flex-row items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
      <Ionicons name="people-outline" size={11} color="#10b981" />
      <Text className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
        {pct}% agree
      </Text>
    </View>
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

    const displayName = item.author?.username ?? "Anonymous";
    const avatar = item.author?.avatar_url ?? null;
    const hot = isHot(item.vote_count, item.created_at);

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
          }
        }
      },
      [sessionUserId, voting, item],
    );

    const cardScale = useSharedValue(1);
    const cardStyle = useAnimatedStyle(() => ({
      transform: [{ scale: cardScale.value }],
    }));

    const renderedOptions = useMemo(() => {
      const safeOptions = item?.options ?? [];
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
          />
        ));
    }, [
      item?.options,
      item?.selected_option_ids,
      item.has_voted,
      item.vote_type,
      voting,
      handleVote,
    ]);

    const displayTime = useMemo(
      () => formatDate(item.created_at),
      [item.created_at],
    );

    return (
      <Animated.View
        style={cardStyle}
        className="bg-white dark:bg-neutral-900 rounded-3xl p-4 mb-1 shadow-sm shadow-black/[0.03]"
      >
        <View className="flex-row items-center justify-between mb-3">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              if (item.author?.username) {
                router.push(`/${item.author.username}/page` as any);
              }
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              flex: 1,
              marginRight: 8,
            }}
          >
            <Avatar uri={avatar} name={displayName} size={36} />
            <View style={{ gap: 2 }}>
              <ThemedText
                className="text-[13px] font-bold text-neutral-900 dark:text-neutral-100"
                numberOfLines={1}
              >
                @{displayName}
              </ThemedText>
              <Text style={{ fontSize: 11, color: "#9ca3af" }}>
                {displayTime}
              </Text>
            </View>
          </TouchableOpacity>

          <View className="flex-row items-center gap-2">
            {hot && (
              <View className="flex-row items-center gap-1 bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-full">
                <Text style={{ fontSize: 10 }}>🔥</Text>
                <Text className="text-[10px] font-bold text-orange-500">
                  hot
                </Text>
              </View>
            )}
            {item.end_date && (
              <View className="flex-row items-center gap-1 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                <Ionicons
                  name="time-outline"
                  size={10}
                  color={isDark ? "#737373" : "#a3a3a3"}
                />
                <Text className="text-[10px] font-medium text-neutral-400">
                  {formatCountdown(item.end_date)}
                </Text>
              </View>
            )}
            <View className="bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
              <Text className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                {item.vote_type}
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
          className="mb-1"
        >
          <ThemedText className="text-base font-bold tracking-tight leading-snug text-neutral-900 dark:text-neutral-50">
            {item.question}
          </ThemedText>
        </TouchableOpacity>

        {item.description ? (
          <Pressable
            onPress={() => setDescExpanded((v) => !v)}
            className="mb-3"
          >
            <ThemedText
              numberOfLines={descExpanded ? undefined : 2}
              className="text-xs text-neutral-400 dark:text-neutral-500 leading-relaxed"
            >
              {item.description}
            </ThemedText>
            {item.description.length > 80 && (
              <Text className="text-xs font-semibold text-neutral-400 mt-0.5">
                {descExpanded ? "less" : "more"}
              </Text>
            )}
          </Pressable>
        ) : (
          <View className="mb-3" />
        )}

        {item.topics && item.topics.length > 0 && (
          <View className="flex-row flex-wrap gap-1.5 mb-3">
            {item.topics.map((t) => (
              <View
                key={t.id}
                className="flex-row items-center gap-1 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full"
              >
                {t.emoji ? (
                  <Text style={{ fontSize: 10 }}>{t.emoji}</Text>
                ) : null}
                <Text className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                  {t.name}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View className="gap-2 mb-3">
          {renderedOptions}
          {item.option_count > 3 && (
            <TouchableOpacity
              onPress={() => router.push(`/ses/${item.id}` as any)}
              activeOpacity={0.7}
            >
              <Text className="text-xs font-medium text-neutral-400 dark:text-neutral-500 pl-1 mt-0.5">
                + {item.option_count - 3} more options
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {item.vote_count < 5 && !item.has_voted && (
          <View className="flex-row items-center gap-1.5 mb-2">
            <Ionicons name="alert-circle-outline" size={12} color="#f59e0b" />
            <Text className="text-[11px] font-medium text-amber-500">
              needs more opinions
            </Text>
          </View>
        )}

        <View className="flex-row items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <View className="flex-row items-center gap-2">
            <View className="flex-row items-center gap-1">
              <Ionicons name="bar-chart-outline" size={14} color="#9ca3af" />
              <Text className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                {item.vote_count}{" "}
                {item.vote_count === 1 ? "response" : "responses"}
              </Text>
            </View>
            {item.has_voted && sessionUserId && (
              <OpinionMatchBadge sesId={item.id} userId={sessionUserId} />
            )}
          </View>
          <View className="flex-row items-center gap-1">
            <BookmarkButton sesId={item.id} userId={sessionUserId ?? null} />
            <LikeButton sesId={item.id} userId={sessionUserId ?? null} />
          </View>
        </View>
      </Animated.View>
    );
  },
  () => false,
);
SesCard.displayName = "SesCard";

