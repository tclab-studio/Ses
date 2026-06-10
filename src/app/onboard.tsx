import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const HAS_LAUNCHED_KEY = "@has_launched";
const IMAGE_SIZE = width * 0.78;

const slides = [
  {
    id: "1",
    number: "01",
    title: "Vote",
    description:
      "Cast your vote securely and seamlessly. Your opinion shapes the future.",
    image: require("@/assets/images/onboard/1.png"),
  },
  {
    id: "2",
    number: "02",
    title: "Share",
    description:
      "Share your thoughts and polls with friends to gather wider insights.",
    image: require("@/assets/images/onboard/2.png"),
  },
  {
    id: "3",
    number: "03",
    title: "Analyze",
    description:
      "Dive deep into the data with real-time analytics and beautiful charts.",
    image: require("@/assets/images/onboard/3.png"),
  },
];

function Slide({
  item,
  isActive,
}: {
  item: (typeof slides)[0];
  isActive: boolean;
}) {
  const imageOpacity = useRef(new Animated.Value(0)).current;
  const imageScale = useRef(new Animated.Value(0.88)).current;
  const imageTranslate = useRef(new Animated.Value(30)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslate = useRef(new Animated.Value(28)).current;
  const numberOpacity = useRef(new Animated.Value(0)).current;
  const numberScale = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (isActive) {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(imageOpacity, {
            toValue: 1,
            duration: 420,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(imageScale, {
            toValue: 1,
            friction: 6,
            tension: 50,
            useNativeDriver: true,
          }),
          Animated.spring(imageTranslate, {
            toValue: 0,
            friction: 7,
            tension: 55,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(numberOpacity, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.spring(numberScale, {
            toValue: 1,
            friction: 6,
            tension: 80,
            useNativeDriver: true,
          }),
          Animated.timing(textOpacity, {
            toValue: 1,
            duration: 320,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.spring(textTranslate, {
            toValue: 0,
            friction: 8,
            tension: 65,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else {
      imageOpacity.setValue(0);
      imageScale.setValue(0.88);
      imageTranslate.setValue(30);
      textOpacity.setValue(0);
      textTranslate.setValue(28);
      numberOpacity.setValue(0);
      numberScale.setValue(0.7);
    }
  }, [isActive]);

  return (
    <View
      style={{
        width,
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: 28,
      }}
    >
      <Animated.View
        style={{
          opacity: imageOpacity,
          transform: [{ scale: imageScale }, { translateY: imageTranslate }],
          alignSelf: "center",
          marginBottom: 36,
          borderRadius: 32,
          overflow: "hidden",
          shadowColor: "#3B5BDB",
          shadowOffset: { width: 0, height: 16 },
          shadowOpacity: 0.22,
          shadowRadius: 32,
          elevation: 12,
        }}
      >
        <Image
          source={item.image}
          style={{ width: IMAGE_SIZE, height: IMAGE_SIZE, borderRadius: 32 }}
          resizeMode="cover"
          fadeDuration={0}
        />
      </Animated.View>

      <Animated.Text
        style={{
          fontSize: 88,
          lineHeight: 88,
          fontWeight: "800",
          color: "#EAEEFF",
          letterSpacing: -4,
          marginBottom: -6,
          opacity: numberOpacity,
          transform: [{ scale: numberScale }],
        }}
      >
        {item.number}
      </Animated.Text>

      <Animated.View
        style={{
          opacity: textOpacity,
          transform: [{ translateY: textTranslate }],
        }}
      >
        <Text
          style={{
            fontSize: 46,
            fontWeight: "800",
            color: "#111",
            letterSpacing: -2,
            marginBottom: 14,
            lineHeight: 50,
          }}
        >
          {item.title}
        </Text>
        <View
          style={{
            width: 36,
            height: 3,
            backgroundColor: "#3B5BDB",
            marginBottom: 18,
            borderRadius: 2,
          }}
        />
        <Text
          style={{
            fontSize: 15.5,
            color: "#888",
            lineHeight: 26,
            maxWidth: 300,
          }}
        >
          {item.description}
        </Text>
      </Animated.View>
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const isMounted = useRef(false);
  const isNavigating = useRef(false);
  const currentIndexRef = useRef(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const screenOpacity = useRef(new Animated.Value(0)).current;
  const screenTranslate = useRef(new Animated.Value(40)).current;
  const backOpacity = useRef(new Animated.Value(0)).current;
  const backTranslate = useRef(new Animated.Value(-12)).current;
  const skipOpacity = useRef(new Animated.Value(1)).current;
  const getStartedScale = useRef(new Animated.Value(0.92)).current;
  const getStartedOpacity = useRef(new Animated.Value(0)).current;
  const continueOpacity = useRef(new Animated.Value(1)).current;

  const dotAnimations = useRef(
    slides.map((_, i) => new Animated.Value(i === 0 ? 1 : 0)),
  ).current;

  useEffect(() => {
    isMounted.current = true;
    console.log("[Onboarding] Screen mounted");

    Animated.parallel([
      Animated.timing(screenOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(screenTranslate, {
        toValue: 0,
        friction: 7,
        tension: 45,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      isMounted.current = false;
    };
  }, []);

  const updateNavUI = useCallback((index: number) => {
    const isFirst = index === 0;
    const isLast = index === slides.length - 1;
    Animated.parallel([
      Animated.timing(backOpacity, {
        toValue: isFirst ? 0 : 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(backTranslate, {
        toValue: isFirst ? -12 : 0,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(skipOpacity, {
        toValue: isLast ? 0 : 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(getStartedOpacity, {
        toValue: isLast ? 1 : 0,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.spring(getStartedScale, {
        toValue: isLast ? 1 : 0.92,
        friction: 6,
        tension: 70,
        useNativeDriver: true,
      }),
      Animated.timing(continueOpacity, {
        toValue: isLast ? 0 : 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const animateDots = useCallback(
    (index: number) => {
      dotAnimations.forEach((anim, i) => {
        Animated.timing(anim, {
          toValue: i === index ? 1 : 0,
          duration: 260,
          useNativeDriver: false,
        }).start();
      });
    },
    [dotAnimations],
  );

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (!isMounted.current) return;
    if (viewableItems[0]) {
      const index = viewableItems[0].index ?? 0;
      currentIndexRef.current = index;
      setCurrentIndex(index);
      animateDots(index);
      updateNavUI(index);
    }
  }).current;

  const finishOnboarding = useCallback(async () => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    try {
      await AsyncStorage.setItem(HAS_LAUNCHED_KEY, "true");
    } catch {}
    await new Promise((r) => setTimeout(r, 80));
    if (isMounted.current) {
      router.replace("/auth");
    }
  }, [router]);

  const handleNext = async () => {
    const idx = currentIndexRef.current;
    if (idx < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: idx + 1, animated: true });
    } else {
      await finishOnboarding();
    }
  };

  const handleBack = () => {
    const idx = currentIndexRef.current;
    if (idx > 0) {
      flatListRef.current?.scrollToIndex({ index: idx - 1, animated: true });
    }
  };

  const handleSkip = () => finishOnboarding();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <Animated.View
        style={{
          flex: 1,
          opacity: screenOpacity,
          transform: [{ translateY: screenTranslate }],
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 28,
            paddingTop: 8,
            height: 52,
          }}
        >
          <Animated.View
            style={{
              opacity: backOpacity,
              transform: [{ translateX: backTranslate }],
            }}
          >
            <TouchableOpacity
              onPress={handleBack}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: "#F4F4F6",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="chevron-back" size={22} color="#111" />
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ opacity: skipOpacity }}>
            <TouchableOpacity
              onPress={handleSkip}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: "#3B5BDB",
                  letterSpacing: 0.2,
                }}
              >
                Skip
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        <View style={{ flex: 1 }}>
          <FlatList
            ref={flatListRef}
            data={slides}
            renderItem={({ item, index }) => (
              <Slide item={item} isActive={index === currentIndex} />
            )}
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            bounces={false}
            keyExtractor={(item) => item.id}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
          />
        </View>

        <View style={{ paddingHorizontal: 28, paddingBottom: 36, gap: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {slides.map((_, index) => {
              const dotWidth = dotAnimations[index].interpolate({
                inputRange: [0, 1],
                outputRange: [7, 26],
              });
              const dotOpacity = dotAnimations[index].interpolate({
                inputRange: [0, 1],
                outputRange: [0.18, 1],
              });
              return (
                <Animated.View
                  key={index}
                  style={{
                    height: 6,
                    width: dotWidth,
                    opacity: dotOpacity,
                    backgroundColor: "#3B5BDB",
                    borderRadius: 3,
                    marginRight: 6,
                  }}
                />
              );
            })}
          </View>

          <View style={{ position: "relative", height: 58 }}>
            <Animated.View
              style={{
                position: "absolute",
                width: "100%",
                opacity: continueOpacity,
              }}
              pointerEvents={
                currentIndex === slides.length - 1 ? "none" : "auto"
              }
            >
              <TouchableOpacity
                onPress={handleNext}
                activeOpacity={0.82}
                style={{
                  backgroundColor: "#111",
                  paddingVertical: 19,
                  borderRadius: 18,
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.1,
                  shadowRadius: 14,
                  elevation: 5,
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 16,
                    fontWeight: "700",
                    letterSpacing: 0.6,
                  }}
                >
                  Continue
                </Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View
              style={{
                position: "absolute",
                width: "100%",
                opacity: getStartedOpacity,
                transform: [{ scale: getStartedScale }],
              }}
              pointerEvents={
                currentIndex === slides.length - 1 ? "auto" : "none"
              }
            >
              <TouchableOpacity
                onPress={handleNext}
                activeOpacity={0.82}
                style={{
                  backgroundColor: "#3B5BDB",
                  paddingVertical: 19,
                  borderRadius: 18,
                  alignItems: "center",
                  shadowColor: "#3B5BDB",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.35,
                  shadowRadius: 18,
                  elevation: 8,
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 16,
                    fontWeight: "700",
                    letterSpacing: 0.6,
                  }}
                >
                  Get Started →
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}
