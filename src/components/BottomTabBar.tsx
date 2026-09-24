import { router } from "expo-router";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
import { getSectionByTime } from "../core/section";
import { colors } from "../theme/colors";
import { radius } from "../theme/layout";
import { fontFamilies, typography } from "../theme/typography";
import { Icon } from "./Icon";
import type { IconName } from "./Icon";

// Keyed by route name inside app/(tabs); the order comes from its _layout.
const TABS: Record<string, { icon: IconName; label: string }> = {
  home: { icon: "utensils", label: "Dziennik" },
  weekly: { icon: "bar-chart", label: "Tydzień" },
  measurements: { icon: "weight", label: "Pomiary" },
  profile: { icon: "person", label: "Profil" },
};

type DialOption = { label: string; icon: IconName; onPress: () => void };

const SPRING = { damping: 30, stiffness: 200, mass: 1 };
const BAR_PAD_X = 8;
const BAR_PAD_TOP = 8;
const PILL_H = 50;
const PILL_INSET = 6;
const FAB_SIZE = 56;
const FAB_RIGHT = 20;
const FAB_GAP = 16;

// Scrollable tab screens pad their content by this much so the last row
// clears the FAB, which floats above the bar.
export const FAB_CLEARANCE = FAB_SIZE + FAB_GAP + 16;

export const BottomTabBar = ({ state, navigation, insets }: BottomTabBarProps) => {
  const [dialOpen, setDialOpen] = useState(false);
  const [barWidth, setBarWidth] = useState(0);

  const bottomPad = Math.max(insets.bottom, 8);
  const fabBottom = BAR_PAD_TOP + PILL_H + bottomPad + FAB_GAP;
  const dialBottom = fabBottom + FAB_SIZE + 10;
  const tabWidth = barWidth > 0 ? (barWidth - BAR_PAD_X * 2) / state.routes.length : 0;

  // One pill that slides between tabs. It always has a background and a fixed
  // radius: a pill that only got a background when active (with radius 999)
  // rendered square on Android when the view was created mid-switch.
  const pillX = useSharedValue(0);
  const placed = useRef(false);
  useEffect(() => {
    if (tabWidth === 0) return;
    const x = state.index * tabWidth;
    pillX.value = placed.current ? withSpring(x, SPRING) : x;
    placed.current = true;
  }, [pillX, state.index, tabWidth]);
  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: pillX.value }] }));

  // FAB icon turns the plus into an × when the speed-dial opens.
  const spin = useSharedValue(0);
  useEffect(() => {
    spin.value = withSpring(dialOpen ? 1 : 0, SPRING);
  }, [dialOpen, spin]);
  const fabIcon = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 45}deg` }] }));

  const dial: DialOption[] = [
    {
      label: "Wyszukaj",
      icon: "search",
      onPress: () => navigation.navigate("home", { add: getSectionByTime() }),
    },
    {
      label: "Skanuj kod",
      icon: "barcode",
      onPress: () => router.push({ pathname: "/add-meal/barcode", params: { section: getSectionByTime() } }),
    },
    {
      label: "Zdjęcie AI",
      icon: "camera",
      onPress: () => router.push({ pathname: "/add-meal/photo", params: { section: getSectionByTime() } }),
    },
  ];

  return (
    <>
      {dialOpen ? (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(160)} style={s.backdrop}>
          <Pressable
            accessibilityLabel="Zamknij menu"
            style={StyleSheet.absoluteFill}
            onPress={() => setDialOpen(false)}
          />
        </Animated.View>
      ) : null}

      {dialOpen ? (
        <View style={[s.dial, { bottom: dialBottom, right: FAB_RIGHT }]}>
          {[...dial].reverse().map((opt, idx) => (
            <Animated.View
              key={opt.label}
              entering={FadeInUp.delay(idx * 45).duration(220).easing(Easing.out(Easing.cubic))}
              exiting={FadeOutDown.duration(140)}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={opt.label}
                style={({ pressed }) => [s.dialRow, pressed && s.dialRowPressed]}
                onPress={() => {
                  setDialOpen(false);
                  opt.onPress();
                }}
              >
                <Text style={s.dialLabel}>{opt.label}</Text>
                <View style={s.dialIcon}>
                  <Icon name={opt.icon} size={20} color={colors.accent} />
                </View>
              </Pressable>
            </Animated.View>
          ))}
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={dialOpen ? "Zamknij menu dodawania" : "Dodaj posiłek"}
        accessibilityState={{ expanded: dialOpen }}
        style={({ pressed }) => [s.fab, { bottom: fabBottom }, pressed && s.fabPressed]}
        onPress={() => setDialOpen((v) => !v)}
      >
        <Animated.View style={fabIcon}>
          <Icon name="plus" size={26} color={colors.warmBlack} />
        </Animated.View>
      </Pressable>

      <View
        style={[s.bar, { paddingBottom: bottomPad }]}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      >
        {tabWidth > 0 ? (
          <Animated.View style={[s.pill, { width: tabWidth - PILL_INSET * 2 }, pillStyle]} />
        ) : null}
        {state.routes.map((route, index) => {
          const tab = TABS[route.name];
          if (!tab) return null;
          const focused = state.index === index;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: focused }}
              style={({ pressed }) => [s.tab, pressed && s.tabPressed]}
              onPress={() => {
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
              }}
            >
              <Icon name={tab.icon} size={22} color={focused ? colors.accent : colors.mutedMid} />
              <Text style={[s.tabLabel, focused && s.tabLabelActive]}>{tab.label}</Text>
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
    backgroundColor: "rgba(8,7,5,0.6)",
    zIndex: 10,
  },

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
    minHeight: 48,
  },
  dialRowPressed: { opacity: 0.65 },
  dialLabel: {
    ...typography.label,
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    color: colors.text,
    fontSize: 13,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  dialIcon: {
    alignItems: "center",
    backgroundColor: colors.elevated,
    borderColor: colors.borderMid,
    borderRadius: 24,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },

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
  fabPressed: { opacity: 0.86, transform: [{ scale: 0.94 }] },

  // A hairline instead of elevation: on Android elevation would draw the bar
  // above the speed-dial backdrop regardless of zIndex.
  bar: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    flexDirection: "row",
    paddingHorizontal: BAR_PAD_X,
    paddingTop: BAR_PAD_TOP,
    zIndex: 9,
  },
  pill: {
    backgroundColor: colors.accentA,
    borderRadius: PILL_H / 2,
    height: PILL_H,
    left: BAR_PAD_X + PILL_INSET,
    pointerEvents: "none",
    position: "absolute",
    top: BAR_PAD_TOP,
  },
  tab: {
    alignItems: "center",
    flex: 1,
    gap: 3,
    height: PILL_H,
    justifyContent: "center",
  },
  tabPressed: { opacity: 0.6 },
  tabLabel: {
    color: colors.mutedMid,
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    lineHeight: 14,
  },
  tabLabelActive: { color: colors.accent, fontFamily: fontFamilies.semibold },
});
