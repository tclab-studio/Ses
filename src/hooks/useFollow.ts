import { supabase } from "@/utils/supabase";
import { useEffect, useState } from "react";

export function useFollow(targetUserId: string, currentUserId: string | null) {
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFollowState();
  }, [targetUserId, currentUserId]);

  async function fetchFollowState() {
    const [countRes, followRes] = await Promise.all([
      supabase
        .from("follows")
        .select("id", { count: "exact", head: true })
        .eq("following_id", targetUserId),
      currentUserId
        ? supabase
            .from("follows")
            .select("id")
            .eq("follower_id", currentUserId)
            .eq("following_id", targetUserId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    setFollowerCount(countRes.count ?? 0);
    setFollowing(!!followRes.data);
  }

  async function toggleFollow() {
    if (!currentUserId || loading) return;
    setLoading(true);

    if (following) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", targetUserId);
      setFollowing(false);
      setFollowerCount((c) => c - 1);
    } else {
      await supabase
        .from("follows")
        .insert({ follower_id: currentUserId, following_id: targetUserId });
      setFollowing(true);
      setFollowerCount((c) => c + 1);
    }

    setLoading(false);
  }

  return { following, followerCount, toggleFollow, loading };
}
