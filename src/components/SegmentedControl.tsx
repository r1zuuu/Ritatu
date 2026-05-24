import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

export type Segment<T extends string> = {
  label: string;
  value: T;
};

type SegmentedControlProps<T extends string> = {
  items: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
};

export const SegmentedControl = <T extends string>({
  items,
  value,
  onChange,
}: SegmentedControlProps<T>) => (
  <View style={styles.wrap}>
    {items.map((item) => {
      const active = item.value === value;
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={item.label}
          accessibilityState={{ selected: active }}
          key={item.value}
          onPress={() => onChange(item.value)}
          style={[styles.item, active && styles.active]}
        >
          <Text style={[styles.label, active && styles.activeLabel]}>{item.label}</Text>
        </Pressable>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  item: {
    minHeight: 48,
    borderRadius: 24,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt,
  },
  active: {
    backgroundColor: colors.accent,
  },
  label: {
    color: colors.muted,
    fontWeight: "700",
  },
  activeLabel: {
    color: colors.black,
  },
});
