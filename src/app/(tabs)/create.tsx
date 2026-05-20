import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  BottomTabInset,
  Colors,
  MaxContentWidth,
  Spacing,
} from "@/constants/theme";
import { useAuthStore, useFeedStore } from "@/stores";
import { supabase } from "@/utils/supabase";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type VoteType = "single" | "multiple";

const MAX_OPTIONS = 10;
const MIN_OPTIONS = 2;

export default function Create() {
  const { session } = useAuthStore();
  const { invalidate, prependItem } = useFeedStore();
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [voteType, setVoteType] = useState<VoteType>("single");
  const [submitting, setSubmitting] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 60,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const updateOption = (text: string, index: number) => {
    const updated = [...options];
    updated[index] = text;
    setOptions(updated);
  };

  const addOption = () => {
    if (options.length >= MAX_OPTIONS) return;
    setOptions([...options, ""]);
  };

  const removeOption = (index: number) => {
    if (options.length <= MIN_OPTIONS) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const validate = () => {
    if (!question.trim()) {
      shake();
      Alert.alert("Missing question", "Write something to vote on fr.");
      return false;
    }
    const filled = options.filter((o) => o.trim());
    if (filled.length < MIN_OPTIONS) {
      shake();
      Alert.alert("Need more options", "At least 2 options required.");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!session?.user) return;

    setSubmitting(true);
    try {
      const filledOptions = options.filter((o) => o.trim());

      const { data: ses, error: sesError } = await supabase
        .from("ses")
        .insert({
          question: question.trim(),
          vote_type: voteType,
          created_by: session.user.id,
        })
        .select()
        .single();

      if (sesError) throw sesError;

      const optionRows = filledOptions.map((text, index) => ({
        ses_id: ses.id,
        text: text.trim(),
        order: index,
      }));

      const { error: optionsError } = await supabase
        .from("ses_options")
        .insert(optionRows);

      if (optionsError) throw optionsError;

      setQuestion("");
      setOptions(["", ""]);
      setVoteType("single");
      invalidate();

      Alert.alert("Ses created!", "Your vote is live.", [
        {
          text: "View it",
          onPress: () => router.push(`/ses/${ses.id}` as any),
        },
        { text: "Create another", style: "cancel" },
      ]);
    } catch (err) {
      Alert.alert("Error", "Could not create ses. Try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const filledCount = options.filter((o) => o.trim()).length;
  const isReady = question.trim().length > 0 && filledCount >= MIN_OPTIONS;

  return (
    <ThemedView className="flex-1 items-center">
      <SafeAreaView
        className="flex-1 w-full"
        style={{ maxWidth: MaxContentWidth }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
          keyboardVerticalOffset={80}
        >
          <ScrollView
            className="flex-1"
            contentContainerClassName="px-4 pt-4 gap-6"
            style={{ paddingBottom: BottomTabInset + Spacing.three }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              <ThemedText className="text-2xl font-bold tracking-tight mb-1">
                New Ses
              </ThemedText>
              <ThemedText className="text-sm text-neutral-400">
                Ask anything, get data back
              </ThemedText>
            </Animated.View>

            <View className="gap-2">
              <ThemedText className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
                Question
              </ThemedText>
              <TextInput
                value={question}
                onChangeText={setQuestion}
                placeholder="What do you want to know?"
                placeholderTextColor={colors.textSecondary}
                multiline
                maxLength={200}
                className="border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-black dark:text-white rounded-2xl px-4 py-3 text-base font-medium"
                style={{ minHeight: 80, textAlignVertical: "top" }}
              />
              <ThemedText className="text-xs text-neutral-400 text-right">
                {question.length}/200
              </ThemedText>
            </View>

            <View className="gap-2">
              <ThemedText className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
                Vote type
              </ThemedText>
              <View className="flex-row gap-2">
                {(["single", "multiple"] as VoteType[]).map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setVoteType(type)}
                    className={`flex-1 py-3 rounded-xl items-center border active:opacity-90 ${
                      voteType === type
                        ? "bg-black dark:bg-white border-black dark:border-white"
                        : "bg-transparent border-neutral-200 dark:border-neutral-800"
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        voteType === type
                          ? "text-white dark:text-black"
                          : "text-neutral-500"
                      }`}
                    >
                      {type === "single" ? "Single choice" : "Multiple choice"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View className="gap-2">
              <View className="flex-row justify-between items-center">
                <ThemedText className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
                  Options
                </ThemedText>
                <ThemedText className="text-xs text-neutral-400">
                  {options.length}/{MAX_OPTIONS}
                </ThemedText>
              </View>

              <View className="gap-2">
                {options.map((option, index) => (
                  <View key={index} className="flex-row items-center gap-2">
                    <View className="w-6 h-6 rounded-full border border-neutral-300 dark:border-neutral-700 items-center justify-center">
                      <ThemedText className="text-xs text-neutral-400 font-medium">
                        {index + 1}
                      </ThemedText>
                    </View>

                    <TextInput
                      value={option}
                      onChangeText={(text) => updateOption(text, index)}
                      placeholder={`Option ${index + 1}`}
                      placeholderTextColor={colors.textSecondary}
                      maxLength={100}
                      className="flex-1 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-black dark:text-white rounded-xl px-4 py-3 text-sm font-medium"
                    />

                    {options.length > MIN_OPTIONS && (
                      <Pressable
                        onPress={() => removeOption(index)}
                        className="w-8 h-8 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-900 active:opacity-70"
                      >
                        <ThemedText className="text-neutral-400 text-base leading-none">
                          ×
                        </ThemedText>
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>

              {options.length < MAX_OPTIONS && (
                <Pressable
                  onPress={addOption}
                  className="flex-row items-center gap-2 py-3 px-4 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl active:opacity-70"
                >
                  <ThemedText className="text-neutral-400 text-lg leading-none">
                    +
                  </ThemedText>
                  <ThemedText className="text-sm text-neutral-400">
                    Add option
                  </ThemedText>
                </Pressable>
              )}
            </View>

            <Pressable
              onPress={handleSubmit}
              disabled={!isReady || submitting}
              className={`py-4 rounded-2xl items-center active:opacity-90 ${
                isReady && !submitting
                  ? "bg-black dark:bg-white"
                  : "bg-neutral-200 dark:bg-neutral-800"
              }`}
              style={{ marginBottom: BottomTabInset + Spacing.three }}
            >
              {submitting ? (
                <ActivityIndicator
                  color={scheme === "dark" ? "#000" : "#fff"}
                />
              ) : (
                <Text
                  className={`font-semibold text-base ${
                    isReady ? "text-white dark:text-black" : "text-neutral-400"
                  }`}
                >
                  Launch Ses
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}
