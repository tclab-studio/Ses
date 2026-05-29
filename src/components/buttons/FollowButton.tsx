import { useFollow } from "@/hooks/useFollow";
import { Platform } from "react-native";

const ExpoButton =
  Platform.OS === "ios"
    ? require("@expo/ui/swift-ui").Button
    : require("@expo/ui/jetpack-compose").Button;

interface Props {
  targetUserId: string;
  currentUserId: string | null;
}

export function FollowButton({ targetUserId, currentUserId }: Props) {
  const { following, followerCount, toggleFollow, loading } = useFollow(
    targetUserId,
    currentUserId,
  );

  const label = loading
    ? "..."
    : following
      ? `Following · ${followerCount}`
      : `Subscribe · ${followerCount}`;

  return (
    <ExpoButton
      variant={following ? "bordered" : "default"}
      onPress={toggleFollow}
      style={{ minWidth: 130, height: 36 }}
    >
      {label}
    </ExpoButton>
  );
}
