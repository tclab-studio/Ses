import { zustandSecureStorage } from "@/utils/storage";
import { supabase } from "@/utils/supabase";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type Profile = {
  username: string | null;
  avatar_url: string | null;
  full_name: string | null;
};

type ProfileStore = {
  profile: Profile | null;
  bookmarkedIds: Set<string>;
  setProfile: (p: Profile) => void;
  clear: () => void;
  fetchBookmarks: (userId: string) => Promise<void>;
  toggleBookmark: (userId: string, sesId: string) => Promise<void>;
  isBookmarked: (sesId: string) => boolean;
};

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set, get) => ({
      profile: null,
      bookmarkedIds: new Set(),

      setProfile: (profile) => set({ profile }),
      
      clear: () => set({ profile: null, bookmarkedIds: new Set() }),

      fetchBookmarks: async (userId) => {
        const { data, error } = await supabase
          .from("bookmarks")
          .select("ses_id")
          .eq("user_id", userId);

        if (!error && data) {
          const ids = data.map((row: any) => row.ses_id);
          set({ bookmarkedIds: new Set(ids) });
        }
      },

      toggleBookmark: async (userId, sesId) => {
        const currentBookmarks = get().bookmarkedIds;
        const isAlreadyBookmarked = currentBookmarks.has(sesId);

        const nextBookmarks = new Set(currentBookmarks);
        if (isAlreadyBookmarked) {
          nextBookmarks.delete(sesId);
        } else {
          nextBookmarks.add(sesId);
        }
        set({ bookmarkedIds: nextBookmarks });

        if (isAlreadyBookmarked) {
          await supabase
            .from("bookmarks")
            .delete()
            .eq("user_id", userId)
            .eq("ses_id", sesId);
        } else {
          await supabase
            .from("bookmarks")
            .insert({ user_id: userId, ses_id: sesId });
        }
      },

      isBookmarked: (sesId) => get().bookmarkedIds.has(sesId),
    }),
    {
      name: "secure-profile-storage",
      storage: zustandSecureStorage,
     partialize: (state) => ({
        ...state,
        bookmarkedIds: Array.from(state.bookmarkedIds),
      } as any),
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        ...persistedState,
        bookmarkedIds: new Set(persistedState?.bookmarkedIds || []),
      }),
    }
  )
);