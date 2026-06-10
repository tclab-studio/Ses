import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, View, useColorScheme } from "react-native";
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
  // @ts-ignore
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
      Math.abs((activeIndex.value % 1) - 0.5) * 2,
      [0, 0.5, 1],
      [1, 1.22, 1],
      Extrapolation.CLAMP,
    );
    return { transform: [{ translateX: x }, { scaleX }] };
  });

  const blobLeft = (TAB_WIDTH - BLOB_SIZE) / 2;
  const blobTop = (BAR_HEIGHT - BLOB_SIZE) / 2;

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: BLOB_SIZE,
          height: BLOB_SIZE,
          left: blobLeft,
          top: blobTop,
          zIndex: 1,
          borderRadius: BLOB_SIZE / 2,
          // @ts-ignore
          background: isDark
            ? "linear-gradient(145deg, rgba(120,140,255,0.25) 0%, rgba(80,100,220,0.15) 100%)"
            : "linear-gradient(145deg, rgba(255,255,255,1) 0%, rgba(240,244,255,0.9) 100%)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          boxShadow: isDark
            ? "0 4px 24px rgba(99,120,255,0.4), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.2)"
            : "0 4px 20px rgba(59,130,246,0.18), inset 0 1px 0 rgba(255,255,255,1)",
          border: isDark
            ? "1.2px solid rgba(150,170,255,0.35)"
            : "1.2px solid rgba(255,255,255,0.95)",
        },
        blobStyle,
      ]}
    />
  );
}
function TabItem({
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
        // @ts-ignore
        position: "relative",
        zIndex: 2,
      }}
    >
      <View
        style={{
          width: 27,
          height: 27,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons
          name={isFocused ? config.activeIcon : config.inactiveIcon}
          size={27}
          color={isFocused ? "#3B82F6" : colors.textSecondary}
        />
      </View>
    </Pressable>
  );
}

function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const currentRoute = state.routes[state.index]?.name;
  if (currentRoute === "create") return null;
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;

  const activeIndex = useSharedValue(state.index);

  useEffect(() => {
    activeIndex.value = withSpring(state.index, SPRING_BLOB);
  }, [state.index]);

  const bottomOffset = Math.max(insets.bottom, 16) + 12;

  return (
    <View
      style={[styles.outerWrap, { bottom: bottomOffset }]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.pill,
          {
            height: BAR_HEIGHT,
            // @ts-ignore
            background: isDark
              ? "linear-gradient(180deg, rgba(38,38,52,0.92) 0%, rgba(20,20,32,0.95) 100%)"
              : "linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(240,244,255,0.75) 100%)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            boxShadow: isDark
              ? "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12)"
              : "0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.9)",
            border: isDark
              ? "1px solid rgba(255,255,255,0.12)"
              : "1px solid rgba(255,255,255,0.9)",
          },
        ]}
      >
        <GlassBlob activeIndex={activeIndex} isDark={isDark} />

        <View style={styles.tabsRow}>
          {state.routes.map((route, index) => {
            const config = TABS.find((t) => t.name === route.name);
            if (!config) return null;
            return (
              <TabItem
                key={route.key}
                config={config}
                index={index}
                currentIndex={state.index}
                // @ts-ignore
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
  },
  tabsRow: {
    flexDirection: "row",
    alignItems: "center",
    zIndex: 2,
  },
});

export default function TabLayout() {
  return (
    <Tabs
      // @ts-ignore
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} />
      ))}
    </Tabs>
  );
}

