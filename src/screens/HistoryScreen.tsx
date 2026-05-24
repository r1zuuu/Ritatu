import { FlatList, StyleSheet, Text } from "react-native";
import { MealCard } from "../components/MealCard";
import { Screen } from "../components/Screen";
import { useMeals } from "../providers/MealsProvider";
import { colors } from "../theme/colors";

export const HistoryScreen = () => {
  const { meals } = useMeals();

  return (
    <Screen padded={false}>
      <Text style={styles.title}>Historia dzisiejsza</Text>
      <FlatList
        data={meals}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <MealCard meal={item} />}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "900",
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 16,
  },
  list: {
    paddingHorizontal: 20,
    gap: 10,
  },
});
