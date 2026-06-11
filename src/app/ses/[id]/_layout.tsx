import { Stack } from "expo-router";

export default function SesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="voters" />
    </Stack>
  );
}
