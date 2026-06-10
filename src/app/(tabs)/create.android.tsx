import {
  EndDatePresets,
  PostVoteSheet,
  QualityHints,
  SectionLabel,
  Topic,
  TopicChip,
} from "@/components/create/components";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, Colors, MaxContentWidth } from "@/constants/theme";
import { useAuthStore, useFeedStore } from "@/stores";
import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  LayoutAnimation,
  PanResponder,
  Pressable,
  ScrollView,
  StatusBar,
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
const OPTION_ROW_HEIGHT = 58;
const STEP_LABELS = ["Question", "Options", "Details"];

function DraggableOptions({
  options,
  focusedOptionIdx,
  setFocusedOptionIdx,
  updateOption,
  removeOption,
}: {
  options: string[];
  focusedOptionIdx: number | null;
  setFocusedOptionIdx: (i: number | null) => void;
  updateOption: (text: string, index: number) => void;
  removeOption: (index: number) => void;
}) {
  const [items, setItems] = useState(options);
  const dragIndex = useRef<number | null>(null);
  const dragY = useRef(new Animated.Value(0)).current;
  const currentY = useRef(0);
  const startY = useRef(0);

  useEffect(() => {
    setItems(options);
  }, [options.length]);

  const syncParent = (newItems: string[]) => {
    newItems.forEach((text, i) => updateOption(text, i));
  };

  const makePanResponder = (index: number) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 4,
      onPanResponderGrant: () => {
        dragIndex.current = index;
        startY.current = index * OPTION_ROW_HEIGHT;
        currentY.current = 0;
        dragY.setValue(0);
      },
      onPanResponderMove: (_, gs) => {
        currentY.current = gs.dy;
        dragY.setValue(gs.dy);
        const newIdx = Math.max(
          0,
          Math.min(
            items.length - 1,
            Math.round((startY.current + gs.dy) / OPTION_ROW_HEIGHT),
          ),
        );
        if (newIdx !== dragIndex.current) {
          const reordered = [...items];
          const [moved] = reordered.splice(dragIndex.current!, 1);
          reordered.splice(newIdx, 0, moved);
          dragIndex.current = newIdx;
          startY.current = newIdx * OPTION_ROW_HEIGHT;
          currentY.current = 0;
          dragY.setValue(0);
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setItems(reordered);
          syncParent(reordered);
        }
      },
      onPanResponderRelease: () => {
        dragY.setValue(0);
        dragIndex.current = null;
      },
    });

  return (
    <View style={{ gap: 10 }}>
      {items.map((option, index) => {
        const panResponder = makePanResponder(index);
        return (
          <View key={index} style={styles.optionRow}>
            <View {...panResponder.panHandlers} style={styles.dragHandle}>
              <Ionicons name="reorder-three-outline" size={20} color="#ccc" />
            </View>

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
              onChangeText={(text) => {
                const updated = [...items];
                updated[index] = text;
                setItems(updated);
                updateOption(text, index);
              }}
              onFocus={() => setFocusedOptionIdx(index)}
              onBlur={() => setFocusedOptionIdx(null)}
              placeholder={`Option ${index + 1}`}
              placeholderTextColor="#ccc"
              maxLength={100}
              returnKeyType={index === items.length - 1 ? "done" : "next"}
              style={[
                styles.optionInput,
                focusedOptionIdx === index && styles.optionInputFocused,
              ]}
            />

            {items.length > MIN_OPTIONS && (
              <Pressable
                onPress={() => removeOption(index)}
                android_ripple={{
                  color: "#ffe4e6",
                  borderless: true,
                  radius: 18,
                }}
                style={styles.removeBtn}
              >
                <Ionicons
                  name="remove-circle-outline"
                  size={20}
                  color="#d1d5db"
                />
              </Pressable>
            )}
          </View>
        );
      })}
    </View>
  );
}

