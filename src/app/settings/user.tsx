import BirthDateGenderModal from "@/components/modals/birth-gender";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
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

const GEO_REMIND_KEY = "@geo_remind_later_ts";
const REMIND_DELAY_MS = 3 * 24 * 60 * 60 * 1000;
const OK_HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

const INTERESTS = [
  { id: "tech", label: "Tech", emoji: "💻" },
  { id: "science", label: "Science", emoji: "🔬" },
  { id: "sports", label: "Sports", emoji: "⚽" },
  { id: "gaming", label: "Gaming", emoji: "🎮" },
  { id: "music", label: "Music", emoji: "🎵" },
  { id: "finance", label: "Finance", emoji: "📈" },
  { id: "politics", label: "Politics", emoji: "🗳️" },
  { id: "food", label: "Food", emoji: "🍕" },
  { id: "travel", label: "Travel", emoji: "✈️" },
  { id: "health", label: "Health", emoji: "💪" },
  { id: "crypto", label: "Crypto", emoji: "₿" },
  { id: "art", label: "Art", emoji: "🎨" },
];

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "tr", label: "Türkçe" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "ru", label: "Русский" },
  { code: "ar", label: "العربية" },
  { code: "zh", label: "中文" },
  { code: "pt", label: "Português" },
  { code: "ja", label: "日本語" },
];

type LocationStatus = "unknown" | "granted" | "denied" | "remind_later";

function FieldLabel({ label }: { label: string }) {
  return (
    <Text className="text-[10px] font-bold text-neutral-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
      {label}
    </Text>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <Text className="text-[10px] font-bold text-neutral-400 dark:text-zinc-500 uppercase tracking-widest px-1 mb-2">
      {label}
    </Text>
  );
}

