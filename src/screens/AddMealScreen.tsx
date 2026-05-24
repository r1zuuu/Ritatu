import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { colors } from "../theme/colors";

export const AddMealScreen = () => (
  <Screen>
    <View style={styles.wrap}>
      <View>
        <Text style={styles.eyebrow}>Dodaj posiłek</Text>
        <Text style={styles.title}>Trzy drogi, jeden zapis</Text>
      </View>

      <View style={styles.actions}>
        <Button title="Skanuj kod kreskowy" onPress={() => router.push("/add-meal/barcode")} />
        <Button title="Analizuj zdjęcie" variant="secondary" onPress={() => router.push("/add-meal/photo")} />
        <Button title="Wpisz ręcznie" variant="secondary" onPress={() => router.push("/add-meal/manual")} />
      </View>
    </View>
  </Screen>
);

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "space-between",
  },
  eyebrow: {
    color: colors.muted,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: 38,
    fontWeight: "900",
    marginTop: 10,
  },
  actions: {
    gap: 12,
  },
});
