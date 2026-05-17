import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import { Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ACTIVE_COLOR = "#3B82F6";
const INACTIVE_COLOR = "#9CA3AF";
const SPRING = { damping: 18, stiffness: 200, mass: 0.8 };

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

function TabItem({
  config,
  isFocused,
  onPress,
}: {
  config: TabConfig;
  isFocused: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderRadius: 999,
    overflow: "hidden",
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.88, SPRING);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, SPRING);
    onPress();
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={config.label}
      accessibilityState={{ selected: isFocused }}
    >
      <Animated.View style={animatedStyle}>
        <View
          className={`items-center justify-center px-5 py-4 gap-0.5 ${
            isFocused ? "bg-blue-50" : "bg-transparent"
          }`}
        >
          <Ionicons
            name={isFocused ? config.activeIcon : config.inactiveIcon}
            size={28}
            color={isFocused ? ACTIVE_COLOR : INACTIVE_COLOR}
          />
        </View>
      </Animated.View>
    </Pressable>
  );
}

function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="absolute left-0 right-0 items-center justify-center"
      style={{ bottom: insets.bottom + 20 }}
      pointerEvents="box-none"
    >
      <View
        className="flex-row items-center self-center bg-white rounded-full px-1 py-1 gap-1"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.1,
          shadowRadius: 24,
          elevation: 16,
        }}
      >
        {state.routes.map((route, index) => {
          const config = TABS.find((t) => t.name === route.name);
          if (!config) return null;

          return (
            <TabItem
              key={route.key}
              config={config}
              isFocused={state.index === index}
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
  );
}

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
