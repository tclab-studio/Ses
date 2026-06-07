import { SesCard } from "@/components/cards/ses-card";
import DemographicsBanner, {
  OK_HIT_SLOP,
} from "@/components/demographics-banner";
import BirthDateGenderModal from "@/components/modals/birth-gender";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAuth } from "@/hooks/useAuth";
import { useFollow } from "@/hooks/useFollow";
import { useProfileStore, useUserActivityStore } from "@/stores";
import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Profile() {
  const router = useRouter();
  const { session } = useAuth();
  const { fetchLikes } = useProfileStore();
  const { fetchBookmarkedSess, bookmarkedSess } = useUserActivityStore();

  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showBirthGenderModal, setShowBirthGenderModal] = useState(false);
  const [hasDemographics, setHasDemographics] = useState(false);
  const [streakCount, setStreakCount] = useState<number>(0);
  const [activeSection, setActiveSection] = useState<"stats" | "bookmarks">(
    "stats",
  );

  const [stats, setStats] = useState({
    published: 0,
    voted: 0,
    followers: 0,
    following: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [, setFollowingUsers] = useState<any[]>([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(8)).current;
  const avatarScale = useRef(new Animated.Value(1)).current;

  const { followerCount: cachedFollowers } = useFollow(
    session?.user?.id || "",
    session?.user?.id || null,
  );

  useFocusEffect(
    React.useCallback(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 120,
          friction: 14,
          useNativeDriver: true,
        }),
      ]).start();

      if (session?.user) {
        loadProfileAndStats();
        fetchLikes(session.user.id);
        fetchBookmarkedSess(session.user.id);
      }
    }, [session]),
  );

  const loadProfileAndStats = async () => {
    if (!session?.user?.id) return;
    setLoadingStats(true);
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("username, avatar_url, birth_date, gender, streak_count")
        .eq("id", session.user.id)
        .single();

      if (profileData) {
        setUsername(profileData.username ?? "");
        setAvatarUrl(profileData.avatar_url ?? null);
        setHasDemographics(!!profileData.birth_date && !!profileData.gender);
        setStreakCount(profileData.streak_count ?? 0);
      }

      const [publishedRes, votedRes, followingRes, followingUsersRes] =
        await Promise.all([
          supabase
            .from("ses")
            .select("*", { count: "exact", head: true })
            .eq("created_by", session.user.id),
          supabase
            .from("ses_votes")
            .select("*", { count: "exact", head: true })
            .eq("user_id", session.user.id),
          supabase
            .from("follows")
            .select("*", { count: "exact", head: true })
            .eq("follower_id", session.user.id),
          supabase
            .from("follows")
            .select("following_id")
            .eq("follower_id", session.user.id)
            .limit(20),
        ]);

      setStats({
        published: publishedRes.count ?? 0,
        voted: votedRes.count ?? 0,
        followers: cachedFollowers,
        following: followingRes.count ?? 0,
      });

      const followingIds = (followingUsersRes.data ?? [])
        .map((r: any) => r.following_id)
        .filter(Boolean);
      if (followingIds.length > 0) {
        const { data: followingProfiles } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", followingIds);
        setFollowingUsers(followingProfiles ?? []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingStats(false);
    }
  };

  const saveUsername = async () => {
    if (!username.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: session!.user.id,
      username: username.trim(),
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    setEditing(false);
    if (error) Alert.alert("Error", "Could not save username.");
  };

  const handleBirthGenderConfirm = async ({
    birthDate,
    gender,
  }: {
    birthDate: Date;
    gender: string;
  }) => {
    if (!session?.user?.id) return;
    const { error } = await supabase.from("profiles").upsert({
      id: session.user.id,
      birth_date: birthDate.toISOString().split("T")[0],
      gender,
      updated_at: new Date().toISOString(),
    });
    if (error) Alert.alert("Error", "Could not save your info.");
    else setHasDemographics(true);
    setShowBirthGenderModal(false);
  };

  const pickAvatarWeb = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setAvatarUploading(true);
      try {
        const fileName = `${session!.user.id}.${file.type.split("/")[1] || "jpg"}`;
        await supabase.storage
          .from("avatars")
          .upload(fileName, file, { upsert: true, contentType: file.type });
        const { data } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);
        await supabase.from("profiles").upsert({
          id: session!.user.id,
          avatar_url: data.publicUrl,
          updated_at: new Date().toISOString(),
        });
        setAvatarUrl(data.publicUrl);
      } catch {
        Alert.alert("Error", "Could not upload avatar.");
      } finally {
        setAvatarUploading(false);
      }
    };
    input.click();
  };

  const pickAvatar = async () => {
    if (Platform.OS === "web") {
      pickAvatarWeb();
      return;
    }
    const ImagePicker = await import("expo-image-picker");
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo access to set an avatar.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    setAvatarUploading(true);
    Animated.spring(avatarScale, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
    try {
      const uri = result.assets[0].uri;
      const ext = uri.split(".").pop() || "jpg";
      const fileName = `${session!.user.id}.${ext}`;
      const formData = new FormData();
      formData.append("file", {
        uri,
        name: fileName,
        type: `image/${ext}`,
      } as any);
      await supabase.storage
        .from("avatars")
        .upload(fileName, formData, { upsert: true });
      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      await supabase.from("profiles").upsert({
        id: session!.user.id,
        avatar_url: data.publicUrl,
        updated_at: new Date().toISOString(),
      });
      setAvatarUrl(data.publicUrl);
    } catch {
      Alert.alert("Error", "Could not upload avatar.");
    } finally {
      setAvatarUploading(false);
      Animated.spring(avatarScale, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  };

  const googleName = session?.user?.user_metadata?.full_name ?? "";
  const googleAvatar = session?.user?.user_metadata?.avatar_url ?? null;
  const displayAvatar = avatarUrl || googleAvatar;
  const displayName = username || googleName || "Anonymous";
  const email = session?.user?.email ?? "";
  const initial = displayName.charAt(0).toUpperCase();
  const userSegment = username.trim() || session?.user?.id || "profile";

  return (
    <ThemedView className="flex-1 bg-white dark:bg-zinc-950">
      <SafeAreaView className="flex-1 w-full" edges={["top", "left", "right"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          <View className="flex-row items-center justify-between px-6 py-4 bg-white dark:bg-zinc-950">
            <ThemedText className="text-base font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              Profile
            </ThemedText>
            <Pressable
              onPress={() => router.push("/settings" as any)}
              hitSlop={OK_HIT_SLOP}
              className="active:opacity-60"
            >
              <Ionicons
                name="settings-outline"
                size={20}
                className="text-neutral-400 dark:text-neutral-500"
              />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
                rowGap: 24,
              }}
            >
              <View className="items-center mt-4">
                <Animated.View style={{ transform: [{ scale: avatarScale }] }}>
                  <Pressable
                    onPress={pickAvatar}
                    hitSlop={OK_HIT_SLOP}
                    className="relative active:opacity-90"
                  >
                    {displayAvatar ? (
                      <Image
                        source={{ uri: displayAvatar }}
                        className="w-20 h-20 rounded-full bg-neutral-100 dark:bg-zinc-900"
                      />
                    ) : (
                      <View className="w-20 h-20 rounded-full bg-neutral-50 dark:bg-zinc-900 items-center justify-center border border-neutral-100 dark:border-zinc-800">
                        <ThemedText className="text-2xl font-semibold text-neutral-400 dark:text-zinc-500">
                          {initial}
                        </ThemedText>
                      </View>
                    )}
                    <View className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-white dark:bg-zinc-800 items-center justify-center shadow-sm border border-neutral-100 dark:border-zinc-700">
                      {avatarUploading ? (
                        <ActivityIndicator size={10} color="#a3a3a3" />
                      ) : (
                        <Ionicons
                          name="camera-outline"
                          size={12}
                          className="text-neutral-500 dark:text-neutral-400"
                        />
                      )}
                    </View>
                  </Pressable>
                </Animated.View>

                {streakCount > 0 && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      marginTop: 8,
                    }}
                  >
                    <Text style={{ fontSize: 14 }}>🔥</Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: "#f97316",
                      }}
                    >
                      {streakCount} day streak
                    </Text>
                  </View>
                )}

                {editing ? (
                  <View className="w-full mt-4 gap-2">
                    <TextInput
                      value={username}
                      onChangeText={setUsername}
                      placeholder="Username"
                      placeholderTextColor="#a3a3a3"
                      autoFocus
                      maxLength={25}
                      className="bg-neutral-50 dark:bg-zinc-900 text-neutral-900 dark:text-neutral-50 rounded-xl px-4 py-2.5 text-sm font-medium text-center border border-neutral-200/50 dark:border-zinc-800"
                    />
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        onPress={saveUsername}
                        className="flex-1 h-9 rounded-lg items-center justify-center bg-neutral-900 dark:bg-white"
                      >
                        <Text className="text-xs font-semibold text-white dark:text-zinc-950">
                          {saving ? "Saving..." : "Save"}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setEditing(false)}
                        className="flex-1 h-9 rounded-lg items-center justify-center border border-neutral-200 dark:border-zinc-800"
                      >
                        <Text className="text-xs font-semibold text-neutral-500 dark:text-zinc-400">
                          Cancel
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View className="items-center mt-3">
                    <View className="flex-row items-center gap-1.5">
                      <ThemedText className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
                        {displayName}
                      </ThemedText>
                      <Pressable
                        onPress={() => setEditing(true)}
                        hitSlop={OK_HIT_SLOP}
                        className="active:opacity-50"
                      >
                        <Ionicons
                          name="pencil"
                          size={12}
                          className="text-neutral-400"
                        />
                      </Pressable>
                    </View>
                    <ThemedText className="text-xs text-neutral-400 dark:text-zinc-500 mt-0.5">
                      {email}
                    </ThemedText>
                  </View>
                )}
              </View>

              <View className="flex-row justify-around py-2">
                <Pressable
                  onPress={() =>
                    router.push(`/${userSegment}/followers` as any)
                  }
                  className="items-center flex-1"
                >
                  {loadingStats ? (
                    <ActivityIndicator size="small" color="#a3a3a3" />
                  ) : (
                    <ThemedText className="text-base font-bold text-neutral-900 dark:text-neutral-50">
                      {cachedFollowers}
                    </ThemedText>
                  )}
                  <ThemedText className="text-[11px] text-neutral-400 dark:text-zinc-500 font-medium mt-0.5">
                    followers
                  </ThemedText>
                </Pressable>
                <View className="w-[1px] h-6 bg-neutral-100 dark:bg-zinc-800 self-center" />
                <Pressable
                  onPress={() =>
                    router.push(`/${userSegment}/following` as any)
                  }
                  className="items-center flex-1"
                >
                  {loadingStats ? (
                    <ActivityIndicator size="small" color="#a3a3a3" />
                  ) : (
                    <ThemedText className="text-base font-bold text-neutral-900 dark:text-neutral-50">
                      {stats.following}
                    </ThemedText>
                  )}
                  <ThemedText className="text-[11px] text-neutral-400 dark:text-zinc-500 font-medium mt-0.5">
                    following
                  </ThemedText>
                </Pressable>
              </View>

              {!hasDemographics && (
                <DemographicsBanner
                  onPress={() => setShowBirthGenderModal(true)}
                />
              )}

              <View
                style={{
                  flexDirection: "row",
                  gap: 0,
                  borderRadius: 12,
                  overflow: "hidden",
                  backgroundColor: "#f3f4f6",
                }}
              >
                {(["stats", "bookmarks"] as const).map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    onPress={() => setActiveSection(tab)}
                    style={{
                      flex: 1,
                      paddingVertical: 9,
                      alignItems: "center",
                      backgroundColor:
                        activeSection === tab ? "#111" : "transparent",
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: activeSection === tab ? "#fff" : "#6b7280",
                        textTransform: "capitalize",
                      }}
                    >
                      {tab}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {activeSection === "stats" && (
                <View className="bg-white dark:bg-zinc-900 rounded-2xl border border-neutral-100 dark:border-zinc-800/60 overflow-hidden shadow-sm shadow-black/[0.02]">
                  <Pressable
                    onPress={() => router.push(`/${userSegment}/sess` as any)}
                    className="flex-row items-center justify-between p-4 border-b border-neutral-50 dark:border-zinc-800/40 active:bg-neutral-50 dark:active:bg-zinc-800/30"
                  >
                    <View className="flex-row items-center gap-3">
                      <Ionicons
                        name="grid-outline"
                        size={16}
                        className="text-neutral-400 dark:text-neutral-500"
                      />
                      <ThemedText className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                        My Sess
                      </ThemedText>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      className="text-neutral-300 dark:text-zinc-600"
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => router.push(`/${userSegment}/votes` as any)}
                    className="flex-row items-center justify-between p-4 active:bg-neutral-50 dark:active:bg-zinc-800/30"
                  >
                    <View className="flex-row items-center gap-3">
                      <Ionicons
                        name="bar-chart-outline"
                        size={16}
                        className="text-neutral-400 dark:text-neutral-500"
                      />
                      <ThemedText className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                        My Votes
                      </ThemedText>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      className="text-neutral-300 dark:text-zinc-600"
                    />
                  </Pressable>
                </View>
              )}

              {activeSection === "bookmarks" && (
                <View>
                  {bookmarkedSess.length === 0 ? (
                    <View
                      style={{
                        alignItems: "center",
                        paddingVertical: 32,
                        gap: 8,
                      }}
                    >
                      <Ionicons
                        name="bookmark-outline"
                        size={28}
                        color="#9ca3af"
                      />
                      <Text style={{ color: "#9ca3af", fontSize: 13 }}>
                        No bookmarks yet
                      </Text>
                    </View>
                  ) : (
                    <FlatList
                      data={bookmarkedSess}
                      keyExtractor={(item) => item.id}
                      renderItem={({ item }) => <SesCard item={item} />}
                      scrollEnabled={false}
                      contentContainerStyle={{ gap: 12 }}
                    />
                  )}
                </View>
              )}
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {showBirthGenderModal && (
        <BirthDateGenderModal
          visible={showBirthGenderModal}
          onDismiss={() => setShowBirthGenderModal(false)}
          onConfirm={handleBirthGenderConfirm}
        />
      )}
    </ThemedView>
  );
}