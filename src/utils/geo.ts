import { supabase } from "@/utils/supabase";
import { Platform } from "react-native";

export type IpGeoData = {
  ip: string;
  city: string | null;
  region: string | null;
  country_name: string | null;
  country_code: string | null;
  latitude: number | null;
  longitude: number | null;
  org: string | null;
  timezone: string | null;
};

const GEO_CACHE_KEY = "geo:ip_data";
const GEO_CACHE_TTL = 1000 * 60 * 60 * 24;

type GeoCacheEntry = {
  data: IpGeoData;
  cachedAt: number;
};

async function getGeoCache(): Promise<IpGeoData | null> {
  try {
    if (Platform.OS === "web") {
      const raw = localStorage.getItem(GEO_CACHE_KEY);
      if (!raw) return null;
      const entry: GeoCacheEntry = JSON.parse(raw);
      if (Date.now() - entry.cachedAt > GEO_CACHE_TTL) {
        localStorage.removeItem(GEO_CACHE_KEY);
        return null;
      }
      return entry.data;
    }
    const AsyncStorage = (
      await import("@react-native-async-storage/async-storage")
    ).default;
    const raw = await AsyncStorage.getItem(GEO_CACHE_KEY);
    if (!raw) return null;
    const entry: GeoCacheEntry = JSON.parse(raw);
    if (Date.now() - entry.cachedAt > GEO_CACHE_TTL) {
      await AsyncStorage.removeItem(GEO_CACHE_KEY);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

async function setGeoCache(data: IpGeoData): Promise<void> {
  try {
    const entry: GeoCacheEntry = { data, cachedAt: Date.now() };
    if (Platform.OS === "web") {
      localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(entry));
      return;
    }
    const AsyncStorage = (
      await import("@react-native-async-storage/async-storage")
    ).default;
    await AsyncStorage.setItem(GEO_CACHE_KEY, JSON.stringify(entry));
  } catch {}
}

async function fetchFromApi(): Promise<IpGeoData | null> {
  if (Platform.OS === "web") return null;
  try {
    const res = await fetch("https://ipwho.is/");
    if (!res.ok) return null;

    const json = await res.json();

    if (json.success === false) return null;

    return {
      ip: json.ip ?? null,
      city: json.city ?? null,
      region: json.region ?? null,
      country_name: json.country ?? null,
      country_code: json.country_code ?? null,
      latitude: json.latitude ?? null,
      longitude: json.longitude ?? null,
      org: json.connection?.isp ?? null,
      timezone: json.timezone?.id ?? null,
    };
  } catch {
    return null;
  }
}

export async function fetchIpGeoData(): Promise<IpGeoData | null> {
  const cached = await getGeoCache();
  if (cached) return cached;

  const fresh = await fetchFromApi();
  if (fresh) await setGeoCache(fresh);
  return fresh;
}

export async function fetchIpCity(): Promise<string | null> {
  const data = await fetchIpGeoData();
  return data?.city || data?.region || null;
}

export async function syncGeoOnAuth(userId: string): Promise<void> {
  if (Platform.OS === "web") return;

  const cached = await getGeoCache();

  if (cached) {
    await supabase.from("profiles").upsert({
      id: userId,
      ip_city: cached.city || cached.region,
      updated_at: new Date().toISOString(),
    });
    return;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("ip_city")
    .eq("id", userId)
    .single();

  const geoData = await fetchFromApi();
  if (!geoData) return;

  await setGeoCache(geoData);

  if (!profile?.ip_city) {
    await supabase.from("profiles").upsert({
      id: userId,
      ip_city: geoData.city || geoData.region,
      updated_at: new Date().toISOString(),
    });
  }
}

export async function syncIpCity(userId: string): Promise<void> {
  await syncGeoOnAuth(userId);
}

export async function resolveDeviceCity(): Promise<string | null> {
  if (Platform.OS === "web") return null;

  const Location = await import("expo-location");
  const coords = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Low,
  });

  const [place] = await Location.reverseGeocodeAsync({
    latitude: coords.coords.latitude,
    longitude: coords.coords.longitude,
  });

  return place?.city || place?.subregion || place?.region || null;
}

export async function syncDeviceCity(userId: string): Promise<string | null> {
  if (Platform.OS === "web") return null;

  const Location = await import("expo-location");
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") return null;

  const city = await resolveDeviceCity();
  if (!city) return null;

  await supabase.from("profiles").upsert({
    id: userId,
    city,
    updated_at: new Date().toISOString(),
  });

  return city;
}

