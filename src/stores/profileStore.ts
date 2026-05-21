import { supabase } from "@/utils/supabase";
import { create } from "zustand";

interface ProfileState {
  bookmarkedIds: string[];
  fetchBookmarks: (userId: string) => Promise<void>;
  toggleBookmark: (userId: string, sesId: string) => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  bookmarkedIds: [],

  fetchBookmarks: async (userId) => {
    const { data, error } = await supabase
      .from("bookmarks")
      .select("ses_id")
      .eq("user_id", userId);

    if (error) {
      return;
    }

    set({
      bookmarkedIds: (data ?? []).map((item) => item.ses_id),
    });
  },

  toggleBookmark: async (userId, sesId) => {
    const bookmarkedIds = get().bookmarkedIds;
    const isBookmarked = bookmarkedIds.includes(sesId);

    if (isBookmarked) {
      // Optimistic UI Update: Remove item instantly
      set({
        bookmarkedIds: bookmarkedIds.filter((id) => id !== sesId),
      });

      const { error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("user_id", userId)
        .eq("ses_id", sesId);

      if (error) {
        // Rollback if DB request failed
        set({
          bookmarkedIds,
        });
      }

      return;
    }

    // Optimistic UI Update: Add item instantly
    set({
      bookmarkedIds: [...bookmarkedIds, sesId],
    });

    const { error } = await supabase.from("bookmarks").insert({
      user_id: userId,
      ses_id: sesId,
    });

    if (error) {
      // Rollback if DB request failed
      set({
        bookmarkedIds,
      });
    }
  },
}));
