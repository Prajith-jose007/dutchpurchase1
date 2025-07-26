
export const formatQuantity = (quantity: number, units: string): string => {
  const normalizedUnits = units?.trim().toLowerCase();
  const num = Number(quantity);

  if (isNaN(num) || num <= 0) return `0 ${units || ''}`;

  if (normalizedUnits === 'kg') {
    const inGrams = num * 1000;

    if (inGrams < 1000) {
      return `${Math.round(inGrams)}g`;
    }

    // Show kg without decimals if whole number, else show up to 2 decimals
    return Number.isInteger(num)
      ? `${num.toFixed(0)}kg`
      : `${num.toFixed(2)}kg`;
  }

  // For other units (e.g., pcs, packs, etc.)
  return Number.isInteger(num)
    ? `${num.toFixed(0)} ${units}`
    : `${num.toFixed(2)} ${units}`;
};
