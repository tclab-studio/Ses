import { create } from "zustand";

type Profile = {
  username: string | null;
  avatar_url: string | null;
  full_name: string | null;
};

type ProfileStore = {
  profile: Profile | null;
  bookmarkedIds: Set<string>;
  setProfile: (p: Profile) => void;
  updateProfile: (partial: Partial<Profile>) => void;
  clear: () => void;
  addBookmark: (sesId: string) => void;
  removeBookmark: (sesId: string) => void;
  setBookmarks: (ids: string[]) => void;
  isBookmarked: (sesId: string) => boolean;
};

export const useProfileStore = create<ProfileStore>((set, get) => ({
  profile: null,
  bookmarkedIds: new Set(),

  setProfile: (profile) => set({ profile }),

  updateProfile: (partial) =>
    set((state) => ({
      profile: state.profile ? { ...state.profile, ...partial } : null,
    })),

  clear: () => set({ profile: null, bookmarkedIds: new Set() }),

  addBookmark: (sesId) =>
    set((state) => ({
      bookmarkedIds: new Set([...state.bookmarkedIds, sesId]),
    })),

  removeBookmark: (sesId) =>
    set((state) => {
      const next = new Set(state.bookmarkedIds);
      next.delete(sesId);
      return { bookmarkedIds: next };
    }),

  setBookmarks: (ids) => set({ bookmarkedIds: new Set(ids) }),

  isBookmarked: (sesId) => get().bookmarkedIds.has(sesId),
}));
