import { SesItem } from "@/components/cards/ses-card";
import { zustandAsyncStorage } from "@/utils/storage";
import { supabase } from "@/utils/supabase";
import { create } from "zustand";
import { persist } from "zustand/middleware";

const CACHE_TTL = 2 * 60_000;

type UserActivityStore = {
  createdSess: SesItem[];
  votedSess: SesItem[];
  bookmarkedSess: SesItem[];
  isLoading: boolean;
  lastFetchedCreated: number | null;
  lastFetchedVoted: number | null;
  lastFetchedBookmarked: number | null;
  fetchCreatedSess: (userId: string, force?: boolean) => Promise<void>;
  fetchVotedSess: (userId: string, force?: boolean) => Promise<void>;
  fetchBookmarkedSess: (userId: string, force?: boolean) => Promise<void>;
  clearActivity: () => void;
};

const isStale = (lastFetched: number | null) => {
  if (!lastFetched) return true;
  return Date.now() - lastFetched > CACHE_TTL;
};

const buildFullSesItems = async (
  sesIds: string[],
  userId: string,
): Promise<SesItem[]> => {
  if (!sesIds.length) return [];

  const [sesRes, optionsRes, votesRes, profilesRes] = await Promise.all([
    supabase
      .from("ses")
      .select("*")
      .in("id", sesIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("ses_options")
      .select("id, ses_id, text, order")
      .in("ses_id", sesIds)
      .order("order"),
    supabase
      .from("ses_votes")
      .select("ses_id, option_id, user_id")
      .in("ses_id", sesIds),
    supabase.from("profiles").select("id, username, avatar_url"),
  ]);

  const optionsBySes: Record<string, { id: string; text: string }[]> = {};
  optionsRes.data?.forEach((o) => {
    if (!optionsBySes[o.ses_id]) optionsBySes[o.ses_id] = [];
    optionsBySes[o.ses_id].push({ id: o.id, text: o.text });
  });

  const voteCounts: Record<string, number> = {};
  const userVotedSes = new Set<string>();
  const userVotesBySeS: Record<string, string[]> = {};
  votesRes.data?.forEach((v) => {
    voteCounts[v.ses_id] = (voteCounts[v.ses_id] ?? 0) + 1;
    if (v.user_id === userId) {
      userVotedSes.add(v.ses_id);
      if (!userVotesBySeS[v.ses_id]) userVotesBySeS[v.ses_id] = [];
      userVotesBySeS[v.ses_id].push(v.option_id);
    }
  });

  const profilesById: Record<
    string,
    { username: string | null; avatar_url: string | null }
  > = {};
  profilesRes.data?.forEach((p) => {
    profilesById[p.id] = { username: p.username, avatar_url: p.avatar_url };
  });

  return (sesRes.data ?? []).map((s) => ({
    ...s,
    options: optionsBySes[s.id] ?? [],
    option_count: (optionsBySes[s.id] ?? []).length,
    vote_count: voteCounts[s.id] ?? 0,
    has_voted: userVotedSes.has(s.id),
    selected_option_ids: userVotesBySeS[s.id] ?? [],
    author: profilesById[s.created_by] ?? null,
  }));
};

export const useUserActivityStore = create<UserActivityStore>()(
  persist(
    (set, get) => ({
      createdSess: [],
      votedSess: [],
      bookmarkedSess: [],
      isLoading: false,
      lastFetchedCreated: null,
      lastFetchedVoted: null,
      lastFetchedBookmarked: null,

      fetchCreatedSess: async (userId, force = false) => {
        if (!force && !isStale(get().lastFetchedCreated)) return;

        set({ isLoading: true });
        const { data } = await supabase
          .from("ses")
          .select("id")
          .eq("created_by", userId)
          .order("created_at", { ascending: false });

        if (data) {
          const ids = data.map((d) => d.id);
          const items = await buildFullSesItems(ids, userId);
          set({ createdSess: items, lastFetchedCreated: Date.now() });
        }
        set({ isLoading: false });
      },

      fetchVotedSess: async (userId, force = false) => {
        if (!force && !isStale(get().lastFetchedVoted)) return;

        set({ isLoading: true });
        const { data } = await supabase
          .from("ses_votes")
          .select("ses_id")
          .eq("user_id", userId);

        if (data) {
          const ids = [...new Set(data.map((d) => d.ses_id))];
          const items = await buildFullSesItems(ids, userId);
          set({ votedSess: items, lastFetchedVoted: Date.now() });
        }
        set({ isLoading: false });
      },

      fetchBookmarkedSess: async (userId, force = false) => {
        if (!force && !isStale(get().lastFetchedBookmarked)) return;

        set({ isLoading: true });
        const { data } = await supabase
          .from("likes")
          .select("ses_id")
          .eq("user_id", userId);

        if (data) {
          const ids = data.map((d) => d.ses_id);
          const items = await buildFullSesItems(ids, userId);
          set({ bookmarkedSess: items, lastFetchedBookmarked: Date.now() });
        }
        set({ isLoading: false });
      },

      clearActivity: () =>
        set({
          createdSess: [],
          votedSess: [],
          bookmarkedSess: [],
          lastFetchedCreated: null,
          lastFetchedVoted: null,
          lastFetchedBookmarked: null,
        }),
    }),
    {
      name: "user-activity-storage",
      storage: zustandAsyncStorage,
      partialize: (state) => ({
        createdSess: state.createdSess,
        votedSess: state.votedSess,
        bookmarkedSess: state.bookmarkedSess,
        lastFetchedCreated: state.lastFetchedCreated,
        lastFetchedVoted: state.lastFetchedVoted,
        lastFetchedBookmarked: state.lastFetchedBookmarked,
      }),
    },
  ),
);
