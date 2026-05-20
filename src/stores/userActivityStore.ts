import { SesItem } from "@/components/cards/ses-card";
import { zustandAsyncStorage } from "@/utils/storage";
import { supabase } from "@/utils/supabase";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type UserActivityStore = {
  createdSess: SesItem[];
  votedSess: SesItem[];
  bookmarkedSess: SesItem[];
  isLoading: boolean;

  fetchCreatedSess: (userId: string) => Promise<void>;
  fetchVotedSess: (userId: string) => Promise<void>;
  fetchBookmarkedSess: (userId: string) => Promise<void>;
  clearActivity: () => void;
};

export const useUserActivityStore = create<UserActivityStore>()(
  persist(
    (set) => ({
      createdSess: [],
      votedSess: [],
      bookmarkedSess: [],
      isLoading: false,

      fetchCreatedSess: async (userId) => {
        set({ isLoading: true });
        const { data, error } = await supabase
          .from("ses")
          .select("*")
          .eq("created_by", userId)
          .order("created_at", { ascending: false });

        if (!error && data) {
          set({ createdSess: data });
        }
        set({ isLoading: false });
      },

      fetchVotedSess: async (userId) => {
        set({ isLoading: true });
        const { data, error } = await supabase
          .from("ses_votes")
          .select("ses:ses_id(*)")
          .eq("user_id", userId);

        if (!error && data) {
          const formattedData = data.map((item: any) => item.ses).flat();
          set({ votedSess: formattedData });
        }
        set({ isLoading: false });
      },

      fetchBookmarkedSess: async (userId) => {
        set({ isLoading: true });
        const { data, error } = await supabase
          .from("bookmarks")
          .select("ses:ses_id(*)")
          .eq("user_id", userId);

        if (!error && data) {
          const formattedData = data.map((item: any) => item.ses).flat();
          set({ bookmarkedSess: formattedData });
        }
        set({ isLoading: false });
      },

      clearActivity: () =>
        set({ createdSess: [], votedSess: [], bookmarkedSess: [] }),
    }),
    {
      name: "user-activity-storage",
      storage: zustandAsyncStorage,
    },
  ),
);
