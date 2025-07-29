
export const formatQuantity = (quantity: number, units: string): string => {
  const num = Number(quantity);

  if (isNaN(num)) {
    return `0 ${units || ''}`;
  }

  // Handle KG to G conversion for display
  if (units.toUpperCase() === 'KG' && num > 0 && num < 1) {
      return `${parseFloat((num * 1000).toFixed(3))} g`;
  }

  // For all other cases, or KG >= 1, display as is.
  // Use up to 3 decimal places for non-integers, and remove trailing zeros.
  return `${parseFloat(num.toFixed(3))} ${units}`;
};
