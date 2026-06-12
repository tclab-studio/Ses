import { syncGeoOnAuth } from "@/utils/geo";
import { redirectUrl, supabase } from "@/utils/supabase";
import { Session } from "@supabase/supabase-js";
import { Platform } from "react-native";
import { create } from "zustand";

type AuthStore = {
  session: Session | null;
  initializing: boolean;
  loading: boolean;
  setSession: (session: Session | null) => void;
  setInitializing: (v: boolean) => void;
  signInWithGoogle: () => Promise<void>;
  signInWithTelegram: () => Promise<void>;
  signOut: () => Promise<void>;
  init: () => () => void;
};

async function doGoogleSignIn() {
  const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } =
    await import("@react-native-google-signin/google-signin");

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) return null;

  const idToken = response.data?.idToken;
  if (!idToken) throw new Error("No idToken returned from Google");
  return { idToken, GoogleSignin, isErrorWithCode, statusCodes };
}

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  initializing: true,
  loading: false,

  setSession: (session) => set({ session }),
  setInitializing: (initializing) => set({ initializing }),

  init: () => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session, initializing: false });
      if (session?.user?.id) {
        syncGeoOnAuth(session.user.id);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        set({ session });
        if (session?.user?.id) {
          syncGeoOnAuth(session.user.id);
        }
      },
    );

    return () => listener.subscription.unsubscribe();
  },

  signInWithGoogle: async () => {
    if (Platform.OS === "web") {
      set({ loading: true });
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: false,
          },
        });
        if (error) throw error;
        if (data?.url) {
          window.location.href = data.url;
        }
      } catch (err) {
        console.error("Google OAuth error:", err);
        set({ loading: false });
      }
      return;
    }

    set({ loading: true });
    try {
      const result = await doGoogleSignIn();
      if (!result) return;
      const { idToken } = result;

      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
      });

      if (error) throw error;
    } catch (err: any) {
      const isErrorWithCode = (
        await import("@react-native-google-signin/google-signin")
      ).isErrorWithCode;
      const statusCodes = (
        await import("@react-native-google-signin/google-signin")
      ).statusCodes;
      if (isErrorWithCode(err)) {
        switch (err.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            break;
          case statusCodes.IN_PROGRESS:
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            console.error("Play Services unavailable");
            break;
          default:
            console.error("Google Sign-In error:", err);
        }
      } else {
        console.error("Unexpected error during Google Sign-In:", err);
      }
    } finally {
      set({ loading: false });
    }
  },

  signInWithTelegram: async () => {
    set({ loading: true });
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (!tg?.initData) throw new Error("No Telegram initData");

      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/tg-auth`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData: tg.initData }),
        },
      );

      const json = await res.json();
      if (!res.ok || json.error)
        throw new Error(json.error ?? "TG auth failed");

      const { error } = await supabase.auth.setSession({
        access_token: json.access_token,
        refresh_token: json.refresh_token,
      });

      if (error) throw error;
    } catch (err) {
      console.error("Telegram Sign-In error:", err);
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    if (Platform.OS !== "web") {
      try {
        const { GoogleSignin } =
          await import("@react-native-google-signin/google-signin");
        await GoogleSignin.revokeAccess();
        await GoogleSignin.signOut();
      } catch {}
    }
    set({ session: null });
  },
}));

