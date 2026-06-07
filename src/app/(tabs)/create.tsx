import {
  PostVoteSheet,
  SectionLabel,
  Topic,
  TopicChip,
} from "@/components/create/components";
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
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Fragment, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type VoteType = "single" | "multiple";

const MAX_OPTIONS = 10;
const MIN_OPTIONS = 2;
const MAX_TOPICS = 3;

export default function Create() {
  const { session } = useAuthStore();
  const { invalidate } = useFeedStore();
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const [step, setStep] = useState(1);
  const [maxUnlockedStep, setMaxUnlockedStep] = useState(1);

  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [voteType, setVoteType] = useState<VoteType>("single");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [endDateEnabled, setEndDateEnabled] = useState(false);
  const [endDays, setEndDays] = useState("7");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [showPostVote, setShowPostVote] = useState(false);
  const [createdSesId, setCreatedSesId] = useState<string | null>(null);

  const [qFocused, setQFocused] = useState(false);
  const [descFocused, setDescFocused] = useState(false);
  const [focusedOptionIdx, setFocusedOptionIdx] = useState<number | null>(null);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    supabase
      .from("topics")
      .select("id, name, slug, emoji, category")
      .order("name")
      .then(({ data }) => {
        setTopics(data ?? []);
        setLoadingTopics(false);
      });
  }, []);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 8,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -8,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 6,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 55,
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
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOptions([...options, ""]);
  };

  const removeOption = (index: number) => {
    if (options.length <= MIN_OPTIONS) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOptions(options.filter((_, i) => i !== index));
  };

  const toggleTopic = (id: string) => {
    setSelectedTopics((prev) => {
      if (prev.includes(id)) return prev.filter((t) => t !== id);
      if (prev.length >= MAX_TOPICS) {
        Alert.alert("Max topics", `Pick up to ${MAX_TOPICS} topics.`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const suggestOptionsFromQuestion = () => {
    const cleanQ = question.trim().replace(/\?$/, "");
    const lowerQ = cleanQ.toLowerCase();

    if (lowerQ.includes(" or ")) {
      const parts = cleanQ.split(/\s+or\s+/i);
      if (parts.length >= 2) {
        setOptions(
          parts
            .slice(0, MAX_OPTIONS)
            .map((p) => p.trim().charAt(0).toUpperCase() + p.trim().slice(1)),
        );
        return;
      }
    }

    const binaryTriggers = [
      "should",
      "is",
      "can",
      "do",
      "will",
      "are",
      "would",
    ];
    const startWord = lowerQ.split(/\s+/)[0];

    if (binaryTriggers.includes(startWord)) {
      setOptions(["Yes 👍", "No 👎"]);
      return;
    }

    const words = cleanQ
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 4);
    if (words.length === 0) return;
    const suggestions = words.map(
      (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
    );
    const newOpts = [...options];
    suggestions.forEach((s, i) => {
      if (i < newOpts.length) {
        if (!newOpts[i].trim()) newOpts[i] = s;
      } else if (newOpts.length < MAX_OPTIONS) {
        newOpts.push(s);
      }
    });
    setOptions(newOpts);
  };

  const handleNextStep = () => {
    if (step === 1 && question.trim().length < 5) {
      shake();
      Alert.alert(
        "Too short 💀",
        "Your question needs at least 5 characters bro.",
      );
      return;
    }
    if (step === 2) {
      const filledCount = options.filter((o) => o.trim()).length;
      if (filledCount < MIN_OPTIONS) {
        shake();
        Alert.alert("Need more options", "At least 2 options required.");
        return;
      }
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const nextStep = step + 1;
    setStep(nextStep);
    if (nextStep > maxUnlockedStep) setMaxUnlockedStep(nextStep);
  };

  const handleBack = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (step > 1) {
      setStep((prev) => prev - 1);
    } else {
      router.back();
    }
  };

  const handleJumpToStep = (targetStep: number) => {
    if (targetStep <= maxUnlockedStep && targetStep !== step) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setStep(targetStep);
    }
  };

  const handleSubmit = async () => {
    if (!session?.user) return;
    if (!description.trim()) {
      Alert.alert(
        "Skip description?",
        "Adding context helps people vote more thoughtfully.",
        [
          {
            text: "Add description",
            onPress: () => {
              LayoutAnimation.configureNext(
                LayoutAnimation.Presets.easeInEaseOut,
              );
              setStep(1);
            },
            style: "cancel",
          },
          { text: "Skip it", onPress: () => doSubmit() },
        ],
      );
      return;
    }
    await doSubmit();
  };

  const doSubmit = async () => {
    if (!session?.user) return;
    setSubmitting(true);
    try {
      const filledOptions = options.filter((o) => o.trim());
      const endDate = endDateEnabled
        ? new Date(
            Date.now() + parseInt(endDays || "7") * 86400000,
          ).toISOString()
        : null;

      const { data: ses, error: sesError } = await supabase
        .from("ses")
        .insert({
          question: question.trim(),
          description: description.trim() || null,
          vote_type: voteType,
          is_anonymous: isAnonymous,
          end_date: endDate,
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

      if (selectedTopics.length > 0) {
        await supabase
          .from("ses_topics")
          .insert(
            selectedTopics.map((topic_id) => ({ ses_id: ses.id, topic_id })),
          );
      }

      setCreatedSesId(ses.id);
      invalidate();
      setShowPostVote(true);
    } catch {
      Alert.alert("Error", "Could not create ses. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostVoteDone = () => {
    setShowPostVote(false);
    setQuestion("");
    setDescription("");
    setOptions(["", ""]);
    setVoteType("single");
    setIsAnonymous(false);
    setEndDateEnabled(false);
    setEndDays("7");
    setSelectedTopics([]);
    setMaxUnlockedStep(1);
    setStep(1);

    Alert.alert("Ses is live! 🔥", "Your question is out there.", [
      {
        text: "View it",
        onPress: () =>
          createdSesId && router.push(`/ses/${createdSesId}` as any),
      },
      { text: "Create another", style: "cancel" },
    ]);
  };

  const isStep1Ready = question.trim().length >= 5;
  const filledCount = options.filter((o) => o.trim()).length;
  const isStep2Ready = filledCount >= MIN_OPTIONS;
  const hasSuggestions = question.trim().length > 10;

  const isCtaActive =
    (step === 1 && isStep1Ready) ||
    (step === 2 && isStep2Ready) ||
    (step === 3 && !submitting);

  return (
    <ThemedView className="flex-1 bg-white dark:bg-black items-center">
      <SafeAreaView
        className="flex-1 w-full"
        style={{ maxWidth: MaxContentWidth }}
      >
        <View className="flex-row items-center px-6 py-4 gap-4">
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              { transform: [{ scale: pressed ? 0.92 : 1 }] },
            ]}
            className="w-10 h-10 items-center justify-center rounded-full bg-neutral-50 dark:bg-neutral-900"
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={isDark ? "#fff" : "#000"}
            />
          </Pressable>

          <View className="flex-1 flex-row items-center">
            {[1, 2, 3].map((s, i) => (
              <Fragment key={s}>
                <Pressable
                  disabled={s > maxUnlockedStep}
                  onPress={() => handleJumpToStep(s)}
                  style={({ pressed }) => [
                    { transform: [{ scale: pressed ? 0.9 : 1 }] },
                  ]}
                >
                  <View
                    className={`w-8 h-8 rounded-full items-center justify-center ${
                      step === s
                        ? "bg-sky-500"
                        : s < step
                          ? "bg-black dark:bg-white"
                          : s <= maxUnlockedStep
                            ? "bg-neutral-200 dark:bg-neutral-800"
                            : "bg-neutral-100 dark:bg-neutral-900"
                    }`}
                  >
                    {s < step ? (
                      <Ionicons
                        name="checkmark"
                        size={13}
                        color={isDark ? "#000" : "#fff"}
                      />
                    ) : (
                      <Text
                        className={`text-xs font-black ${
                          step === s
                            ? "text-white"
                            : "text-neutral-400 dark:text-neutral-600"
                        }`}
                      >
                        {s}
                      </Text>
                    )}
                  </View>
                </Pressable>
                {i < 2 && (
                  <View
                    className={`flex-1 h-0.5 mx-1.5 ${
                      s < step
                        ? "bg-black dark:bg-white"
                        : "bg-neutral-100 dark:bg-neutral-900"
                    }`}
                  />
                )}
              </Fragment>
            ))}
          </View>

          <View className="w-10" />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
          keyboardVerticalOffset={60}
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingTop: 12,
              gap: 24,
              paddingBottom: BottomTabInset + Spacing.three,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              <ThemedText className="text-3xl font-black tracking-tight text-black dark:text-white mb-1">
                {step === 1 && "What's on your mind?"}
                {step === 2 && "How should they answer?"}
                {step === 3 && "Final details"}
              </ThemedText>
              <ThemedText className="text-sm font-medium text-neutral-400 dark:text-neutral-500">
                {step === 1 && "Ask your audience anything."}
                {step === 2 && "Give them some solid options to pick from."}
                {step === 3 && "Fine-tune who sees this and how it runs."}
              </ThemedText>
            </Animated.View>

            {step === 1 && (
              <Animated.View className="flex-1 gap-6">
                <View>
                  <SectionLabel>Question</SectionLabel>
                  <TextInput
                    value={question}
                    onChangeText={setQuestion}
                    onFocus={() => setQFocused(true)}
                    onBlur={() => setQFocused(false)}
                    placeholder="What do you want to know?"
                    placeholderTextColor={isDark ? "#525252" : "#a3a3a3"}
                    multiline
                    maxLength={200}
                    autoFocus
                    className={`bg-neutral-50 dark:bg-neutral-900 text-black dark:text-white rounded-2xl px-5 py-4 text-base font-semibold ${
                      qFocused
                        ? "bg-sky-50/50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400"
                        : ""
                    }`}
                    style={{ minHeight: 110, textAlignVertical: "top" }}
                  />
                  <View className="flex-row justify-between items-center px-1 mt-2">
                    <ThemedText className="text-xs font-bold text-sky-500">
                      {question.length < 5 && question.length > 0
                        ? "Keep typing..."
                        : ""}
                    </ThemedText>
                    <ThemedText className="text-xs font-bold text-neutral-400 dark:text-neutral-600">
                      {question.length}/200
                    </ThemedText>
                  </View>
                </View>

                <View>
                  <SectionLabel>Context (optional)</SectionLabel>
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    onFocus={() => setDescFocused(true)}
                    onBlur={() => setDescFocused(false)}
                    placeholder="Add details so people vote better..."
                    placeholderTextColor={isDark ? "#525252" : "#a3a3a3"}
                    multiline
                    maxLength={300}
                    className={`bg-neutral-50 dark:bg-neutral-900 text-black dark:text-white rounded-2xl px-5 py-4 text-sm font-medium ${
                      descFocused
                        ? "bg-sky-50/50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400"
                        : ""
                    }`}
                    style={{ minHeight: 90, textAlignVertical: "top" }}
                  />
                  <View className="px-1 mt-2">
                    <ThemedText className="text-xs font-bold text-neutral-400 dark:text-neutral-600 text-right">
                      {description.length}/300
                    </ThemedText>
                  </View>
                </View>
              </Animated.View>
            )}

            {step === 2 && (
              <Animated.View className="flex-1 gap-6">
                <View>
                  <SectionLabel>Vote type</SectionLabel>
                  <View className="flex-row gap-3">
                    {(["single", "multiple"] as VoteType[]).map((type) => (
                      <Pressable
                        key={type}
                        onPress={() => setVoteType(type)}
                        style={({ pressed }) => [
                          { transform: [{ scale: pressed ? 0.97 : 1 }] },
                        ]}
                        className={`flex-1 py-4 rounded-2xl items-center ${
                          voteType === type
                            ? "bg-black dark:bg-white"
                            : "bg-neutral-50 dark:bg-neutral-900"
                        }`}
                      >
                        <Text
                          className={`text-sm font-black tracking-tight ${
                            voteType === type
                              ? "text-white dark:text-black"
                              : "text-neutral-400 dark:text-neutral-500"
                          }`}
                        >
                          {type === "single" ? "Single Choice" : "Multiple"}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View>
                  <View className="flex-row justify-between items-center mb-3">
                    <SectionLabel>Options</SectionLabel>
                    <View className="flex-row items-center gap-4">
                      {hasSuggestions && (
                        <Pressable
                          onPress={suggestOptionsFromQuestion}
                          style={({ pressed }) => [
                            { transform: [{ scale: pressed ? 0.92 : 1 }] },
                          ]}
                          className="flex-row items-center gap-1.5 bg-sky-50 dark:bg-sky-950/40 px-3 py-1.5 rounded-full"
                        >
                          <Ionicons name="sparkles" size={12} color="#0ea5e9" />
                          <Text className="text-xs font-black text-sky-600 dark:text-sky-400">
                            Magic Fill
                          </Text>
                        </Pressable>
                      )}
                      <ThemedText className="text-xs font-bold text-neutral-400 dark:text-neutral-600">
                        {options.length}/{MAX_OPTIONS}
                      </ThemedText>
                    </View>
                  </View>

                  <View className="gap-3">
                    {options.map((option, index) => (
                      <View key={index} className="flex-row items-center gap-3">
                        <View
                          className={`w-7 h-7 rounded-full items-center justify-center flex-shrink-0 ${
                            option.trim()
                              ? "bg-sky-500"
                              : "bg-neutral-100 dark:bg-neutral-900"
                          }`}
                        >
                          <Text
                            className={`text-xs font-black ${
                              option.trim()
                                ? "text-white"
                                : "text-neutral-400 dark:text-neutral-600"
                            }`}
                          >
                            {index + 1}
                          </Text>
                        </View>

                        <TextInput
                          value={option}
                          onChangeText={(text) => updateOption(text, index)}
                          onFocus={() => setFocusedOptionIdx(index)}
                          onBlur={() => setFocusedOptionIdx(null)}
                          placeholder={`Option ${index + 1}`}
                          placeholderTextColor={isDark ? "#525252" : "#a3a3a3"}
                          maxLength={100}
                          returnKeyType={
                            index === options.length - 1 ? "done" : "next"
                          }
                          className={`flex-1 bg-neutral-50 dark:bg-neutral-900 text-black dark:text-white rounded-2xl px-5 py-4 text-sm font-semibold ${
                            focusedOptionIdx === index
                              ? "bg-sky-50/50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400"
                              : ""
                          }`}
                        />

                        {options.length > MIN_OPTIONS && (
                          <Pressable
                            onPress={() => removeOption(index)}
                            style={({ pressed }) => [
                              { transform: [{ scale: pressed ? 0.85 : 1 }] },
                            ]}
                            className="w-9 h-9 items-center justify-center rounded-full bg-neutral-50 dark:bg-neutral-900"
                          >
                            <Ionicons
                              name="close"
                              size={16}
                              color={isDark ? "#ef4444" : "#f43f5e"}
                            />
                          </Pressable>
                        )}
                      </View>
                    ))}
                  </View>

                  {options.length < MAX_OPTIONS && (
                    <Pressable
                      onPress={addOption}
                      style={({ pressed }) => [
                        { transform: [{ scale: pressed ? 0.98 : 1 }] },
                      ]}
                      className="flex-row items-center justify-center gap-2 py-4 mt-3 bg-sky-50/40 dark:bg-sky-950/10 rounded-2xl"
                    >
                      <Ionicons name="add" size={18} color="#0ea5e9" />
                      <Text className="text-sm font-black text-sky-600 dark:text-sky-400">
                        Add Option
                      </Text>
                    </Pressable>
                  )}
                </View>
              </Animated.View>
            )}

            {step === 3 && (
              <Animated.View className="flex-1 gap-6">
                <View>
                  <SectionLabel>Topics (optional)</SectionLabel>
                  {loadingTopics ? (
                    <ActivityIndicator size="small" color="#0ea5e9" />
                  ) : (
                    <View className="flex-row flex-wrap gap-2 mt-2">
                      {topics.map((topic) => (
                        <TopicChip
                          key={topic.id}
                          topic={topic}
                          selected={selectedTopics.includes(topic.id)}
                          onPress={() => toggleTopic(topic.id)}
                          isDark={isDark}
                        />
                      ))}
                    </View>
                  )}
                  {selectedTopics.length > 0 && (
                    <ThemedText className="text-xs font-bold text-sky-500 mt-3 px-1">
                      {selectedTopics.length}/{MAX_TOPICS} selected
                    </ThemedText>
                  )}
                </View>

                <View className="gap-3">
                  <SectionLabel>Settings</SectionLabel>

                  <View className="flex-row items-center justify-between py-4 px-5 bg-neutral-50 dark:bg-neutral-900 rounded-2xl">
                    <View className="flex-row items-center gap-3 flex-1">
                      <Ionicons name="eye-off" size={20} color="#0ea5e9" />
                      <View>
                        <ThemedText className="text-sm font-bold text-black dark:text-white">
                          Anonymous Voting
                        </ThemedText>
                        <ThemedText className="text-xs font-medium text-neutral-400 dark:text-neutral-500">
                          Hide voter identities
                        </ThemedText>
                      </View>
                    </View>
                    <Switch
                      value={isAnonymous}
                      onValueChange={setIsAnonymous}
                      trackColor={{
                        false: isDark ? "#262626" : "#e5e5e5",
                        true: "#0ea5e9",
                      }}
                      thumbColor={
                        isDark ? (isAnonymous ? "#fff" : "#a3a3a3") : "#fff"
                      }
                    />
                  </View>

                  <View className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl overflow-hidden">
                    <View className="flex-row items-center justify-between py-4 px-5">
                      <View className="flex-row items-center gap-3 flex-1">
                        <Ionicons name="time" size={20} color="#0ea5e9" />
                        <View>
                          <ThemedText className="text-sm font-bold text-black dark:text-white">
                            Expiry Date
                          </ThemedText>
                          <ThemedText className="text-xs font-medium text-neutral-400 dark:text-neutral-500">
                            Auto-close after set time
                          </ThemedText>
                        </View>
                      </View>
                      <Switch
                        value={endDateEnabled}
                        onValueChange={setEndDateEnabled}
                        trackColor={{
                          false: isDark ? "#262626" : "#e5e5e5",
                          true: "#0ea5e9",
                        }}
                        thumbColor={
                          isDark
                            ? endDateEnabled
                              ? "#fff"
                              : "#a3a3a3"
                            : "#fff"
                        }
                      />
                    </View>

                    {endDateEnabled && (
                      <View className="flex-row items-center gap-3 px-5 pb-4 bg-neutral-100/50 dark:bg-neutral-800/30">
                        <ThemedText className="text-sm font-bold text-neutral-500">
                          Close after
                        </ThemedText>
                        <TextInput
                          value={endDays}
                          onChangeText={(t) =>
                            setEndDays(t.replace(/[^0-9]/g, "").slice(0, 3))
                          }
                          keyboardType="number-pad"
                          maxLength={3}
                          className="bg-white dark:bg-neutral-800 text-black dark:text-white rounded-xl px-4 py-2 text-sm font-black w-20 text-center text-sky-600 dark:text-sky-400"
                        />
                        <ThemedText className="text-sm font-bold text-neutral-500">
                          days
                        </ThemedText>
                      </View>
                    )}
                  </View>
                </View>
              </Animated.View>
            )}

            <Pressable
              onPress={step < 3 ? handleNextStep : handleSubmit}
              disabled={
                (step === 1 && !isStep1Ready) ||
                (step === 2 && !isStep2Ready) ||
                submitting
              }
              style={({ pressed }) => [
                { transform: [{ scale: pressed ? 0.98 : 1 }] },
                { marginBottom: BottomTabInset + Spacing.three },
              ]}
              className={`py-5 rounded-2xl items-center mt-8 ${
                isCtaActive
                  ? "bg-black dark:bg-white"
                  : "bg-neutral-100 dark:bg-neutral-900"
              }`}
            >
              {submitting ? (
                <ActivityIndicator color={isDark ? "#000" : "#fff"} />
              ) : (
                <Text
                  className={`text-base font-black tracking-tight ${
                    isCtaActive
                      ? "text-white dark:text-black"
                      : "text-neutral-400 dark:text-neutral-600"
                  }`}
                >
                  {step < 3 ? "Continue" : "Launch Ses 🚀"}
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {createdSesId && session?.user?.id && (
        <PostVoteSheet
          visible={showPostVote}
          sesId={createdSesId}
          userId={session.user.id}
          isDark={isDark}
          colors={colors}
          onDone={handlePostVoteDone}
        />
      )}
    </ThemedView>
  );
}
