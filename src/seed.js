#!/usr/bin/env node

// Simple script to run the seed-data.js file
import { main } from './seed-data.js';

console.log('Starting the seeding process...');

main().catch(error => {
  console.error('Error during seeding:', error);
  process.exit(1);
}); 