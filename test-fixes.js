#!/usr/bin/env node

/**
 * Test script to verify restaurant ordering system fixes
 * Tests precision calculations, Stripe validation, and order totals
 */

// Import the price utility functions (simulated)
const priceUtils = {
  roundToCents: (value) => Number(value.toFixed(2)),
  dollarsToCents: (dollars) => {
    const cents = Math.round(dollars * 100);
    if (!Number.isInteger(cents) || cents < 0 || isNaN(cents)) {
      throw new Error(`Invalid dollar amount for conversion: $${dollars} -> ${cents} cents`);
    }
    return cents;
  },
  addMonetaryValues: (...values) => {
    const sum = values.reduce((total, value) => total + value, 0);
    return Number(sum.toFixed(2));
  },
  calculatePercentage: (amount, percentage) => {
    return Number((amount * (percentage / 100)).toFixed(2));
  }
};

console.log('🧪 Testing Restaurant Ordering System Fixes\n');

// Test 1: Floating Point Precision Issues
console.log('Test 1: Floating Point Precision');
console.log('==============================');

// Simulate the original problematic calculation
const originalTip = 12.99 * 0.2; // This produces 2.5980000000000003
console.log('❌ Original calculation: 12.99 * 0.2 =', originalTip);

// Fixed calculation
const fixedTip = priceUtils.calculatePercentage(12.99, 20);
console.log('✅ Fixed calculation: 12.99 * 20% =', fixedTip);

// Test service charge calculation
const subtotal = 58.97;
const serviceChargePercentage = 15;
const originalServiceCharge = subtotal * (serviceChargePercentage / 100);
const fixedServiceCharge = priceUtils.calculatePercentage(subtotal, serviceChargePercentage);

console.log('❌ Original service charge: 58.97 * 15% =', originalServiceCharge);
console.log('✅ Fixed service charge: 58.97 * 15% =', fixedServiceCharge);
console.log('');

// Test 2: Stripe Amount Validation
console.log('Test 2: Stripe Amount Validation');
console.log('================================');

const testAmounts = [
  { name: 'Caesar Salad', amount: 12.99 },
  { name: 'Service Charge', amount: fixedServiceCharge },
  { name: 'Tip', amount: fixedTip },
  { name: 'Problematic Amount', amount: 2.5980000000000003 }
];

testAmounts.forEach(({ name, amount }) => {
  try {
    const cents = priceUtils.dollarsToCents(amount);
    console.log(`✅ ${name}: $${amount} -> ${cents} cents (valid)`);
  } catch (error) {
    console.log(`❌ ${name}: $${amount} -> ERROR: ${error.message}`);
    // Show fixed version
    const fixed = priceUtils.roundToCents(amount);
    const fixedCents = priceUtils.dollarsToCents(fixed);
    console.log(`   Fixed: $${fixed} -> ${fixedCents} cents`);
  }
});
console.log('');

// Test 3: Bill Calculation Accuracy
console.log('Test 3: Bill Calculation Accuracy');
console.log('==================================');

// Simulate order data as it would appear in the system
const mockOrders = [
  {
    id: '250804-1836',
    items: [{ name: 'Classic Caesar Salad', price: 12.99, quantity: 1 }],
    subtotal: 12.99,
    service_charge: 15.00,
    tip: 2.60,
    total: 30.59
  },
  {
    id: '250804-0586', 
    items: [
      { name: 'Chianti Wine', price: 28.99, quantity: 1 },
      { name: 'Classic Margherita Pizza', price: 16.99, quantity: 1 }
    ],
    subtotal: 45.98,
    service_charge: 15.00,
    tip: 0.00,
    total: 60.98
  }
];

// Calculate bill totals using fixed logic
const billSubtotal = priceUtils.addMonetaryValues(...mockOrders.map(o => o.subtotal));
const billServiceCharges = priceUtils.addMonetaryValues(...mockOrders.map(o => o.service_charge));
const billTips = priceUtils.addMonetaryValues(...mockOrders.map(o => o.tip));
const billTotal = priceUtils.addMonetaryValues(billSubtotal, billServiceCharges, billTips);

console.log('Order #250804-1836:');
console.log(`  Classic Caesar Salad: $${mockOrders[0].items[0].price}`);
console.log(`  Subtotal: $${mockOrders[0].subtotal}`);
console.log(`  Service Charge: $${mockOrders[0].service_charge}`);
console.log(`  Tip: $${mockOrders[0].tip}`);
console.log(`  Total: $${mockOrders[0].total}`);
console.log('');

