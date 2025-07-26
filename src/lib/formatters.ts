
export const formatQuantity = (quantity: number, units: string): string => {
  const normalizedUnits = units?.trim().toLowerCase();
  const num = Number(quantity);

  if (isNaN(num)) return `0 ${units || ''}`;

  if (normalizedUnits === 'kg') {
    if (num < 1 && num > 0) {
        return `${Math.round(num * 1000)}g`;
    }
    const wholeKg = num;
      return Number.isInteger(wholeKg)
        ? `${wholeKg.toFixed(0)} KG`
        : `${wholeKg.toFixed(3)} KG`;
  }

  // For non-kg units
  return Number.isInteger(num)
    ? `${num.toFixed(0)} ${units}`
    : `${num.toFixed(2)} ${units}`;
};
