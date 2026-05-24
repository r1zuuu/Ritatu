import { router } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, LayoutAnimation } from "react-native";
import { MealCard } from "../components/MealCard";
import { NutritionBar } from "../components/NutritionBar";
import { useMeals } from "../providers/MealsProvider";
import { useUserProfile } from "../providers/UserProfileProvider";
import { colors } from "../theme/colors";
import { useEffect } from "react";

export const HomeScreen = () => {
  const { profile } = useUserProfile();
  const { meals, totals, loading, error } = useMeals();

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [meals]);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Dzisiaj</Text>
          <Text style={styles.title}>{Math.round(totals.kcal)} <Text style={styles.unit}>kcal</Text></Text>
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

      <NutritionBar totals={totals} profile={profile} />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : null}

      <FlatList
        data={meals}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <MealCard meal={item} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Brak posiłków</Text>
            <Text style={styles.emptyText}>Zacznij śledzić swoje makro już teraz.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eyebrow: {
    color: colors.muted,
    fontWeight: "700",
    textTransform: "uppercase",
    fontSize: 14,
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    color: colors.text,
    fontSize: 48,
    fontWeight: "900",
    letterSpacing: -1,
  },
  unit: {
    fontSize: 24,
    color: colors.muted,
    fontWeight: "700",
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  addLabel: {
    color: colors.warmBlack,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: "600",
  },
  addButtonPressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.9,
  },
  loader: {
    marginTop: 20,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 12,
  },
  error: {
    color: colors.danger,
    fontWeight: "600",
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  empty: {
    marginTop: 40,
    borderRadius: 16,
    padding: 32,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  emptyText: {
    color: colors.muted,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 22,
  },
});
