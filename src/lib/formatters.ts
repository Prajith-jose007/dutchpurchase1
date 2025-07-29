
export const formatQuantity = (quantity: number, units: string): string => {
  const num = Number(quantity);

  if (isNaN(num)) {
    return `0 ${units || ''}`;
  }

  // Always display the number with its unit.
  // Use up to 3 decimal places for non-integers, and remove trailing zeros.
  return `${parseFloat(num.toFixed(3))} ${units}`;
};
