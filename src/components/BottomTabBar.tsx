import { router, usePathname } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  FadeOut,
  FadeOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getSectionByTime } from "../core/section";
import { colors } from "../theme/colors";
import { radius } from "../theme/layout";
import { typography } from "../theme/typography";
import { Icon } from "./Icon";
import type { IconName } from "./Icon";

const NAV_TABS = [
  { icon: "utensils" as IconName, label: "Dziennik", route: "/home",    match: "/home" },
  { icon: "bar-chart" as IconName, label: "Tydzień",  route: "/weekly",  match: "/weekly" },
  { icon: "settings" as IconName, label: "Profil",   route: "/profile", match: "/profile" },
];

type DialOption = {
  label: string;
  icon: IconName;
  route: "/add-meal/barcode" | "/add-meal/photo";
};

const DIAL_OPTIONS: DialOption[] = [
  { label: "Skaner", icon: "barcode", route: "/add-meal/barcode" },
  { label: "Zdjęcie", icon: "camera",  route: "/add-meal/photo" },
];

// Inner height of the tab bar (paddingTop + icon + gap + label + paddingBottom)
const TAB_INNER_H = 58;
const FAB_SIZE = 56;
const FAB_RIGHT = 20;

export const BottomTabBar = () => {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const [dialOpen, setDialOpen] = useState(false);

  const bottomPad = Math.max(insets.bottom, 8);
  const fabBottom = TAB_INNER_H + bottomPad + 16;
  const dialBottom = fabBottom + FAB_SIZE + 10;

  // FAB icon spins the plus into an × when the speed-dial opens.
  const spin = useSharedValue(0);
  useEffect(() => {
    spin.value = withSpring(dialOpen ? 1 : 0, { damping: 13, stiffness: 170 });
  }, [dialOpen, spin]);
  const fabIcon = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 45}deg` }] }));

  const openRoute = (route: DialOption["route"]) => {
    setDialOpen(false);
    router.push({ pathname: route, params: { section: getSectionByTime() } });
  };

  return (
    <>
      {/* Backdrop */}
      {dialOpen ? (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(160)}
          style={s.backdrop}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDialOpen(false)} />
        </Animated.View>
      ) : null}

      {/* Speed-dial options — right-aligned over FAB */}
      {dialOpen ? (
        <View style={[s.dial, { bottom: dialBottom, right: FAB_RIGHT }]}>
          {[...DIAL_OPTIONS].reverse().map((opt, idx) => (
            <Animated.View
              key={opt.route}
              entering={FadeInUp.delay(idx * 55).duration(240).easing(Easing.out(Easing.cubic))}
              exiting={FadeOutDown.duration(160)}
            >
              <Pressable
                style={({ pressed }) => [s.dialRow, pressed && s.dialRowPressed]}
                onPress={() => openRoute(opt.route)}
              >
                <Text style={s.dialLabel}>{opt.label}</Text>
                <View style={s.dialIcon}>
                  <Icon name={opt.icon} size={19} color={colors.accent} />
                </View>
              </Pressable>
            </Animated.View>
          ))}
        </View>
      ) : null}

      {/* FAB */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dodaj posiłek"
        style={({ pressed }) => [s.fab, { bottom: fabBottom }, pressed && s.fabPressed]}
        onPress={() => setDialOpen((v) => !v)}
      >
        <Animated.View style={fabIcon}>
          <Icon name="plus" size={24} color={colors.warmBlack} />
        </Animated.View>
      </Pressable>

      {/* Tab bar — 3 equal tabs with labels + active pill */}
      <View style={[s.bar, { paddingBottom: bottomPad }]}>
        {NAV_TABS.map((tab) => {
          const active = pathname === tab.match;
          return (
            <Pressable
              key={tab.route}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              style={({ pressed }) => [s.tab, pressed && s.tabPressed]}
              onPress={() => router.replace(tab.route as "/home" | "/weekly" | "/profile")}
            >
              <View style={[s.tabInner, active && s.tabInnerActive]}>
                <Icon name={tab.icon} size={21} color={active ? colors.accent : colors.muted} />
                <Text style={[s.tabLabel, active && s.tabLabelActive]}>{tab.label}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </>
  );
};

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.45)",
    zIndex: 10,
  },

  /* Speed-dial */
  dial: {
    alignItems: "flex-end",
    gap: 10,
    position: "absolute",
    zIndex: 11,
  },
  dialRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minWidth: FAB_SIZE,
  },
  dialRowPressed: { opacity: 0.65 },
  dialLabel: {
    ...typography.label,
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    color: colors.text,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  dialIcon: {
    alignItems: "center",
    backgroundColor: colors.elevated,
    borderColor: colors.borderMid,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },

  /* FAB */
  fab: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: FAB_SIZE / 2,
    elevation: 6,
    height: FAB_SIZE,
    justifyContent: "center",
    position: "absolute",
    right: FAB_RIGHT,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.38,
    shadowRadius: 10,
    width: FAB_SIZE,
    zIndex: 12,
  },
  fabPressed: { opacity: 0.82, transform: [{ scale: 0.94 }] },

  /* Tab bar */
  bar: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingTop: 10,
    zIndex: 9,
    ...Platform.select({
      android: { elevation: 12 },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
    }),
  },
  tab: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  tabPressed: { opacity: 0.6 },
  tabInner: {
    alignItems: "center",
    borderRadius: radius.pill,
    gap: 4,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  tabInnerActive: { backgroundColor: colors.accentA },
  tabLabel: {
    ...typography.stat,
    color: colors.muted,
    fontSize: 9,
  },
  tabLabelActive: { color: colors.accent },
});
