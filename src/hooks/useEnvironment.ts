import { Platform } from "react-native";

export function useEnvironment() {
  const isWeb = Platform.OS === "web";

  const isTelegram =
    isWeb &&
    typeof window !== "undefined" &&
    !!(window as any).Telegram?.WebApp?.initData;

  return {
    isWeb,
    isTelegram,
    isNative: Platform.OS === "ios" || Platform.OS === "android",
  };
}
