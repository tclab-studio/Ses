import { ProfileBookmarks } from "@/components/profile-bookmarks";
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
  TextInput,
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
  const [showBookmarks, setShowBookmarks] = useState(false);

  const [stats, setStats] = useState({ published: 0, voted: 0, saved: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

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

      const [publishedRes, votedRes, savedRes] = await Promise.all([
        supabase
          .from("ses")
          .select("*", { count: "exact", head: true })
          .eq("created_by", session.user.id),

        supabase
          .from("ses_votes")
          .select("*", { count: "exact", head: true })
          .eq("user_id", session.user.id),

        supabase
          .from("bookmarks")
          .select("*", { count: "exact", head: true })
          .eq("user_id", session.user.id),
      ]);

      setStats({
        published: publishedRes.count || 0,
        voted: votedRes.count || 0,
        saved: savedRes.count || 0,
      });
    } catch (error) {
      console.error("Error loading profile metrics:", error);
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
          <View className="items-center justify-center py-4 border-b border-neutral-100 dark:border-neutral-900">
            <ThemedText className="text-base font-bold tracking-widest text-black dark:text-white">
              Profile
            </ThemedText>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 24 }}
          >
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
                gap: 24,
              }}
            >
              {/* Profile Card */}
              <View className="bg-neutral-100 dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-200 dark:border-neutral-800">
                <View className="flex-row items-center gap-4">
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
                          className="w-20 h-20 rounded-full"
                        />
                      ) : (
                        <View className="w-20 h-20 rounded-full bg-neutral-200 dark:bg-neutral-800 items-center justify-center">
                          <ThemedText className="text-3xl font-bold text-neutral-500 dark:text-neutral-400">
                            {initial}
                          </ThemedText>
                        </View>
                      )}

                      <View className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-black dark:bg-white items-center justify-center border-2 border-neutral-100 dark:border-neutral-900">
                        {avatarUploading ? (
                          <ActivityIndicator size={12} color="white" />
                        ) : (
                          <Ionicons
                            name="camera"
                            size={12}
                            color={Platform.OS === "ios" ? "white" : "black"}
                          />
                        )}
                      </View>
                    </Pressable>
                  </Animated.View>

                  <View className="flex-1 justify-center">
                    {editing ? (
                      <View className="gap-2">
                        <TextInput
                          value={username}
                          onChangeText={setUsername}
                          placeholder="Your username"
                          placeholderTextColor="#9ca3af"
                          autoFocus
                          className="border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-black dark:text-white rounded-xl px-3 py-2 text-base font-medium"
                        />
                        <View className="flex-row gap-2">
                          <Pressable
                            onPress={saveUsername}
                            disabled={saving}
                            className="bg-black dark:bg-white px-4 py-2 rounded-xl active:opacity-80 flex-1 items-center"
                          >
                            {saving ? (
                              <ActivityIndicator size={16} color="white" />
                            ) : (
                              <ThemedText className="text-white dark:text-black text-xs font-bold">
                                Save
                              </ThemedText>
                            )}
                          </Pressable>
                          <Pressable
                            onPress={() => setEditing(false)}
                            className="bg-neutral-200 dark:bg-neutral-800 px-4 py-2 rounded-xl active:opacity-80 flex-1 items-center"
                          >
                            <ThemedText className="text-black dark:text-white text-xs font-bold">
                              Cancel
                            </ThemedText>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <View className="gap-1">
                        <View className="flex-row items-center justify-between">
                          <ThemedText className="text-xl font-bold tracking-tight">
                            {displayName}
                          </ThemedText>
                          <Pressable
                            onPress={() => setEditing(true)}
                            className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-800 items-center justify-center active:opacity-70"
                          >
                            <Ionicons name="pencil" size={14} color="#9ca3af" />
                          </Pressable>
                        </View>
                        <ThemedText className="text-sm text-neutral-500 dark:text-neutral-400">
                          {email}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Stats Section */}
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => router.push(`/${userSegment}/sess` as any)}
                  className="flex-1 bg-neutral-100 dark:bg-neutral-900 rounded-2xl p-4 items-center justify-center border border-neutral-200 dark:border-neutral-800 active:opacity-70"
                >
                  <Ionicons
                    name="paper-plane-outline"
                    size={16}
                    color="#9ca3af"
                    className="mb-1"
                  />
                  {loadingStats ? (
                    <ActivityIndicator size="small" color="#9ca3af" />
                  ) : (
                    <ThemedText className="text-2xl font-black tracking-tight text-neutral-900 dark:text-neutral-50">
                      {stats.published}
                    </ThemedText>
                  )}
                  <ThemedText className="text-[11px] text-neutral-500 font-bold uppercase tracking-wider mt-1">
                    Publishes
                  </ThemedText>
                </Pressable>

                <Pressable
                  onPress={() => router.push(`/${userSegment}/votes` as any)}
                  className="flex-1 bg-neutral-100 dark:bg-neutral-900 rounded-2xl p-4 items-center justify-center border border-neutral-200 dark:border-neutral-800 active:opacity-70"
                >
                  <Ionicons
                    name="checkmark-done-outline"
                    size={16}
                    color="#9ca3af"
                    className="mb-1"
                  />
                  {loadingStats ? (
                    <ActivityIndicator size="small" color="#9ca3af" />
                  ) : (
                    <ThemedText className="text-2xl font-black tracking-tight text-neutral-900 dark:text-neutral-50">
                      {stats.voted}
                    </ThemedText>
                  )}
                  <ThemedText className="text-[11px] text-neutral-500 font-bold uppercase tracking-wider mt-1">
                    Votes
                  </ThemedText>
                </Pressable>
              </View>

              <View className="bg-neutral-100 dark:bg-neutral-900 rounded-3xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
                <Pressable
                  onPress={() => setShowBookmarks(!showBookmarks)}
                  className="flex-row items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800 active:opacity-70"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-8 h-8 rounded-full bg-black dark:bg-white items-center justify-center">
                      <Ionicons
                        name="bookmark"
                        size={14}
                        color={Platform.OS === "ios" ? "white" : "black"}
                      />
                    </View>
                    <ThemedText className="text-base font-medium">
                      My Bookmarks
                    </ThemedText>
                  </View>
                  <Ionicons
                    name={showBookmarks ? "chevron-down" : "chevron-forward"}
                    size={20}
                    color="#9ca3af"
                  />
                </Pressable>

                <Pressable
                  onPress={handleSignOut}
                  className="flex-row items-center justify-between p-4 active:opacity-70"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 items-center justify-center">
                      <Ionicons name="log-out" size={14} color="#ef4444" />
                    </View>
                    <ThemedText className="text-base font-medium text-red-500">
                      Sign Out
                    </ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </Pressable>
              </View>

              {showBookmarks && session?.user?.id && (
                <View className="mt-2">
                  <View className="mb-3 px-1">
                    <ThemedText className="text-sm font-bold uppercase tracking-wider text-neutral-400">
                      Saved Content
                    </ThemedText>
                  </View>
                  <ProfileBookmarks userId={session.user.id} />
                </View>
              )}
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}
