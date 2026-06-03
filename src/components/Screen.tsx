import { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme/colors";

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  padded?: boolean;
  noBottomInset?: boolean;
}>;

export const Screen = ({ children, scroll = false, padded = true, noBottomInset = false }: ScreenProps) => {
  const content = <View style={[styles.content, padded && styles.padded]}>{children}</View>;

  return (
    <SafeAreaView
      style={styles.safe}
      edges={noBottomInset ? ["top", "left", "right"] : undefined}
    >
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : content}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  padded: {
    padding: 20,
  },
});
