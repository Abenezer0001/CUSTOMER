/**
 * Utility functions for handling monetary calculations with proper precision
 */

/**
 * Rounds a number to 2 decimal places for monetary values
 * Avoids floating point precision errors
 * @param value - The value to round
 * @returns The rounded value
 */
export const roundToCents = (value: number): number => {
  return Number(value.toFixed(2));
};

/**
 * Converts a dollar amount to cents (for Stripe API)
 * Ensures the result is a valid integer
 * @param dollars - The dollar amount
 * @returns The amount in cents as an integer
 */
export const dollarsToCents = (dollars: number): number => {
  const cents = Math.round(dollars * 100);
  
  // Validate that the result is a valid integer
  if (!Number.isInteger(cents) || cents < 0 || isNaN(cents)) {
    throw new Error(`Invalid dollar amount for conversion: $${dollars} -> ${cents} cents`);
  }
  
  return cents;
};

/**
 * Converts cents to dollars
 * @param cents - The amount in cents
 * @returns The amount in dollars
 */
export const centsToDollars = (cents: number): number => {
  return roundToCents(cents / 100);
};

/**
 * Safely adds multiple monetary values
 * @param values - Array of monetary values to add
 * @returns The sum with proper precision
 */
export const addMonetaryValues = (...values: number[]): number => {
  const sum = values.reduce((total, value) => total + value, 0);
  return roundToCents(sum);
};

/**
 * Calculates percentage of a monetary value
 * @param amount - The base amount
 * @param percentage - The percentage (e.g., 15 for 15%)
 * @returns The calculated percentage amount
 */
export const calculatePercentage = (amount: number, percentage: number): number => {
  return roundToCents(amount * (percentage / 100));
};

/**
 * Validates that a monetary value is valid for payment processing
 * @param value - The value to validate
 * @param fieldName - The name of the field (for error messages)
 * @returns True if valid, throws error if invalid
 */
export const validateMonetaryValue = (value: number, fieldName: string = 'amount'): boolean => {
  if (typeof value !== 'number' || isNaN(value) || value < 0) {
    throw new Error(`Invalid ${fieldName}: ${value}. Must be a non-negative number.`);
  }
  
  // Check if the value has more than 2 decimal places
  const rounded = roundToCents(value);
  if (Math.abs(value - rounded) > 0.001) {
    console.warn(`${fieldName} ${value} has precision beyond cents, rounding to ${rounded}`);
  }
  
  return true;
};

/**
 * Formats a monetary value for display
 * @param value - The value to format
 * @param currency - The currency symbol (default: '$')
 * @returns The formatted string
 */
export const formatMoney = (value: number, currency: string = '$'): string => {
  validateMonetaryValue(value);
  return `${currency}${roundToCents(value).toFixed(2)}`;
};

/**
 * Calculates order totals with proper precision
 * @param subtotal - The subtotal amount
 * @param serviceCharge - The service charge amount
 * @param tip - The tip amount
 * @param tax - The tax amount (optional)
 * @returns Object with all calculated values
 */
export const calculateOrderTotals = (
  subtotal: number,
  serviceCharge: number = 0,
  tip: number = 0,
  tax: number = 0
) => {
  validateMonetaryValue(subtotal, 'subtotal');
  validateMonetaryValue(serviceCharge, 'serviceCharge');
  validateMonetaryValue(tip, 'tip');
  validateMonetaryValue(tax, 'tax');

  return {
    subtotal: roundToCents(subtotal),
    serviceCharge: roundToCents(serviceCharge),
    tip: roundToCents(tip),
    tax: roundToCents(tax),
    total: addMonetaryValues(subtotal, serviceCharge, tip, tax)
  };
};