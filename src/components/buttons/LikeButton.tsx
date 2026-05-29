import { useLike } from "@/hooks/useLike";
import { Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";

interface Props {
  sesId: string;
  currentUserId: string | null;
}

export function LikeButton({ sesId, currentUserId }: Props) {
  const { liked, likeCount, toggleLike, loading } = useLike(
    sesId,
    currentUserId,
  );
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePress() {
    scale.value = withSequence(withSpring(1.5), withSpring(1));
    toggleLike();
  }

  return (
    <View className="flex-row items-center gap-1">
      <Pressable onPress={handlePress} disabled={loading} hitSlop={10}>
        <Animated.Text style={animatedStyle} className="text-[22px]">
          {liked ? "❤️" : "🤍"}
        </Animated.Text>
      </Pressable>
      {likeCount > 0 && (
        <Text className="text-[13px] text-gray-500 font-medium">
          {likeCount}
        </Text>
      )}
    </View>
  );
}
