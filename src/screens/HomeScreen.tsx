import { router } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { MealCard } from "../components/MealCard";
import { NutritionBar } from "../components/NutritionBar";
import { useMeals } from "../providers/MealsProvider";
import { useUserProfile } from "../providers/UserProfileProvider";
import { colors } from "../theme/colors";

export const HomeScreen = () => {
  const { profile } = useUserProfile();
  const { meals, totals, loading, error } = useMeals();

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Dzisiaj</Text>
          <Text style={styles.title}>{Math.round(totals.kcal)} kcal</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dodaj posiłek"
          accessibilityHint="Otwiera wybór sposobu dodania posiłku"
          style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
          onPress={() => router.push("/add-meal")}
        >
          <Text style={styles.addLabel}>+</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={colors.text} /> : null}

      <FlatList
        data={meals}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <MealCard meal={item} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Dodaj pierwszy posiłek</Text>
            <Text style={styles.emptyText}>Skan, zdjęcie albo ręczne makro — zawsze z potwierdzeniem gramatury.</Text>
          </View>
        }
      />

      <NutritionBar totals={totals} profile={profile} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eyebrow: {
    color: colors.muted,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: 44,
    fontWeight: "900",
  },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  addLabel: {
    color: colors.warmBlack,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "800",
  },
  addButtonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.86,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 10,
  },
  error: {
    color: colors.danger,
    fontWeight: "800",
    paddingHorizontal: 20,
  },
  empty: {
    marginTop: 56,
    borderRadius: 8,
    padding: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  emptyText: {
    color: colors.muted,
    fontWeight: "700",
    lineHeight: 22,
  },
});
