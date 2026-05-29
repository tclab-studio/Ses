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

type FollowUser = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

function Avatar({
  uri,
  name,
  size = 44,
}: {
  uri: string | null;
  name: string;
  size?: number;
}) {
  const initial = name.charAt(0).toUpperCase();
  const colors = ["#3B5BDB", "#7048e8", "#0ca678", "#e8590c", "#d6336c"];
  const bgColor = colors[name.charCodeAt(0) % colors.length];

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

function UserRow({
  user,
  currentUserId,
}: {
  user: FollowUser;
  currentUserId: string | null;
}) {
  const router = useRouter();
  const { following, toggleFollow, loading } = useFollow(
    user.id,
    currentUserId,
  );
  const isOwn = currentUserId === user.id;
  const name = user.username ?? "unknown";

  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.97,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
    router.push(`/${name}/page` as any);
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={1}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 12,
          paddingHorizontal: 16,
          gap: 12,
        }}
      >
        <Avatar uri={user.avatar_url} name={name} size={46} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#111" }}>
            @{name}
          </Text>
        </View>
        {!isOwn && (
          <TouchableOpacity
            onPress={toggleFollow}
            disabled={loading}
            activeOpacity={0.75}
            style={{
              height: 32,
              minWidth: 88,
              paddingHorizontal: 14,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: following ? "transparent" : "#111",
              borderWidth: 1.5,
              borderColor: following ? "#d1d5db" : "#111",
              opacity: loading ? 0.5 : 1,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: following ? "#6b7280" : "#fff",
              }}
            >
              {loading ? "..." : following ? "Following" : "Follow"}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function FollowersScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const currentUserId = useAuthStore((s) => s.session?.user?.id);

  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    if (!username) return;

    const { data: profileData } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .single();

    if (!profileData) {
      setLoading(false);
      return;
    }

    const { data: followsData, error: followsErr } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("following_id", profileData.id)
      .order("created_at", { ascending: false });

    if (followsErr) {
      console.error("follows query error:", followsErr);
      setLoading(false);
      return;
    }

    const followerIds = (followsData ?? []).map((r) => r.follower_id).filter(Boolean);

    if (followerIds.length === 0) {
      setFollowers([]);
      setLoading(false);
      setRefreshing(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
      return;
    }

    const { data: profilesData, error: profilesErr } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", followerIds);

    if (profilesErr) {
      console.error("profiles query error:", profilesErr);
      setLoading(false);
      return;
    }

    const profileById: Record<string, FollowUser> = {};
    (profilesData ?? []).forEach((p) => { profileById[p.id] = p; });
    const users = followerIds.map((id) => profileById[id]).filter(Boolean) as FollowUser[];

    setFollowers(users);
    setLoading(false);
    setRefreshing(false);

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [username]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: "#f3f4f6",
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={{ padding: 4, marginLeft: -4, marginRight: 8 }}
          >
            <Ionicons name="chevron-back" size={24} color="#9ca3af" />
          </TouchableOpacity>
          <ThemedText
            style={{ fontSize: 16, fontWeight: "800", letterSpacing: -0.3 }}
          >
            Followers
          </ThemedText>
        </View>

        {loading ? (
          <View style={{ padding: 16, gap: 8 }}>
            {[...Array(6)].map((_, i) => (
              <View
                key={i}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                }}
              >
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 23,
                    backgroundColor: "#f3f4f6",
                  }}
                />
                <View style={{ flex: 1, gap: 6 }}>
                  <View
                    style={{
                      width: 100,
                      height: 10,
                      borderRadius: 6,
                      backgroundColor: "#f3f4f6",
                    }}
                  />
                  <View
                    style={{
                      width: 64,
                      height: 8,
                      borderRadius: 6,
                      backgroundColor: "#f3f4f6",
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
            <FlatList
              data={followers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <UserRow user={item} currentUserId={currentUserId ?? null} />
              )}
              ItemSeparatorComponent={() => (
                <View
                  style={{
                    height: 1,
                    backgroundColor: "#f9fafb",
                    marginHorizontal: 16,
                  }}
                />
              )}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                />
              }
              ListEmptyComponent={
                <View
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingTop: 80,
                    gap: 10,
                  }}
                >
                  <Ionicons name="people-outline" size={36} color="#d1d5db" />
                  <Text
                    style={{
                      color: "#9ca3af",
                      fontSize: 14,
                      fontWeight: "500",
                    }}
                  >
                    No followers yet
                  </Text>
                </View>
              }
              contentContainerStyle={{ paddingBottom: 40 }}
            />
          </Animated.View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}
