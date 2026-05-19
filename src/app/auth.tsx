import { GoogleButton } from "@/components/google-button";
import { useAuth } from "@/hooks/useAuth";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, StatusBar, Text, View } from "react-native";

const { width, height } = Dimensions.get("window");

export default function AuthScreen() {
  const { loading, signInWithGoogle } = useAuth();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const logoAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 60,
          friction: 10,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(buttonAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View className="flex-1 bg-neutral-950">
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={["#0f0f0f", "#1a1a2e", "#0f0f0f"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="absolute inset-0"
      />

      <View
        className="absolute rounded-full opacity-20"
        style={{
          width: 300,
          height: 300,
          top: -80,
          right: -80,
          backgroundColor: "#6366f1",
        }}
      />
      <View
        className="absolute rounded-full opacity-10"
        style={{
          width: 250,
          height: 250,
          bottom: 100,
          left: -60,
          backgroundColor: "#8b5cf6",
        }}
      />

      <View className="flex-1 justify-between px-8 pt-20 pb-16">
        <Animated.View
          className="items-center"
          style={{ opacity: logoAnim, transform: [{ scale: logoAnim }] }}
        >
          <View
            className="w-20 h-20 rounded-3xl items-center justify-center mb-6"
            style={{
              backgroundColor: "rgba(99,102,241,0.15)",
              borderWidth: 1,
              borderColor: "rgba(99,102,241,0.3)",
            }}
          >
            <Text style={{ fontSize: 36 }}>⚡</Text>
          </View>
        </Animated.View>

        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          <Text
            className="text-white text-5xl font-bold tracking-tight leading-tight mb-4"
            style={{ fontWeight: "800" }}
          >
            Welcome{"\n"}back, fam
          </Text>
          <Text className="text-neutral-400 text-lg leading-relaxed">
            Sign in and let's get this bread. No cap, it takes 2 seconds.
          </Text>
        </Animated.View>

        <Animated.View style={{ opacity: buttonAnim }}>
          <GoogleButton onPress={signInWithGoogle} loading={loading} />
          <Text className="text-center text-neutral-600 text-xs mt-6 leading-relaxed px-4">
            By continuing, you agree to our Terms of Service and Privacy Policy.
            No sketchy stuff, fr.
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}
