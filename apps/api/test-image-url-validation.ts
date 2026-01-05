/**
 * Test image URL validation after Step 5 implementation
 * Run with: npx ts-node test-image-url-validation.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

import Joi from 'joi';

// Updated validation schema
const imageSchema = Joi.object({
  imageUrl: Joi.string()
    .pattern(/^(https?:\/\/.*|[\w-]+\.[a-zA-Z]{2,5})$/)
    .required()
    .messages({
      "string.pattern.base": "imageUrl must be either a valid URL or a blob path (e.g., filename.jpg)",
    }),
  displayOrder: Joi.number().integer().min(0).required(),
});

console.log('Testing Image URL Validation\n');
console.log('=====================================\n');

const testCases = [
  // New format (blob paths) - should PASS
  {
    name: 'Blob path (new format)',
    data: { imageUrl: '123-1234567890-uuid.jpg', displayOrder: 1 },
    shouldPass: true,
  },
  {
    name: 'Blob path with PNG',
    data: { imageUrl: '456-timestamp-uuid.png', displayOrder: 2 },
    shouldPass: true,
  },
  {
    name: 'Blob path with WEBP',
    data: { imageUrl: '789-timestamp-uuid.webp', displayOrder: 3 },
    shouldPass: true,
  },
  
  // Old format (full URLs) - should PASS (backward compatibility)
  {
    name: 'Full HTTPS URL with SAS token',
    data: { imageUrl: 'https://declutterimg.blob.core.windows.net/images/123-uuid.jpg?sp=r&sig=abc', displayOrder: 1 },
    shouldPass: true,
  },
  {
    name: 'Full HTTP URL',
    data: { imageUrl: 'http://example.com/images/test.jpg', displayOrder: 1 },
    shouldPass: true,
  },
  
  // Invalid formats - should FAIL
  {
    name: 'Empty string',
    data: { imageUrl: '', displayOrder: 1 },
    shouldPass: false,
  },
  {
    name: 'No file extension',
    data: { imageUrl: '123-timestamp-uuid', displayOrder: 1 },
    shouldPass: false,
  },
  {
    name: 'Invalid characters',
    data: { imageUrl: '123 timestamp uuid.jpg', displayOrder: 1 },
    shouldPass: false,
  },
  {
    name: 'Missing imageUrl',
    data: { displayOrder: 1 },
    shouldPass: false,
  },
];

let passed = 0;
let failed = 0;

for (const test of testCases) {
  const result = imageSchema.validate(test.data);
  const actuallyPassed = !result.error;
  const testPassed = actuallyPassed === test.shouldPass;
  
  if (testPassed) {
    passed++;
    console.log(`✅ ${test.name}`);
  } else {
    failed++;
    console.log(`❌ ${test.name}`);
    console.log(`   Expected: ${test.shouldPass ? 'PASS' : 'FAIL'}`);
    console.log(`   Got: ${actuallyPassed ? 'PASS' : 'FAIL'}`);
    if (result.error) {
      console.log(`   Error: ${result.error.message}`);
    }
  }
  console.log();
}

console.log('=====================================');
console.log(`Results: ${passed}/${testCases.length} tests passed`);
console.log('=====================================\n');

if (failed === 0) {
  console.log('✅ All validation tests passed!');
  console.log('   - Blob paths (new format) are accepted');
  console.log('   - Full URLs (old format) are accepted');
  console.log('   - Invalid formats are rejected');
  console.log('\n🎉 Post creation should now work with blob paths!');
} else {
  console.log('❌ Some tests failed. Please review the validation logic.');
  process.exit(1);
}