function LocationCard({
  status,
  cityName,
  loading,
  onAllow,
  onRemindLater,
}: {
  status: LocationStatus;
  cityName: string | null;
  loading: boolean;
  onAllow: () => void;
  onRemindLater: () => void;
}) {
  if (loading) {
    return (
      <View className="bg-white dark:bg-zinc-900 rounded-2xl border border-neutral-200/60 dark:border-zinc-800 p-5 items-center gap-2">
        <ActivityIndicator color="#3b82f6" />
        <Text className="text-xs text-neutral-400 dark:text-zinc-500 font-medium">
          Fetching your city...
        </Text>
      </View>
    );
  }

  if (status === "granted" && cityName) {
    return (
      <View className="bg-white dark:bg-zinc-900 rounded-2xl border border-neutral-200/60 dark:border-zinc-800 p-4 flex-row items-center gap-3">
        <View className="w-9 h-9 rounded-xl bg-emerald-500 items-center justify-center">
          <Ionicons name="location" size={16} color="#fff" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
            Location active
          </Text>
          <Text className="text-xs text-neutral-400 dark:text-zinc-500 mt-0.5">
            Showing as {cityName}
          </Text>
        </View>
        <View className="w-2 h-2 rounded-full bg-emerald-500" />
      </View>
    );
  }

  if (status === "denied") {
    return (
      <View className="bg-white dark:bg-zinc-900 rounded-2xl border border-neutral-200/60 dark:border-zinc-800 p-4 flex-row items-center gap-3">
        <View className="w-9 h-9 rounded-xl bg-red-500/10 items-center justify-center">
          <Ionicons name="location-outline" size={16} color="#ef4444" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
            Location denied
          </Text>
          <Text className="text-xs text-neutral-400 dark:text-zinc-500 mt-0.5">
            Enable it in device settings
          </Text>
        </View>
      </View>
    );
  }

  if (status === "remind_later") {
    return (
      <View className="bg-white dark:bg-zinc-900 rounded-2xl border border-neutral-200/60 dark:border-zinc-800 p-4 flex-row items-center gap-3">
        <View className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-zinc-800 items-center justify-center">
          <Ionicons name="time-outline" size={16} color="#a3a3a3" />
        </View>
        <Text className="text-sm font-medium text-neutral-500 dark:text-zinc-400 flex-1">
          We'll ask again in 3 days
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-white dark:bg-zinc-900 rounded-2xl border border-neutral-200/60 dark:border-zinc-800 overflow-hidden">
      <View className="p-4 gap-3">
        <View className="flex-row items-start gap-3">
          <View className="w-9 h-9 rounded-xl bg-blue-500/10 items-center justify-center mt-0.5">
            <Ionicons name="location-outline" size={16} color="#3b82f6" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
              Share Your City
            </Text>
            <Text className="text-xs text-neutral-400 dark:text-zinc-500 mt-1 leading-relaxed">
              City-level only. Never your exact address. Makes polls way more
              relevant fr.
            </Text>
          </View>
        </View>
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={onAllow}
            activeOpacity={0.8}
            className="flex-1 h-10 rounded-xl bg-blue-500 items-center justify-center"
          >
            <Text className="text-xs font-bold text-white">Allow</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onRemindLater}
            activeOpacity={0.8}
            className="flex-1 h-10 rounded-xl border border-neutral-200 dark:border-zinc-700 items-center justify-center"
          >
            <Text className="text-xs font-semibold text-neutral-500 dark:text-zinc-400">
              Later
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function formatBirthDate(isoDate: string | null): string {
  if (!isoDate) return "Not set";
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function UserSettings() {
  const router = useRouter();
  const { session } = useAuth();

  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("Male");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showBirthGenderModal, setShowBirthGenderModal] = useState(false);
  const [birthDate, setBirthDate] = useState<string | null>(null);

  const [interests, setInterests] = useState<string[]>([]);
  const [savingInterests, setSavingInterests] = useState(false);
  const [newInterest, setNewInterest] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [savingLanguages, setSavingLanguages] = useState(false);

  const [locationStatus, setLocationStatus] =
    useState<LocationStatus>("unknown");
  const [cityName, setCityName] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const avatarScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const googleAvatar = session?.user?.user_metadata?.avatar_url ?? null;
  const displayAvatar = avatarUrl || googleAvatar;
  const initial = (username || fullName || "U").charAt(0).toUpperCase();

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
    loadProfile();
    checkLocationStatus();
  }, []);

  const loadProfile = async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select(
          "username, avatar_url, full_name, birth_date, gender, city, interests, languages",
        )
        .eq("id", session.user.id)
        .single();

      if (data) {
        setUsername(data.username ?? "");
        setFullName(data.full_name ?? "");
        setAvatarUrl(data.avatar_url ?? null);
        setGender(data.gender ?? "Male");
        setBirthDate(data.birth_date ?? null);
        setInterests(data.interests ?? []);
        setLanguages(data.languages ?? []);
        if (data.city) {
          setCityName(data.city);
          setLocationStatus("granted");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const checkLocationStatus = async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === "granted") {
      setLocationStatus("granted");
      return;
    }
    if (status === "denied") {
      setLocationStatus("denied");
      return;
    }
    try {
      const remindTs = await AsyncStorage.getItem(GEO_REMIND_KEY);
      if (remindTs && Date.now() - parseInt(remindTs, 10) < REMIND_DELAY_MS) {
        setLocationStatus("remind_later");
        return;
      }
    } catch {}
    setLocationStatus("unknown");
  };

  const handleAllowLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationStatus("denied");
        return;
      }

      const coords = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });
      const [place] = await Location.reverseGeocodeAsync({
        latitude: coords.coords.latitude,
        longitude: coords.coords.longitude,
      });
      const city =
        place?.city || place?.subregion || place?.region || "Unknown City";

      setCityName(city);
      setLocationStatus("granted");

      if (session?.user?.id) {
        await supabase.from("profiles").upsert({
          id: session.user.id,
          city,
          updated_at: new Date().toISOString(),
        });
      }
    } catch {
      Alert.alert("Error", "Could not fetch location.");
    } finally {
      setLocationLoading(false);
    }
  };

  const handleRemindLater = async () => {
    try {
      await AsyncStorage.setItem(GEO_REMIND_KEY, String(Date.now()));
    } catch {}
    setLocationStatus("remind_later");
  };

  const toggleInterest = async (id: string) => {
    if (!session?.user?.id) return;
    const next = interests.includes(id)
      ? interests.filter((i) => i !== id)
      : interests.length < 6
        ? [...interests, id]
        : interests;
    setInterests(next);
    setSavingInterests(true);
    await supabase.from("profiles").upsert({
      id: session.user.id,
      interests: next,
      updated_at: new Date().toISOString(),
    });
    setSavingInterests(false);
  };

  const addCustomInterest = async () => {
    if (!newInterest.trim() || !session?.user?.id) return;
    const trimmed = newInterest.trim().toLowerCase();
    if (interests.includes(trimmed) || interests.length >= 6) return;

    const next = [...interests, trimmed];
    setInterests(next);
    setNewInterest("");
    setSavingInterests(true);
    await supabase.from("profiles").upsert({
      id: session.user.id,
      interests: next,
      updated_at: new Date().toISOString(),
    });
    setSavingInterests(false);
  };

  const toggleLanguage = async (code: string) => {
    if (!session?.user?.id) return;
    const next = languages.includes(code)
      ? languages.filter((l) => l !== code)
      : [...languages, code];
    setLanguages(next);
    setSavingLanguages(true);
    await supabase.from("profiles").upsert({
      id: session.user.id,
      languages: next,
      updated_at: new Date().toISOString(),
    });
    setSavingLanguages(false);
  };

  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert("Username required", "Can't be out here anonymous.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: session!.user.id,
      username: username.trim(),
      full_name: fullName.trim() || null,
      gender,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) Alert.alert("Error", "Save failed, try again.");
    else router.back();
  };

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo access to update avatar.");
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
      toValue: 0.94,
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
      Alert.alert("Error", "Avatar upload flopped.");
    } finally {
      setAvatarUploading(false);
      Animated.spring(avatarScale, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleBirthGenderConfirm = async ({
    birthDate: bd,
    gender: g,
  }: {
    birthDate: Date;
    gender: string;
  }) => {
    if (!session?.user?.id) return;
    const { error } = await supabase.from("profiles").upsert({
      id: session.user.id,
      birth_date: bd.toISOString().split("T")[0],
      gender: g,
      updated_at: new Date().toISOString(),
    });
    if (error) Alert.alert("Error", "Could not save.");
    else {
      setGender(g);
      setBirthDate(bd.toISOString().split("T")[0]);
    }
    setShowBirthGenderModal(false);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-neutral-50 dark:bg-zinc-950 items-center justify-center">
        <ActivityIndicator color="#a3a3a3" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-zinc-950">
      <SafeAreaView className="flex-1" edges={["top", "left", "right"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          <View className="flex-row items-center justify-between px-6 py-4 bg-neutral-50 dark:bg-zinc-950">
            <Pressable
              onPress={() => router.back()}
              hitSlop={OK_HIT_SLOP}
              className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-900 border border-neutral-200/60 dark:border-zinc-800 items-center justify-center active:opacity-70"
            >
              <Ionicons name="chevron-back" size={18} color="#a3a3a3" />
            </Pressable>
            <Text className="text-base font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              Edit Profile
            </Text>
            <TouchableOpacity
              onPress={handleSave}
              activeOpacity={0.8}
              disabled={saving}
              className="h-9 px-4 rounded-xl bg-[#27a3f1] items-center justify-center"
            >
              {saving ? (
                <ActivityIndicator size={12} color="#fff" />
              ) : (
                <Text className="text-xs font-bold text-white dark:text-neutral-100">
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 20, paddingBottom: 80 }}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View style={{ opacity: fadeAnim, gap: 24 }}>
              <View className="items-center gap-3">
                <Animated.View style={{ transform: [{ scale: avatarScale }] }}>
                  <Pressable
                    onPress={pickAvatar}
                    className="relative active:opacity-90"
                  >
                    {displayAvatar ? (
                      <Image
                        source={{ uri: displayAvatar }}
                        className="w-24 h-24 rounded-full"
                      />
                    ) : (
                      <View className="w-24 h-24 rounded-full bg-neutral-100 dark:bg-zinc-800 items-center justify-center">
                        <Text className="text-3xl font-black text-neutral-400 dark:text-zinc-500">
                          {initial}
                        </Text>
                      </View>
                    )}
                    <View className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-neutral-900 dark:bg-white items-center justify-center border-2 border-neutral-50 dark:border-zinc-950">
                      {avatarUploading ? (
                        <ActivityIndicator size={12} color="#fff" />
                      ) : (
                        <Ionicons
                          name="camera"
                          size={14}
                          color={Platform.OS === "ios" ? "white" : "black"}
                        />
                      )}
                    </View>
                  </Pressable>
                </Animated.View>
                <Text className="text-xs text-neutral-400 dark:text-zinc-500 font-medium">
                  Tap to change photo
                </Text>
              </View>

              <View className="gap-2">
                <SectionLabel label="Profile" />
                <View className="bg-white dark:bg-zinc-900 rounded-2xl border border-neutral-200/60 dark:border-zinc-800 overflow-hidden">
                  <View className="px-4 pt-4 pb-3 border-b border-neutral-100 dark:border-zinc-800/60">
                    <FieldLabel label="Username" />
                    <TextInput
                      value={username}
                      onChangeText={setUsername}
                      placeholder="your_handle"
                      placeholderTextColor="#a3a3a3"
                      maxLength={25}
                      autoCapitalize="none"
                      className="text-base font-bold text-neutral-900 dark:text-white p-0"
                    />
                  </View>
                  <View className="px-4 pt-4 pb-3">
                    <FieldLabel label="Display Name" />
                    <TextInput
                      value={fullName}
                      onChangeText={setFullName}
                      placeholder="Your name (optional)"
                      placeholderTextColor="#a3a3a3"
                      maxLength={40}
                      className="text-base font-semibold text-neutral-900 dark:text-white p-0"
                    />
                  </View>
                </View>
              </View>

              <View className="gap-2">
                <SectionLabel label="Gender" />
                <View className="bg-white dark:bg-zinc-900 rounded-2xl border border-neutral-200/60 dark:border-zinc-800 p-4">
                  <View className="flex-row gap-3">
                    {["Male", "Female"].map((item) => {
                      const selected = gender === item;
                      return (
                        <TouchableOpacity
                          key={item}
                          onPress={() => setGender(item)}
                          activeOpacity={0.8}
                          className={`flex-1 py-3 rounded-xl border items-center ${
                            selected
                              ? "bg-neutral-900 border-neutral-900 dark:bg-white dark:border-white"
                              : "bg-neutral-50 border-neutral-200/60 dark:bg-zinc-800 dark:border-zinc-700"
                          }`}
                        >
                          <Text
                            className={`text-sm font-bold ${
                              selected
                                ? "text-white dark:text-zinc-950"
                                : "text-neutral-500 dark:text-zinc-400"
                            }`}
                          >
                            {item}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

              <View className="gap-2">
                <SectionLabel label="Demographics" />
                <Pressable
                  onPress={() => setShowBirthGenderModal(true)}
                  className="bg-white dark:bg-zinc-900 rounded-2xl border border-neutral-200/60 dark:border-zinc-800 px-4 py-3.5 flex-row items-center justify-between active:opacity-80"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-8 h-8 rounded-xl bg-purple-500/10 items-center justify-center">
                      <Ionicons
                        name="calendar-outline"
                        size={15}
                        color="#a855f7"
                      />
                    </View>
                    <View>
                      <Text className="text-xs text-neutral-400 dark:text-zinc-500 font-medium">
                        Birth Date
                      </Text>
                      <Text className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mt-0.5">
                        {formatBirthDate(birthDate)}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color="#a3a3a3" />
                </Pressable>
              </View>

              <View className="gap-2">
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 10,
                  }}
                >
                  <SectionLabel label="Interests" />
                  <Text style={{ fontSize: 11, color: "#9ca3af" }}>
                    {interests.length}/6
                  </Text>
                </View>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  {INTERESTS.map((item) => {
                    const active = interests.includes(item.id);
                    const maxed = !active && interests.length >= 6;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => toggleInterest(item.id)}
                        disabled={maxed || savingInterests}
                        activeOpacity={0.7}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 5,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 999,
                          backgroundColor: active ? "#111" : "#f3f4f6",
                          opacity: maxed ? 0.4 : 1,
                        }}
                      >
                        <Text style={{ fontSize: 13 }}>{item.emoji}</Text>
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "600",
                            color: active ? "#fff" : "#374151",
                          }}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View className="flex-row gap-2 mt-3">
                  <TextInput
                    value={newInterest}
                    onChangeText={setNewInterest}
                    placeholder="add custom vibe..."
                    placeholderTextColor="#a3a3a3"
                    className="flex-1 bg-white dark:bg-zinc-900 rounded-xl px-4 py-3 text-sm border border-neutral-200 dark:border-zinc-800"
                    onSubmitEditing={addCustomInterest}
                  />
                  <TouchableOpacity
                    onPress={addCustomInterest}
                    disabled={!newInterest.trim() || savingInterests}
                    className="h-12 px-6 bg-neutral-900 dark:bg-white rounded-xl items-center justify-center"
                  >
                    <Text className="text-xs font-bold text-white dark:text-zinc-950">
                      Add
                    </Text>
                  </TouchableOpacity>
                </View>
                {interests.length > 0 && (
                  <View className="flex-row flex-wrap gap-2 mt-2">
                    {interests.map((int, idx) => (
                      <View
                        key={idx}
                        className="bg-neutral-100 dark:bg-zinc-800 px-3 py-1 rounded-full flex-row items-center gap-1"
                      >
                        <Text className="text-xs text-neutral-700 dark:text-neutral-300">
                          #{int}
                        </Text>
                        <TouchableOpacity onPress={() => toggleInterest(int)}>
                          <Ionicons name="close" size={12} color="#9ca3af" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View className="gap-2">
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 10,
                  }}
                >
                  <SectionLabel label="Languages" />
                  {savingLanguages && (
                    <ActivityIndicator size={12} color="#9ca3af" />
                  )}
                </View>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  {LANGUAGES.map((lang) => {
                    const active = languages.includes(lang.code);
                    return (
                      <TouchableOpacity
                        key={lang.code}
                        onPress={() => toggleLanguage(lang.code)}
                        disabled={savingLanguages}
                        activeOpacity={0.7}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 999,
                          backgroundColor: active ? "#111" : "#f3f4f6",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "600",
                            color: active ? "#fff" : "#374151",
                          }}
                        >
                          {lang.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View className="gap-2">
                <SectionLabel label="Location" />
                <LocationCard
                  status={locationStatus}
                  cityName={cityName}
                  loading={locationLoading}
                  onAllow={handleAllowLocation}
                  onRemindLater={handleRemindLater}
                />
              </View>
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
    </View>
  );
}
