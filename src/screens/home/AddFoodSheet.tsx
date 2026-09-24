import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "../../components/Button";
import { Icon, type IconName } from "../../components/Icon";
import { SegmentedControl } from "../../components/SegmentedControl";
import { Sheet } from "../../components/Sheet";
import { dateWithOffset } from "../../core/date";
import { countMatches, matchScore, normalize, tokenize } from "../../core/search";
import { isSection, SECTION_GENITIVE } from "../../core/section";
import { getCachedMealsForDay } from "../../data/mealRepository";
import { searchProductsByName, type OpenFoodFactsSearchItem } from "../../services/openFoodFactsService";
import { colors } from "../../theme/colors";
import { radius } from "../../theme/layout";
import { fontFamilies, typography } from "../../theme/typography";
import { sh } from "../../theme/sharedStyles";
import { FOOD_DB } from "./foodDb";
import type { FoodItem } from "./types";

function offItemToFoodItem(item: OpenFoodFactsSearchItem): FoodItem {
  return {
    id: `off:${item.code}`,
    code: item.code,
    name: item.name,
    detail: item.detail,
    calories: Math.round(item.calories),
    protein: item.proteinPer100g,
    carbs: item.carbsPer100g,
    fat: item.fatPer100g,
    per100: true,
    imageUrl: item.imageUrl ?? null,
  };
}

function ActionTile({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [s.quickTile, pressed && sh.pressed]}
      onPress={onPress}
    >
      <Icon name={icon} size={20} color={colors.accent} />
      <Text style={s.quickLabel}>{label}</Text>
    </Pressable>
  );
}

const TABS = [
  { value: "search" as const, label: "Szukaj" },
  { value: "recent" as const, label: "Ostatnie" },
  { value: "custom" as const, label: "Własne" },
];

// Always say what the kcal is per: "250 kcal" next to "500 g" read as the pack.
const kcalLabel = (item: FoodItem) => `${item.calories} kcal ${item.per100 ? "/ 100 g" : "/ porcja"}`;

type Props = {
  visible: boolean;
  section: string;
  uid: string;
  customProducts: FoodItem[];
  onClose: () => void;
  onSelectFood: (food: FoodItem) => void;
  onDeleteCustom: (food: FoodItem) => void;
  onOpenCreateCustom: () => void;
  onQuickAdd: () => void;
  onScanBarcode: () => void;
  onAnalyzePhoto: () => void;
};

