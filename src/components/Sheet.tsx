import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  // Fixed height, or `fit` to size to the content (up to 92% of the screen).
  height?: DimensionValue | "fit";
};

export const Sheet = ({ visible, onClose, title, children, height = "88%" }: SheetProps) => {
  const { height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(screenH);
  const bdOpacity = useSharedValue(0);
  const [mounted, setMounted] = useState(false);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  // Reopened while the close animation was still running: stay mounted.
  const finishClose = () => { if (!visibleRef.current) setMounted(false); };

  useEffect(() => {
    if (visible) {
      if (mounted) {
        translateY.value = withSpring(0, OPEN);
        bdOpacity.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.quad) });
      }
      setMounted(true);
    } else if (mounted) {
      translateY.value = withSpring(screenH, CLOSE);
      bdOpacity.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.quad) }, () => {
        runOnJS(finishClose)();
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
        <KeyboardAvoidingView
          style={s.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Animated.View
            style={[
              s.surface,
              height === "fit" ? { maxHeight: "92%" } : { height },
              { paddingBottom: insets.bottom },
              sheetStyle,
            ]}
          >
            <View style={s.handle} />
            {title ? (
              <View style={s.titleRow}>
                <Text style={s.titleText}>{title}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Zamknij"
                  hitSlop={6}
                  style={({ pressed }) => [s.close, pressed && s.closePr]}
                  onPress={close}
                >
                  <Icon name="x" size={18} color={colors.mutedMid} />
                </Pressable>
              </View>
            ) : null}
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { backgroundColor: "#000" },
  flex: { flex: 1, justifyContent: "flex-end", pointerEvents: "box-none" },
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
  titleText: { ...typography.section, color: colors.text, flex: 1 },
  close: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 19,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  closePr: { opacity: 0.7, transform: [{ scale: 0.95 }] },
});
