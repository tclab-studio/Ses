import { zustandAsyncStorage } from "@/utils/storage";
import { supabase } from "@/utils/supabase";
import { create } from "zustand";
import { persist } from "zustand/middleware";

const CACHE_TTL = 5 * 60_000;

interface ProfileState {
  likedIds: string[];
  lastFetchedLikes: number | null;
  fetchLikes: (userId: string, force?: boolean) => Promise<void>;
  toggleLike: (userId: string, sesId: string) => Promise<void>;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      likedIds: [],
      lastFetchedLikes: null,

      fetchLikes: async (userId, force = false) => {
        const { lastFetchedLikes } = get();
        if (
          !force &&
          lastFetchedLikes &&
          Date.now() - lastFetchedLikes < CACHE_TTL
        )
          return;

        const { data, error } = await supabase
          .from("likes")
          .select("ses_id")
          .eq("user_id", userId);

        if (error) return;

        set({
          likedIds: (data ?? []).map((item) => item.ses_id),
          lastFetchedLikes: Date.now(),
        });
      },

      toggleLike: async (userId, sesId) => {
        const likedIds = get().likedIds;
        const isLiked = likedIds.includes(sesId);

        if (isLiked) {
          set({ likedIds: likedIds.filter((id) => id !== sesId) });
          const { error } = await supabase
            .from("likes")
            .delete()
            .eq("user_id", userId)
            .eq("ses_id", sesId);
          if (error) set({ likedIds });
          return;
        }

        set({ likedIds: [...likedIds, sesId] });
        const { error } = await supabase.from("likes").insert({
          user_id: userId,
          ses_id: sesId,
        });
        if (error) set({ likedIds });
      },
    }),
    {
      name: "profile-storage",
      storage: zustandAsyncStorage,
      partialize: (state) => ({
        likedIds: state.likedIds,
        lastFetchedLikes: state.lastFetchedLikes,
      }),
    },
  ),
);
