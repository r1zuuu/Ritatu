import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { colors } from "../theme/colors";

/**
 * Horizontal progress fill that grows from 0 to `pct`% on mount and animates
 * whenever `pct` changes. Replaces the static <View width="x%"> bars — motion
 * makes the diary feel alive without extra layout code at each call site.
 */
export function AnimatedBar({
  pct,
  color,
  height = 6,
  delay = 0,
  track = colors.border,
}: {
  pct: number;
  color: string;
  height?: number;
  delay?: number;
  track?: string;
}) {
  const w = useSharedValue(0);

  useEffect(() => {
    w.value = withDelay(
      delay,
      withTiming(Math.max(0, Math.min(pct, 100)), {
        duration: 650,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [pct, delay, w]);

  const fill = useAnimatedStyle(() => ({ width: `${w.value}%` }));

  return (
    <View style={[s.track, { height, borderRadius: height / 2, backgroundColor: track }]}>
      <Animated.View
        style={[{ height: "100%", borderRadius: height / 2, backgroundColor: color }, fill]}
      />
    </View>
  );
}

const s = StyleSheet.create({
  track: { overflow: "hidden", width: "100%" },
});
