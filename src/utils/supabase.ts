import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import * as AuthSession from "expo-auth-session";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const CHUNK_SIZE = 1800;

async function clearChunkedKey(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
    const metaRaw = await SecureStore.getItemAsync(`${key}__chunks`);
    if (metaRaw) {
      const chunkCount = parseInt(metaRaw, 10);
      if (!isNaN(chunkCount)) {
        for (let i = 0; i < chunkCount; i++) {
          await SecureStore.deleteItemAsync(`${key}__chunk_${i}`);
        }
      }
      await SecureStore.deleteItemAsync(`${key}__chunks`);
    }
  } catch {}
}

const LargeSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const raw = await SecureStore.getItemAsync(key);
      if (raw !== null) return raw;

      const metaRaw = await SecureStore.getItemAsync(`${key}__chunks`);
      if (!metaRaw) return null;

      const chunkCount = parseInt(metaRaw, 10);
      if (isNaN(chunkCount) || chunkCount <= 0) {
        await clearChunkedKey(key);
        return null;
      }

      const chunks: string[] = [];
      for (let i = 0; i < chunkCount; i++) {
        const chunk = await SecureStore.getItemAsync(`${key}__chunk_${i}`);
        if (chunk === null) {
          await clearChunkedKey(key);
          return null;
        }
        chunks.push(chunk);
      }

      return chunks.join("");
    } catch {
      await clearChunkedKey(key).catch(() => {});
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await clearChunkedKey(key);

      if (value.length <= CHUNK_SIZE) {
        await SecureStore.setItemAsync(key, value);
        return;
      }

      const chunks: string[] = [];
      for (let i = 0; i < value.length; i += CHUNK_SIZE) {
        chunks.push(value.slice(i, i + CHUNK_SIZE));
      }

      for (let i = 0; i < chunks.length; i++) {
        await SecureStore.setItemAsync(`${key}__chunk_${i}`, chunks[i]);
      }

      await SecureStore.setItemAsync(`${key}__chunks`, String(chunks.length));
    } catch (err) {
      console.error("[SecureStore] setItem failed:", err);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    await clearChunkedKey(key);
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

const storage = Platform.OS === "web" ? undefined : LargeSecureStoreAdapter;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const redirectUrl = AuthSession.makeRedirectUri({
  scheme: "ses",
  path: "auth/callback",
});

export async function clearAuthStorage(): Promise<void> {
  try {
    const keys = ["supabase.auth.token", "sb-access-token", "sb-refresh-token"];
    await Promise.all(keys.map((k) => clearChunkedKey(k).catch(() => {})));
    await AsyncStorage.multiRemove(
      (await AsyncStorage.getAllKeys()).filter(
        (k) => k.includes("supabase") || k.includes("sb-"),
      ),
    ).catch(() => {});
  } catch {}
}