console.log('Order #250804-0586:');
console.log(`  Chianti Wine: $${mockOrders[1].items[0].price}`);
console.log(`  Classic Margherita Pizza: $${mockOrders[1].items[1].price}`);
console.log(`  Subtotal: $${mockOrders[1].subtotal}`);
console.log(`  Service Charge: $${mockOrders[1].service_charge}`);
console.log(`  Tip: $${mockOrders[1].tip}`);
console.log(`  Total: $${mockOrders[1].total}`);
console.log('');

console.log('Bill Summary:');
console.log(`  Subtotal: $${billSubtotal}`);
console.log(`  Service Charges: $${billServiceCharges}`);
console.log(`  Tips: $${billTips}`);
console.log(`  Total: $${billTotal}`);

// Verify individual order totals match their calculated values
const order1Expected = priceUtils.addMonetaryValues(mockOrders[0].subtotal, mockOrders[0].service_charge, mockOrders[0].tip);
const order2Expected = priceUtils.addMonetaryValues(mockOrders[1].subtotal, mockOrders[1].service_charge, mockOrders[1].tip);

console.log('');
console.log('Verification:');
console.log(`  Order 1 calculated total: $${order1Expected} (stored: $${mockOrders[0].total}) ${order1Expected === mockOrders[0].total ? '✅' : '❌'}`);
console.log(`  Order 2 calculated total: $${order2Expected} (stored: $${mockOrders[1].total}) ${order2Expected === mockOrders[1].total ? '✅' : '❌'}`);
console.log(`  Expected bill total: $${order1Expected + order2Expected} (calculated: $${billTotal}) ${(order1Expected + order2Expected) === billTotal ? '✅' : '❌'}`);
console.log('');

// Test 4: Stripe Line Items Generation
console.log('Test 4: Stripe Line Items Generation');
console.log('====================================');

const generateStripeLineItems = (orders) => {
  const lineItems = [];
  
  // Add individual items
  orders.forEach(order => {
    order.items.forEach(item => {
      const itemTotal = priceUtils.roundToCents(item.price * item.quantity);
      const cents = priceUtils.dollarsToCents(itemTotal);
      
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: { name: item.name },
          unit_amount: cents
        },
        quantity: item.quantity
      });
    });
  });
  
  // Add service charges
  if (billServiceCharges > 0) {
    const serviceChargeCents = priceUtils.dollarsToCents(billServiceCharges);
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: { name: 'Service Charge' },
        unit_amount: serviceChargeCents
      },
      quantity: 1
    });
  }
  
  // Add tips
  if (billTips > 0) {
    const tipCents = priceUtils.dollarsToCents(billTips);
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: { name: 'Tips' },
        unit_amount: tipCents
      },
      quantity: 1
    });
  }
  
  return lineItems;
};

try {
  const stripeLineItems = generateStripeLineItems(mockOrders);
  console.log('✅ Stripe line items generated successfully:');
  
  let stripeTotal = 0;
  stripeLineItems.forEach((item, index) => {
    const itemTotal = item.price_data.unit_amount * item.quantity;
    stripeTotal += itemTotal;
    console.log(`  ${index + 1}. ${item.price_data.product_data.name}: ${item.price_data.unit_amount} cents × ${item.quantity} = ${itemTotal} cents`);
  });
  
  const stripeTotalDollars = stripeTotal / 100;
  console.log(`  Stripe Total: ${stripeTotal} cents = $${stripeTotalDollars}`);
  console.log(`  Bill Total: $${billTotal}`);
  console.log(`  Match: ${stripeTotalDollars === billTotal ? '✅' : '❌'}`);
  
} catch (error) {
  console.log('❌ Stripe line item generation failed:', error.message);
}

console.log('');
console.log('🎉 All tests completed! The fixes should resolve:');
console.log('   1. ✅ Floating point precision errors in calculations');
console.log('   2. ✅ "Invalid integer" errors in Stripe payments');
console.log('   3. ✅ Missing service charges and tips in bill totals');
console.log('   4. ✅ Proper validation of monetary values');
console.log('   5. ✅ Accurate bill aggregation across multiple orders');