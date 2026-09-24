import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { radius } from "../theme/layout";
import { typography } from "../theme/typography";

export type Segment<T extends string> = {
  label: string;
  value: T;
};

type SegmentedControlProps<T extends string> = {
  items: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
};

// The one control for "pick one of a few": sheet tabs, meal section, photo
// angle. A raised segment on a sunken track, like the platform control.
export const SegmentedControl = <T extends string>({
  items,
  value,
  onChange,
  disabled = false,
}: SegmentedControlProps<T>) => (
  <View style={styles.wrap} accessibilityRole="tablist">
    {items.map((item) => {
      const active = item.value === value;
      return (
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel={item.label}
          accessibilityState={{ selected: active, disabled }}
          disabled={disabled}
          key={item.value}
          onPress={() => onChange(item.value)}
          style={({ pressed }) => [styles.item, active && styles.active, pressed && !active && styles.pressed]}
        >
          <Text numberOfLines={1} style={[styles.label, active && styles.activeLabel]}>{item.label}</Text>
        </Pressable>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.control,
    flexDirection: "row",
    gap: 4,
    padding: 4,
  },
  item: {
    alignItems: "center",
    borderRadius: 10,
    flex: 1,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 6,
  },
  active: {
    backgroundColor: colors.elevated,
    borderColor: colors.borderMid,
    borderWidth: 1,
  },
  pressed: { opacity: 0.6 },
  label: {
    ...typography.label,
    color: colors.mutedMid,
  },
  activeLabel: {
    color: colors.text,
  },
});
