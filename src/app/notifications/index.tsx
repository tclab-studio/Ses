import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Notification = {
  id: string;
  type: string;
  data: any;
  read: boolean;
  created_at: string;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function notifIcon(type: string) {
  switch (type) {
    case "vote": return "bar-chart-outline";
    case "follow": return "person-add-outline";
    case "like": return "heart-outline";
    case "comment": return "chatbubble-outline";
    default: return "notifications-outline";
  }
}

function notifLabel(type: string, data: any) {
  switch (type) {
    case "vote": return `Someone voted on your ses "${data?.question ?? ""}"`;
    case "follow": return `${data?.username ?? "Someone"} started following you`;
    case "like": return `${data?.username ?? "Someone"} liked your ses`;
    case "comment": return `${data?.username ?? "Someone"} commented on your ses`;
    default: return data?.message ?? "New notification";
  }
}

export default function NotificationsScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifications(data ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [session?.user?.id]);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  };

  const markAllRead = async () => {
    if (!session?.user?.id) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase.from("notifications").update({ read: true }).eq("user_id", session.user.id).eq("read", false);
  };

  const handlePress = (n: Notification) => {
    markRead(n.id);
    if (n.data?.ses_id) router.push(`/ses/${n.data.ses_id}` as any);
    else if (n.data?.username) router.push(`/${n.data.username}/page` as any);
  };

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: isDark ? "#161616" : "#f3f4f6" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Ionicons name="chevron-back" size={22} color={isDark ? "#888" : "#555"} />
            </Pressable>
            <ThemedText style={{ fontSize: 16, fontWeight: "700" }}>Notifications</ThemedText>
            {unread > 0 && (
              <View style={{ backgroundColor: "#ef4444", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: "#fff" }}>{unread}</Text>
              </View>
            )}
          </View>
          {unread > 0 && (
            <TouchableOpacity onPress={markAllRead} activeOpacity={0.7}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#3b82f6" }}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={isDark ? "#fff" : "#000"} />
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={isDark ? "#fff" : "#000"} />}
            contentContainerStyle={{ paddingBottom: 40 }}
            ListEmptyComponent={
              <View style={{ alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 }}>
                <Ionicons name="notifications-off-outline" size={36} color="#9ca3af" />
                <ThemedText style={{ color: "#9ca3af", fontSize: 14 }}>No notifications yet</ThemedText>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handlePress(item)}
                activeOpacity={0.7}
                style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, gap: 14, backgroundColor: item.read ? "transparent" : (isDark ? "rgba(59,130,246,0.05)" : "rgba(59,130,246,0.04)"), borderBottomWidth: 1, borderBottomColor: isDark ? "#0f0f0f" : "#f9fafb" }}
              >
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: isDark ? "#1a1a1a" : "#f3f4f6", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={notifIcon(item.type) as any} size={18} color={isDark ? "#666" : "#9ca3af"} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ fontSize: 13, fontWeight: item.read ? "400" : "600", color: isDark ? "#e5e5e5" : "#111", lineHeight: 18 }} numberOfLines={2}>
                    {notifLabel(item.type, item.data)}
                  </Text>
                  <Text style={{ fontSize: 11, color: isDark ? "#555" : "#9ca3af" }}>{timeAgo(item.created_at)}</Text>
                </View>
                {!item.read && (
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#3b82f6" }} />
                )}
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}
