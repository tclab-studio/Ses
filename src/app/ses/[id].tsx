import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";
import { useFollow } from "@/hooks/useFollow";
import { useLike } from "@/hooks/useLike";
import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInLeft,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

type Option = { id: string; text: string; order: number; vote_count: number };
type Ses = {
  id: string;
  question: string;
  vote_type: "single" | "multiple";
  created_at: string;
  created_by: string;
};
type AuthorProfile = { username: string | null; avatar_url: string | null };

function Avatar({
  uri,
  name,
  size = 38,
}: {
  uri: string | null;
  name: string;
  size?: number;
}) {
  const initial = name.charAt(0).toUpperCase();
  const palette = ["#3B5BDB", "#7048e8", "#0ca678", "#e8590c", "#d6336c"];
  const bg = palette[name.charCodeAt(0) % palette.length];
  if (uri)
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
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

function OptionBar({
  option,
  index,
  isMyVote,
  showResults,
  hasVoted,
  totalVotes,
  topCount,
  onPress,
  voting,
  voteType,
  isDark,
}: {
  option: Option;
  index: number;
  isMyVote: boolean;
  showResults: boolean;
  hasVoted: boolean;
  totalVotes: number;
  topCount: number;
  onPress: () => void;
  voting: boolean;
  voteType: "single" | "multiple";
  isDark: boolean;
}) {
  const percent =
    totalVotes > 0 ? Math.round((option.vote_count / totalVotes) * 100) : 0;
  const isWinning = option.vote_count === topCount && option.vote_count > 0;
  const isLocked = voteType === "single" && hasVoted && !isMyVote;

  const barWidth = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    barWidth.value = withDelay(
      index * 80,
      withSpring(showResults ? percent : 0, { damping: 22, stiffness: 120 }),
    );
  }, [showResults, percent]);

  const barStyle = useAnimatedStyle(() => ({ width: `${barWidth.value}%` }));
  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const accentColor = isDark ? "#fff" : "#000";
  const mutedBorder = isDark ? "#222" : "#ebebeb";

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60)
        .springify()
        .damping(22)}
    >
      <Animated.View style={scaleStyle}>
        <Pressable
          onPressIn={() => {
            if (!isLocked && !voting)
              scale.value = withSpring(0.97, { damping: 20 });
          }}
          onPressOut={() => {
            scale.value = withSpring(1, { damping: 20 });
          }}
          onPress={isLocked || voting ? undefined : onPress}
          style={{
            borderRadius: 18,
            overflow: "hidden",
            borderWidth: isMyVote ? 2 : 1.5,
            borderColor: isMyVote ? accentColor : mutedBorder,
            opacity: isLocked ? 0.32 : 1,
          }}
        >
          {showResults && (
            <Animated.View
              style={[
                barStyle,
                {
                  position: "absolute",
                  top: 0,
                  left: 0,
                  bottom: 0,
                  backgroundColor: isMyVote
                    ? isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.07)"
                    : isWinning
                      ? isDark
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(0,0,0,0.03)"
                      : "transparent",
                },
              ]}
            />
          )}

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 16,
              gap: 12,
            }}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                borderWidth: 2,
                borderColor: isMyVote
                  ? accentColor
                  : isDark
                    ? "#3a3a3a"
                    : "#d0d0d0",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isMyVote ? accentColor : "transparent",
              }}
            >
              {isMyVote && (
                <Animated.View entering={FadeIn.springify()}>
                  <Ionicons
                    name="checkmark"
                    size={12}
                    color={isDark ? "#000" : "#fff"}
                  />
                </Animated.View>
              )}
            </View>

            <Text
              style={{
                fontSize: 14,
                flex: 1,
                lineHeight: 20,
                fontWeight: isMyVote ? "700" : "500",
                color: isMyVote ? accentColor : isDark ? "#d0d0d0" : "#333",
              }}
              numberOfLines={2}
            >
              {option.text}
            </Text>

            {showResults && (
              <Animated.View
                entering={FadeIn.delay(index * 70 + 200)}
                style={{ alignItems: "flex-end", minWidth: 42 }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "800",
                    color: accentColor,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {percent}%
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: isDark ? "#555" : "#b0b0b0",
                    fontVariant: ["tabular-nums"],
                    marginTop: 1,
                  }}
                >
                  {option.vote_count}
                </Text>
              </Animated.View>
            )}
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

