import { SesItem } from '@/components/cards/ses-card'
import { create } from 'zustand'

const CACHE_TTL = 60_000

type FeedStore = {
  feed: SesItem[]
  lastFetched: number | null
  realtimeConnected: boolean
  setFeed: (items: SesItem[]) => void
  optimisticVote: (sesId: string, optionId: string) => void
  optimisticUnvote: (sesId: string, optionId: string) => void
  updateVoteCount: (sesId: string, count: number) => void
  prependItem: (item: SesItem) => void
  markAsVoted: (sesId: string, optionId: string) => void
  markAsUnvoted: (sesId: string, optionId: string) => void
  invalidate: () => void
  isStale: () => boolean
  setRealtimeConnected: (v: boolean) => void
}

export const useFeedStore = create<FeedStore>((set, get) => ({
  feed: [],
  lastFetched: null,
  realtimeConnected: false,

  setFeed: (feed) => set({ feed, lastFetched: Date.now() }),

  optimisticVote: (sesId, optionId) =>
    set((state) => ({
      feed: state.feed.map((s) =>
        s.id === sesId
          ? {
              ...s,
              vote_count: s.vote_count + 1,
              has_voted: true,
              selected_option_ids: [...(s.selected_option_ids ?? []), optionId],
            }
          : s,
      ),
    })),

  optimisticUnvote: (sesId, optionId) =>
    set((state) => ({
      feed: state.feed.map((s) => {
        if (s.id === sesId) {
          const newSelected = (s.selected_option_ids ?? []).filter((id) => id !== optionId)
          return {
            ...s,
            vote_count: Math.max(0, s.vote_count - 1),
            has_voted: newSelected.length > 0,
            selected_option_ids: newSelected,
          }
        }
        return s
      }),
    })),

  updateVoteCount: (sesId, count) =>
    set((state) => ({
      feed: state.feed.map((s) => (s.id === sesId ? { ...s, vote_count: count } : s)),
    })),

  prependItem: (item) =>
    set((state) => ({ feed: [item, ...state.feed] })),

  markAsVoted: (sesId, optionId) =>
    set((state) => ({
      feed: state.feed.map((item) =>
        item.id === sesId
          ? {
              ...item,
              has_voted: true,
              selected_option_ids: Array.from(new Set([...(item.selected_option_ids ?? []), optionId])),
            }
          : item,
      ),
    })),

  markAsUnvoted: (sesId, optionId) =>
    set((state) => ({
      feed: state.feed.map((item) => {
        if (item.id === sesId) {
          const newSelected = (item.selected_option_ids ?? []).filter((id) => id !== optionId)
          return {
            ...item,
            has_voted: newSelected.length > 0,
            selected_option_ids: newSelected,
          }
        }
        return item
      }),
    })),

  invalidate: () => set({ lastFetched: null }),

  isStale: () => {
    const { lastFetched } = get()
    if (!lastFetched) return true
    return Date.now() - lastFetched > CACHE_TTL
  },

  setRealtimeConnected: (realtimeConnected) => set({ realtimeConnected }),
}))