export const AddFoodSheet = ({
  visible,
  section,
  uid,
  customProducts,
  onClose,
  onSelectFood,
  onDeleteCustom,
  onOpenCreateCustom,
  onQuickAdd,
  onScanBarcode,
  onAnalyzePhoto,
}: Props) => {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"search" | "recent" | "custom">("search");
  // Tagged with the query they answer, so results for "pie" never show under "pierś".
  const [remote, setRemote] = useState<{ query: string; items: FoodItem[] }>({ query: "", items: [] });
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [recentFoods, setRecentFoods] = useState<FoodItem[]>([]);

  // Each opening starts clean: the sheet stays mounted between sections.
  useEffect(() => {
    if (!visible) return;
    setQuery("");
    setActiveTab("search");
  }, [visible]);

  const trimmed = query.trim();
  const tokens = useMemo(() => tokenize(query), [query]);

  useEffect(() => {
    if (activeTab !== "search" || trimmed.length < 3) {
      setSearchError(null);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    setSearching(true);
    setSearchError(null);

    const handle = setTimeout(() => {
      searchProductsByName(trimmed, controller.signal)
        .then((items) => setRemote({ query: trimmed, items: items.map(offItemToFoodItem) }))
        .catch(() => { if (!controller.signal.aborted) setSearchError("Nie udało się pobrać produktów z Open Food Facts."); })
        .finally(() => { if (!controller.signal.aborted) setSearching(false); });
    }, 500);

    // A newer query aborts the older request instead of letting it finish.
    return () => { clearTimeout(handle); controller.abort(); };
  }, [activeTab, trimmed]);

  useEffect(() => {
    if (activeTab !== "recent") return;
    let cancelled = false;
    const load = async () => {
      const seen = new Map<string, FoodItem>();
      for (let i = 0; i < 7; i++) {
        const meals = await getCachedMealsForDay(uid, dateWithOffset(-i));
        for (const m of meals) {
          const key = m.name.toLowerCase();
          if (!seen.has(key)) {
            seen.set(key, {
              id: `recent:${key}`,
              name: m.name,
              detail: "Ostatnio dodane",
              calories: Math.round(
                Number.isFinite(m.kcalPer100g as number)
                  ? (m.kcalPer100g as number)
                  : (m.proteinPer100g * 4) + (m.carbsPer100g * 4) + (m.fatPer100g * 9),
              ),
              protein: m.proteinPer100g,
              carbs: m.carbsPer100g,
              fat: m.fatPer100g,
              per100: true,
            });
          }
        }
      }
      if (!cancelled) setRecentFoods([...seen.values()].slice(0, 20));
    };
    void load();
    return () => { cancelled = true; };
  }, [activeTab, uid]);

  const listData = useMemo(() => {
    const source =
      activeTab === "search" ? [...customProducts, ...FOOD_DB]
      : activeTab === "recent" ? recentFoods
      : customProducts;
    if (tokens.length === 0) return activeTab === "search" ? FOOD_DB : source;

    const local = source
      .map((food) => ({ food, score: matchScore(food.name, tokens) }))
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((m) => m.food);
    if (activeTab !== "search" || remote.query !== trimmed) return local;

    // Local results always stay on top: remote ones are only appended below,
    // ranked by how many query words their name contains (OFF ORs the words).
    const localNames = new Set(local.map((f) => normalize(f.name)));
    const extra = remote.items
      .filter((f) => !localNames.has(normalize(f.name)))
      .map((food, index) => ({ food, index, hits: countMatches(food.name, tokens) }))
      .sort((a, b) => b.hits - a.hits || a.index - b.index)
      .map((m) => m.food);
    return [...local, ...extra];
  }, [activeTab, customProducts, recentFoods, remote, tokens, trimmed]);

  const title = isSection(section) ? `Dodaj do ${SECTION_GENITIVE[section]}` : "Dodaj posiłek";
  const needsMoreChars = activeTab === "search" && trimmed.length > 0 && trimmed.length < 3;

  const confirmDelete = (item: FoodItem) =>
    Alert.alert("Usunąć produkt?", `„${item.name}” zniknie z listy własnych produktów.`, [
      { text: "Anuluj", style: "cancel" },
      { text: "Usuń", style: "destructive", onPress: () => onDeleteCustom(item) },
    ]);

  // No results is not a dead end: offer the other ways to log the meal.
  const emptyState =
    activeTab === "search" && tokens.length > 0 ? (
      <View style={s.empty}>
        <Text style={s.emptyTitle}>Nie znalazłem „{trimmed}”</Text>
        <Text style={s.emptyText}>Zeskanuj kod z opakowania albo dodaj posiłek inaczej.</Text>
        <View style={s.emptyActions}>
          <Button title="Skanuj kod" icon="barcode" variant="secondary" onPress={onScanBarcode} />
          <Button title="Szybkie kcal" icon="flame" variant="secondary" onPress={onQuickAdd} />
          <Button
            title="Stwórz własny produkt"
            icon="plus"
            variant="ghost"
            onPress={() => { setActiveTab("custom"); onOpenCreateCustom(); }}
          />
        </View>
      </View>
    ) : (
      <View style={s.empty}>
        <Icon name={activeTab === "custom" ? "clipboard" : "search"} size={28} color={colors.muted} />
        <Text style={s.emptyText}>
          {activeTab === "custom"
            ? "Brak własnych produktów. Stwórz taki, który jesz często, np. swoją owsiankę."
            : activeTab === "recent"
              ? "Tu pojawią się produkty dodane w ostatnich 7 dniach."
              : "Brak wyników"}
        </Text>
      </View>
    );

  return (
    <Sheet visible={visible} onClose={onClose} title={title} height="92%">
      <View style={s.wrap}>
        <View style={s.searchRow}>
          <Icon name="search" size={18} color={colors.mutedMid} />
          <TextInput
            style={s.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="np. skyr, pierś z kurczaka"
            placeholderTextColor={colors.muted}
            accessibilityLabel="Szukaj produktu"
            returnKeyType="search"
          />
          {query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Wyczyść wyszukiwanie"
              hitSlop={10}
              style={({ pressed }) => [s.clearButton, pressed && sh.pressed]}
              onPress={() => setQuery("")}
            >
              <Icon name="x" size={16} color={colors.mutedMid} />
            </Pressable>
          ) : null}
        </View>
        {needsMoreChars ? <Text style={s.hint}>Wpisz min. 3 znaki, by szukać też w Open Food Facts.</Text> : null}

        <View style={s.quickGrid}>
          <ActionTile icon="barcode" label="Skanuj" onPress={onScanBarcode} />
          <ActionTile icon="camera" label="Zdjęcie AI" onPress={onAnalyzePhoto} />
          <ActionTile icon="flame" label="Szybkie kcal" onPress={onQuickAdd} />
        </View>

        <View style={s.tabs}>
          <SegmentedControl items={TABS} value={activeTab} onChange={setActiveTab} />
        </View>

        {activeTab === "custom" ? (
          <Pressable style={({ pressed }) => [s.createCustom, pressed && sh.pressed]} onPress={onOpenCreateCustom}>
            <Icon name="plus" size={18} color={colors.accent} />
            <Text style={s.createCustomText}>Stwórz własny produkt</Text>
          </Pressable>
        ) : null}

        <FlatList
          data={listData}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          keyExtractor={(item) => String(item.id)}
          style={s.list}
          contentContainerStyle={listData.length > 0 ? s.listContent : s.listEmpty}
          ListEmptyComponent={
            searching ? (
              <View style={s.loaderWrap}>
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
            ) : emptyState
          }
          ListFooterComponent={
            searching && listData.length > 0 ? (
              <View style={s.loaderFooter}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={s.loaderText}>Szukam w Open Food Facts...</Text>
              </View>
            ) : searchError ? (
              <Text style={s.errorText}>{searchError}</Text>
            ) : null
          }
          renderItem={({ item, index }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${kcalLabel(item)}`}
              accessibilityHint={item.custom ? "Przytrzymaj, aby usunąć" : undefined}
              style={({ pressed }) => [s.foodRow, index > 0 && s.foodBorder, pressed && s.foodPressed]}
              onPress={() => onSelectFood(item)}
              onLongPress={item.custom ? () => confirmDelete(item) : undefined}
            >
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={s.foodImage} />
              ) : (
                <View style={s.foodIcon}>
                  <Icon name={item.custom ? "clipboard" : item.code ? "barcode" : "utensils"} size={18} color={colors.mutedMid} />
                </View>
              )}
              <View style={s.foodText}>
                <Text style={s.foodName} numberOfLines={1}>{item.name}</Text>
                <Text style={s.foodDetail} numberOfLines={1}>
                  {item.detail === "100 g" ? kcalLabel(item) : `${item.detail} · ${kcalLabel(item)}`}
                </Text>
              </View>
              <Icon name="chevron-right" size={18} color={colors.muted} />
            </Pressable>
          )}
        />
      </View>
    </Sheet>
  );
};

const s = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 16 },
  searchRow: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.borderMid,
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    height: 50,
    marginBottom: 8,
    paddingHorizontal: 14,
  },
  searchInput: { ...typography.body, color: colors.text, flex: 1, paddingVertical: 0 },
  clearButton: { alignItems: "center", backgroundColor: colors.surfaceAlt, borderRadius: 12, height: 24, justifyContent: "center", width: 24 },
  hint: { ...typography.micro, color: colors.mutedMid, marginBottom: 8, marginLeft: 4 },
  quickGrid: { flexDirection: "row", gap: 8, marginBottom: 12, marginTop: 4 },
  quickTile: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    justifyContent: "center",
    minHeight: 64,
  },
  quickLabel: { ...typography.label, color: colors.text },
  tabs: { marginBottom: 12 },
  loaderWrap: { alignItems: "center", paddingVertical: 32 },
  loaderFooter: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "center", paddingVertical: 14 },
  loaderText: { ...typography.micro, color: colors.mutedMid },
  errorText: { ...typography.caption, color: colors.danger, padding: 12, textAlign: "center" },
  createCustom: {
    alignItems: "center",
    backgroundColor: colors.accentA,
    borderColor: colors.accentB,
    borderRadius: radius.control,
    borderStyle: "dashed",
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  createCustomText: { ...typography.label, color: colors.accent, fontSize: 14 },
  list: { flex: 1 },
  listContent: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, overflow: "hidden" },
  listEmpty: { flexGrow: 1 },
  foodRow: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 60, paddingHorizontal: 14, paddingVertical: 10 },
  foodPressed: { backgroundColor: colors.cardHov },
  foodBorder: { borderTopColor: colors.border, borderTopWidth: 1 },
  foodIcon: { alignItems: "center", backgroundColor: colors.surfaceAlt, borderRadius: 10, height: 40, justifyContent: "center", width: 40 },
  foodImage: { backgroundColor: colors.surfaceAlt, borderRadius: 10, height: 40, width: 40 },
  foodText: { flex: 1, minWidth: 0 },
  foodName: { ...typography.body, color: colors.text, fontFamily: fontFamilies.medium },
  foodDetail: { ...typography.micro, color: colors.mutedMid, fontSize: 12, marginTop: 2 },
  empty: { alignItems: "center", gap: 10, justifyContent: "center", minHeight: 160, paddingHorizontal: 12, paddingVertical: 20 },
  emptyTitle: { ...typography.section, color: colors.text, textAlign: "center" },
  emptyText: { ...typography.caption, color: colors.mutedMid, textAlign: "center" },
  emptyActions: { alignSelf: "stretch", gap: 8, marginTop: 6 },
});
