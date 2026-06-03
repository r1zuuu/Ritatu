import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Sheet } from "../../components/Sheet";
import { Icon } from "../../components/Icon";
import { dateWithOffset } from "../../core/date";
import { getCachedMealsForDay } from "../../data/mealRepository";
import { searchProductsByName, type OpenFoodFactsSearchItem } from "../../services/openFoodFactsService";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
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

function ActionTile({ icon, label, onPress }: { icon: "barcode" | "camera" | "plus" | "check"; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [s.quickTile, pressed && sh.pressed]}
      onPress={onPress}
    >
      <Icon name={icon} size={18} color={colors.accent} />
      <Text style={s.quickLabel}>{label}</Text>
    </Pressable>
  );
}

type Props = {
  visible: boolean;
  section: string;
  uid: string;
  customProducts: FoodItem[];
  onClose: () => void;
  onSelectFood: (food: FoodItem) => void;
  onOpenCreateCustom: () => void;
  onQuickAdd: () => void;
  onScanBarcode: () => void;
  onAnalyzePhoto: () => void;
  onManualEntry: () => void;
};

export const AddFoodSheet = ({
  visible,
  section,
  uid,
  customProducts,
  onClose,
  onSelectFood,
  onOpenCreateCustom,
  onQuickAdd,
  onScanBarcode,
  onAnalyzePhoto,
  onManualEntry,
}: Props) => {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"search" | "recent" | "custom">("search");
  const [remoteFoods, setRemoteFoods] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [recentFoods, setRecentFoods] = useState<FoodItem[]>([]);

  useEffect(() => {
    const trimmed = query.trim();
    if (activeTab !== "search" || trimmed.length < 3) {
      setRemoteFoods([]);
      setSearchError(null);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    setSearchError(null);

    const handle = setTimeout(() => {
      searchProductsByName(trimmed)
        .then((items) => { if (!cancelled) setRemoteFoods(items.map(offItemToFoodItem)); })
        .catch(() => { if (!cancelled) { setRemoteFoods([]); setSearchError("Nie udało się pobrać produktów z Open Food Facts."); } })
        .finally(() => { if (!cancelled) setSearching(false); });
    }, 500);

    return () => { cancelled = true; clearTimeout(handle); };
  }, [activeTab, query]);

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
              detail: "100 g",
              calories: Math.round((m.proteinPer100g * 4) + (m.carbsPer100g * 4) + (m.fatPer100g * 9)),
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
    if (activeTab === "search") {
      const trimmed = query.trim().toLowerCase();
      if (trimmed.length < 1) return FOOD_DB;
      const localMatches = FOOD_DB.filter((f) => f.name.toLowerCase().includes(trimmed));
      if (trimmed.length < 3 || remoteFoods.length === 0) return localMatches;
      const localNames = new Set(localMatches.map((f) => f.name.toLowerCase()));
      const onlyRemote = remoteFoods.filter((f) => !localNames.has(f.name.toLowerCase()));
      const merged = [...localMatches, ...onlyRemote];
      const score = (name: string, isLocal: boolean) => {
        const n = name.toLowerCase();
        const base = n === trimmed ? 30 : n.startsWith(trimmed) ? 20 : 10;
        return base + (isLocal ? 1 : 0);
      };
      return merged.sort((a, b) => score(b.name, typeof b.id === "number") - score(a.name, typeof a.id === "number"));
    }
    if (activeTab === "recent") return recentFoods;
    if (activeTab === "custom") return customProducts;
    return [];
  }, [activeTab, customProducts, query, remoteFoods, recentFoods]);

  const tabs = [
    { id: "search" as const, label: "Szukaj" },
    { id: "recent" as const, label: "Ostatnie" },
    { id: "custom" as const, label: "Własne" },
  ];

  return (
    <Sheet visible={visible} onClose={onClose} title={`Dodaj do: ${section}`} height="92%">
      <View style={s.wrap}>
        <View style={s.searchRow}>
          <Icon name="search" size={17} color={colors.muted} />
          <TextInput
            style={s.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Szukaj produktu..."
            placeholderTextColor={colors.muted}
            accessibilityLabel="Szukaj produktu"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skanuj kod kreskowy"
            style={({ pressed }) => [s.scanButton, pressed && sh.pressed]}
            onPress={onScanBarcode}
          >
            <Icon name="scan" size={18} color={colors.accent} />
          </Pressable>
        </View>

        <View style={s.quickGrid}>
          <ActionTile icon="barcode" label="Skan" onPress={onScanBarcode} />
          <ActionTile icon="camera" label="Zdjęcie" onPress={onAnalyzePhoto} />
          <ActionTile icon="plus" label="Ręcznie" onPress={onManualEntry} />
          <ActionTile icon="check" label="Jednoraz." onPress={onQuickAdd} />
        </View>

        <View style={s.tabs}>
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={({ pressed }) => [s.tab, active && s.tabActive, pressed && sh.pressed]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Text style={[s.tabText, active && s.tabTextActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {activeTab === "custom" ? (
          <Pressable style={({ pressed }) => [s.createCustom, pressed && sh.pressed]} onPress={onOpenCreateCustom}>
            <Icon name="plus" size={18} color={colors.accent} />
            <Text style={s.createCustomText}>Stwórz własny produkt</Text>
          </Pressable>
        ) : null}

        <FlatList
          data={listData}
          keyExtractor={(item) => String(item.id)}
          style={s.list}
          contentContainerStyle={s.listContent}
          ListEmptyComponent={
            searching ? (
              <View style={s.loaderWrap}>
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
            ) : (
              <View style={s.empty}>
                <Icon name="search" size={28} color={colors.muted} />
                <Text style={s.emptyText}>
                  {activeTab === "custom" ? "Brak własnych produktów" : activeTab === "recent" ? "Brak historii posiłków" : "Brak wyników"}
                </Text>
              </View>
            )
          }
          ListFooterComponent={
            searching && listData.length > 0 ? (
              <View style={s.loaderFooter}>
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
            ) : searchError ? (
              <Text style={s.errorText}>{searchError}</Text>
            ) : null
          }
          renderItem={({ item, index }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Dodaj ${item.name}`}
              style={({ pressed }) => [s.foodRow, index > 0 && s.foodBorder, pressed && s.foodPressed]}
              onPress={() => onSelectFood(item)}
            >
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={s.foodImage} />
              ) : (
                <View style={s.foodIcon}>
                  <Icon name={item.custom ? "clipboard" : item.code ? "barcode" : "utensils"} size={17} color={colors.accent} />
                </View>
              )}
              <View style={s.foodText}>
                <Text style={s.foodName} numberOfLines={1}>{item.name}</Text>
                <Text style={s.foodDetail}>{item.detail} - {item.calories} kcal</Text>
              </View>
              <Icon name="plus" size={17} color={colors.mutedMid} />
            </Pressable>
          )}
        />
      </View>
    </Sheet>
  );
};

const s = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 16 },
  searchRow: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 9, height: 48, marginBottom: 12, paddingHorizontal: 12 },
  searchInput: { ...typography.body, color: colors.text, flex: 1, paddingVertical: 0 },
  scanButton: { alignItems: "center", height: 36, justifyContent: "center", width: 36 },
  quickGrid: { flexDirection: "row", gap: 8, marginBottom: 12 },
  quickTile: { alignItems: "center", backgroundColor: colors.card, borderRadius: 14, flex: 1, gap: 5, justifyContent: "center", minHeight: 54 },
  quickLabel: { ...typography.label, color: colors.mutedMid },
  tabs: { flexDirection: "row", gap: 6, marginBottom: 12 },
  tab: { alignItems: "center", backgroundColor: colors.card, borderRadius: 11, flex: 1, height: 34, justifyContent: "center" },
  tabActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  tabText: { ...typography.label, color: colors.mutedMid },
  tabTextActive: { color: colors.warmBlack },
  loaderWrap: { alignItems: "center", paddingVertical: 32 },
  loaderFooter: { alignItems: "center", paddingVertical: 12 },
  errorText: { ...typography.label, color: colors.danger, padding: 12, textAlign: "center" },
  createCustom: { alignItems: "center", backgroundColor: colors.accentA, borderColor: colors.accentB, borderRadius: 14, borderStyle: "dashed", borderWidth: 1.5, flexDirection: "row", gap: 10, marginBottom: 10, padding: 13 },
  createCustomText: { ...typography.label, color: colors.accent, fontSize: 13 },
  list: { flex: 1 },
  listContent: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  foodRow: { alignItems: "center", flexDirection: "row", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  foodPressed: { backgroundColor: colors.cardHov },
  foodBorder: { borderTopColor: colors.border, borderTopWidth: 1 },
  foodIcon: { alignItems: "center", height: 28, justifyContent: "center", width: 28 },
  foodImage: { backgroundColor: colors.surfaceAlt, borderRadius: 8, height: 36, width: 36 },
  foodText: { flex: 1, minWidth: 0 },
  foodName: { ...typography.label, color: colors.text, fontSize: 13 },
  foodDetail: { ...typography.label, color: colors.muted, fontSize: 11, marginTop: 2 },
  empty: { alignItems: "center", gap: 10, justifyContent: "center", minHeight: 140 },
  emptyText: { ...typography.label, color: colors.muted },
});
