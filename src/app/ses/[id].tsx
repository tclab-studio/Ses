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
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

type Option = { id: string; text: string; order: number; vote_count: number };
type Topic = { id: string; name: string; emoji: string | null };
type Ses = {
  id: string;
  question: string;
  description?: string | null;
  vote_type: "single" | "multiple";
  created_at: string;
  created_by: string;
  end_date?: string | null;
  is_anonymous?: boolean;
};
type AuthorProfile = { username: string | null; avatar_url: string | null };

function Avatar({
  uri,
  name,
  size = 40,
}: {
  uri: string | null;
  name: string;
  size?: number;
}) {
  const palette = ["#6366f1", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899"];
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
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

function formatCountdown(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "closed";
  const h = Math.floor(diff / 3600000);
  if (h < 24) return `${h}h left`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h left`;
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
  const pct =
    totalVotes > 0 ? Math.round((option.vote_count / totalVotes) * 100) : 0;
  const isWinning = option.vote_count > 0 && option.vote_count === topCount;
  const isLocked = voteType === "single" && hasVoted && !isMyVote;
  const barW = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    barW.value = withDelay(
      index * 70,
      withSpring(showResults ? pct : 0, { damping: 24, stiffness: 110 }),
    );
  }, [showResults, pct]);

  const barStyle = useAnimatedStyle(() => ({ width: `${barW.value}%` }));
  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const borderColor = isMyVote
    ? isDark
      ? "rgba(255,255,255,0.45)"
      : "rgba(0,0,0,0.65)"
    : isDark
      ? "rgba(255,255,255,0.08)"
      : "rgba(0,0,0,0.08)";

  const barColor = isMyVote
    ? isDark
      ? "rgba(255,255,255,0.07)"
      : "rgba(0,0,0,0.06)"
    : isWinning
      ? isDark
        ? "rgba(255,255,255,0.03)"
        : "rgba(0,0,0,0.03)"
      : "transparent";

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 55)
        .springify()
        .damping(24)}
    >
      <Animated.View style={scaleStyle}>
        <Pressable
          onPressIn={() => {
            if (!isLocked && !voting)
              scale.value = withSpring(0.975, { damping: 20 });
          }}
          onPressOut={() => {
            scale.value = withSpring(1, { damping: 20 });
          }}
          onPress={isLocked || voting ? undefined : onPress}
          style={[
            styles.optionBar,
            { borderColor, opacity: isLocked ? 0.3 : 1 },
          ]}
        >
          <Animated.View
            style={[
              barStyle,
              {
                position: "absolute",
                top: 0,
                left: 0,
                bottom: 0,
                backgroundColor: barColor,
                borderRadius: 16,
              },
            ]}
          />
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: voteType === "multiple" ? 6 : 10,
              borderWidth: 1.5,
              borderColor: isMyVote
                ? isDark
                  ? "#fff"
                  : "#000"
                : isDark
                  ? "#333"
                  : "#d0d0d0",
              backgroundColor: isMyVote
                ? isDark
                  ? "#fff"
                  : "#000"
                : "transparent",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isMyVote && (
              <Animated.View entering={FadeIn.springify()}>
                <Ionicons
                  name="checkmark"
                  size={11}
                  color={isDark ? "#000" : "#fff"}
                />
              </Animated.View>
            )}
          </View>
          <Text
            style={{
              flex: 1,
              fontSize: 14,
              lineHeight: 20,
              fontWeight: isMyVote ? "700" : "400",
              color: isMyVote
                ? isDark
                  ? "#fff"
                  : "#000"
                : isDark
                  ? "#bbb"
                  : "#444",
            }}
            numberOfLines={2}
          >
            {option.text}
          </Text>
          {showResults && (
            <Animated.View
              entering={FadeIn.delay(index * 60 + 180)}
              style={{ alignItems: "flex-end", minWidth: 44 }}
            >
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "800",
                  color: isDark ? "#ddd" : "#111",
                  fontVariant: ["tabular-nums"],
                }}
              >
                {pct}%
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: isDark ? "#444" : "#bbb",
                  fontVariant: ["tabular-nums"],
                }}
              >
                {option.vote_count}
              </Text>
            </Animated.View>
          )}
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
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePress() {
    if (!userId) return;
    scale.value = withSequence(
      withSpring(1.5, { damping: 5, stiffness: 280 }),
      withSpring(1, { damping: 12 }),
    );
    toggleLike();
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      style={[
        styles.actionBtn,
        {
          backgroundColor: liked
            ? isDark
              ? "rgba(239,68,68,0.12)"
              : "rgba(239,68,68,0.08)"
            : isDark
              ? "#111"
              : "#f5f5f5",
          borderColor: liked ? "rgba(239,68,68,0.35)" : "transparent",
          borderWidth: 1,
        },
      ]}
    >
      <Animated.View style={anim}>
        <Ionicons
          name={liked ? "heart" : "heart-outline"}
          size={16}
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
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePress() {
    scale.value = withSequence(
      withSpring(0.94, { damping: 15 }),
      withSpring(1, { damping: 15 }),
    );
    toggleFollow();
  }

  return (
    <Animated.View style={anim}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={1}
        style={[
          styles.actionBtn,
          {
            backgroundColor: following
              ? "transparent"
              : isDark
                ? "#fff"
                : "#000",
            borderColor: following
              ? isDark
                ? "#222"
                : "#e5e5e5"
              : isDark
                ? "#fff"
                : "#000",
            borderWidth: 1,
          },
        ]}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: "700",
            color: following
              ? isDark
                ? "#555"
                : "#aaa"
              : isDark
                ? "#000"
                : "#fff",
          }}
        >
          {loading ? "···" : following ? "Following" : "Follow"}
        </Text>
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
  const [topics, setTopics] = useState<Topic[]>([]);
  const [myVotes, setMyVotes] = useState<string[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [reporting, setReporting] = useState(false);

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
      const [optRes, voteRes, profileRes, topicsRes] = await Promise.all([
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
        supabase
          .from("ses_topics")
          .select("topics(id, name, emoji)")
          .eq("ses_id", id),
      ]);
      setAuthor(profileRes.data ?? null);
      setTopics(
        (topicsRes.data ?? []).map((r: any) => r.topics).filter(Boolean),
      );
      const counts: Record<string, number> = {};
      voteRes.data?.forEach((v) => {
        counts[v.option_id] = (counts[v.option_id] ?? 0) + 1;
      });
      const mine =
        voteRes.data
          ?.filter((v) => v.user_id === session?.user?.id)
          .map((v) => v.option_id) ?? [];
      setOptions(
        (optRes.data ?? []).map((o) => ({
          ...o,
          vote_count: counts[o.id] ?? 0,
        })),
      );
      setMyVotes(mine);
      setTotalVotes(voteRes.data?.length ?? 0);
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
      Alert.alert("Error", "Vote failed. Try again.");
    } finally {
      setVoting(false);
    }
  };

  const handleShare = async () => {
    try {
      if (Platform.OS === "web") {
        if (navigator.share)
          await navigator.share({
            title: ses?.question,
            url: window.location.href,
          });
        else {
          await navigator.clipboard.writeText(window.location.href);
          Alert.alert("Copied", "Link copied.");
        }
        return;
      }
      await Share.share({
        title: ses?.question ?? "Ses",
        message: `${ses?.question}\n\nses://ses/${id}`,
      });
    } catch {}
  };

  const submitReport = async (reason: string) => {
    if (!session?.user?.id) return;
    setReporting(true);
    await supabase
      .from("reports")
      .insert({ ses_id: id, user_id: session.user.id, reason });
    setReporting(false);
    Alert.alert("Reported", "We'll look into it.");
  };

  const handleReport = () => {
    if (!session?.user?.id || reporting) return;
    Alert.alert("Report", "Why are you reporting this?", [
      { text: "Spam", onPress: () => submitReport("spam") },
      { text: "Inappropriate", onPress: () => submitReport("inappropriate") },
      { text: "Misinformation", onPress: () => submitReport("misinformation") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const hasVoted = myVotes.length > 0;
  const showResults = hasVoted || ses?.created_by === session?.user?.id;
  const topCount = Math.max(...options.map((o) => o.vote_count), 0);
  const isOwn = ses?.created_by === session?.user?.id;
  const displayName = ses?.is_anonymous ? "anon" : (author?.username ?? "anon");
  const displayAvatar = ses?.is_anonymous ? null : (author?.avatar_url ?? null);
  const pct =
    myVotes.length > 0 && totalVotes > 5
      ? Math.round(
          (options
            .filter((o) => myVotes.includes(o.id))
            .reduce((a, o) => a + o.vote_count, 0) /
            totalVotes) *
            100,
        )
      : null;

  const bg = isDark ? "#000" : "#fafafa";
  const cardBg = isDark ? "#0f0f0f" : "#fff";
  const border = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const muted = isDark ? "#444" : "#bbb";
  const mutedBg = isDark ? "#111" : "#f2f2f2";

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
          paddingHorizontal: 40,
        }}
      >
        <Text
          style={{
            fontSize: 20,
            fontWeight: "800",
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
            lineHeight: 20,
          }}
        >
          This ses doesn't exist or was deleted.
        </Text>
      </ThemedView>
    );
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <ThemedView style={{ flex: 1, backgroundColor: bg }}>
      <SafeAreaView style={{ flex: 1 }}>
        <Animated.View
          entering={FadeInDown.springify().damping(26)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: border,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: mutedBg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <TouchableOpacity
              onPress={handleShare}
              style={[styles.iconBtn, { backgroundColor: mutedBg }]}
            >
              <Ionicons name="share-outline" size={16} color={muted} />
            </TouchableOpacity>
            {!isOwn && (
              <TouchableOpacity
                onPress={handleReport}
                style={[styles.iconBtn, { backgroundColor: mutedBg }]}
              >
                <Ionicons name="flag-outline" size={16} color={muted} />
              </TouchableOpacity>
            )}
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 8,
                backgroundColor: mutedBg,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "800",
                  color: muted,
                  textTransform: "uppercase",
                  letterSpacing: 1,
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
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: 6 }}
          >
            <Animated.View
              entering={FadeInDown.delay(60).springify().damping(24)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 18,
              }}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() =>
                  !ses.is_anonymous &&
                  author?.username &&
                  router.push(`/${author.username}/page` as any)
                }
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  flex: 1,
                }}
              >
                <Avatar uri={displayAvatar} name={displayName} size={38} />
                <View style={{ gap: 2 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: isDark ? "#e0e0e0" : "#111",
                      }}
                    >
                      @{displayName}
                    </Text>
                    {ses.is_anonymous && (
                      <View
                        style={{
                          backgroundColor: mutedBg,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 5,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 9,
                            fontWeight: "700",
                            color: muted,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                          }}
                        >
                          anon
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={{ fontSize: 11, color: muted, fontWeight: "500" }}
                  >
                    {formatDate(ses.created_at)}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(90).springify().damping(24)}
            >
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "800",
                  color: isDark ? "#f5f5f5" : "#0a0a0a",
                  lineHeight: 32,
                  letterSpacing: -0.5,
                  marginBottom: ses.description ? 10 : 16,
                }}
              >
                {ses.question}
              </Text>
            </Animated.View>

            {ses.description ? (
              <Animated.View entering={FadeInDown.delay(110).springify()}>
                <Pressable
                  onPress={() => setDescExpanded((v) => !v)}
                  style={{ marginBottom: 14 }}
                >
                  <Text
                    numberOfLines={descExpanded ? undefined : 3}
                    style={{
                      fontSize: 14,
                      color: isDark ? "#666" : "#888",
                      lineHeight: 22,
                    }}
                  >
                    {ses.description}
                  </Text>
                  {ses.description.length > 100 && (
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: isDark ? "#444" : "#bbb",
                        marginTop: 4,
                      }}
                    >
                      {descExpanded ? "Show less" : "Show more"}
                    </Text>
                  )}
                </Pressable>
              </Animated.View>
            ) : null}

            {topics.length > 0 && (
              <Animated.View
                entering={FadeIn.delay(130)}
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 6,
                  marginBottom: 14,
                }}
              >
                {topics.map((t) => (
                  <View
                    key={t.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      backgroundColor: mutedBg,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 999,
                    }}
                  >
                    {t.emoji ? (
                      <Text style={{ fontSize: 11 }}>{t.emoji}</Text>
                    ) : null}
                    <Text
                      style={{ fontSize: 12, fontWeight: "600", color: muted }}
                    >
                      {t.name}
                    </Text>
                  </View>
                ))}
              </Animated.View>
            )}

            {ses.end_date && (
              <Animated.View
                entering={FadeIn.delay(140)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  marginBottom: 14,
                }}
              >
                <Ionicons name="time-outline" size={13} color="#f59e0b" />
                <Text
                  style={{ fontSize: 12, fontWeight: "600", color: "#f59e0b" }}
                >
                  {formatCountdown(ses.end_date)}
                </Text>
              </Animated.View>
            )}

            <Animated.View
              entering={FadeIn.delay(100)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginBottom: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 38,
                  fontWeight: "900",
                  color: isDark ? "#f0f0f0" : "#0a0a0a",
                  fontVariant: ["tabular-nums"],
                  lineHeight: 44,
                }}
              >
                {totalVotes}
              </Text>
              <View>
                <Text style={{ fontSize: 13, color: muted, fontWeight: "600" }}>
                  {totalVotes === 1 ? "vote" : "votes"}
                </Text>
                {pct !== null && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      marginTop: 3,
                      backgroundColor: isDark
                        ? "rgba(16,185,129,0.12)"
                        : "rgba(16,185,129,0.09)",
                      paddingHorizontal: 7,
                      paddingVertical: 2,
                      borderRadius: 999,
                      alignSelf: "flex-start",
                    }}
                  >
                    <Ionicons name="people-outline" size={10} color="#10b981" />
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: "#10b981",
                      }}
                    >
                      {pct}% agree
                    </Text>
                  </View>
                )}
              </View>
            </Animated.View>
          </View>

          <View style={{ paddingHorizontal: 20, gap: 8, paddingTop: 8 }}>
            {options.map((opt, i) => (
              <OptionBar
                key={opt.id}
                option={opt}
                index={i}
                isMyVote={myVotes.includes(opt.id)}
                showResults={showResults}
                hasVoted={hasVoted}
                totalVotes={totalVotes}
                topCount={topCount}
                onPress={() => handleVote(opt.id)}
                voting={voting}
                voteType={ses.vote_type}
                isDark={isDark}
              />
            ))}
          </View>

          {!showResults && (
            <Animated.View
              entering={FadeIn.delay(350)}
              style={{
                marginTop: 14,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 5,
              }}
            >
              <Ionicons
                name="eye-off-outline"
                size={13}
                color={isDark ? "#2a2a2a" : "#d5d5d5"}
              />
              <Text
                style={{
                  fontSize: 12,
                  color: isDark ? "#2a2a2a" : "#d5d5d5",
                  fontWeight: "500",
                }}
              >
                results visible after voting
              </Text>
            </Animated.View>
          )}
          {ses.vote_type === "multiple" && !hasVoted && (
            <Animated.View
              entering={FadeIn.delay(370)}
              style={{
                marginTop: 8,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 5,
              }}
            >
              <Ionicons
                name="layers-outline"
                size={13}
                color={isDark ? "#2a2a2a" : "#d5d5d5"}
              />
              <Text
                style={{
                  fontSize: 12,
                  color: isDark ? "#2a2a2a" : "#d5d5d5",
                  fontWeight: "500",
                }}
              >
                select multiple options
              </Text>
            </Animated.View>
          )}
          {voting && (
            <View style={{ marginTop: 18, alignItems: "center" }}>
              <ActivityIndicator size="small" color={muted} />
            </View>
          )}

          <Animated.View
            entering={FadeInUp.delay(180).springify()}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginHorizontal: 20,
              marginTop: 30,
              paddingTop: 16,
              borderTopWidth: 1,
              borderTopColor: border,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
            >
              <Ionicons name="people-outline" size={14} color={muted} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: muted }}>
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

const styles = StyleSheet.create({
  optionBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 12,
    overflow: "hidden",
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
});

