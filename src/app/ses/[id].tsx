import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/utils/supabase";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Option = {
  id: string;
  text: string;
  order: number;
  vote_count: number;
};

type Ses = {
  id: string;
  question: string;
  vote_type: "single" | "multiple";
  created_at: string;
  created_by: string;
};

export default function SesDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  const [ses, setSes] = useState<Ses | null>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const [myVotes, setMyVotes] = useState<string[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sesData } = await supabase
        .from("ses")
        .select("*")
        .eq("id", id)
        .single();

      if (!sesData) return;
      setSes(sesData);

      const { data: optionsData } = await supabase
        .from("ses_options")
        .select("*")
        .eq("ses_id", id)
        .order("order");

      const { data: votesData } = await supabase
        .from("ses_votes")
        .select("option_id, user_id")
        .eq("ses_id", id);

      const voteCounts: Record<string, number> = {};
      votesData?.forEach((v) => {
        voteCounts[v.option_id] = (voteCounts[v.option_id] ?? 0) + 1;
      });

      const userVoteIds =
        votesData
          ?.filter((v) => v.user_id === session?.user?.id)
          .map((v) => v.option_id) ?? [];

      setOptions(
        (optionsData ?? []).map((o) => ({
          ...o,
          vote_count: voteCounts[o.id] ?? 0,
        })),
      );
      setMyVotes(userVoteIds);
      setTotalVotes(votesData?.length ?? 0);
    } finally {
      setLoading(false);
    }
  }, [id, session?.user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleVote = async (optionId: string) => {
    if (!session?.user || voting) return;

    setVoting(true);
    try {
      if (ses?.vote_type === "single") {
        if (myVotes.length > 0) return;
        await supabase.from("ses_votes").insert({
          ses_id: id,
          option_id: optionId,
          user_id: session.user.id,
        });
      } else {
        if (myVotes.includes(optionId)) {
          await supabase
            .from("ses_votes")
            .delete()
            .eq("ses_id", id)
            .eq("option_id", optionId)
            .eq("user_id", session.user.id);
        } else {
          await supabase.from("ses_votes").insert({
            ses_id: id,
            option_id: optionId,
            user_id: session.user.id,
          });
        }
      }
      await load();
    } catch {
      Alert.alert("Error", "Could not submit vote.");
    } finally {
      setVoting(false);
    }
  };

  const hasVoted = myVotes.length > 0;
  const showResults = hasVoted || ses?.created_by === session?.user?.id;
  const topCount = Math.max(...options.map((o) => o.vote_count), 1);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  if (loading) {
    return (
      <ThemedView className="flex-1 items-center justify-center">
        <ActivityIndicator color={colors.text} />
      </ThemedView>
    );
  }

  if (!ses) {
    return (
      <ThemedView className="flex-1 items-center justify-center px-8">
        <ThemedText className="text-lg font-semibold mb-2">
          Not found
        </ThemedText>
        <ThemedText className="text-sm text-neutral-400 text-center">
          This ses doesn't exist or was deleted.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView className="flex-1">
      <SafeAreaView className="flex-1">
        <View className="flex-row items-center px-4 pt-2 pb-4 gap-3">
          <Pressable
            onPress={() => router.back()}
            activeOpacity={0.7}
            className="w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-900 items-center justify-center"
          >
            <Text className="text-black dark:text-white text-base font-medium leading-none">
              ‹
            </Text>
          </Pressable>
          <ThemedText className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
            Ses
          </ThemedText>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-16 gap-6"
          showsVerticalScrollIndicator={false}
        >
          <View className="gap-2">
            <ThemedText
              className="text-2xl font-bold tracking-tight leading-tight"
              style={{ lineHeight: 30 }}
            >
              {ses.question}
            </ThemedText>
            <View className="flex-row items-center gap-3">
              <View className="px-2.5 py-1 rounded-full border border-neutral-200 dark:border-neutral-800">
                <ThemedText className="text-xs text-neutral-400 font-medium">
                  {ses.vote_type === "single"
                    ? "Single choice"
                    : "Multiple choice"}
                </ThemedText>
              </View>
              <ThemedText className="text-xs text-neutral-400">
                {formatDate(ses.created_at)}
              </ThemedText>
            </View>
          </View>

          <View className="flex-row items-center gap-2">
            <ThemedText className="text-3xl font-bold">{totalVotes}</ThemedText>
            <ThemedText className="text-sm text-neutral-400 mt-1">
              {totalVotes === 1 ? "vote" : "votes"}
            </ThemedText>
          </View>

          <View className="gap-3">
            {options.map((option) => {
              const isMyVote = myVotes.includes(option.id);
              const percent =
                totalVotes > 0
                  ? Math.round((option.vote_count / totalVotes) * 100)
                  : 0;
              const isWinning =
                option.vote_count === topCount && option.vote_count > 0;

              return (
                <Pressable
                  key={option.id}
                  onPress={() => handleVote(option.id)}
                  disabled={
                    voting ||
                    (ses.vote_type === "single" && hasVoted && !isMyVote)
                  }
                  activeOpacity={0.75}
                  className={`rounded-2xl overflow-hidden border ${
                    isMyVote
                      ? "border-black dark:border-white"
                      : "border-neutral-200 dark:border-neutral-800"
                  }`}
                >
                  {showResults && (
                    <View
                      className={`absolute top-0 left-0 bottom-0 ${
                        isMyVote
                          ? "bg-black dark:bg-white"
                          : "bg-neutral-100 dark:bg-neutral-900"
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  )}

                  <View className="flex-row items-center justify-between px-4 py-4 relative">
                    <View className="flex-row items-center gap-3 flex-1">
                      <View
                        className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                          isMyVote
                            ? "border-white dark:border-black"
                            : "border-neutral-300 dark:border-neutral-700"
                        }`}
                      >
                        {isMyVote && (
                          <View className="w-2 h-2 rounded-full bg-white dark:bg-black" />
                        )}
                      </View>
                      <Text
                        className={`text-sm font-medium flex-1 ${
                          isMyVote
                            ? "text-white dark:text-black"
                            : "text-black dark:text-white"
                        }`}
                        numberOfLines={2}
                      >
                        {option.text}
                      </Text>
                    </View>

                    {showResults && (
                      <View className="items-end ml-3">
                        <Text
                          className={`text-sm font-bold ${
                            isMyVote
                              ? "text-white dark:text-black"
                              : "text-black dark:text-white"
                          }`}
                        >
                          {percent}%
                        </Text>
                        <Text
                          className={`text-xs ${
                            isMyVote
                              ? "text-white/70 dark:text-black/70"
                              : "text-neutral-400"
                          }`}
                        >
                          {option.vote_count}
                        </Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {!showResults && (
            <ThemedText className="text-xs text-center text-neutral-400">
              Results visible after voting
            </ThemedText>
          )}

          {ses.vote_type === "multiple" && !hasVoted && (
            <ThemedText className="text-xs text-center text-neutral-400">
              Tap multiple options to select
            </ThemedText>
          )}

          {voting && <ActivityIndicator color={colors.text} />}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
