
export const formatQuantity = (quantity: number, units: string): string => {
  const num = Number(quantity);
  const normalizedUnits = units?.trim().toLowerCase();

  if (isNaN(num) || num <= 0) return `0 ${units || ''}`;

  if (normalizedUnits === 'kg') {
    const grams = num * 1000;

    if (grams < 1000) {
      return `${Math.round(grams)}g`;
    }

    // For exact 1kg, 2kg etc.
    if (Number.isInteger(num)) {
      return `${num.toFixed(0)}kg`;
    }

    return `${num.toFixed(3).replace(/\.?0+$/, '')}kg`; // Remove trailing zeros
  }

  // Default for other units
  return Number.isInteger(num)
    ? `${num.toFixed(0)} ${units}`
    : `${num.toFixed(2)} ${units}`;
};
