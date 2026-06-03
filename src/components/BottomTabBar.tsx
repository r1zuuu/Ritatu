import { router, usePathname } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  FadeOut,
  FadeOutDown,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getSectionByTime } from "../core/section";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { Icon } from "./Icon";
import type { IconName } from "./Icon";

const NAV_TABS = [
  { icon: "utensils" as IconName, route: "/home",    match: "/home" },
  { icon: "bar-chart" as IconName, route: "/weekly",  match: "/weekly" },
  { icon: "settings" as IconName, route: "/profile", match: "/profile" },
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

// Inner height of the tab bar (paddingTop + icon + paddingVertical×2)
const TAB_INNER_H = 50;
const FAB_SIZE = 56;
const FAB_RIGHT = 20;

export const BottomTabBar = () => {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const [dialOpen, setDialOpen] = useState(false);

  const bottomPad = Math.max(insets.bottom, 8);
  const fabBottom = TAB_INNER_H + bottomPad + 16;
  const dialBottom = fabBottom + FAB_SIZE + 10;

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
                <Icon name={opt.icon} size={20} color={colors.text} />
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
        <Icon name={dialOpen ? "x" : "plus"} size={22} color={colors.warmBlack} />
      </Pressable>

      {/* Tab bar — 3 equal tabs */}
      <View style={[s.bar, { paddingBottom: bottomPad }]}>
        {NAV_TABS.map((tab) => {
          const active = pathname === tab.match;
          return (
            <Pressable
              key={tab.route}
              accessibilityRole="button"
              style={({ pressed }) => [s.tab, pressed && s.tabPressed]}
              onPress={() => router.replace(tab.route as "/home" | "/weekly" | "/profile")}
            >
              <Icon name={tab.icon} size={22} color={active ? colors.accent : colors.muted} />
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
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.text,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 8,
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
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    paddingTop: 8,
    zIndex: 9,
  },
  tab: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingVertical: 10,
  },
  tabPressed: { opacity: 0.5 },
});
