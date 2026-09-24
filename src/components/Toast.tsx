import { createContext, PropsWithChildren, useCallback, useContext, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { radius } from "../theme/layout";
import { typography } from "../theme/typography";

type ToastOptions = {
  message: string;
  // Offered for a few seconds, e.g. "Cofnij" after a delete.
  action?: { label: string; onPress: () => void };
};

type ShownToast = ToastOptions & { id: number };

const ToastContext = createContext<(toast: ToastOptions) => void>(() => {});

// Sits above the tab bar, so it never covers the FAB or the tabs.
const ABOVE_TAB_BAR = 92;

export const ToastProvider = ({ children }: PropsWithChildren) => {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ShownToast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((next: ToastOptions) => {
    if (timer.current) clearTimeout(timer.current);
    const id = Date.now();
    setToast({ ...next, id });
    // An undo needs a little longer to reach for than a plain confirmation.
    timer.current = setTimeout(
      () => setToast((current) => (current?.id === id ? null : current)),
      next.action ? 5000 : 2800,
    );
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <Animated.View
          key={toast.id}
          entering={FadeInDown.duration(200)}
          exiting={FadeOutDown.duration(160)}
          style={[s.wrap, { bottom: insets.bottom + ABOVE_TAB_BAR }]}
        >
          <View style={s.toast} accessibilityLiveRegion="polite">
            <Text style={s.text} numberOfLines={2}>{toast.message}</Text>
            {toast.action ? (
              <Pressable
                accessibilityRole="button"
                hitSlop={10}
                onPress={() => {
                  toast.action?.onPress();
                  setToast(null);
                }}
              >
                <Text style={s.action}>{toast.action.label}</Text>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);

const s = StyleSheet.create({
  wrap: { alignItems: "center", left: 16, pointerEvents: "box-none", position: "absolute", right: 16, zIndex: 20 },
  toast: {
    alignItems: "center",
    backgroundColor: colors.elevated,
    borderColor: colors.borderMid,
    borderRadius: radius.control,
    borderWidth: 1,
    elevation: 8,
    flexDirection: "row",
    gap: 16,
    maxWidth: 480,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
  },
  text: { ...typography.caption, color: colors.text, flex: 1 },
  action: { ...typography.label, color: colors.accent, fontSize: 14 },
});
