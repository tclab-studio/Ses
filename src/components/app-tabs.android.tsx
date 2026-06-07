import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs } from "expo-router";
import { useEffect } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  useColorScheme,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";

const SPRING_BLOB = { damping: 20, stiffness: 260, mass: 0.65 };
const TAB_WIDTH = 76;
const BLOB_SIZE = 62;
const BAR_HEIGHT = 68;

type TabConfig = {
  name: string;
  label: string;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
};

const TABS: TabConfig[] = [
  {
    name: "index",
    label: "Home",
    activeIcon: "home",
    inactiveIcon: "home-outline",
  },
  {
    name: "create",
    label: "Create",
    activeIcon: "add",
    inactiveIcon: "add-outline",
  },
  {
    name: "profile",
    label: "Profile",
    activeIcon: "person",
    inactiveIcon: "person-outline",
  },
];

function GlassBlob({
  activeIndex,
  isDark,
}: {
  activeIndex: Animated.SharedValue<number>;
  isDark: boolean;
}) {
  const blobStyle = useAnimatedStyle(() => {
    const x = interpolate(
      activeIndex.value,
      [0, 1, 2],
      [0, TAB_WIDTH, TAB_WIDTH * 2],
      Extrapolation.CLAMP,
    );
    const scaleX = interpolate(
      activeIndex.value % 1 === 0
        ? 0
        : Math.abs((activeIndex.value % 1) - 0.5) * 2,
      [0, 0.5, 1],
      [1, 1.22, 1],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ translateX: x }, { scaleX }],
    };
  });

  const blobLeft = (TAB_WIDTH - BLOB_SIZE) / 2;
  const blobTop = (BAR_HEIGHT - BLOB_SIZE) / 2;

  return (
    <Animated.View
      style={[
        styles.blobWrap,
        {
          width: BLOB_SIZE,
          height: BLOB_SIZE,
          left: blobLeft,
          top: blobTop,
          borderRadius: BLOB_SIZE / 2,
        },
        blobStyle,
      ]}
    >
      {Platform.OS === "ios" ? (
        <BlurView
          intensity={55}
          tint={isDark ? "dark" : "extraLight"}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      <LinearGradient
        colors={
          isDark
            ? ["rgba(255,255,255,0.18)", "rgba(255,255,255,0.06)"]
            : ["rgba(255,255,255,0.82)", "rgba(255,255,255,0.38)"]
        }
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <LinearGradient
        colors={["rgba(255,255,255,0.6)", "rgba(255,255,255,0)"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 0.5 }}
        style={[styles.blobShimmer, { borderRadius: BLOB_SIZE / 2 }]}
      />

      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: BLOB_SIZE / 2,
            borderWidth: 1.2,
            borderColor: isDark
              ? "rgba(255,255,255,0.28)"
              : "rgba(255,255,255,0.95)",
          },
        ]}
      />
    </Animated.View>
  );
}

function TabItemSmart({
  config,
  index,
  currentIndex,
  onPress,
  colors,
}: {
  config: TabConfig;
  index: number;
  currentIndex: number;
  onPress: () => void;
  colors: typeof Colors.light;
}) {
  const isFocused = currentIndex === index;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={config.label}
      accessibilityState={{ selected: isFocused }}
      style={{
        width: TAB_WIDTH,
        height: BAR_HEIGHT,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons
        name={isFocused ? config.activeIcon : config.inactiveIcon}
        size={27}
        color={isFocused ? "#3B82F6" : colors.textSecondary}
      />
    </Pressable>
  );
}

function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;

  const activeIndex = useSharedValue(state.index);

  useEffect(() => {
    activeIndex.value = withSpring(state.index, SPRING_BLOB);
  }, [state.index]);

  return (
    <View
      style={[styles.outerWrap, { bottom: insets.bottom + 20 }]}
      pointerEvents="box-none"
    >
      <View style={[styles.pill, { height: BAR_HEIGHT }]}>
        {Platform.OS === "ios" ? (
          <BlurView
            intensity={72}
            tint={isDark ? "dark" : "extraLight"}
            style={[StyleSheet.absoluteFill, { borderRadius: 999 }]}
          />
        ) : null}

        <LinearGradient
          colors={
            isDark
              ? ["rgba(30,30,40,0.78)", "rgba(18,18,28,0.82)"]
              : ["rgba(255,255,255,0.68)", "rgba(235,240,255,0.58)"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 999 }]}
        />

        <LinearGradient
          colors={["rgba(255,255,255,0.55)", "rgba(255,255,255,0)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.pillTopShimmer}
        />

        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: 999,
              borderWidth: 1,
              borderColor: isDark
                ? "rgba(255,255,255,0.14)"
                : "rgba(255,255,255,0.88)",
            },
          ]}
        />

        <GlassBlob activeIndex={activeIndex} isDark={isDark} />

        <View style={styles.tabsRow}>
          {state.routes.map((route, index) => {
            const config = TABS.find((t) => t.name === route.name);
            if (!config) return null;
            return (
              <TabItemSmart
                key={route.key}
                config={config}
                index={index}
                currentIndex={state.index}
                colors={colors}
                onPress={() => {
                  const event = navigation.emit({
                    type: "tabPress",
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!event.defaultPrevented) {
                    navigation.navigate(route.name);
                  }
                }}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    flexDirection: "row",
    alignSelf: "center",
    borderRadius: 999,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 36,
    elevation: 22,
  },
  tabsRow: {
    flexDirection: "row",
    alignItems: "center",
    zIndex: 2,
  },
  blobWrap: {
    position: "absolute",
    overflow: "hidden",
    zIndex: 1,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  blobShimmer: {
    position: "absolute",
    top: 0,
    left: 4,
    right: 4,
    height: "45%",
  },
  pillTopShimmer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "40%",
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    zIndex: 1,
  },
});

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} />
      ))}
    </Tabs>
  );
}
