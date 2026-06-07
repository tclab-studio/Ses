import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Topic = {
  id: string;
  name: string;
  emoji: string | null;
  category: string | null;
};

export default function TopicsScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const isStep1Ready = true;
  const isStep2Ready = true;
  const isCtaActive = true;
  const BottomTabInset = 0;
  const Spacing = { three: 12 };
  const handleNextStep = () => {};

  const handleSubmit = () => {
    if (followed.size === 0) {
      return;
    }
    router.replace("/");
  };

  const [topics, setTopics] = useState<Topic[]>([]);
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [topicsRes, userTopicsRes] = await Promise.all([
      supabase
        .from("topics")
        .select("id, name, emoji, category")
        .order("category")
        .order("name"),
      session?.user?.id
        ? supabase
            .from("user_topics")
            .select("topic_id")
            .eq("user_id", session.user.id)
        : Promise.resolve({ data: [] }),
    ]);

    setTopics(topicsRes.data ?? []);
    setFollowed(
      new Set((userTopicsRes.data ?? []).map((t: any) => t.topic_id)),
    );
    setLoading(false);
    setRefreshing(false);
  }, [session?.user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (topicId: string) => {
    if (!session?.user?.id || toggling) return;
    setToggling(topicId);
    const isFollowed = followed.has(topicId);

    setFollowed((prev) => {
      const next = new Set(prev);
      if (isFollowed) next.delete(topicId);
      else next.add(topicId);
      return next;
    });

    if (isFollowed) {
      await supabase
        .from("user_topics")
        .delete()
        .eq("user_id", session.user.id)
        .eq("topic_id", topicId);
    } else {
      await supabase
        .from("user_topics")
        .insert({ user_id: session.user.id, topic_id: topicId });
    }

    setToggling(null);
  };

  const grouped = topics.reduce<Record<string, Topic[]>>((acc, t) => {
    const cat = t.category ?? "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  return (
    <ThemedView
      style={{
        flexDirection: "column",
        width: "100%",
        flex: 1,
      }}
    >
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        {loading ? (
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <ActivityIndicator color={isDark ? "#fff" : "#000"} />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: 20,
              paddingBottom: 60,
              paddingTop: 8,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  load();
                }}
                tintColor={isDark ? "#fff" : "#000"}
              />
            }
          >
            <View
              style={{ width: "100%", alignItems: "center", marginBottom: 24 }}
            >
              <ThemedText className="text-center text-[28px]">
                Please choose one of these themes to follow.
              </ThemedText>
              <ThemedText className="text-center text-sm text-neutral-900 mt-2">
                This will help us personalize your experience and recommend
                content that matches your interests.
              </ThemedText>
            </View>

            {Object.entries(grouped).map(([category, items]) => (
              <View
                key={category}
                style={{
                  marginBottom: 24,
                  alignItems: "flex-start",
                  width: "100%",
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "800",
                    color: isDark ? "#555" : "#9ca3af",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    marginBottom: 10,
                    marginTop: 8,
                    textAlign: "left",
                  }}
                >
                  {category}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                    justifyContent: "flex-start",
                  }}
                >
                  {items.map((t) => {
                    const isFollowed = followed.has(t.id);
                    const isToggling = toggling === t.id;
                    return (
                      <TouchableOpacity
                        key={t.id}
                        onPress={() => toggle(t.id)}
                        activeOpacity={0.75}
                        disabled={!!toggling}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 5,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 999,
                          backgroundColor: isFollowed
                            ? isDark
                              ? "#fff"
                              : "#111"
                            : isDark
                              ? "#1a1a1a"
                              : "#f3f4f6",
                          borderWidth: 1.5,
                          borderColor: isFollowed
                            ? isDark
                              ? "#fff"
                              : "#111"
                            : isDark
                              ? "#222"
                              : "#e5e7eb",
                          opacity: isToggling ? 0.6 : 1,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "600",
                            color: isFollowed
                              ? isDark
                                ? "#000"
                                : "#fff"
                              : isDark
                                ? "#ccc"
                                : "#374151",
                          }}
                        >
                          {t.name}
                        </Text>
                        {isFollowed && !isToggling && (
                          <Ionicons
                            name="checkmark"
                            size={13}
                            color={isDark ? "#000" : "#fff"}
                          />
                        )}
                        {isToggling && (
                          <ActivityIndicator
                            size={12}
                            color={
                              isFollowed
                                ? isDark
                                  ? "#000"
                                  : "#fff"
                                : isDark
                                  ? "#fff"
                                  : "#000"
                            }
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}

            {Object.keys(grouped).length === 0 && (
              <View
                style={{
                  alignItems: "center",
                  paddingTop: 60,
                  gap: 12,
                  width: "100%",
                }}
              >
                <Ionicons name="pricetags-outline" size={36} color="#9ca3af" />
                <ThemedText style={{ color: "#9ca3af", fontSize: 14 }}>
                  No topics available yet
                </ThemedText>
              </View>
            )}

            <Pressable
              onPress={step < 3 ? handleNextStep : handleSubmit}
              disabled={
                (step === 1 && !isStep1Ready) ||
                (step === 2 && !isStep2Ready) ||
                submitting
              }
              style={({ pressed }) => [
                { transform: [{ scale: pressed ? 0.98 : 1 }] },
                { marginBottom: BottomTabInset + Spacing.three },
                { width: "100%" },
              ]}
              className={`py-5 rounded-2xl items-center mt-8 ${isCtaActive ? "bg-[#5db8ed]" : "bg-neutral-200"}`}
            >
              {submitting ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text
                  className={`text-base font-black tracking-tight 
                  ${isCtaActive ? "text-white" : isDark ? "text-neutral-600" : "text-neutral-400"}`}
                >
                  Continue
                </Text>
              )}
            </Pressable>
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

