import { supabase } from "@/utils/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useFollow(targetUserId: string, currentUserId: string | null) {
  const queryClient = useQueryClient();

  const queryKey = ["followState", targetUserId, currentUserId];

  const { data, isLoading: isQueryLoading } = useQuery({
    queryKey,
    queryFn: async () => {
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

      return {
        followerCount: countRes.count ?? 0,
        following: !!followRes.data,
      };
    },
    enabled: !!targetUserId,
    staleTime: 1000 * 60 * 5,
  });

  const toggleMutation = useMutation({
    mutationFn: async (currentlyFollowing: boolean) => {
      if (!currentUserId) throw new Error("Must be logged in to follow");

      if (currentlyFollowing) {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", targetUserId);
      } else {
        await supabase
          .from("follows")
          .insert({ follower_id: currentUserId, following_id: targetUserId });
      }
    },
    onMutate: async (currentlyFollowing) => {
      await queryClient.cancelQueries({ queryKey });

      const previousState = queryClient.getQueryData<{
        followerCount: number;
        following: boolean;
      }>(queryKey);

      if (previousState) {
        queryClient.setQueryData(queryKey, {
          followerCount: currentlyFollowing
            ? previousState.followerCount - 1
            : previousState.followerCount + 1,
          following: !currentlyFollowing,
        });
      }

      return { previousState };
    },
    onError: (err, variables, context) => {
      if (context?.previousState) {
        queryClient.setQueryData(queryKey, context.previousState);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });

      if (currentUserId) {
        queryClient.invalidateQueries({ queryKey: ["following"] });
        queryClient.invalidateQueries({ queryKey: ["followers"] });
      }
    },
  });

  return {
    following: data?.following ?? false,
    followerCount: data?.followerCount ?? 0,
    toggleFollow: () => {
      if (!currentUserId || toggleMutation.isPending) return;
      toggleMutation.mutate(data?.following ?? false);
    },
    loading: isQueryLoading || toggleMutation.isPending,
  };
}
