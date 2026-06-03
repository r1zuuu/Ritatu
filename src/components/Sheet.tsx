import { type ReactNode, useEffect, useState } from "react";
import {
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type DimensionValue,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { Icon } from "./Icon";

// Near-critically damped — smooth, no bounce, still snappy
const OPEN  = { damping: 30, stiffness: 200, mass: 1.0 };
const CLOSE = { damping: 36, stiffness: 220, mass: 1.0 };

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  height?: DimensionValue;
};

export const Sheet = ({ visible, onClose, title, children, height = "88%" }: SheetProps) => {
  const { height: screenH } = useWindowDimensions();
  const translateY = useSharedValue(screenH);
  const bdOpacity = useSharedValue(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
    } else if (mounted) {
      translateY.value = withSpring(screenH, CLOSE);
      bdOpacity.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.quad) }, () => {
        runOnJS(setMounted)(false);
      });
    }
  }, [visible]);

  useEffect(() => {
    if (mounted) {
      translateY.value = screenH;
      translateY.value = withSpring(0, OPEN);
      bdOpacity.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.quad) });
    }
  }, [mounted]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: bdOpacity.value * 0.70,
  }));

  const close = () => { Keyboard.dismiss(); onClose(); };

  return (
    <Modal
      transparent
      visible={mounted}
      animationType="none"
      onRequestClose={close}
      statusBarTranslucent
    >
      <View style={s.root}>
        <Animated.View style={[StyleSheet.absoluteFill, s.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        </Animated.View>
        <View style={[s.flex, { pointerEvents: "box-none" }]}>
          <Animated.View style={[s.surface, { height }, sheetStyle]}>
            <View style={s.handle} />
            {title ? (
              <View style={s.titleRow}>
                <Text style={s.titleText}>{title}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Zamknij"
                  style={({ pressed }) => [s.close, pressed && s.closePr]}
                  onPress={close}
                >
                  <Icon name="x" size={18} color={colors.mutedMid} />
                </Pressable>
              </View>
            ) : null}
            {children}
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { backgroundColor: "#000" },
  flex: { flex: 1, justifyContent: "flex-end" },
  surface: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  handle: {
    alignSelf: "center",
    backgroundColor: colors.borderMid,
    borderRadius: 2,
    height: 4,
    marginBottom: 8,
    marginTop: 12,
    width: 36,
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 14,
    paddingHorizontal: 20,
  },
  titleText: { ...typography.section, color: colors.text },
  close: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 10,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  closePr: { opacity: 0.7, transform: [{ scale: 0.95 }] },
});
