import { Colors } from "@/constants/theme";
import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { ThemedText } from "../themed-text";

export type Topic = {
  id: string;
  name: string;
  slug: string;
  emoji: string | null;
  category: string;
};

export function SectionLabel({ children }: { children: string }) {
  return (
    <ThemedText className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-2 mt-4">
      {children}
    </ThemedText>
  );
}

export function StarRating({
  value,
  onChange,
  isDark,
}: {
  value: number;
  onChange: (v: number) => void;
  isDark: boolean;
}) {
  return (
    <View className="flex-row gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          onPress={() => onChange(star)}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          className="active:opacity-70"
        >
          <Ionicons
            name={star <= value ? "star" : "star-outline"}
            size={28}
            color={star <= value ? "#f59e0b" : isDark ? "#404040" : "#d1d5db"}
          />
        </Pressable>
      ))}
    </View>
  );
}

export function TopicChip({
  topic,
  selected,
  onPress,
  isDark,
}: {
  topic: Topic;
  selected: boolean;
  onPress: () => void;
  isDark: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-1.5 px-3 py-2 rounded-full border active:opacity-80 ${
        selected
          ? "bg-black dark:bg-white border-black dark:border-white"
          : "bg-transparent border-neutral-200 dark:border-neutral-800"
      }`}
    >
      {topic.emoji ? <Text style={{ fontSize: 13 }}>{topic.emoji}</Text> : null}
      <Text
        className={`text-xs font-semibold ${
          selected
            ? "text-white dark:text-black"
            : "text-neutral-600 dark:text-neutral-400"
        }`}
      >
        {topic.name}
      </Text>
    </Pressable>
  );
}

const END_PRESETS: { label: string; value: number | null }[] = [
  { label: "No expiry", value: null },
  { label: "3d", value: 3 },
  { label: "7d", value: 7 },
  { label: "14d", value: 14 },
  { label: "30d", value: 30 },
];

export function EndDatePresets({
  selectedDays,
  onSelect,
}: {
  selectedDays: number | null;
  onSelect: (days: number | null) => void;
}) {
  const closeDate =
    selectedDays !== null
      ? new Date(Date.now() + selectedDays * 86400000).toLocaleDateString(
          "en-US",
          { month: "short", day: "numeric" },
        )
      : null;

  return (
    <View style={{ gap: 10 }}>
      <View className="flex-row flex-wrap gap-2">
        {END_PRESETS.map((p) => (
          <Pressable
            key={String(p.value)}
            onPress={() => onSelect(p.value)}
            style={({ pressed }) => [
              { transform: [{ scale: pressed ? 0.95 : 1 }] },
            ]}
            className={`px-4 py-2.5 rounded-full border ${
              selectedDays === p.value
                ? "bg-black border-black"
                : "bg-white border-neutral-200"
            }`}
          >
            <Text
              className={`text-xs font-black ${
                selectedDays === p.value ? "text-white" : "text-neutral-500"
              }`}
            >
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {closeDate && (
        <Text className="text-xs font-semibold text-sky-500 px-0.5">
          Closes on {closeDate}
        </Text>
      )}
    </View>
  );
}

function getQualityHints(
  question: string,
  description: string,
): { msg: string; color: string; icon: string }[] {
  const len = question.trim().length;
  const hasQ = question.trim().endsWith("?");
  const hints: { msg: string; color: string; icon: string }[] = [];

  if (len === 0) return hints;

  if (len < 10) {
    hints.push({
      msg: "Question too short",
      color: "#ef4444",
      icon: "warning-outline",
    });
  } else if (len < 20) {
    hints.push({
      msg: "Getting there...",
      color: "#f59e0b",
      icon: "ellipsis-horizontal-circle-outline",
    });
  }

  if (len >= 10 && !hasQ) {
    hints.push({
      msg: "Try ending with a ?",
      color: "#a3a3a3",
      icon: "help-circle-outline",
    });
  }

  if (len >= 20 && !description.trim()) {
    hints.push({
      msg: "Add context for better votes",
      color: "#a3a3a3",
      icon: "information-circle-outline",
    });
  }

  return hints;
}

export function QualityHints({
  question,
  description,
}: {
  question: string;
  description: string;
}) {
  const hints = getQualityHints(question, description);
  if (hints.length === 0) return null;

  return (
    <View className="gap-1.5 px-0.5 mt-1">
      {hints.map((h, i) => (
        <View key={i} className="flex-row items-center gap-2">
          <Ionicons name={h.icon as any} size={12} color={h.color} />
          <Text style={{ color: h.color }} className="text-xs font-semibold">
            {h.msg}
          </Text>
        </View>
      ))}
    </View>
  );
}

const CONFIDENCE_LABELS = [
  "",
  "Not sure at all",
  "Slightly sure",
  "Pretty sure",
  "Very sure",
  "100% certain",
];

export function PostVoteSheet({
  visible,
  sesId,
  userId,
  isDark,
  colors,
  onDone,
}: {
  visible: boolean;
  sesId: string;
  userId: string;
  isDark: boolean;
  colors: (typeof Colors)["light"];
  onDone: () => void;
}) {
  const [confidence, setConfidence] = useState(0);
  const [opinion, setOpinion] = useState("");
  const [saving, setSaving] = useState(false);
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 22,
        stiffness: 180,
        useNativeDriver: Platform.OS !== "web",
      }).start();
    } else {
      slideAnim.setValue(300);
    }
  }, [visible]);

  const handleSave = async () => {
    if (confidence === 0 && !opinion.trim()) {
      onDone();
      return;
    }
    setSaving(true);
    try {
      await supabase
        .from("ses")
        .update({
          ...(confidence > 0 && { creator_confidence: confidence }),
          ...(opinion.trim() && { creator_prediction: opinion.trim() }),
        })
        .eq("id", sesId)
        .eq("created_by", userId);
    } catch {
    } finally {
      setSaving(false);
      onDone();
    }
  };

  if (!visible) return null;

  if (Platform.OS === "web") {
    return (
      <View
        style={{
          position: "fixed" as any,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          zIndex: 9999,
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          style={{ position: "absolute" as any, inset: 0 }}
          onPress={onDone}
        />
        <View
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 40,
            maxWidth: 600,
            width: "100%",
            alignSelf: "center",
          }}
        >
          <SheetContent
            confidence={confidence}
            setConfidence={setConfidence}
            opinion={opinion}
            setOpinion={setOpinion}
            saving={saving}
            isDark={isDark}
            colors={colors}
            onDone={onDone}
            onSave={handleSave}
          />
        </View>
      </View>
    );
  }

  return (
    <Modal transparent animationType="none" visible={visible}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
        onPress={onDone}
      >
        <Animated.View
          style={[
            {
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: "#fff",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 40,
            },
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Pressable>
            <SheetContent
              confidence={confidence}
              setConfidence={setConfidence}
              opinion={opinion}
              setOpinion={setOpinion}
              saving={saving}
              isDark={isDark}
              colors={colors}
              onDone={onDone}
              onSave={handleSave}
            />
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function SheetContent({
  confidence,
  setConfidence,
  opinion,
  setOpinion,
  saving,
  isDark,
  colors,
  onDone,
  onSave,
}: {
  confidence: number;
  setConfidence: (v: number) => void;
  opinion: string;
  setOpinion: (v: string) => void;
  saving: boolean;
  isDark: boolean;
  colors: (typeof Colors)["light"];
  onDone: () => void;
  onSave: () => void;
}) {
  return (
    <>
      <View
        style={{
          width: 40,
          height: 4,
          borderRadius: 2,
          backgroundColor: "#e5e5e5",
          alignSelf: "center",
          marginBottom: 20,
        }}
      />
      <ThemedText className="text-lg font-bold tracking-tight mb-1">
        Your prediction 🎯
      </ThemedText>
      <ThemedText className="text-sm text-neutral-400 mb-5">
        Optional — lock in your take before the results roll in.
      </ThemedText>

      <SectionLabel>How confident are you?</SectionLabel>
      <View className="mb-5">
        <StarRating
          value={confidence}
          onChange={setConfidence}
          isDark={isDark}
        />
        {confidence > 0 && (
          <ThemedText className="text-xs text-neutral-400 mt-2">
            {CONFIDENCE_LABELS[confidence]}
          </ThemedText>
        )}
      </View>

      <SectionLabel>What outcome do you predict?</SectionLabel>
      <TextInput
        value={opinion}
        onChangeText={setOpinion}
        placeholder="I think the result will be... (optional)"
        placeholderTextColor={colors.textSecondary}
        multiline
        maxLength={500}
        className="border border-neutral-200 bg-neutral-50 text-black rounded-2xl px-4 py-3 text-sm"
        style={{ minHeight: 80, textAlignVertical: "top" }}
      />
      <ThemedText className="text-xs text-neutral-400 text-right mt-1 mb-5">
        {opinion.length}/500
      </ThemedText>

      <View className="flex-row gap-3">
        <Pressable
          onPress={onDone}
          className="flex-1 py-3.5 rounded-2xl items-center border border-neutral-200 active:opacity-70"
        >
          <Text className="text-sm font-semibold text-neutral-500">Skip</Text>
        </Pressable>
        <Pressable
          onPress={onSave}
          disabled={saving}
          className="flex-1 py-3.5 rounded-2xl items-center bg-black active:opacity-90"
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text className="text-sm font-semibold text-white">Save</Text>
          )}
        </Pressable>
      </View>
    </>
  );
}
