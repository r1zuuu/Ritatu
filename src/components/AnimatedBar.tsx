import { useEffect, useState } from "react";
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
  const [trackWidth, setTrackWidth] = useState(0);
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

  // Slide a full-width fill in from the left instead of animating width:
  // transforms stay on the UI thread and the rounded end keeps its shape.
  const fill = useAnimatedStyle(() => ({
    transform: [{ translateX: ((w.value - 100) / 100) * trackWidth }],
  }));

  return (
    <View
      style={[s.track, { height, borderRadius: height / 2, backgroundColor: track }]}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View
        style={[{ height: "100%", borderRadius: height / 2, backgroundColor: color }, fill]}
      />
    </View>
  );
}

const s = StyleSheet.create({
  track: { overflow: "hidden", width: "100%" },
});
