// Blank input is NaN, not 0: Number("") === 0 let empty required fields pass
// validation. Optional fields read it as `parseDecimal(x) || 0`.
export const parseDecimal = (value: string) =>
  value.trim() === "" ? NaN : Number(value.replace(",", "."));

export const formatDecimal = (value: number, decimals = 1): string =>
  String(Number(value.toFixed(decimals)));
