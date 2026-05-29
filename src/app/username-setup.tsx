import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/utils/supabase";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
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
    if (!session?.user) {
      Alert.alert("Error", "No active session. Please sign in again.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("profiles").upsert(
      {
        id: session.user.id,
        username,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    setSaving(false);

    if (error) {
      console.error(
        "[UsernameSetup] Supabase error:",
        JSON.stringify(error, null, 2),
      );
      Alert.alert(
        "Error",
        `Could not save username.\n\nCode: ${error.code}\n${error.message}`,
      );
      return;
    }

    await supabase
      .from("profiles")
      .select("username")
      .eq("id", session.user.id)
      .maybeSingle();
    router.replace("/");
  };

  const isValid = username.length >= 3 && available === true;

  const statusText = () => {
    if (username.length === 0) return null;
    if (username.length < 3)
      return { text: "Min 3 characters", color: "#a3a3a3" };
    if (checking) return { text: "Checking...", color: "#a3a3a3" };
    if (available === true) return { text: "✓ Available", color: "#22c55e" };
    if (available === false) return { text: "Already taken", color: "#ef4444" };
    return null;
  };

  const status = statusText();

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <SafeAreaView
        style={{
          flex: 1,
          paddingHorizontal: 32,
          justifyContent: "space-between",
          paddingBottom: 48,
          paddingTop: 64,
        }}
      >
        <View style={{ gap: 8 }}>
          <Text
            style={{
              fontSize: 28,
              fontWeight: "700",
              letterSpacing: -0.5,
              color: "#111",
            }}
          >
            Pick a username
          </Text>
          <Text style={{ color: "#a3a3a3", fontSize: 15, lineHeight: 22 }}>
            This is how others will see you. You can change it later.
          </Text>
        </View>

        <Animated.View
          style={{ gap: 10, transform: [{ translateX: shakeAnim }] }}
        >
          <View
            style={{
              borderWidth: 1.5,
              borderColor:
                available === true
                  ? "#22c55e"
                  : available === false
                    ? "#ef4444"
                    : "#e5e5e5",
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 14,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#fafafa",
            }}
          >
            <Text style={{ color: "#a3a3a3", fontSize: 16, marginRight: 4 }}>
              @
            </Text>
            <TextInput
              value={username}
              onChangeText={handleChange}
              placeholder="yourname"
              placeholderTextColor="#c4c4c4"
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={24}
              style={{
                flex: 1,
                fontSize: 16,
                fontWeight: "500",
                color: "#111",
              }}
            />
            {checking && <ActivityIndicator size="small" color="#a3a3a3" />}
            {!checking && available === true && (
              <Text style={{ color: "#22c55e", fontSize: 18 }}>✓</Text>
            )}
            {!checking && available === false && (
              <Text style={{ color: "#ef4444", fontSize: 18 }}>✕</Text>
            )}
          </View>

          {status && (
            <Text style={{ fontSize: 12, paddingLeft: 4, color: status.color }}>
              {status.text}
            </Text>
          )}

          <Text style={{ fontSize: 12, color: "#c4c4c4", paddingLeft: 4 }}>
            Letters, numbers, dots and underscores only.
          </Text>
        </Animated.View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={!isValid || saving}
          activeOpacity={0.85}
          style={{
            paddingVertical: 17,
            borderRadius: 16,
            alignItems: "center",
            backgroundColor: isValid && !saving ? "#111" : "#f0f0f0",
          }}
        >
          {saving ? (
            <ActivityIndicator color={isValid ? "#fff" : "#a3a3a3"} />
          ) : (
            <Text
              style={{
                fontWeight: "600",
                fontSize: 16,
                color: isValid ? "#fff" : "#c4c4c4",
              }}
            >
              Continue
            </Text>
          )}
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}