export default function Create() {
  const { session } = useAuthStore();
  const { invalidate } = useFeedStore();
  const router = useRouter();
  const colors = Colors.light;

  const [step, setStep] = useState(1);
  const [maxUnlockedStep, setMaxUnlockedStep] = useState(1);

  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [voteType, setVoteType] = useState<VoteType>("single");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [endDays, setEndDays] = useState<number | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);

  const [submitting, setSubmitting] = useState(false);
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
      toValue: (step - 1) / 2,
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

  const toggleTopic = (id: string) => {
    setSelectedTopics((prev) => {
      if (prev.includes(id)) return prev.filter((t) => t !== id);
      if (prev.length >= MAX_TOPICS) {
        Alert.alert("Max topics", `Only ${MAX_TOPICS} topics allowed.`);
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
    if (binaryTriggers.includes(lowerQ.split(/\s+/)[0])) {
      setOptions(["Yes", "No"]);
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
      } else if (newOpts.length < MAX_OPTIONS) newOpts.push(s);
    });
    setOptions(newOpts);
  };

  const handleNextStep = () => {
    if (step === 1 && question.trim().length < 5) {
      shake();
      Alert.alert("Too short", "Need at least 5 characters.");
      return;
    }
    if (step === 2 && options.filter((o) => o.trim()).length < MIN_OPTIONS) {
      shake();
      Alert.alert("Not enough options", "Need at least 2 options.");
      return;
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const nextStep = step + 1;
    setStep(nextStep);
    if (nextStep > maxUnlockedStep) setMaxUnlockedStep(nextStep);
  };

  const handleBack = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (step > 1) setStep((prev) => prev - 1);
    else router.back();
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
      Alert.alert("Skip description?", "Context helps people vote smarter.", [
        {
          text: "Add it",
          onPress: () => {
            LayoutAnimation.configureNext(
              LayoutAnimation.Presets.easeInEaseOut,
            );
            setStep(1);
          },
          style: "cancel",
        },
        { text: "Skip", onPress: () => doSubmit() },
      ]);
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
    setQuestion("");
    setDescription("");
    setOptions(["", ""]);
    setVoteType("single");
    setIsAnonymous(false);
    setEndDays(null);
    setSelectedTopics([]);
    setMaxUnlockedStep(1);
    setStep(1);

    Alert.alert("Ses is live!", "Your question is out there.", [
      {
        text: "View it",
        onPress: () =>
          createdSesId && router.push(`/ses/${createdSesId}` as any),
      },
      { text: "Create another", style: "cancel" },
    ]);
  };

  const isStep1Ready = question.trim().length >= 5;
  const isStep2Ready = options.filter((o) => o.trim()).length >= MIN_OPTIONS;
  const hasSuggestions = question.trim().length > 10;
  const isCtaActive =
    (step === 1 && isStep1Ready) ||
    (step === 2 && isStep2Ready) ||
    (step === 3 && !submitting);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <ThemedView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SafeAreaView
        style={[
          styles.safeArea,
          { maxWidth: MaxContentWidth, alignSelf: "center", width: "100%" },
        ]}
      >
        <View style={styles.header}>
          <Pressable
            onPress={handleBack}
            android_ripple={{ color: "#f0f0f0", radius: 20, borderless: true }}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={22} color="#111" />
          </Pressable>

          <View style={styles.stepLabels}>
            {STEP_LABELS.map((label, i) => {
              const s = i + 1;
              const isActive = step === s;
              const isDone = step > s;
              return (
                <Pressable
                  key={s}
                  onPress={() => handleJumpToStep(s)}
                  disabled={s > maxUnlockedStep}
                  android_ripple={{ color: "#f0f0f0", borderless: true }}
                  style={styles.stepLabelBtn}
                >
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
                      styles.stepLabelText,
                      isActive && styles.stepLabelTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
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
          behavior="height"
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
                {step === 1 && "What's on your mind?"}
                {step === 2 && "Give them options"}
                {step === 3 && "Final details"}
              </Text>
              <Text style={styles.stepSubtitle}>
                {step === 1 && "Ask your audience anything."}
                {step === 2 && "Hold and drag to reorder."}
                {step === 3 && "Fine-tune how this ses runs."}
              </Text>
            </Animated.View>

            {step === 1 && (
              <View style={styles.sectionGap}>
                <View>
                  <SectionLabel>Question</SectionLabel>
                  <TextInput
                    value={question}
                    onChangeText={setQuestion}
                    placeholder="What do you wanna know?"
                    placeholderTextColor="#ccc"
                    multiline
                    maxLength={200}
                    autoFocus
                    style={[styles.textArea, { minHeight: 110 }]}
                    textAlignVertical="top"
                  />
                  <View style={styles.rowBetween}>
                    <QualityHints
                      question={question}
                      description={description}
                    />
                    <Text style={styles.charCount}>{question.length}/200</Text>
                  </View>
                </View>

                <View>
                  <SectionLabel>Context (optional)</SectionLabel>
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Add details so people vote smarter..."
                    placeholderTextColor="#ccc"
                    multiline
                    maxLength={300}
                    style={[
                      styles.textArea,
                      styles.textAreaSm,
                      { minHeight: 90 },
                    ]}
                    textAlignVertical="top"
                  />
                  <Text
                    style={[
                      styles.charCount,
                      { textAlign: "right", marginTop: 6, paddingRight: 4 },
                    ]}
                  >
                    {description.length}/300
                  </Text>
                </View>
              </View>
            )}

            {step === 2 && (
              <View style={styles.sectionGap}>
                <View>
                  <SectionLabel>Vote type</SectionLabel>
                  <View style={styles.voteTypeRow}>
                    {(["single", "multiple"] as VoteType[]).map((type) => (
                      <Pressable
                        key={type}
                        onPress={() => setVoteType(type)}
                        android_ripple={{
                          color: voteType === type ? "#333" : "#eee",
                        }}
                        style={[
                          styles.voteTypeBtn,
                          voteType === type && styles.voteTypeBtnActive,
                        ]}
                      >
                        <Ionicons
                          name={
                            type === "single"
                              ? "radio-button-on-outline"
                              : "checkbox-outline"
                          }
                          size={15}
                          color={voteType === type ? "#fff" : "#aaa"}
                          style={{ marginRight: 6 }}
                        />
                        <Text
                          style={[
                            styles.voteTypeBtnText,
                            voteType === type && styles.voteTypeBtnTextActive,
                          ]}
                        >
                          {type === "single" ? "Single" : "Multiple"}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View>
                  <View style={styles.rowBetween}>
                    <SectionLabel>Options</SectionLabel>
                    <View style={styles.rowGap}>
                      {hasSuggestions && (
                        <Pressable
                          onPress={suggestOptionsFromQuestion}
                          android_ripple={{
                            color: "#dbeafe",
                            borderless: false,
                          }}
                          style={styles.magicBtn}
                        >
                          <Ionicons
                            name="sparkles-outline"
                            size={13}
                            color="#0ea5e9"
                          />
                          <Text style={styles.magicBtnText}>Magic Fill</Text>
                        </Pressable>
                      )}
                      <Text style={styles.charCount}>
                        {options.length}/{MAX_OPTIONS}
                      </Text>
                    </View>
                  </View>

                  <DraggableOptions
                    options={options}
                    focusedOptionIdx={focusedOptionIdx}
                    setFocusedOptionIdx={setFocusedOptionIdx}
                    updateOption={updateOption}
                    removeOption={removeOption}
                  />

                  {options.length < MAX_OPTIONS && (
                    <Pressable
                      onPress={addOption}
                      android_ripple={{ color: "#dbeafe" }}
                      style={styles.addOptionBtn}
                    >
                      <Ionicons name="add-outline" size={18} color="#0ea5e9" />
                      <Text style={styles.addOptionBtnText}>Add Option</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}

            {step === 3 && (
              <View style={styles.sectionGap}>
                <View>
                  <SectionLabel>Topics (optional)</SectionLabel>
                  {loadingTopics ? (
                    <ActivityIndicator
                      size="small"
                      color="#0ea5e9"
                      style={{ marginTop: 12 }}
                    />
                  ) : (
                    <View style={styles.topicsWrap}>
                      {topics.map((topic) => (
                        <TopicChip
                          key={topic.id}
                          topic={topic}
                          selected={selectedTopics.includes(topic.id)}
                          onPress={() => toggleTopic(topic.id)}
                          isDark={false}
                        />
                      ))}
                    </View>
                  )}
                  {selectedTopics.length > 0 && (
                    <Text style={styles.selectedTopicsText}>
                      {selectedTopics.length}/{MAX_TOPICS} selected
                    </Text>
                  )}
                </View>

                <View style={styles.settingsSection}>
                  <SectionLabel>Settings</SectionLabel>

                  <View style={styles.settingRow}>
                    <View style={styles.settingIconWrap}>
                      <Ionicons name="eye-off-outline" size={18} color="#888" />
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
                      trackColor={{ false: "#e5e5e5", true: "#111" }}
                      thumbColor="#fff"
                    />
                  </View>

                  <View style={styles.settingCard}>
                    <View
                      style={[
                        styles.settingRow,
                        {
                          paddingVertical: 0,
                          paddingHorizontal: 0,
                          backgroundColor: "transparent",
                        },
                      ]}
                    >
                      <View style={styles.settingIconWrap}>
                        <Ionicons name="time-outline" size={18} color="#888" />
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
          <Pressable
            onPress={step < 3 ? handleNextStep : handleSubmit}
            disabled={
              (step === 1 && !isStep1Ready) ||
              (step === 2 && !isStep2Ready) ||
              submitting
            }
            android_ripple={{ color: isCtaActive ? "#333" : "#ddd" }}
            style={[styles.ctaBtn, !isCtaActive && styles.ctaBtnDisabled]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.ctaBtnInner}>
                <Text
                  style={[
                    styles.ctaBtnText,
                    !isCtaActive && styles.ctaBtnTextDisabled,
                  ]}
                >
                  {step < 3 ? "Continue" : "Launch Ses"}
                </Text>
                {!submitting && (
                  <Ionicons
                    name={step < 3 ? "arrow-forward" : "rocket-outline"}
                    size={16}
                    color={isCtaActive ? "#fff" : "#ccc"}
                    style={{ marginLeft: 6 }}
                  />
                )}
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
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
  },
  stepLabels: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  stepLabelBtn: { alignItems: "center", gap: 4, flex: 1 },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: { backgroundColor: "#111" },
  stepDotDone: { backgroundColor: "#111" },
  stepDotText: { fontSize: 11, fontWeight: "800", color: "#bbb" },
  stepDotTextActive: { color: "#fff" },
  stepLabelText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#ccc",
    letterSpacing: 0.3,
  },
  stepLabelTextActive: { color: "#111" },
  headerSpacer: { width: 40 },
  progressTrack: { height: 2, backgroundColor: "#f0f0f0" },
  progressFill: { height: 2, backgroundColor: "#111", borderRadius: 2 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, gap: 20 },
  stepTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#111",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  stepSubtitle: { fontSize: 13, fontWeight: "500", color: "#bbb" },
  sectionGap: { gap: 20 },
  textArea: {
    backgroundColor: "#f7f7f8",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: "500",
    color: "#111",
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  textAreaSm: { fontSize: 14 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 4,
    marginTop: 6,
  },
  charCount: {
    fontSize: 11,
    fontWeight: "600",
    color: "#ccc",
    marginLeft: "auto",
  },
  voteTypeRow: { flexDirection: "row", gap: 10 },
  voteTypeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: "#f7f7f8",
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  voteTypeBtnActive: { backgroundColor: "#111", borderColor: "#111" },
  voteTypeBtnText: { fontSize: 13, fontWeight: "700", color: "#aaa" },
  voteTypeBtnTextActive: { color: "#fff" },
  rowGap: { flexDirection: "row", alignItems: "center", gap: 10 },
  magicBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
  },
  magicBtnText: { fontSize: 12, fontWeight: "700", color: "#0ea5e9" },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dragHandle: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  optionBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  optionBadgeActive: { backgroundColor: "#111" },
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
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  optionInputFocused: {
    borderColor: "#e0e0e0",
    backgroundColor: "#fafafa",
  },
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
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderStyle: "dashed",
  },
  addOptionBtnText: { fontSize: 13, fontWeight: "700", color: "#aaa" },
  topicsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  selectedTopicsText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0ea5e9",
    marginTop: 10,
    paddingLeft: 2,
  },
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
  settingIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#efefef",
    alignItems: "center",
    justifyContent: "center",
  },
  settingText: { flex: 1 },
  settingLabel: { fontSize: 14, fontWeight: "700", color: "#111" },
  settingDesc: { fontSize: 12, fontWeight: "400", color: "#bbb", marginTop: 1 },
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
    backgroundColor: "#111",
  },
  ctaBtnDisabled: { backgroundColor: "#f0f0f0" },
  ctaBtnInner: { flexDirection: "row", alignItems: "center" },
  ctaBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.2,
  },
  ctaBtnTextDisabled: { color: "#ccc" },
});