function LikeButton({
  sesId,
  userId,
  isDark,
}: {
  sesId: string;
  userId: string | null;
  isDark: boolean;
}) {
  const { liked, likeCount, toggleLike } = useLike(sesId, userId);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotation.value}deg` }],
  }));

  function handlePress() {
    if (!userId) return;
    scale.value = withSequence(
      withSpring(1.5, { damping: 5, stiffness: 300 }),
      withSpring(1, { damping: 12 }),
    );
    rotation.value = withSequence(
      withTiming(-15, { duration: 60 }),
      withTiming(15, { duration: 60 }),
      withTiming(0, { duration: 60 }),
    );
    toggleLike();
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        paddingHorizontal: 18,
        paddingVertical: 11,
        borderRadius: 999,
        backgroundColor: liked
          ? isDark
            ? "rgba(239,68,68,0.15)"
            : "rgba(239,68,68,0.09)"
          : isDark
            ? "#171717"
            : "#f0f0f0",
        borderWidth: 1.5,
        borderColor: liked ? "rgba(239,68,68,0.5)" : "transparent",
      }}
    >
      <Animated.View style={animStyle}>
        <Ionicons
          name={liked ? "heart" : "heart-outline"}
          size={17}
          color={liked ? "#ef4444" : isDark ? "#555" : "#aaa"}
        />
      </Animated.View>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "700",
          color: liked ? "#ef4444" : isDark ? "#555" : "#aaa",
        }}
      >
        {likeCount > 0 ? likeCount : liked ? "Liked" : "Like"}
      </Text>
    </TouchableOpacity>
  );
}

function FollowButton({
  targetUserId,
  currentUserId,
  isDark,
}: {
  targetUserId: string;
  currentUserId: string | null;
  isDark: boolean;
}) {
  const { following, followerCount, toggleFollow, loading } = useFollow(
    targetUserId,
    currentUserId,
  );
  const scale = useSharedValue(1);
  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePress() {
    scale.value = withSequence(
      withSpring(0.93, { damping: 15 }),
      withSpring(1, { damping: 15 }),
    );
    toggleFollow();
  }

  return (
    <Animated.View style={scaleStyle}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={1}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 7,
          paddingHorizontal: 16,
          paddingVertical: 9,
          borderRadius: 999,
          backgroundColor: following ? "transparent" : isDark ? "#fff" : "#111",
          borderWidth: 1.5,
          borderColor: following
            ? isDark
              ? "#2a2a2a"
              : "#e0e0e0"
            : isDark
              ? "#fff"
              : "#111",
        }}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: "800",
            letterSpacing: 0.1,
            color: following
              ? isDark
                ? "#4a4a4a"
                : "#bbb"
              : isDark
                ? "#000"
                : "#fff",
          }}
        >
          {loading ? "·  ·  ·" : following ? "Following" : "Subscribe"}
        </Text>
        {followerCount > 0 && (
          <>
            <View
              style={{
                width: 1,
                height: 10,
                backgroundColor: following
                  ? isDark
                    ? "#2a2a2a"
                    : "#e0e0e0"
                  : isDark
                    ? "rgba(0,0,0,0.25)"
                    : "rgba(255,255,255,0.25)",
              }}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: following
                  ? isDark
                    ? "#4a4a4a"
                    : "#bbb"
                  : isDark
                    ? "#000"
                    : "#fff",
              }}
            >
              {followerCount}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function SesDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const [ses, setSes] = useState<Ses | null>(null);
  const [author, setAuthor] = useState<AuthorProfile | null>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const [myVotes, setMyVotes] = useState<string[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sesData } = await supabase
        .from("ses")
        .select("*")
        .eq("id", id)
        .single();
      if (!sesData) return;
      setSes(sesData);

      const [optionsRes, votesRes, profileRes] = await Promise.all([
        supabase
          .from("ses_options")
          .select("*")
          .eq("ses_id", id)
          .order("order"),
        supabase
          .from("ses_votes")
          .select("option_id, user_id")
          .eq("ses_id", id),
        supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", sesData.created_by)
          .single(),
      ]);

      setAuthor(profileRes.data ?? null);
      const voteCounts: Record<string, number> = {};
      votesRes.data?.forEach((v) => {
        voteCounts[v.option_id] = (voteCounts[v.option_id] ?? 0) + 1;
      });
      const userVoteIds =
        votesRes.data
          ?.filter((v) => v.user_id === session?.user?.id)
          .map((v) => v.option_id) ?? [];
      setOptions(
        (optionsRes.data ?? []).map((o) => ({
          ...o,
          vote_count: voteCounts[o.id] ?? 0,
        })),
      );
      setMyVotes(userVoteIds);
      setTotalVotes(votesRes.data?.length ?? 0);
    } finally {
      setLoading(false);
    }
  }, [id, session?.user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleVote = async (optionId: string) => {
    if (!session?.user || voting) return;
    setVoting(true);
    try {
      if (ses?.vote_type === "single") {
        if (myVotes.length > 0) return;
        await supabase.from("ses_votes").insert({
          ses_id: id,
          option_id: optionId,
          user_id: session.user.id,
        });
      } else {
        if (myVotes.includes(optionId)) {
          await supabase
            .from("ses_votes")
            .delete()
            .eq("ses_id", id)
            .eq("option_id", optionId)
            .eq("user_id", session.user.id);
        } else {
          await supabase.from("ses_votes").insert({
            ses_id: id,
            option_id: optionId,
            user_id: session.user.id,
          });
        }
      }
      await load();
    } catch {
      Alert.alert("Error", "Could not submit vote.");
    } finally {
      setVoting(false);
    }
  };

  const hasVoted = myVotes.length > 0;
  const showResults = hasVoted || ses?.created_by === session?.user?.id;
  const topCount = Math.max(...options.map((o) => o.vote_count), 1);
  const isOwn = ses?.created_by === session?.user?.id;
  const displayName = author?.username ?? "Anonymous";
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  if (loading) {
    return (
      <ThemedView
        style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
      >
        <ActivityIndicator color={colors.text} />
      </ThemedView>
    );
  }

  if (!ses) {
    return (
      <ThemedView
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 32,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: colors.text,
            marginBottom: 8,
          }}
        >
          Not found
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: colors.textSecondary,
            textAlign: "center",
          }}
        >
          This ses doesn't exist or was deleted.
        </Text>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <Animated.View
          entering={FadeInDown.springify().damping(24)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingTop: 6,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? "#161616" : "#f2f2f2",
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: isDark ? "#171717" : "#f2f2f2",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="chevron-back" size={21} color={colors.text} />
          </Pressable>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 8,
                backgroundColor: isDark ? "#171717" : "#f2f2f2",
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "800",
                  color: isDark ? "#555" : "#aaa",
                  textTransform: "uppercase",
                  letterSpacing: 1.2,
                }}
              >
                {ses.vote_type === "single" ? "Single" : "Multi"}
              </Text>
            </View>
            {!isOwn && (
              <FollowButton
                targetUserId={ses.created_by}
                currentUserId={session?.user?.id ?? null}
                isDark={isDark}
              />
            )}
          </View>
        </Animated.View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 52 }}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            entering={FadeInDown.delay(50).springify().damping(22)}
            style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                author?.username &&
                router.push(`/${author.username}/page` as any)
              }
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginBottom: 18,
              }}
            >
              <Avatar
                uri={author?.avatar_url ?? null}
                name={displayName}
                size={38}
              />
              <View style={{ gap: 3 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: isDark ? "#ddd" : "#111",
                  }}
                >
                  @{displayName}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: isDark ? "#4a4a4a" : "#bbb",
                    fontWeight: "500",
                  }}
                >
                  {formatDate(ses.created_at)}
                </Text>
              </View>
            </TouchableOpacity>

            <Animated.View
              entering={FadeInLeft.delay(90).springify().damping(24)}
            >
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "800",
                  color: colors.text,
                  lineHeight: 30,
                  letterSpacing: -0.4,
                  marginBottom: 16,
                }}
              >
                {ses.question}
              </Text>
            </Animated.View>

            <Animated.View
              entering={FadeIn.delay(130)}
              style={{
                flexDirection: "row",
                alignItems: "baseline",
                gap: 5,
                marginBottom: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 36,
                  fontWeight: "900",
                  color: colors.text,
                  fontVariant: ["tabular-nums"],
                  lineHeight: 40,
                }}
              >
                {totalVotes}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: isDark ? "#484848" : "#c0c0c0",
                  fontWeight: "600",
                }}
              >
                {totalVotes === 1 ? "vote" : "votes"}
              </Text>
            </Animated.View>
          </Animated.View>

          <View style={{ paddingHorizontal: 20, gap: 9, paddingTop: 10 }}>
            {options.map((option, i) => (
              <OptionBar
                key={option.id}
                option={option}
                index={i}
                isMyVote={myVotes.includes(option.id)}
                showResults={showResults}
                hasVoted={hasVoted}
                totalVotes={totalVotes}
                topCount={topCount}
                onPress={() => handleVote(option.id)}
                voting={voting}
                voteType={ses.vote_type}
                isDark={isDark}
              />
            ))}
          </View>

          {(!showResults || (ses.vote_type === "multiple" && !hasVoted)) && (
            <Animated.View
              entering={FadeIn.delay(380)}
              style={{ marginTop: 16, alignItems: "center", gap: 6 }}
            >
              {!showResults && (
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
                >
                  <Ionicons
                    name="eye-off-outline"
                    size={12}
                    color={isDark ? "#383838" : "#d0d0d0"}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      color: isDark ? "#383838" : "#d0d0d0",
                      fontWeight: "500",
                    }}
                  >
                    Results visible after voting
                  </Text>
                </View>
              )}
              {ses.vote_type === "multiple" && !hasVoted && (
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
                >
                  <Ionicons
                    name="layers-outline"
                    size={12}
                    color={isDark ? "#383838" : "#d0d0d0"}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      color: isDark ? "#383838" : "#d0d0d0",
                      fontWeight: "500",
                    }}
                  >
                    Pick multiple
                  </Text>
                </View>
              )}
            </Animated.View>
          )}

          {voting && (
            <View style={{ marginTop: 20, alignItems: "center" }}>
              <ActivityIndicator
                color={isDark ? "#444" : "#ccc"}
                size="small"
              />
            </View>
          )}

          <Animated.View
            entering={FadeInUp.delay(200).springify()}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginHorizontal: 20,
              marginTop: 32,
              paddingTop: 18,
              borderTopWidth: 1,
              borderTopColor: isDark ? "#161616" : "#f0f0f0",
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Ionicons
                name="people-outline"
                size={15}
                color={isDark ? "#383838" : "#ccc"}
              />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: isDark ? "#444" : "#c0c0c0",
                }}
              >
                {totalVotes} {totalVotes === 1 ? "response" : "responses"}
              </Text>
            </View>
            <LikeButton
              sesId={ses.id}
              userId={session?.user?.id ?? null}
              isDark={isDark}
            />
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
