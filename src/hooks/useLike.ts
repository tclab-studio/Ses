import { supabase } from "@/utils/supabase";
import { useEffect, useState } from "react";

export function useLike(sesId: string, currentUserId: string | null) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLikeState();
  }, [sesId, currentUserId]);

  async function fetchLikeState() {
    const [countRes, likedRes] = await Promise.all([
      supabase
        .from("likes")
        .select("id", { count: "exact", head: true })
        .eq("ses_id", sesId),
      currentUserId
        ? supabase
            .from("likes")
            .select("id")
            .eq("ses_id", sesId)
            .eq("user_id", currentUserId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    setLikeCount(countRes.count ?? 0);
    setLiked(!!likedRes.data);
  }

  async function toggleLike() {
    if (!currentUserId || loading) return;
    setLoading(true);

    if (liked) {
      await supabase
        .from("likes")
        .delete()
        .eq("ses_id", sesId)
        .eq("user_id", currentUserId);
      setLiked(false);
      setLikeCount((c) => c - 1);
    } else {
      await supabase
        .from("likes")
        .insert({ ses_id: sesId, user_id: currentUserId });
      setLiked(true);
      setLikeCount((c) => c + 1);
    }

    setLoading(false);
  }

  return { liked, likeCount, toggleLike, loading };
}
