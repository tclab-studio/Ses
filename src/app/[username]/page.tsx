import { SesCard, SesCardSkeleton } from "@/components/cards/ses-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useFollow } from "@/hooks/useFollow";
import { useAuthStore } from "@/stores";
import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ProfileData = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  interests: string[] | null;
  streak_count: number | null;
};

type StatsData = { published: number; followers: number; following: number };
type Topic = { id: string; name: string; emoji: string | null };

const INTEREST_EMOJI: Record<string, string> = {
  tech: "💻", science: "🔬", sports: "⚽", gaming: "🎮", music: "🎵",
  finance: "📈", politics: "🗳️", food: "🍕", travel: "✈️", health: "💪",
  crypto: "₿", art: "🎨",
};

function FollowButton({ targetUserId, currentUserId }: { targetUserId: string; currentUserId: string | null }) {
  const { following, followerCount, toggleFollow, loading } = useFollow(targetUserId, currentUserId);
  return (
    <TouchableOpacity onPress={toggleFollow} disabled={loading} activeOpacity={0.75}
      style={{ height: 36, minWidth: 110, paddingHorizontal: 16, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: following ? "transparent" : "#000", borderWidth: 1.5, borderColor: following ? "#d1d5db" : "#000", opacity: loading ? 0.6 : 1 }}>
      <Text style={{ fontSize: 13, fontWeight: "700", color: following ? "#6b7280" : "#fff" }}>
        {loading ? "..." : following ? "Following" : "Follow"}
      </Text>
    </TouchableOpacity>
  );
}

export default function UserProfilePage() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const currentUserId = useAuthStore((s) => s.session?.user?.id);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<StatsData>({ published: 0, followers: 0, following: 0 });
  const [sess, setSess] = useState<any[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  const loadAll = useCallback(async () => {
    if (!username) return;

    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, interests, streak_count")
      .eq("username", username)
      .single();

    if (!profileData) { setLoading(false); return; }
    setProfile(profileData);

    const [publishedRes, followersRes, followingRes, sessRes, topicsRes] = await Promise.all([
      supabase.from("ses").select("*", { count: "exact", head: true }).eq("created_by", profileData.id),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profileData.id),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profileData.id),
      supabase.from("ses").select(`
        id, question, vote_type, created_at, created_by,
        option_count, vote_count,
        options:ses_options(id, text),
        author:profiles!ses_created_by_fkey(username, avatar_url)
      `).eq("created_by", profileData.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("user_topics").select("topics(id, name, emoji)").eq("user_id", profileData.id),
    ]);

    setStats({ published: publishedRes.count ?? 0, followers: followersRes.count ?? 0, following: followingRes.count ?? 0 });
    setSess((sessRes.data ?? []).map((s) => ({ ...s, has_voted: false, selected_option_ids: null })));
    setTopics((topicsRes.data ?? []).map((r: any) => r.topics).filter(Boolean));
    setLoading(false);

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 90, friction: 14, useNativeDriver: true }),
    ]).start();
  }, [username]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  const isOwnProfile = currentUserId === profile?.id;
  const displayName = profile?.username ?? username ?? "Unknown";
  const initial = displayName.charAt(0).toUpperCase();
  const interests = profile?.interests ?? [];
  const streak = profile?.streak_count ?? 0;

  const renderItem = useCallback(({ item }: any) => <SesCard item={item} />, []);
  const keyExtractor = useCallback((item: any) => item.id, []);

  const ListHeader = () => (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], gap: 16, marginBottom: 16 }}>
      <View className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-100 dark:border-neutral-800">
        <View className="items-center gap-4">
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} className="w-20 h-20 rounded-full" />
          ) : (
            <View className="w-20 h-20 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center">
              <Text className="text-3xl font-black text-neutral-500 dark:text-neutral-400">{initial}</Text>
            </View>
          )}

          <View className="items-center gap-2">
            <ThemedText className="text-2xl font-black tracking-tight">{displayName}</ThemedText>
            {streak > 0 && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={{ fontSize: 13 }}>🔥</Text>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#f97316" }}>{streak} day streak</Text>
              </View>
            )}
          </View>

          {interests.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
              {interests.map((id) => (
                <View key={id} style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f3f4f6", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 }}>
                  <Text style={{ fontSize: 12 }}>{INTEREST_EMOJI[id] ?? "•"}</Text>
                  <Text style={{ fontSize: 11, fontWeight: "600", color: "#374151", textTransform: "capitalize" }}>{id}</Text>
                </View>
              ))}
            </View>
          )}

          {topics.length > 0 && (
            <View style={{ width: "100%" }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Topics</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {topics.map((t) => (
                  <View key={t.id} style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f3f4f6", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 }}>
                    {t.emoji ? <Text style={{ fontSize: 11 }}>{t.emoji}</Text> : null}
                    <Text style={{ fontSize: 11, fontWeight: "600", color: "#374151" }}>{t.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {!isOwnProfile && profile && <FollowButton targetUserId={profile.id} currentUserId={currentUserId ?? null} />}
        </View>
      </View>

      <View className="flex-row gap-3">
        {[{ label: "Sess", value: stats.published }, { label: "Followers", value: stats.followers }, { label: "Following", value: stats.following }].map((s) => (
          <View key={s.label} className="flex-1 bg-white dark:bg-neutral-900 rounded-2xl p-4 items-center border border-neutral-100 dark:border-neutral-800">
            <ThemedText className="text-2xl font-black tracking-tight text-neutral-900 dark:text-neutral-50">{s.value}</ThemedText>
            <ThemedText className="text-[11px] text-neutral-500 font-bold uppercase tracking-wider mt-1">{s.label}</ThemedText>
          </View>
        ))}
      </View>

      {sess.length > 0 && (
        <ThemedText className="text-xs font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 px-1">Sessions</ThemedText>
      )}
    </Animated.View>
  );

  return (
    <ThemedView className="flex-1">
      <SafeAreaView className="flex-1" edges={["top", "left", "right"]}>
        <View className="flex-row items-center px-4 py-3.5 border-b border-neutral-100 dark:border-neutral-800">
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} className="p-2 -ml-2 rounded-full active:bg-neutral-100 dark:active:bg-neutral-800">
            <Ionicons name="chevron-back" size={24} color="#9ca3af" />
          </TouchableOpacity>
          <ThemedText className="text-base font-black tracking-tight ml-1">{displayName}</ThemedText>
        </View>

        {loading ? (
          <View style={{ padding: 16, gap: 16 }}>
            <View className="bg-white dark:bg-neutral-900 rounded-3xl p-6 items-center gap-4 border border-neutral-100 dark:border-neutral-800">
              <View className="w-20 h-20 rounded-full bg-neutral-100 dark:bg-neutral-800" />
              <View className="w-28 h-4 rounded-lg bg-neutral-100 dark:bg-neutral-800" />
            </View>
            {[...Array(2)].map((_, i) => <SesCardSkeleton key={i} />)}
          </View>
        ) : !profile ? (
          <View className="flex-1 items-center justify-center gap-2">
            <Ionicons name="person-outline" size={36} color="#9ca3af" />
            <ThemedText className="text-neutral-400">User not found</ThemedText>
          </View>
        ) : (
          <FlatList
            data={sess}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            ListHeaderComponent={ListHeader}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            ListEmptyComponent={
              <View className="items-center py-10 gap-2">
                <Ionicons name="grid-outline" size={28} color="#9ca3af" />
                <ThemedText className="text-neutral-400 text-sm">No sessions yet</ThemedText>
              </View>
            }
            removeClippedSubviews
            maxToRenderPerBatch={8}
            windowSize={5}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}
