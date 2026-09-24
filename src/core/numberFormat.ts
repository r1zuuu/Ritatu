// Blank input is NaN, not 0: Number("") === 0 let empty required fields pass
// validation. Optional fields read it as `parseDecimal(x) || 0`.
export const parseDecimal = (value: string) =>
  value.trim() === "" ? NaN : Number(value.replace(",", "."));

// Polish decimal comma ("81,6"). parseDecimal reads it back, so this is safe
// for input fields too.
export const formatDecimal = (value: number, decimals = 1): string =>
  String(Number(value.toFixed(decimals))).replace(".", ",");
