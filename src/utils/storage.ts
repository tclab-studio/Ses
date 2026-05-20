import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { StateStorage, createJSONStorage } from "zustand/middleware";

const secureStorageAdapter: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await SecureStore.getItemAsync(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await SecureStore.deleteItemAsync(name);
  },
};

export const zustandSecureStorage = createJSONStorage(() => secureStorageAdapter);

export const zustandAsyncStorage = createJSONStorage(() => AsyncStorage);