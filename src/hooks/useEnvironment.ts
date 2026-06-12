import { Platform } from "react-native";

export function useEnvironment() {
  const isWeb = Platform.OS === "web";

  const isTelegramTarget = process.env.EXPO_PUBLIC_TARGET === "telegram";

  const isTelegram =
    isWeb &&
    isTelegramTarget &&
    typeof window !== "undefined" &&
    !!(window as any).Telegram?.WebApp?.initData;

  const isStandaloneWeb = isWeb && !isTelegramTarget;

  return {
    isWeb,
    isTelegram,
    isStandaloneWeb,
    isNative: Platform.OS === "ios" || Platform.OS === "android",
  };
}
