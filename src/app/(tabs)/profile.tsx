import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAuth } from "@/hooks/useAuth";
import { useProfileStore, useUserActivityStore } from "@/stores";
import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
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
  const { session, signOut } = useAuth();
  const { fetchBookmarks } = useProfileStore();
  const { fetchBookmarkedSess } = useUserActivityStore();

  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [stats, setStats] = useState({
    published: 0,
    voted: 0,
    followers: 0,
    following: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [followingUsers, setFollowingUsers] = useState<
    { id: string; username: string | null; avatar_url: string | null }[]
  >([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const avatarScale = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    React.useCallback(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 80,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();

      if (session?.user) {
        loadProfileAndStats();
        fetchBookmarks(session.user.id);
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
        .select("username, avatar_url")
        .eq("id", session.user.id)
        .single();

      if (profileData) {
        setUsername(profileData.username ?? "");
        setAvatarUrl(profileData.avatar_url ?? null);
      }

      const [
        publishedRes,
        votedRes,
        followersRes,
        followingRes,
        followingUsersRes,
      ] = await Promise.all([
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
          .eq("following_id", session.user.id),

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
        followers: followersRes.count ?? 0,
        following: followingRes.count ?? 0,
      });

      const followingIds = (followingUsersRes.data ?? [])
        .map((r: any) => r.following_id)
        .filter(Boolean);

      let mappedFollowing: { id: string; username: string | null; avatar_url: string | null }[] = [];
      if (followingIds.length > 0) {
        const { data: followingProfiles } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", followingIds);
        mappedFollowing = followingProfiles ?? [];
      }
      setFollowingUsers(mappedFollowing);
    } catch (error) {
      console.error("Error loading profile:", error);
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

  const pickAvatar = async () => {
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
      toValue: 0.92,
      useNativeDriver: true,
    }).start();

    try {
      const uri = result.assets[0].uri;
      const ext = uri.split(".").pop();
      const fileName = `${session!.user.id}.${ext}`;
      const formData = new FormData();
      formData.append("file", {
        uri,
        name: fileName,
        type: `image/${ext}`,
      } as any);

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, formData, { upsert: true });

      if (uploadError) throw uploadError;

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

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to leave?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: signOut },
    ]);
  };

  const googleName = session?.user?.user_metadata?.full_name ?? "";
  const googleAvatar = session?.user?.user_metadata?.avatar_url ?? null;
  const displayAvatar = avatarUrl || googleAvatar;
  const displayName = username || googleName || "Anonymous";
  const email = session?.user?.email ?? "";
  const initial = displayName.charAt(0).toUpperCase();
  const userSegment = username.trim() || session?.user?.id || "profile";

  return (
    <ThemedView className="flex-1">
      <SafeAreaView className="flex-1 w-full" edges={["top", "left", "right"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-900">
            <ThemedText className="text-base font-black tracking-widest uppercase text-black dark:text-white">
              Profile
            </ThemedText>
            <Pressable
              onPress={handleSignOut}
              className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/20 items-center justify-center active:opacity-70"
            >
              <Ionicons name="log-out-outline" size={16} color="#ef4444" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 16 }}
          >
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
                gap: 16,
              }}
            >
              {/* ── Avatar + name hero ── */}
              <View className="bg-neutral-100 dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800">
                <View className="items-center gap-4">
                  <Animated.View
                    style={{ transform: [{ scale: avatarScale }] }}
                  >
                    <Pressable
                      onPress={pickAvatar}
                      className="relative active:opacity-80"
                    >
                      {displayAvatar ? (
                        <Image
                          source={{ uri: displayAvatar }}
                          className="w-24 h-24 rounded-full"
                        />
                      ) : (
                        <View className="w-24 h-24 rounded-full bg-neutral-200 dark:bg-neutral-800 items-center justify-center">
                          <ThemedText className="text-4xl font-black text-neutral-500 dark:text-neutral-400">
                            {initial}
                          </ThemedText>
                        </View>
                      )}
                      <View className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-black dark:bg-white items-center justify-center border-2 border-neutral-100 dark:border-neutral-900">
                        {avatarUploading ? (
                          <ActivityIndicator size={12} color="white" />
                        ) : (
                          <Ionicons
                            name="camera"
                            size={13}
                            color={Platform.OS === "ios" ? "white" : "black"}
                          />
                        )}
                      </View>
                    </Pressable>
                  </Animated.View>

                  {editing ? (
                    <View className="w-full gap-2">
                      <TextInput
                        value={username}
                        onChangeText={setUsername}
                        placeholder="Your username"
                        placeholderTextColor="#9ca3af"
                        autoFocus
                        className="border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-black dark:text-white rounded-xl px-4 py-3 text-base font-medium text-center"
                      />
                      <View className="flex-row gap-2">
                        <TouchableOpacity
                          onPress={saveUsername}
                          activeOpacity={0.75}
                          style={{
                            flex: 1,
                            height: 40,
                            borderRadius: 999,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "#000",
                          }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>
                            {saving ? "Saving..." : "Save"}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setEditing(false)}
                          activeOpacity={0.75}
                          style={{
                            flex: 1,
                            height: 40,
                            borderRadius: 999,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "transparent",
                            borderWidth: 1.5,
                            borderColor: "#d1d5db",
                          }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: "700", color: "#6b7280" }}>
                            Cancel
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View className="items-center gap-1">
                      <View className="flex-row items-center gap-2">
                        <ThemedText className="text-2xl font-black tracking-tight">
                          {displayName}
                        </ThemedText>
                        <Pressable
                          onPress={() => setEditing(true)}
                          className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-800 items-center justify-center active:opacity-70"
                        >
                          <Ionicons name="pencil" size={12} color="#9ca3af" />
                        </Pressable>
                      </View>
                      <ThemedText className="text-sm text-neutral-400 dark:text-neutral-500">
                        {email}
                      </ThemedText>
                    </View>
                  )}
                </View>
              </View>

              <View className="flex-row gap-3">
                <Pressable
                  onPress={() =>
                    router.push(`/${userSegment}/followers` as any)
                  }
                  className="flex-1 bg-neutral-100 dark:bg-neutral-900 rounded-2xl p-4 items-center border border-neutral-200 dark:border-neutral-800 active:opacity-70"
                >
                  {loadingStats ? (
                    <ActivityIndicator size="small" color="#9ca3af" />
                  ) : (
                    <ThemedText className="text-2xl font-black tracking-tight text-neutral-900 dark:text-neutral-50">
                      {stats.followers}
                    </ThemedText>
                  )}
                  <ThemedText className="text-[11px] text-neutral-500 font-bold uppercase tracking-wider mt-1">
                    Followers
                  </ThemedText>
                </Pressable>

                <Pressable
                  onPress={() =>
                    router.push(`/${userSegment}/following` as any)
                  }
                  className="flex-1 bg-neutral-100 dark:bg-neutral-900 rounded-2xl p-4 items-center border border-neutral-200 dark:border-neutral-800 active:opacity-70"
                >
                  {loadingStats ? (
                    <ActivityIndicator size="small" color="#9ca3af" />
                  ) : (
                    <ThemedText className="text-2xl font-black tracking-tight text-neutral-900 dark:text-neutral-50">
                      {stats.following}
                    </ThemedText>
                  )}
                  <ThemedText className="text-[11px] text-neutral-500 font-bold uppercase tracking-wider mt-1">
                    Following
                  </ThemedText>
                </Pressable>
              </View>

              <View className="bg-neutral-100 dark:bg-neutral-900 rounded-3xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
                <Pressable
                  onPress={() => router.push(`/${userSegment}/sess` as any)}
                  className="flex-row items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800 active:opacity-70"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 items-center justify-center">
                      <Ionicons name="grid-outline" size={14} color="#3b82f6" />
                    </View>
                    <ThemedText className="text-base font-medium">
                      My Sess
                    </ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                </Pressable>

                <Pressable
                  onPress={() => router.push(`/${userSegment}/votes` as any)}
                  className="flex-row items-center justify-between p-4 active:opacity-70"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 items-center justify-center">
                      <Ionicons
                        name="stats-chart-outline"
                        size={14}
                        color="#8b5cf6"
                      />
                    </View>
                    <ThemedText className="text-base font-medium">
                      My Votes
                    </ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                </Pressable>
              </View>

              {followingUsers.length > 0 && (
                <View className="gap-3">
                  <ThemedText className="text-xs font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 px-1">
                    Following
                  </ThemedText>
                  <View className="bg-neutral-100 dark:bg-neutral-900 rounded-3xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
                    {followingUsers.map((user, index) => {
                      const name = user.username ?? "Unknown";
                      const initial = name.charAt(0).toUpperCase();
                      return (
                        <TouchableOpacity
                          key={user.id}
                          activeOpacity={0.7}
                          onPress={() =>
                            router.push(`/${user.username}/page` as any)
                          }
                          className={`flex-row items-center gap-3 p-4 active:opacity-70 ${
                            index < followingUsers.length - 1
                              ? "border-b border-neutral-200 dark:border-neutral-800"
                              : ""
                          }`}
                        >
                          {user.avatar_url ? (
                            <Image
                              source={{ uri: user.avatar_url }}
                              className="w-9 h-9 rounded-full"
                            />
                          ) : (
                            <View className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-800 items-center justify-center">
                              <Text className="text-sm font-black text-neutral-500 dark:text-neutral-400">
                                {initial}
                              </Text>
                            </View>
                          )}
                          <ThemedText className="text-sm font-semibold flex-1">
                            {name}
                          </ThemedText>
                          <Ionicons
                            name="chevron-forward"
                            size={16}
                            color="#9ca3af"
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}
