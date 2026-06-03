import { StyleSheet, Text } from "react-native";
import { colors } from "../theme/colors";

export type IconName =
  | "activity"
  | "apple"
  | "bar-chart"
  | "barcode"
  | "camera"
  | "check"
  | "chevron-down"
  | "chevron-left"
  | "chevron-right"
  | "chevron-up"
  | "alert"
  | "clipboard"
  | "dumbbell"
  | "flame"
  | "gauge"
  | "image"
  | "info"
  | "logout"
  | "minus"
  | "plus"
  | "reset"
  | "scan"
  | "search"
  | "settings"
  | "sparkles"
  | "trash"
  | "upload"
  | "utensils"
  | "weight"
  | "x";

type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

const symbols: Record<IconName, string> = {
  activity: "monitoring",
  apple: "nutrition",
  "bar-chart": "show_chart",
  barcode: "barcode_scanner",
  camera: "photo_camera",
  check: "check",
  "chevron-down": "expand_more",
  "chevron-left": "chevron_left",
  "chevron-right": "chevron_right",
  "chevron-up": "expand_less",
  alert: "warning",
  clipboard: "assignment",
  dumbbell: "fitness_center",
  flame: "local_fire_department",
  gauge: "speed",
  image: "image",
  info: "info",
  logout: "logout",
  minus: "remove",
  plus: "add",
  reset: "refresh",
  scan: "document_scanner",
  search: "search",
  settings: "settings",
  sparkles: "auto_awesome",
  trash: "delete",
  upload: "ios_share",
  utensils: "restaurant",
  weight: "scale",
  x: "close",
};

export const Icon = ({ name, size = 20, color = colors.text }: IconProps) => (
  <Text
    accessibilityElementsHidden
    importantForAccessibility="no"
    style={[styles.icon, { color, fontSize: size, height: size, lineHeight: size, width: size }]}
  >
    {symbols[name]}
  </Text>
);

const styles = StyleSheet.create({
  icon: {
    fontFamily: "MaterialSymbols_200ExtraLight",
    includeFontPadding: false,
    textAlign: "center",
    textAlignVertical: "center",
  },
});
