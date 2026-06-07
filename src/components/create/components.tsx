import { Colors } from "@/constants/theme";
import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
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
        useNativeDriver: true,
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

  return (
    <Modal transparent animationType="none" visible={visible}>
      <Pressable className="flex-1 bg-black/50" onPress={onDone}>
        <Animated.View
          style={{ transform: [{ translateY: slideAnim }] }}
          className="absolute bottom-0 left-0 right-0 bg-white dark:bg-neutral-950 rounded-t-3xl px-5 pt-5 pb-10"
        >
          <Pressable>
            <View className="w-10 h-1 rounded-full bg-neutral-200 dark:bg-neutral-800 self-center mb-5" />

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
              className="border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-black dark:text-white rounded-2xl px-4 py-3 text-sm"
              style={{ minHeight: 80, textAlignVertical: "top" }}
            />
            <ThemedText className="text-xs text-neutral-400 text-right mt-1 mb-5">
              {opinion.length}/500
            </ThemedText>

            <View className="flex-row gap-3">
              <Pressable
                onPress={onDone}
                className="flex-1 py-3.5 rounded-2xl items-center border border-neutral-200 dark:border-neutral-800 active:opacity-70"
              >
                <Text className="text-sm font-semibold text-neutral-500">
                  Skip
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={saving}
                className="flex-1 py-3.5 rounded-2xl items-center bg-black dark:bg-white active:opacity-90"
              >
                {saving ? (
                  <ActivityIndicator
                    color={isDark ? "#000" : "#fff"}
                    size="small"
                  />
                ) : (
                  <Text className="text-sm font-semibold text-white dark:text-black">
                    Save
                  </Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
