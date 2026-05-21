import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/utils/supabase";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function UsernameSetup() {
  const { session } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const checkTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 60,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleChange = (text: string) => {
    const cleaned = text.toLowerCase().replace(/[^a-z0-9_.]/g, "");
    setUsername(cleaned);
    setAvailable(null);

    if (checkTimeout.current) clearTimeout(checkTimeout.current);
    if (cleaned.length < 3) return;

    setChecking(true);
    checkTimeout.current = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", cleaned)
        .maybeSingle();

      setAvailable(!data);
      setChecking(false);
    }, 500);
  };

  const handleSave = async () => {
    if (!username || username.length < 3) {
      shake();
      Alert.alert("Too short", "Username must be at least 3 characters.");
      return;
    }
    if (available === false) {
      shake();
      Alert.alert("Taken", "That username is already taken.");
      return;
    }
    if (!session?.user) return;

    setSaving(true);

    const meta = session.user.user_metadata;
    const googleAvatar = meta?.avatar_url ?? meta?.picture ?? null;
    const googleName = meta?.full_name ?? meta?.name ?? null;

    const { error } = await supabase.from("profiles").upsert({
      id: session.user.id,
      username,
      avatar_url: googleAvatar,
      full_name: googleName,
      updated_at: new Date().toISOString(),
    });

    setSaving(false);

    if (error) {
      Alert.alert("Error", "Could not save username.");
      return;
    }

    router.replace("/");
  };

  const isValid = username.length >= 3 && available === true;

  const statusText = () => {
    if (username.length === 0) return null;
    if (username.length < 3)
      return { text: "Min 3 characters", color: "text-neutral-400" };
    if (checking) return { text: "Checking...", color: "text-neutral-400" };
    if (available === true)
      return { text: "Available ✓", color: "text-green-500" };
    if (available === false)
      return { text: "Already taken", color: "text-red-500" };
    return null;
  };

  const status = statusText();

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="flex-1 px-8 justify-between pb-12 pt-16">
        <View className="gap-2">
          <Text className="text-3xl font-bold tracking-tight text-black">
            Pick a username
          </Text>
          <Text className="text-neutral-400 text-base leading-relaxed">
            This is how others will see you on Ses. You can change it later.
          </Text>
        </View>

        <Animated.View
          className="gap-3"
          style={{ transform: [{ translateX: shakeAnim }] }}
        >
          <View className="border border-neutral-200 rounded-2xl px-4 py-3 flex-row items-center">
            <Text className="text-neutral-400 text-base mr-1">@</Text>
            <TextInput
              value={username}
              onChangeText={handleChange}
              placeholder="yourname"
              placeholderTextColor="#a3a3a3"
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={24}
              className="flex-1 text-base font-medium text-black"
            />
            {checking && <ActivityIndicator size="small" color="#a3a3a3" />}
          </View>

          {status && (
            <Text className={`text-xs pl-1 ${status.color}`}>
              {status.text}
            </Text>
          )}

          <Text className="text-xs text-neutral-400 pl-1">
            Only letters, numbers, dots and underscores.
          </Text>
        </Animated.View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={!isValid || saving}
          activeOpacity={0.85}
          className={`py-4 rounded-2xl items-center ${
            isValid && !saving ? "bg-black" : "bg-neutral-200"
          }`}
        >
          {saving ? (
            <ActivityIndicator color={isValid ? "#fff" : "#a3a3a3"} />
          ) : (
            <Text
              className={`font-semibold text-base ${isValid ? "text-white" : "text-neutral-400"}`}
            >
              Continue
            </Text>
          )}
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}
