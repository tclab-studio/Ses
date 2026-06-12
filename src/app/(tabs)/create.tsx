import {
  EndDatePresets,
  PostVoteSheet,
  SectionLabel,
  Topic,
  TopicChip,
} from "@/components/create/components";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, Colors, MaxContentWidth } from "@/constants/theme";
import { useAuthStore, useFeedStore } from "@/stores";
import { aiMagicFill, enhanceQuestion, processSes } from "@/utils/ai";
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
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type VoteType = "single" | "multiple";

const MAX_OPTIONS = 10;
const MIN_OPTIONS = 2;
const MAX_TOPICS = 3;
const STEP_LABELS = ["Question", "Options"];

export default function Create() {
  const { session } = useAuthStore();
  const { invalidate } = useFeedStore();
  const router = useRouter();
  const colors = Colors.light;

  const [step, setStep] = useState(1);
  const [maxUnlockedStep, setMaxUnlockedStep] = useState(1);

  const [rawQuestion, setRawQuestion] = useState("");
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [isEnhanced, setIsEnhanced] = useState(false);

  const [options, setOptions] = useState(["", ""]);
  const [voteType, setVoteType] = useState<VoteType>("single");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [endDays, setEndDays] = useState<number | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [moderating, setModerating] = useState(false);
  const [magicFilling, setMagicFilling] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [showPostVote, setShowPostVote] = useState(false);
  const [createdSesId, setCreatedSesId] = useState<string | null>(null);

  const [focusedOptionIdx, setFocusedOptionIdx] = useState<number | null>(null);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: step - 1, // 0 for step 1, 1 for step 2
      damping: 20,
      stiffness: 120,
      useNativeDriver: false,
    }).start();
  }, [step]);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 6,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const updateOption = (text: string, index: number) => {
    setOptions((prev) => {
      const updated = [...prev];
      updated[index] = text;
      return updated;
    });
  };

  const addOption = () => {
    if (options.length >= MAX_OPTIONS) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOptions((prev) => [...prev, ""]);
  };

  const removeOption = (index: number) => {
    if (options.length <= MIN_OPTIONS) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const fallbackMagicFill = () => {
    const cleanQ = question.trim().replace(/\?$/, "");
    const lowerQ = cleanQ.toLowerCase();

    if (lowerQ.includes(" or ")) {
      const parts = cleanQ.split(/\s+or\s+/i);
      if (parts.length >= 2) {
        setOptions(parts.slice(0, MAX_OPTIONS).map((p) => p.trim()));
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
    if (binaryTriggers.includes(lowerQ.split(/\s+/)[0])) {
      setOptions(["Yes", "No"]);
      return;
    }

    setOptions(["Option 1", "Option 2"]);
  };

  const handleAiMagicFill = async () => {
    if (magicFilling || question.trim().length < 5) return;
    setMagicFilling(true);
    try {
      const suggestions = await aiMagicFill(
        question.trim(),
        description.trim(),
      );
      if (suggestions.length >= 2) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setOptions(suggestions);
      } else {
        fallbackMagicFill();
      }
    } catch {
      fallbackMagicFill();
    } finally {
      setMagicFilling(false);
    }
  };

  const handleNextStep = async () => {
    if (step === 1) {
      if (!isEnhanced) {
        if (rawQuestion.trim().length < 5) {
          shake();
          Alert.alert("Too short", "Need at least 5 characters.");
          return;
        }
        if (loadingTopics) {
          Alert.alert("Loading", "Please wait while topics load...");
          return;
        }

        setIsEnhancing(true);
        try {
          const result = await enhanceQuestion(rawQuestion.trim(), topics);
          setQuestion(result.question || rawQuestion);
          setDescription(result.context || "");

          const topicIds = (result.topics || [])
            .map(
              (slug) =>
                topics.find((t) => t.slug === slug || t.name === slug)?.id,
            )
            .filter((id): id is string => !!id)
            .slice(0, MAX_TOPICS);
          setSelectedTopics(topicIds);

          setIsEnhanced(true);
        } catch {
          Alert.alert("Error", "AI failed to enhance. Try again.");
        } finally {
          setIsEnhancing(false);
        }
        return;
      } else {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setStep(2);
        if (2 > maxUnlockedStep) setMaxUnlockedStep(2);

        // Auto-generate options when entering Step 2 if they are empty
        if (options.every((o) => !o.trim())) {
          setTimeout(() => handleAiMagicFill(), 300);
        }
        return;
      }
    }
  };

  const handleBack = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (step === 2) {
      setStep(1);
    } else if (isEnhanced) {
      setIsEnhanced(false); // Go back to raw input
    } else {
      router.back();
    }
  };
  const handleSubmit = async () => {
    if (!session?.user) return;
    const filled = options.filter((o) => o.trim());
    if (filled.length < MIN_OPTIONS) {
      shake();
      Alert.alert("Not enough options", "Need at least 2 options.");
      return;
    }
    await doSubmit();
  };

  const doSubmit = async () => {
    if (!session?.user) return;
    setSubmitting(true);
    try {
      const filledOptions = options.filter((o) => o.trim());
      const endDate =
        endDays !== null
          ? new Date(Date.now() + endDays * 86400000).toISOString()
          : null;

      const aiResult = await processSes(question.trim());

      if (aiResult.safetyStatus === "blocked") {
        shake();
        Alert.alert(
          "Content blocked",
          "Your question violates our guidelines.",
        );
        return;
      }

      const { data: ses, error: sesError } = await supabase
        .from("ses")
        .insert({
          question: aiResult.normalizedText || question.trim(),
          description: description.trim() || null,
          vote_type: voteType,
          is_anonymous: isAnonymous,
          end_date: endDate,
          created_by: session.user.id,
          ai_category: aiResult.category,
          ai_topics: aiResult.topics,
          ai_keywords: aiResult.keywords,
          ai_quality_score: aiResult.qualityScore,
          ai_quality_feedback: aiResult.qualityFeedback,
          ai_recommended_audience: aiResult.recommendedAudience,
          ai_safety_status: aiResult.safetyStatus,
        })
        .select()
        .single();

      if (sesError) throw sesError;

      const { error: optionsError } = await supabase.from("ses_options").insert(
        filledOptions.map((text, index) => ({
          ses_id: ses.id,
          text: text.trim(),
          order: index,
        })),
      );
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
    setRawQuestion("");
    setQuestion("");
    setDescription("");
    setIsEnhanced(false);
    setOptions(["", ""]);
    setVoteType("single");
    setIsAnonymous(false);
    setEndDays(null);
    setSelectedTopics([]);
    setMaxUnlockedStep(1);
    setStep(1);

    router.push(`/ses/${createdSesId}` as any);
  };

  const isBusy = moderating || submitting || magicFilling || isEnhancing;
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView
        style={[
          styles.safeArea,
          { maxWidth: MaxContentWidth, alignSelf: "center", width: "100%" },
        ]}
      >
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color="#111" />
          </Pressable>

          <View style={styles.stepIndicator}>
            {STEP_LABELS.map((label, i) => {
              const s = i + 1;
              const isActive = step === s;
              const isDone = step > s;
              return (
                <Fragment key={s}>
                  <View style={styles.stepBtn}>
                    <View
                      style={[
                        styles.stepDot,
                        isActive && styles.stepDotActive,
                        isDone && styles.stepDotDone,
                      ]}
                    >
                      {isDone ? (
                        <Ionicons name="checkmark" size={12} color="#fff" />
                      ) : (
                        <Text
                          style={[
                            styles.stepDotText,
                            isActive && styles.stepDotTextActive,
                          ]}
                        >
                          {s}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.stepLabel,
                        isActive && styles.stepLabelActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </View>
                  {i < 1 && (
                    <View
                      style={[styles.stepLine, isDone && styles.stepLineDone]}
                    />
                  )}
                </Fragment>
              );
            })}
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.progressTrack}>
          <Animated.View
            style={[styles.progressFill, { width: progressWidth }]}
          />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex1}
          keyboardVerticalOffset={60}
        >
          <ScrollView
            style={styles.flex1}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              <Text style={styles.stepTitle}>
                {step === 1 &&
                  (isEnhanced ? "Review your poll" : "What's on your mind?")}
                {step === 2 && "Options & Settings"}
              </Text>
              <Text style={styles.stepSubtitle}>
                {step === 1 &&
                  (isEnhanced
                    ? "AI fixed your question and added context."
                    : "Ask anything — AI will fix it and add context.")}
                {step === 2 &&
                  "AI generated smart options. Tweak them or regenerate."}
              </Text>
            </Animated.View>

            {step === 1 && (
              <View style={styles.sectionGap}>
                {!isEnhanced ? (
                  <View>
                    <SectionLabel>Your Question</SectionLabel>
                    <TextInput
                      value={rawQuestion}
                      onChangeText={setRawQuestion}
                      placeholder="What do you wanna know? (AI will fix it!)"
                      placeholderTextColor="#bbb"
                      multiline
                      maxLength={200}
                      autoFocus
                      style={[styles.textArea, { minHeight: 110 }]}
                      textAlignVertical="top"
                    />
                    <Text
                      style={[
                        styles.charCount,
                        { textAlign: "right", marginTop: 6, paddingRight: 4 },
                      ]}
                    >
                      {rawQuestion.length}/200
                    </Text>
                  </View>
                ) : (
                  <>
                    <View>
                      <SectionLabel>Question (AI Enhanced)</SectionLabel>
                      <TextInput
                        value={question}
                        onChangeText={setQuestion}
                        style={styles.textArea}
                        multiline
                        textAlignVertical="top"
                      />
                    </View>

                    {description.trim() ? (
                      <View>
                        <SectionLabel>Context (AI Generated)</SectionLabel>
                        <View style={styles.readOnlyBox}>
                          <Text style={styles.readOnlyText}>{description}</Text>
                        </View>
                      </View>
                    ) : null}

                    {selectedTopics.length > 0 && (
                      <View>
                        <SectionLabel>Topics (AI Selected)</SectionLabel>
                        <View style={styles.topicsWrap}>
                          {topics
                            .filter((t) => selectedTopics.includes(t.id))
                            .map((topic) => (
                              <TopicChip
                                key={topic.id}
                                topic={topic}
                                selected={true}
                                onPress={() => {}}
                                isDark={false}
                              />
                            ))}
                        </View>
                      </View>
                    )}
                  </>
                )}
              </View>
            )}

            {step === 2 && (
              <View style={styles.sectionGap}>
                <View>
                  <View style={styles.rowBetween}>
                    <SectionLabel>Options</SectionLabel>
                    <Pressable
                      onPress={handleAiMagicFill}
                      disabled={magicFilling}
                      style={styles.magicBtn}
                    >
                      {magicFilling ? (
                        <ActivityIndicator size="small" color="#6366f1" />
                      ) : (
                        <Ionicons name="sparkles" size={13} color="#6366f1" />
                      )}
                      <Text style={styles.magicBtnText}>
                        {magicFilling ? "Thinking..." : "Regenerate"}
                      </Text>
                    </Pressable>
                  </View>

                  <View style={{ gap: 10 }}>
                    {options.map((option, index) => (
                      <View key={index} style={styles.optionRow}>
                        <View
                          style={[
                            styles.optionBadge,
                            !!option.trim() && styles.optionBadgeActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.optionBadgeText,
                              !!option.trim() && styles.optionBadgeTextActive,
                            ]}
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
                          placeholderTextColor="#bbb"
                          maxLength={100}
                          style={[
                            styles.optionInput,
                            focusedOptionIdx === index &&
                              styles.optionInputFocused,
                          ]}
                        />
                        {options.length > MIN_OPTIONS && (
                          <Pressable
                            onPress={() => removeOption(index)}
                            style={styles.removeBtn}
                          >
                            <Ionicons
                              name="close-circle"
                              size={20}
                              color="#fca5a5"
                            />
                          </Pressable>
                        )}
                      </View>
                    ))}
                  </View>

                  {options.length < MAX_OPTIONS && (
                    <Pressable onPress={addOption} style={styles.addOptionBtn}>
                      <Ionicons
                        name="add-circle-outline"
                        size={18}
                        color="#aaa"
                      />
                      <Text style={styles.addOptionBtnText}>Add Option</Text>
                    </Pressable>
                  )}
                </View>

                <View style={styles.settingsSection}>
                  <SectionLabel>Settings</SectionLabel>
                  <View style={styles.settingRow}>
                    <View style={styles.settingIconWrap}>
                      <Ionicons
                        name="eye-off-outline"
                        size={18}
                        color="#6366f1"
                      />
                    </View>
                    <View style={styles.settingText}>
                      <Text style={styles.settingLabel}>Anonymous Voting</Text>
                      <Text style={styles.settingDesc}>
                        Hide voter identities
                      </Text>
                    </View>
                    <Switch
                      value={isAnonymous}
                      onValueChange={setIsAnonymous}
                      trackColor={{ false: "#e5e5e5", true: "#6366f1" }}
                      thumbColor="#fff"
                    />
                  </View>

                  <View style={styles.settingCard}>
                    <View style={styles.settingCardHeader}>
                      <View style={styles.settingIconWrap}>
                        <Ionicons
                          name="time-outline"
                          size={18}
                          color="#6366f1"
                        />
                      </View>
                      <View style={styles.settingText}>
                        <Text style={styles.settingLabel}>Expiry Date</Text>
                        <Text style={styles.settingDesc}>
                          Auto-close after set time
                        </Text>
                      </View>
                    </View>
                    <View style={{ marginTop: 14 }}>
                      <EndDatePresets
                        selectedDays={endDays}
                        onSelect={setEndDays}
                      />
                    </View>
                  </View>
                </View>
              </View>
            )}
            <View style={{ height: 100 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        <View
          style={[styles.ctaContainer, { paddingBottom: BottomTabInset + 8 }]}
        >
          {isBusy && (
            <View style={styles.moderatingBanner}>
              <ActivityIndicator size="small" color="#6366f1" />
              <Text style={styles.moderatingText}>
                {isEnhancing
                  ? "Enhancing with AI..."
                  : moderating
                    ? "Checking content..."
                    : "Generating options..."}
              </Text>
            </View>
          )}
          <Pressable
            onPress={step === 1 ? handleNextStep : handleSubmit}
            disabled={
              isBusy ||
              (step === 1 && !isEnhanced && rawQuestion.trim().length < 5)
            }
            style={[
              styles.ctaBtn,
              (isBusy ||
                (step === 1 && !isEnhanced && rawQuestion.trim().length < 5)) &&
                styles.ctaBtnDisabled,
            ]}
          >
            {isBusy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.ctaBtnInner}>
                <Text style={styles.ctaBtnText}>
                  {step === 1
                    ? isEnhanced
                      ? "Continue to Options"
                      : "Enhance with AI"
                    : "Launch Ses"}
                </Text>
                <Ionicons
                  name={step === 1 ? "sparkles" : "rocket-outline"}
                  size={16}
                  color="#fff"
                  style={{ marginLeft: 6 }}
                />
              </View>
            )}
          </Pressable>
        </View>
      </SafeAreaView>

      {createdSesId && session?.user?.id && (
        <PostVoteSheet
          visible={showPostVote}
          sesId={createdSesId}
          userId={session.user.id}
          isDark={false}
          colors={colors}
          onDone={handlePostVoteDone}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  flex1: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
  },
  stepIndicator: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtn: { alignItems: "center", gap: 4 },
  stepLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: "#eee",
    marginHorizontal: 6,
    marginBottom: 16,
  },
  stepLineDone: { backgroundColor: "#111" },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: { backgroundColor: "#6366f1" },
  stepDotDone: { backgroundColor: "#111" },
  stepDotText: { fontSize: 11, fontWeight: "800", color: "#bbb" },
  stepDotTextActive: { color: "#fff" },
  stepLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#ccc",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  stepLabelActive: { color: "#6366f1" },
  headerSpacer: { width: 38 },
  progressTrack: { height: 2, backgroundColor: "#f0f0f0" },
  progressFill: { height: 2, backgroundColor: "#6366f1", borderRadius: 2 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, gap: 20 },
  stepTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#111",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#aaa",
    lineHeight: 18,
  },
  sectionGap: { gap: 20 },
  textArea: {
    backgroundColor: "#f7f7f8",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: "500",
    color: "#111",
    borderWidth: 1.5,
    borderColor: "#f0f0f0",
  },
  readOnlyBox: {
    backgroundColor: "#f7f7f8",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  readOnlyText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#555",
    lineHeight: 20,
  },
  charCount: {
    fontSize: 11,
    fontWeight: "600",
    color: "#ccc",
    marginLeft: "auto",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 4,
    marginTop: 6,
  },
  magicBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#eef2ff",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
  },
  magicBtnText: { fontSize: 12, fontWeight: "800", color: "#6366f1" },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  optionBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  optionBadgeActive: { backgroundColor: "#6366f1" },
  optionBadgeText: { fontSize: 11, fontWeight: "800", color: "#bbb" },
  optionBadgeTextActive: { color: "#fff" },
  optionInput: {
    flex: 1,
    backgroundColor: "#f7f7f8",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    fontWeight: "500",
    color: "#111",
    borderWidth: 1.5,
    borderColor: "#f0f0f0",
  },
  optionInputFocused: { borderColor: "#c7d2fe", backgroundColor: "#fafafa" },
  removeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  addOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginTop: 8,
    backgroundColor: "#fafafa",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e8e8e8",
    borderStyle: "dashed",
  },
  addOptionBtnText: { fontSize: 13, fontWeight: "700", color: "#aaa" },
  topicsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  settingsSection: { gap: 10 },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#f7f7f8",
    borderRadius: 14,
    gap: 12,
  },
  settingCard: {
    backgroundColor: "#f7f7f8",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingCardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  settingIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#eef2ff",
    alignItems: "center",
    justifyContent: "center",
  },
  settingText: { flex: 1 },
  settingLabel: { fontSize: 14, fontWeight: "700", color: "#111" },
  settingDesc: { fontSize: 12, fontWeight: "400", color: "#bbb", marginTop: 1 },
  moderatingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#eef2ff",
    borderRadius: 10,
    marginBottom: 10,
  },
  moderatingText: { fontSize: 13, fontWeight: "600", color: "#6366f1" },
  ctaContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f5f5f5",
  },
  ctaBtn: {
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#6366f1",
  },
  ctaBtnDisabled: { backgroundColor: "#f0f0f0" },
  ctaBtnInner: { flexDirection: "row", alignItems: "center" },
  ctaBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.2,
  },
});
