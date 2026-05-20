import { redirectUrl, supabase } from "@/utils/supabase";
import { Session } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import { create } from "zustand";

WebBrowser.maybeCompleteAuthSession();

type AuthStore = {
  session: Session | null;
  initializing: boolean;
  loading: boolean;
  setSession: (session: Session | null) => void;
  setInitializing: (v: boolean) => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  init: () => () => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  initializing: true,
  loading: false,

  setSession: (session) => set({ session }),
  setInitializing: (initializing) => set({ initializing }),

  init: () => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session, initializing: false });
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        set({ session });
      },
    );

    return () => listener.subscription.unsubscribe();
  },

  signInWithGoogle: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
      });
      if (error) throw error;

      const result = await WebBrowser.openAuthSessionAsync(
        data.url!,
        redirectUrl,
        {
          showInRecents: false,
          preferEphemeralSession: true,
        },
      );

      if (result.type === "success") {
        const fragment = result.url.includes("#")
          ? result.url.split("#")[1]
          : result.url.split("?")[1];
        const params = new URLSearchParams(fragment);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        }
      }
    } catch (err) {
      console.error("Google OAuth failed:", err);
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null });
  },
}));
