import { type IpGeoData } from "@/utils/geo";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

export type GeoState = {
  ipData: IpGeoData | null;
  deviceCity: string | null;
  deviceCoords: { lat: number; lon: number } | null;
  loadingIp: boolean;
  loadingDevice: boolean;
  devicePermission: "unknown" | "granted" | "denied";
};

export default function GeoInfoCard({
  geo,
  onRequestDevice,
}: {
  geo: GeoState;
  onRequestDevice: () => void;
}) {
  const ipLocationString = geo.ipData
    ? [geo.ipData.city, geo.ipData.country_name].filter(Boolean).join(", ")
    : "Unavailable";

  return (
    <View className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-neutral-100 dark:border-zinc-800/60 shadow-sm shadow-black/[0.02] gap-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3 flex-1">
          <Ionicons
            name="cellular-outline"
            size={18}
            className="text-neutral-400 dark:text-neutral-500"
          />
          <View className="flex-1">
            <Text className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">
              Connecting from...
            </Text>
            {geo.loadingIp ? (
              <ActivityIndicator
                size="small"
                color="#a3a3a3"
                className="self-start mt-1"
              />
            ) : (
              <Text
                className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mt-0.5"
                numberOfLines={1}
              >
                {ipLocationString}
              </Text>
            )}
          </View>
        </View>
        {!geo.loadingIp && geo.ipData?.ip && (
          <Text className="text-[11px] font-mono bg-neutral-50 dark:bg-zinc-950 px-2 py-1 rounded text-neutral-500 dark:text-neutral-400 border border-neutral-100 dark:border-zinc-800/40">
            {geo.ipData.ip}
          </Text>
        )}
      </View>

      <View className="h-[1px] bg-neutral-100 dark:bg-zinc-800/60" />

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3 flex-1">
          <Ionicons
            name="earth-outline"
            size={18}
            className="text-neutral-400 dark:text-neutral-500"
          />
          <View className="flex-1">
            <Text className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">
              Physical Location
            </Text>
            {geo.loadingDevice ? (
              <ActivityIndicator
                size="small"
                color="#a3a3a3"
                className="self-start mt-1"
              />
            ) : geo.deviceCity ? (
              <Text className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mt-0.5">
                {geo.deviceCity}
              </Text>
            ) : (
              <Text className="text-sm font-medium text-neutral-400 dark:text-neutral-600 mt-0.5">
                {geo.devicePermission === "denied"
                  ? "Access Denied"
                  : "Not configured"}
              </Text>
            )}
          </View>
        </View>

        {!geo.loadingDevice && !geo.deviceCity && (
          <TouchableOpacity
            onPress={onRequestDevice}
            activeOpacity={0.7}
            className="px-3 py-1.5 bg-neutral-50 dark:bg-zinc-950 rounded-lg border border-neutral-200/60 dark:border-zinc-800"
          >
            <Text className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              {geo.devicePermission === "denied" ? "Enable" : "Share GPS"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}