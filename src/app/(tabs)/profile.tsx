import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/utils/supabase";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Profile() {
  const { session, signOut } = useAuth();

  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const avatarScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
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

    if (session?.user) loadProfile();
  }, [session]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", session!.user.id)
      .single();

    if (data) {
      setUsername(data.username ?? "");
      setAvatarUrl(data.avatar_url ?? null);
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
    Alert.alert("Sign out", "You sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: signOut },
    ]);
  };

  const googleName = session?.user?.user_metadata?.full_name ?? "";
  const googleAvatar = session?.user?.user_metadata?.avatar_url ?? null;
  const displayAvatar = avatarUrl || googleAvatar;
  const displayName = username || googleName || "No name yet";
  const email = session?.user?.email ?? "";

  return (
    <ThemedView className="flex-1 items-center">
      <SafeAreaView className="flex-1 w-full max-w-xl px-4 pb-24">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <Animated.View
            className="flex-1 items-center justify-center gap-3"
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <Animated.View style={{ transform: [{ scale: avatarScale }] }}>
              <TouchableOpacity
                onPress={pickAvatar}
                activeOpacity={0.8}
                className="relative mb-2"
              >
                {displayAvatar ? (
                  <Image
                    source={{ uri: displayAvatar }}
                    className="w-24 h-24 rounded-full"
                  />
                ) : (
                  <View className="w-24 h-24 rounded-full bg-neutral-100 dark:bg-neutral-900 items-center justify-center">
                    <ThemedText className="text-4xl font-semibold">
                      {(username || googleName || email)
                        .charAt(0)
                        .toUpperCase()}
                    </ThemedText>
                  </View>
                )}

                <View className="absolute bottom-0.5 right-0.5 w-6 h-6 rounded-full bg-black dark:bg-white items-center justify-center">
                  {avatarUploading ? (
                    <ActivityIndicator size={10} color="white" />
                  ) : (
                    <ThemedText className="text-white dark:text-black text-xs font-bold">
                      ✎
                    </ThemedText>
                  )}
                </View>
              </TouchableOpacity>
            </Animated.View>

            <View className="items-center">
              {editing ? (
                <View className="flex-row items-center gap-2">
                  <TextInput
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Your name"
                    placeholderTextColor="#9ca3af"
                    autoFocus
                    className="border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white rounded-xl px-3 py-2 text-base font-medium min-w-40"
                  />
                  <TouchableOpacity
                    onPress={saveUsername}
                    disabled={saving}
                    activeOpacity={0.8}
                    className="bg-black dark:bg-white px-3 py-2.5 rounded-xl"
                  >
                    {saving ? (
                      <ActivityIndicator size={14} color="white" />
                    ) : (
                      <ThemedText className="text-white dark:text-black text-sm font-semibold">
                        Save
                      </ThemedText>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <Pressable
                  onPress={() => setEditing(true)}
                  className="items-center gap-0.5"
                >
                  <ThemedText className="text-[22px] font-bold tracking-tight">
                    {displayName}
                  </ThemedText>
                  <ThemedText className="text-xs text-neutral-400">
                    tap to edit
                  </ThemedText>
                </Pressable>
              )}
            </View>

            <ThemedText className="text-sm text-neutral-400">
              {email}
            </ThemedText>

            <View className="h-px bg-neutral-100 dark:bg-neutral-900 self-stretch my-4" />

            <TouchableOpacity
              onPress={handleSignOut}
              activeOpacity={0.7}
              className="border border-neutral-200 dark:border-neutral-800 rounded-xl px-6 py-3"
            >
              <ThemedText className="text-sm font-medium text-neutral-400">
                Sign out
              </ThemedText>
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}
