import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import { DefaultTheme, ThemeProvider } from "expo-router";
import React from "react";

export default function TabLayout() {
  return (
    <ThemeProvider value={DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}
