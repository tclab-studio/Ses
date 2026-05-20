import { GoogleButton } from "@/components/google-button";
import { useAuth } from "@/hooks/useAuth";
import React, { useEffect, useRef } from "react";
import { Animated, StatusBar, Text, View } from "react-native";

export default function AuthScreen() {
  const { loading, signInWithGoogle } = useAuth();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />

      <Animated.View
        className="flex-1 justify-between px-8 pt-24 pb-16"
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        <View>
          <Text className="text-black text-4xl font-bold tracking-tight leading-tight">
            Ses
          </Text>
          <Text className="text-neutral-400 text-base mt-3 leading-relaxed">
            Vote on anything.{"\n"}See what people really think.
          </Text>
        </View>

        <View className="gap-4">
          <GoogleButton onPress={signInWithGoogle} loading={loading} />
          <Text className="text-center text-neutral-400 text-xs leading-relaxed">
            By continuing you agree to our Terms & Privacy Policy.
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}
