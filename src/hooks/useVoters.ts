import { supabase } from "@/utils/supabase";
import { useQuery } from "@tanstack/react-query";

export type Voter = {
  user_id: string;
  option_id: string;
  username: string | null;
  avatar_url: string | null;
  is_following: boolean;
};

export function useVoters(
  sesId: string | undefined,
  currentUserId: string | null,
) {
  const cleanSesId = sesId?.trim();
  const isValidId =
    !!cleanSesId && cleanSesId !== "undefined" && cleanSesId !== "[id]";

  return useQuery({
    queryKey: ["voters", cleanSesId, currentUserId],
    queryFn: async () => {
      if (!isValidId) return { voters: [], followingVoters: [] };

      const [votesRes, followsRes] = await Promise.all([
        supabase
          .from("ses_votes")
          .select("user_id, option_id")
          .eq("ses_id", cleanSesId),
        currentUserId
          ? supabase
              .from("follows")
              .select("following_id")
              .eq("follower_id", currentUserId)
          : Promise.resolve({ data: [] }),
      ]);

      const votes = votesRes.data ?? [];
      const followingIds = new Set(
        (followsRes.data ?? []).map((f: any) => f.following_id),
      );

      const uniqueUserIds = [...new Set(votes.map((v) => v.user_id))];

      if (uniqueUserIds.length === 0) {
        return { voters: [], followingVoters: [] };
      }

      const profilesRes = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", uniqueUserIds);

      const profileMap = new Map(
        (profilesRes.data ?? []).map((p: any) => [p.id, p]),
      );

      const voters: Voter[] = votes.map((v) => {
        const profile = profileMap.get(v.user_id) as any;
        return {
          user_id: v.user_id,
          option_id: v.option_id,
          username: profile?.username ?? null,
          avatar_url: profile?.avatar_url ?? null,
          is_following: followingIds.has(v.user_id),
        };
      });

      const followingVoters = voters
        .filter((v) => v.is_following && v.user_id !== currentUserId)
        .slice(0, 3);

      return { voters, followingVoters };
    },
    enabled: isValidId,
    staleTime: 1000 * 30,
  });
}
