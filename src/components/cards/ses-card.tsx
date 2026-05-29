import { ThemedText } from "@/components/themed-text";
import { useFollow } from "@/hooks/useFollow";
import { useLike } from "@/hooks/useLike";
import { useAuthStore, useFeedStore } from "@/stores";
import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
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
  vote_type: "single" | "multiple";
  created_at: string;
  created_by: string;
  option_count: number;
  vote_count: number;
  selected_option_ids: string[] | null | undefined;
  has_voted: boolean;
  options: { id: string; text: string }[] | null | undefined;
  author: { username: string | null; avatar_url: string | null } | null;
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
    const bgProgress = useSharedValue(isSelected ? 1 : 0);

    useEffect(() => {
      bgProgress.value = withSpring(isSelected ? 1 : 0, {
        damping: 18,
        stiffness: 200,
      });
    }, [isSelected]);

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
  const colors = ["#3B5BDB", "#7048e8", "#0ca678", "#e8590c", "#d6336c"];
  const colorIndex = name.charCodeAt(0) % colors.length;
  const bgColor = colors[colorIndex];

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

export const SesCard = React.memo(
  ({ item }: { item: SesItem }) => {
    const router = useRouter();
    const sessionUserId = useAuthStore((s) => s.session?.user?.id);
    const { optimisticVote, optimisticUnvote } = useFeedStore();
    const isOwn = sessionUserId === item.created_by;

    const displayName = item.author?.username ?? "Anonymous";
    const avatar = item.author?.avatar_url ?? null;

    const [voting, setVoting] = React.useState(false);

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
              <Text
                style={{ fontSize: 13, fontWeight: "700", color: "#111" }}
                numberOfLines={1}
              >
                @{displayName}
              </Text>
              <Text style={{ fontSize: 11, color: "#9ca3af" }}>
                {displayTime}
              </Text>
            </View>
          </TouchableOpacity>

          <View className="flex-row items-center gap-2">
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
          className="mb-3"
        >
          <ThemedText className="text-base font-bold tracking-tight leading-snug text-neutral-900 dark:text-neutral-50">
            {item.question}
          </ThemedText>
        </TouchableOpacity>

        <View className="gap-2 mb-3">
          {renderedOptions}
          {item.option_count > 3 && (
            <Text className="text-xs font-medium text-neutral-400 dark:text-neutral-500 pl-1 mt-0.5">
              + {item.option_count - 3} more options
            </Text>
          )}
        </View>

        <View className="flex-row items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <View className="flex-row items-center gap-1">
            <Ionicons name="bar-chart-outline" size={14} color="#9ca3af" />
            <Text className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              {item.vote_count}{" "}
              {item.vote_count === 1 ? "response" : "responses"}
            </Text>
          </View>
          <LikeButton sesId={item.id} userId={sessionUserId ?? null} />
        </View>
      </Animated.View>
    );
  },
  () => false,
);
SesCard.displayName = "SesCard";

