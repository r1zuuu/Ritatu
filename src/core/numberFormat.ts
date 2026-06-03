export const parseDecimal = (value: string) => Number(value.replace(",", "."));

export const formatDecimal = (value: number, decimals = 1): string => {
  const rounded = Number(value.toFixed(decimals));
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
};
