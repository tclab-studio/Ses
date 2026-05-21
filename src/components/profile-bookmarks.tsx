import { ThemedText } from "@/components/themed-text";
import { useProfileStore } from "@/stores";
import { supabase } from "@/utils/supabase";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SesCard, SesItem } from "./cards/ses-card";

export function ProfileBookmarks({ userId }: { userId: string }) {
  const [items, setItems] = useState<SesItem[]>([]);
  const [loading, setLoading] = useState(true);

  const bookmarkedIds = useProfileStore((s) => s.bookmarkedIds);
  const fetchBookmarks = useProfileStore((s) => s.fetchBookmarks);

  const fetchBookmarkedItems = useCallback(async () => {
    try {
      setLoading(true);

      if (bookmarkedIds.length === 0) {
        setItems([]);
        return;
      }

      // 1. Fetch base 'ses' rows first
      const { data: sesData, error: sesError } = await supabase
        .from("ses")
        .select("*")
        .in("id", bookmarkedIds)
        .order("created_at", { ascending: false });

      if (sesError) {
        console.error("❌ Error fetching ses records:", sesError.message);
        setItems([]);
        return;
      }

      if (!sesData || sesData.length === 0) {
        setItems([]);
        return;
      }

      // 2. Extract unique author IDs to avoid redundant profile queries
      const authorIds = [...new Set(sesData.map((s) => s.created_by))].filter(
        Boolean,
      );

      // 3. Fetch options and profiles in parallel (bypasses missing DB relationships)
      const [optionsRes, profilesRes] = await Promise.all([
        supabase
          .from("ses_options")
          .select("id, ses_id, text")
          .in("ses_id", bookmarkedIds),
        supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", authorIds),
      ]);

      // Map options by their parent ses_id
      const optionsBySes: Record<string, { id: string; text: string }[]> = {};
      optionsRes.data?.forEach((o) => {
        if (!optionsBySes[o.ses_id]) optionsBySes[o.ses_id] = [];
        optionsBySes[o.ses_id].push({ id: o.id, text: o.text });
      });

      // Map profiles by user id
      const profilesById: Record<
        string,
        { username: string | null; avatar_url: string | null }
      > = {};
      profilesRes.data?.forEach((p) => {
        profilesById[p.id] = { username: p.username, avatar_url: p.avatar_url };
      });

      // 4. Combine data manually into a unified SesItem array
      const fullItems = sesData.map((s) => ({
        ...s,
        options: optionsBySes[s.id] ?? [],
        option_count: (optionsBySes[s.id] ?? []).length,
        author: profilesById[s.created_by] ?? null,
        // Defaulting properties if state layers require them
        vote_count: 0,
        has_voted: false,
        selected_option_ids: [],
      }));

      setItems(fullItems as SesItem[]);
    } catch (err) {
      console.error("❌ Code exception building bookmarks:", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [bookmarkedIds]);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        fetchBookmarks(userId);
      }
    }, [userId, fetchBookmarks]),
  );

  useEffect(() => {
    fetchBookmarkedItems();
  }, [fetchBookmarkedItems]);

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
