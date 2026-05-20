import { ThemedText } from "@/components/themed-text";
import { useProfileStore } from "@/stores";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Image, Pressable, Text, TouchableOpacity, View } from "react-native";

export type SesItem = {
  id: string;
  question: string;
  vote_type: "single" | "multiple";
  created_at: string;
  created_by: string;
  option_count: number;
  vote_count: number;
  selected_option_ids: string[];
  has_voted: boolean;
  options: { id: string; text: string }[];
  author: { username: string | null; avatar_url: string | null } | null;
};

const formatDate = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

export function SesCard({ item }: { item: SesItem }) {
  const router = useRouter();
  const { isBookmarked, addBookmark, removeBookmark } = useProfileStore();

  const bookmarked = isBookmarked(item.id);
  const displayName = item.author?.username ?? "Anonymous";
  const avatar = item.author?.avatar_url ?? null;
  const initial = displayName.charAt(0).toUpperCase();

  const toggleBookmark = () => {
    bookmarked ? removeBookmark(item.id) : addBookmark(item.id);
  };

  return (
    <View className="bg-white dark:bg-neutral-900 rounded-3xl p-5 mb-1 shadow-sm shadow-black/[0.03]">
      {/* Meta Header */}
      <View className="flex-row items-center justify-between mb-3.5">
        <View className="flex-row items-center gap-2.5">
          {avatar ? (
            <Image source={{ uri: avatar }} className="w-6 h-6 rounded-full" />
          ) : (
            <View className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center">
              <Text className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400">
                {initial}
              </Text>
            </View>
          )}
          <Text className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            {displayName}
          </Text>
          <Text className="text-xs text-neutral-300 dark:text-neutral-600">•</Text>
          <Text className="text-xs text-neutral-400 dark:text-neutral-500">
            {formatDate(item.created_at)}
          </Text>
        </View>

        {/* Top Mini Badges */}
        <View className="flex-row items-center gap-1.5">
          {item.has_voted && (
            <View className="bg-emerald-500/10 dark:bg-emerald-500/20 px-2 py-0.5 rounded-md">
              <Text className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Voted
              </Text>
            </View>
          )}
          <View className="bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
            <Text className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              {item.vote_type}
            </Text>
          </View>
        </View>
      </View>

      {/* Clickable Question Title */}
      <TouchableOpacity
        onPress={() => router.push(`/ses/${item.id}` as any)}
        activeOpacity={0.8}
        className="mb-4"
      >
        <ThemedText className="text-lg font-bold tracking-tight leading-snug text-neutral-900 dark:text-neutral-50">
          {item.question}
        </ThemedText>
      </TouchableOpacity>

      {/* Clean Interactive Poll UI */}
      <View className="gap-2 mb-4">
        {item.options.slice(0, 3).map((opt) => {
          const isSelected = item.selected_option_ids.includes(opt.id);

          return (
            <Pressable
              key={opt.id}
              className={`flex-row items-center justify-between px-4 py-3.5 rounded-2xl transition-all ${
                isSelected
                  ? "bg-neutral-900 dark:bg-white"
                  : "bg-neutral-50 dark:bg-neutral-850 active:bg-neutral-100 dark:active:bg-neutral-800"
              }`}
            >
              <Text
                className={`text-sm font-medium flex-1 pr-4 ${
                  isSelected
                    ? "text-white dark:text-black font-semibold"
                    : "text-neutral-800 dark:text-neutral-200"
                }`}
                numberOfLines={2}
              >
                {opt.text}
              </Text>

              {isSelected && (
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={isSelected && !item.has_voted ? (item.has_voted ? '#10b981' : '#000') : (item.has_voted ? '#10b981' : '#fff')}
                  style={{ color: isSelected ? (item.has_voted ? '#10b981' : (item.options ? (item.has_voted ? '#10b981' : '#fff') : '#000')) : '#9ca3af' }}
                />
              )}
            </Pressable>
          );
        })}

        {item.option_count > 3 && (
          <Text className="text-xs font-medium text-neutral-400 dark:text-neutral-500 pl-1 mt-0.5">
            + {item.option_count - 3} more options to view
          </Text>
        )}
      </View>

      {/* Bottom Action / Interaction Strip */}
      <View className="flex-row items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800">
        <View className="flex-row items-center gap-1">
          <Ionicons name="bar-chart-outline" size={14} color="#9ca3af" />
          <Text className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
            {item.vote_count} {item.vote_count === 1 ? "response" : "responses"}
          </Text>
        </View>

        {/* Bookmark Interaction Icon */}
        <TouchableOpacity
          onPress={toggleBookmark}
          activeOpacity={0.7}
          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full active:bg-neutral-100 dark:active:bg-neutral-800"
        >
          <Ionicons
            name={bookmarked ? "bookmark" : "bookmark-outline"}
            size={16}
            color={bookmarked ? "#f59e0b" : "#9ca3af"} 
          />
          <Text
            className={`text-xs font-medium ${
              bookmarked ? "text-amber-500" : "text-neutral-400"
            }`}
          >
            {bookmarked ? "Saved" : "Save"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}