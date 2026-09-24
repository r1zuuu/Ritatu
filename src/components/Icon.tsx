import { StyleSheet, Text } from "react-native";
import { colors } from "../theme/colors";

export type IconName =
  | "activity"
  | "apple"
  | "bar-chart"
  | "barcode"
  | "calendar"
  | "camera"
  | "check"
  | "chevron-down"
  | "chevron-left"
  | "chevron-right"
  | "chevron-up"
  | "alert"
  | "clipboard"
  | "dumbbell"
  | "edit"
  | "flame"
  | "flash-on"
  | "flash-off"
  | "gauge"
  | "image"
  | "info"
  | "logout"
  | "minus"
  | "person"
  | "plus"
  | "reset"
  | "scan"
  | "search"
  | "settings"
  | "sparkles"
  | "trash"
  | "undo"
  | "upload"
  | "utensils"
  | "weight"
  | "x";

type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
};

const symbols: Record<IconName, string> = {
  activity: "monitoring",
  apple: "nutrition",
  "bar-chart": "bar_chart",
  barcode: "barcode_scanner",
  calendar: "calendar_month",
  camera: "photo_camera",
  check: "check",
  "chevron-down": "expand_more",
  "chevron-left": "chevron_left",
  "chevron-right": "chevron_right",
  "chevron-up": "expand_less",
  alert: "warning",
  clipboard: "assignment",
  dumbbell: "fitness_center",
  edit: "edit",
  flame: "local_fire_department",
  "flash-on": "flashlight_on",
  "flash-off": "flashlight_off",
  gauge: "speed",
  image: "image",
  info: "info",
  logout: "logout",
  minus: "remove",
  person: "person",
  plus: "add",
  reset: "refresh",
  scan: "document_scanner",
  search: "search",
  settings: "settings",
  sparkles: "auto_awesome",
  trash: "delete",
  undo: "undo",
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
