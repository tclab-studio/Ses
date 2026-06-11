import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";
import { useVoters, Voter } from "@/hooks/useVoters";
import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

type OptionMeta = { id: string; text: string; order: number };

function Avatar({
  uri,
  name,
  size = 28,
}: {
  uri: string | null;
  name: string;
  size?: number;
}) {
  const [hasError, setHasError] = useState(false);
  const palette = [
    "#4C6EF5",
    "#7048E8",
    "#0CA678",
    "#E8590C",
    "#F06595",
    "#15AABF",
  ];

  const charCodeSum = name
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const bg = palette[charCodeSum % palette.length];

  if (uri && !hasError) {
    return (
      <Image
        source={{ uri }}
        onError={() => setHasError(true)}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: size * 0.4, fontWeight: "800", color: "#fff" }}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

function VoterRow({
  voter,
  isDark,
  onPress,
  index,
  isLast,
}: {
  voter: Voter;
  isDark: boolean;
  onPress: () => void;
  index: number;
  isLast: boolean;
}) {
  const name = voter.username ?? "anon";
  const border = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 30)
        .springify()
        .damping(22)}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.6}
        style={[
          styles.voterRow,
          {
            borderBottomWidth: isLast ? 0 : 1,
            borderBottomColor: border,
          },
        ]}
      >
        <Avatar uri={voter.avatar_url} name={name} size={36} />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: isDark ? "#f3f3f3" : "#1a1a1a",
            }}
          >
            @{name}
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={14}
          color={isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)"}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function VotersScreen() {
  const searchParams = useLocalSearchParams();
  const id = (searchParams.id ??
    searchParams.sesId ??
    Object.values(searchParams)[0]) as string;

  const { session } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const [options, setOptions] = useState<OptionMeta[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [totalVotes, setTotalVotes] = useState(0);

  // Track selected filter tab ("all" or option ID)
  const [selectedOptionId, setSelectedOptionId] = useState<string>("all");

  const { data, isLoading: votersLoading } = useVoters(
    id,
    session?.user?.id ?? null,
  );

  useEffect(() => {
    if (!id || id === "undefined" || id === "[id]") {
      setOptionsLoading(false);
      return;
    }

    supabase
      .from("ses_options")
      .select("id, text, order")
      .eq("ses_id", id)
      .order("order")
      .then(({ data: opts }) => {
        setOptions(opts ?? []);
        setOptionsLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (data?.voters) {
      const uniquePeople = new Set(data.voters.map((v: any) => v.user_id));
      setTotalVotes(uniquePeople.size);
    }
  }, [data]);

  const bg = isDark ? "#0D0D0C" : "#F8F9FA";
  const border = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const muted = isDark ? "#707070" : "#8E8E93";
  const headerBtnBg = isDark ? "#1C1C1E" : "#EFEFF4";
  const containerCardBg = isDark ? "#161618" : "#FFFFFF";

  const isLoading = votersLoading || optionsLoading;

  // 1. Build list items grouped by matching options
  const allSections = options
    .map((opt) => {
      const matchingVoters =
        data?.voters?.filter((v: any) => v.option_id === opt.id) ?? [];
      return {
        option: opt,
        data: matchingVoters,
        count: matchingVoters.length,
      };
    })
    .filter((s) => s.data.length > 0);

  // 2. Filter runtime sections array depending on the top tab bar state
  const displayedSections =
    selectedOptionId === "all"
      ? allSections
      : allSections.filter((s) => s.option.id === selectedOptionId);

  return (
    <ThemedView style={{ flex: 1, backgroundColor: bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        {/* Header Layout */}
        <View style={[styles.header, { borderBottomColor: border }]}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: headerBtnBg }]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Voters
            </Text>
            <Text style={[styles.headerSubtitle, { color: muted }]}>
              {totalVotes} {totalVotes === 1 ? "person" : "people"} voted total
            </Text>
          </View>
        </View>

        {/* Top Rounded Full Tab Filter Bar */}
        {!isLoading && allSections.length > 0 && (
          <View style={[styles.tabBarContainer, { borderBottomColor: border }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabBarScroll}
            >
              {/* "All" Toggle Pill */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setSelectedOptionId("all")}
                style={[
                  styles.filterTab,
                  {
                    backgroundColor:
                      selectedOptionId === "all"
                        ? isDark
                          ? "#FFFFFF"
                          : "#000000"
                        : isDark
                          ? "#1C1C1E"
                          : "#EFEFF4",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color:
                        selectedOptionId === "all"
                          ? isDark
                            ? "#000000"
                            : "#FFFFFF"
                          : isDark
                            ? "#A9A9B2"
                            : "#48484A",
                    },
                  ]}
                >
                  All ({totalVotes})
                </Text>
              </TouchableOpacity>

              {/* Dynamic Option Pills */}
              {allSections.map((sec) => {
                const isSelected = selectedOptionId === sec.option.id;
                return (
                  <TouchableOpacity
                    key={sec.option.id}
                    activeOpacity={0.7}
                    onPress={() => setSelectedOptionId(sec.option.id)}
                    style={[
                      styles.filterTab,
                      {
                        backgroundColor: isSelected
                          ? isDark
                            ? "#FFFFFF"
                            : "#000000"
                          : isDark
                            ? "#1C1C1E"
                            : "#EFEFF4",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        {
                          color: isSelected
                            ? isDark
                              ? "#000000"
                              : "#FFFFFF"
                            : isDark
                              ? "#A9A9B2"
                              : "#48484A",
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {sec.option.text} ({sec.count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="small" color={colors.text} />
          </View>
        ) : displayedSections.length === 0 ? (
          <View style={styles.centerContainer}>
            <Ionicons
              name="people-outline"
              size={42}
              color={isDark ? "#2C2C2E" : "#D1D1D6"}
            />
            <Text style={[styles.emptyText, { color: muted }]}>
              No voters found matching selection
            </Text>
          </View>
        ) : (
          <SectionList
            sections={displayedSections}
            keyExtractor={(item, index) =>
              `${item.user_id}-${item.option_id}-${index}`
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
            renderSectionHeader={({ section }) => (
              <View
                style={[
                  styles.sectionHeaderContainer,
                  {
                    backgroundColor: containerCardBg,
                    borderColor: border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.sectionHeaderText,
                    { color: isDark ? "#FFFFFF" : "#1C1C1E" },
                  ]}
                  numberOfLines={1}
                >
                  {section.option.text}
                </Text>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7" },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: isDark ? "#A9A9B2" : "#48484A" },
                    ]}
                  >
                    {section.count}
                  </Text>
                </View>
              </View>
            )}
            renderItem={({ item, index, section }) => (
              <View
                style={[
                  styles.rowWrapper,
                  {
                    backgroundColor: containerCardBg,
                    borderColor: border,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderBottomWidth:
                      index === section.data.length - 1 ? 1 : 0,
                    borderBottomLeftRadius:
                      index === section.data.length - 1 ? 12 : 0,
                    borderBottomRightRadius:
                      index === section.data.length - 1 ? 12 : 0,
                  },
                ]}
              >
                <VoterRow
                  voter={item}
                  isDark={isDark}
                  index={index}
                  isLast={index === section.data.length - 1}
                  onPress={() => {
                    if (item.username) {
                      router.push(`/${item.username}/page` as any);
                    }
                  }}
                />
              </View>
            )}
            renderSectionFooter={() => <View style={{ height: 24 }} />}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 1,
  },
  tabBarContainer: {
    borderBottomWidth: 1,
    paddingBottom: 12,
  },
  tabBarScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999, // Makes pills completely rounded-full
    justifyContent: "center",
    alignItems: "center",
    minWidth: 50,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "500",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  sectionHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    marginRight: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    minWidth: 24,
    alignItems: "center",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  rowWrapper: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  voterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
