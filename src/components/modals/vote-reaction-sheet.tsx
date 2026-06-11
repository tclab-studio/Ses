import { Colors } from "@/constants/theme";
import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";

const CONFIDENCE_LABELS = [
  "",
  "Not sure at all",
  "Slightly sure",
  "Pretty sure",
  "Very sure",
  "100% certain",
];

type VoteReactionSheetProps = {
  visible: boolean;
  sesId: string;
  optionId: string;
  userId: string;
  onDone: () => void;
};

export function VoteReactionSheet({
  visible,
  sesId,
  optionId,
  userId,
  onDone,
}: VoteReactionSheetProps) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const [confidence, setConfidence] = useState(0);
  const [opinion, setOpinion] = useState("");
  const [saving, setSaving] = useState(false);
  const slideAnim = useRef(new Animated.Value(400)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 22,
          stiffness: 180,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(400);
      backdropAnim.setValue(0);
      setConfidence(0);
      setOpinion("");
    }
  }, [visible]);

  const dismiss = (save: boolean) => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 400,
        damping: 24,
        stiffness: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => onDone());
  };

  const handleSave = async () => {
    if (confidence === 0 && !opinion.trim()) {
      dismiss(false);
      return;
    }
    setSaving(true);
    try {
      await supabase.from("ses_vote_reactions").upsert({
        ses_id: sesId,
        option_id: optionId,
        user_id: userId,
        confidence: confidence > 0 ? confidence : null,
        opinion: opinion.trim() || null,
      });
    } catch {}
    setSaving(false);
    dismiss(true);
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="none"
      visible={visible}
      onRequestClose={() => dismiss(false)}
    >
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.45)",
          opacity: backdropAnim,
          justifyContent: "flex-end",
        }}
      >
        <Pressable style={{ flex: 1 }} onPress={() => dismiss(false)} />

        <Animated.View
          style={{
            transform: [{ translateY: slideAnim }],
            backgroundColor: isDark ? "#0f0f0f" : "#fff",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            maxHeight: "90%",
          }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingTop: 20,
              paddingBottom: 40,
            }}
          >
            <Pressable>
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: isDark ? "#2a2a2a" : "#e5e5e5",
                  alignSelf: "center",
                  marginBottom: 22,
                }}
              />

              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "900",
                  color: isDark ? "#f0f0f0" : "#111",
                  letterSpacing: -0.4,
                  marginBottom: 4,
                }}
              >
                You voted! How confident? ✨
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: isDark ? "#555" : "#aaa",
                  fontWeight: "500",
                  marginBottom: 24,
                  lineHeight: 18,
                }}
              >
                Totally optional — just for your own stats.
              </Text>

              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  color: isDark ? "#444" : "#bbb",
                  textTransform: "uppercase",
                  letterSpacing: 1.2,
                  marginBottom: 12,
                }}
              >
                Confidence
              </Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable
                    key={star}
                    onPress={() =>
                      setConfidence(star === confidence ? 0 : star)
                    }
                    hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Ionicons
                      name={star <= confidence ? "star" : "star-outline"}
                      size={30}
                      color={
                        star <= confidence
                          ? "#f59e0b"
                          : isDark
                            ? "#2a2a2a"
                            : "#e5e5e5"
                      }
                    />
                  </Pressable>
                ))}
              </View>
              {confidence > 0 && (
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: isDark ? "#555" : "#aaa",
                    marginBottom: 20,
                  }}
                >
                  {CONFIDENCE_LABELS[confidence]}
                </Text>
              )}
              {confidence === 0 && <View style={{ marginBottom: 20 }} />}

              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  color: isDark ? "#444" : "#bbb",
                  textTransform: "uppercase",
                  letterSpacing: 1.2,
                  marginBottom: 8,
                }}
              >
                Why did you pick this?
              </Text>
              <TextInput
                value={opinion}
                onChangeText={setOpinion}
                placeholder="Share your reasoning... (optional)"
                placeholderTextColor={isDark ? "#333" : "#ccc"}
                multiline
                maxLength={300}
                style={{
                  backgroundColor: isDark ? "#171717" : "#f7f7f8",
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 14,
                  fontWeight: "500",
                  color: isDark ? "#e0e0e0" : "#111",
                  borderWidth: 1.5,
                  borderColor: isDark ? "#1f1f1f" : "#f0f0f0",
                  minHeight: 80,
                  textAlignVertical: "top",
                  marginBottom: 4,
                }}
              />
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: isDark ? "#333" : "#ddd",
                  textAlign: "right",
                  marginBottom: 24,
                }}
              >
                {opinion.length}/300
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  marginTop: 10,
                }}
              >
                <Pressable
                  onPress={() => dismiss(false)}
                  style={{
                    flex: 1,
                    height: 50,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1.5,
                    borderColor: isDark ? "#222" : "#e8e8e8",
                    marginRight: 5,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: isDark ? "#555" : "#999",
                    }}
                  >
                    Skip
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleSave}
                  disabled={saving}
                  style={{
                    flex: 1,
                    height: 50,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isDark ? "#fff" : "#111",
                    marginLeft: 5,
                  }}
                >
                  {saving ? (
                    <ActivityIndicator
                      color={isDark ? "#000" : "#fff"}
                      size="small"
                    />
                  ) : (
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "800",
                        color: isDark ? "#000" : "#fff",
                      }}
                    >
                      Save
                    </Text>
                  )}
                </Pressable>
              </View>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
