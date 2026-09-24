import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { formatDecimal } from "../../core/numberFormat";
import { weightTrend } from "../../core/weightTrend";
import type { WeightEntry } from "../../data/types";
import { colors } from "../../theme/colors";
import { radius } from "../../theme/layout";
import { typography } from "../../theme/typography";

const HEIGHT = 170;
const Y_LABEL_W = 34;
// A target this far outside the data would squash the line; it is then only
// mentioned in the legend.
const TARGET_REACH_KG = 3;

const MONTHS_SHORT = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];
const shortDate = (iso: string) => {
  const d = new Date(`${iso}T00:00`);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
};

type Point = { value: number; kg: number; date: string; label?: string };

// Weigh-ins as a soft area line plus the smoothed trend, a dashed target line
// and a press-and-hold tooltip ("21 wrz · 82,4 kg").
export const WeightChart = ({ data, target, width }: { data: WeightEntry[]; target: number | null; width: number }) => {
  const [chartWidth] = useState(() => Math.max(160, width - Y_LABEL_W - 8));
  const trend = weightTrend(data);
  const kgs = [...data.map((d) => d.weightKg), ...trend];
  const dataMin = Math.min(...kgs);
  const dataMax = Math.max(...kgs);
  const showTarget = target !== null && target >= dataMin - TARGET_REACH_KG && target <= dataMax + TARGET_REACH_KG;
  const lo = Math.floor(Math.min(dataMin, showTarget ? target! : dataMin) - 0.5);
  const hi = Math.ceil(Math.max(dataMax, showTarget ? target! : dataMax) + 0.5);
  // Whole-kg steps sized to the range, so labels never repeat after rounding
  // and the line uses the height instead of floating under empty sections.
  const range = hi - lo;
  const step = range <= 6 ? 1 : range <= 12 ? 2 : 5;
  const sections = Math.max(2, Math.ceil(range / step));
  const span = step * sections;

  const points: Point[] = data.map((d) => ({ value: d.weightKg, kg: d.weightKg, date: d.date }));
  // The chart gives each x label one point's width and truncates it, so the
  // first, middle and last dates go in a row of their own below.
  const dateLabels = [data[0], data[Math.floor((data.length - 1) / 2)], data[data.length - 1]].map((d) => shortDate(d.date));
  const trendPoints: Point[] = data.map((d, i) => ({ value: trend[i], kg: trend[i], date: d.date }));

  return (
    <View>
      <LineChart
        data={points}
        data2={trendPoints}
        width={chartWidth}
        height={HEIGHT}
        adjustToWidth
        disableScroll
        initialSpacing={10}
        endSpacing={10}
        curved
        areaChart
        color={colors.accent}
        thickness={2.5}
        startFillColor={colors.accent}
        endFillColor={colors.accent}
        startOpacity={0.28}
        endOpacity={0.02}
        dataPointsColor={colors.accent}
        dataPointsRadius={3}
        color2={colors.text}
        thickness2={1.5}
        strokeDashArray2={[5, 4]}
        hideDataPoints2
        startFillColor2="transparent"
        endFillColor2="transparent"
        startOpacity2={0}
        endOpacity2={0}
        yAxisOffset={lo}
        maxValue={span}
        noOfSections={sections}
        stepValue={step}
        formatYLabel={(label) => formatDecimal(Number(label), 0)}
        yAxisLabelWidth={Y_LABEL_W}
        yAxisTextStyle={styles.axisText}
        xAxisLabelsHeight={0}
        yAxisColor="transparent"
        xAxisColor={colors.border}
        rulesColor={colors.border}
        rulesType="solid"
        showReferenceLine1={showTarget}
        referenceLine1Position={target ?? 0}
        referenceLine1Config={{ color: colors.green, dashWidth: 5, dashGap: 5, thickness: 1.5 }}
        isAnimated
        animationDuration={600}
        pointerConfig={{
          activatePointersOnLongPress: true,
          activatePointersDelay: 120,
          persistPointer: true,
          pointerStripHeight: HEIGHT,
          pointerStripColor: colors.borderMid,
          pointerStripWidth: 1,
          pointerColor: colors.accent,
          radius: 6,
          hidePointer2: true,
          pointerLabelWidth: 104,
          pointerLabelHeight: 60,
          autoAdjustPointerLabelPosition: true,
          pointerLabelComponent: (items: Point[]) => {
            const point = items[0];
            const smooth = items[1];
            return (
              <View style={styles.tooltip}>
                <Text style={styles.tooltipDate}>{shortDate(point.date)}</Text>
                <Text style={styles.tooltipKg}>{formatDecimal(point.kg, 1)} kg</Text>
                {smooth ? <Text style={styles.tooltipTrend}>trend {formatDecimal(smooth.kg, 1)}</Text> : null}
              </View>
            );
          },
        }}
      />
      <View style={styles.dates}>
        {dateLabels.map((label, i) => (
          <Text key={i} style={styles.axisText}>{label}</Text>
        ))}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: colors.accent }]} />
          <Text style={styles.legendText}>pomiary</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, styles.swatchDashed]} />
          <Text style={styles.legendText}>trend</Text>
        </View>
        {target !== null ? (
          <View style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: colors.green }]} />
            <Text style={styles.legendText}>
              cel {formatDecimal(target, 1)} kg{showTarget ? "" : target < dataMin ? " (niżej)" : " (wyżej)"}
            </Text>
          </View>
        ) : null}
        <Text style={styles.legendHint}>Przytrzymaj, by zobaczyć wagę</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  axisText: { ...typography.micro, color: colors.mutedMid },
  dates: { flexDirection: "row", justifyContent: "space-between", marginTop: 4, paddingLeft: Y_LABEL_W + 4 },
  tooltip: {
    alignSelf: "flex-start",
    backgroundColor: colors.elevated,
    borderColor: colors.borderMid,
    borderRadius: radius.control,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tooltipDate: { ...typography.micro, color: colors.mutedMid },
  tooltipKg: { ...typography.label, color: colors.text, fontSize: 15, fontVariant: ["tabular-nums"] },
  tooltipTrend: { ...typography.micro, color: colors.mutedMid },
  legend: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 10 },
  legendItem: { alignItems: "center", flexDirection: "row", gap: 6 },
  swatch: { borderRadius: 1, height: 3, width: 14 },
  swatchDashed: { backgroundColor: "transparent", borderColor: colors.text, borderStyle: "dashed", borderTopWidth: 1.5, height: 0 },
  legendText: { ...typography.micro, color: colors.mutedMid },
  legendHint: { ...typography.micro, color: colors.muted, flexBasis: "100%" },
});
