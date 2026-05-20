import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { supabase } from "@/utils/supabase";
import { ThemedText } from "@/components/themed-text";
import { SesCard, SesItem } from "./cards/ses-card";

export function ProfileBookmarks({ userId }: { userId: string }) {
  const [items, setItems] = useState<SesItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookmarkedItems();
  }, [userId]);

  const fetchBookmarkedItems = async () => {
    try {
      const { data: bookmarkRows, error: bookmarkError } = await supabase
        .from("bookmarks")
        .select("ses_id")
        .eq("user_id", userId);

      if (bookmarkError || !bookmarkRows || bookmarkRows.length === 0) {
        setItems([]);
        return;
      }

      const sesIds = bookmarkRows.map((row) => row.ses_id);

      const { data: sesData, error: sesError } = await supabase
        .from("ses")
        .select(`
          *,
          author:profiles(username, avatar_url),
          options(id, text)
        `)
        .in("id", sesIds)
        .order("created_at", { ascending: false });

      if (!sesError && sesData) {
        setItems(sesData as any);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="py-8 items-center justify-center">
        <ActivityIndicator size="small" color="#9ca3af" />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View className="py-8 px-4 items-center justify-center bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-850">
        <ThemedText className="text-sm text-neutral-400 font-medium">
          No bookmarks saved yet.
        </ThemedText>
      </View>
    );
  }

  return (
    <View className="gap-4">
      {items.map((item) => (
        <SesCard key={item.id} item={item} />
      ))}
    </View>
  );
}