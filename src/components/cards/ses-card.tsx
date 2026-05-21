import { ThemedText } from "@/components/themed-text";
import { useAuthStore, useProfileStore } from "@/stores";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  Image,
  Platform,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export type SesItem = {
  id: string;
  question: string;
  vote_type: "single" | "multiple";
  created_at: string;
  created_by: string;
  option_count: number;
  vote_count: number;
  selected_option_ids: string[] | null | undefined;
  has_voted: boolean;
  options: { id: string; text: string }[] | null | undefined;
  author: { username: string | null; avatar_url: string | null } | null;
};

const formatDate = (iso: string) => {
  if (!iso) return "unknown";
  const timestamp = new Date(iso).getTime();
  if (isNaN(timestamp)) return "unknown";

  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};
const OptionRow = React.memo(
  ({
    opt,
    isSelected,
    hasVoted,
  }: {
    opt: { id: string; text: string };
    isSelected: boolean;
    hasVoted: boolean;
  }) => (
    <Pressable
      className={`flex-row items-center justify-between px-4 py-3.5 rounded-2xl ${
        isSelected
          ? "bg-neutral-900 dark:bg-white"
          : "bg-neutral-50 dark:bg-neutral-900 active:bg-neutral-100 dark:active:bg-neutral-800"
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
          color={hasVoted ? "#10b981" : Platform.OS === "ios" ? "#fff" : "#000"}
        />
      )}
    </Pressable>
  ),
);
OptionRow.displayName = "OptionRow";

export const SesCard = React.memo(
  ({ item }: { item: SesItem }) => {
    const router = useRouter();
    const sessionUserId = useAuthStore((s) => s.session?.user?.id);
    const isBookmarked = useProfileStore((s) => s.isBookmarked);
    const toggleBookmark = useProfileStore((s) => s.toggleBookmark);

    const bookmarked = isBookmarked(item.id);
    const displayName = item.author?.username ?? "Anonymous";
    const avatar = item.author?.avatar_url ?? null;
    const initial = displayName.charAt(0).toUpperCase();

    const handleBookmarkPress = () => {
      if (!sessionUserId) {
        alert("Please sign in to save bookmarks");
        return;
      }
      toggleBookmark(sessionUserId, item.id);
    };

    // Heavy array extraction wrapped inside useMemo parameters
    const renderedOptions = useMemo(() => {
      const safeOptions = item?.options ?? [];
      const safeSelectedIds = item?.selected_option_ids ?? [];
      return safeOptions
        .slice(0, 3)
        .map((opt) => (
          <OptionRow
            key={opt.id}
            opt={opt}
            isSelected={safeSelectedIds.includes(opt.id)}
            hasVoted={item.has_voted}
          />
        ));
    }, [item?.options, item?.selected_option_ids, item.has_voted]);

    const displayTime = useMemo(
      () => formatDate(item.created_at),
      [item.created_at],
    );

    return (
      <View className="bg-white dark:bg-neutral-900 rounded-3xl p-5 mb-1 shadow-sm shadow-black/[0.03]">
        <View className="flex-row items-center justify-between mb-3.5">
          <View className="flex-row items-center gap-2.5">
            {avatar ? (
              <Image
                source={{ uri: avatar }}
                className="w-6 h-6 rounded-full"
              />
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
            <Text className="text-xs text-neutral-300 dark:text-neutral-600">
              •
            </Text>
            <Text className="text-xs text-neutral-400 dark:text-neutral-500">
              {displayTime}
            </Text>
          </View>

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

        <TouchableOpacity
          onPress={() => router.push(`/ses/${item.id}` as any)}
          activeOpacity={0.8}
          className="mb-4"
        >
          <ThemedText className="text-lg font-bold tracking-tight leading-snug text-neutral-900 dark:text-neutral-50">
            {item.question}
          </ThemedText>
        </TouchableOpacity>

        <View className="gap-2 mb-4">
          {renderedOptions}

          {item.option_count > 3 && (
            <Text className="text-xs font-medium text-neutral-400 dark:text-neutral-500 pl-1 mt-0.5">
              + {item.option_count - 3} more options to view
            </Text>
          )}
        </View>

        <View className="flex-row items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <View className="flex-row items-center gap-1">
            <Ionicons name="bar-chart-outline" size={14} color="#9ca3af" />
            <Text className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              {item.vote_count}{" "}
              {item.vote_count === 1 ? "response" : "responses"}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleBookmarkPress}
            activeOpacity={0.7}
            className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full active:bg-neutral-100 dark:active:bg-neutral-800"
          >
            <Ionicons
              name={bookmarked ? "bookmark" : "bookmark-outline"}
              size={16}
              color={bookmarked ? "#f59e0b" : "#9ca3af"}
            />
            <Text
              className={`text-xs font-medium ${bookmarked ? "text-amber-500" : "text-neutral-400"}`}
            >
              {bookmarked ? "Saved" : "Save"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  },
  (prev, next) => {
    return (
      prev.item.id === next.item.id &&
      prev.item.vote_count === next.item.vote_count &&
      prev.item.has_voted === next.item.has_voted &&
      prev.item.selected_option_ids?.length ===
        next.item.selected_option_ids?.length
    );
  },
);

SesCard.displayName = "SesCard";
