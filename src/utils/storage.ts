import { Platform } from "react-native";
import { StateStorage, createJSONStorage } from "zustand/middleware";

const secureStorageAdapter: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const SecureStore = await import("expo-secure-store");
    return (await SecureStore.getItemAsync(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    const SecureStore = await import("expo-secure-store");
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    const SecureStore = await import("expo-secure-store");
    await SecureStore.deleteItemAsync(name);
  },
};

const localStorageAdapter: StateStorage = {
  getItem: (name: string): string | null => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      localStorage.setItem(name, value);
    } catch {}
  },
  removeItem: (name: string): void => {
    try {
      localStorage.removeItem(name);
    } catch {}
  },
};

const asyncStorageAdapter: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    return AsyncStorage.getItem(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    await AsyncStorage.setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    await AsyncStorage.removeItem(name);
  },
};

export const zustandSecureStorage = createJSONStorage(
  () => (Platform.OS === "web" ? localStorageAdapter : secureStorageAdapter),
);

export const zustandAsyncStorage = createJSONStorage(
  () => (Platform.OS === "web" ? localStorageAdapter : asyncStorageAdapter),
);
