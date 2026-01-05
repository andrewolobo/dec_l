/**
 * Quick test script for dynamic SAS URL generation
 * Run with: npx ts-node test-dynamic-sas.ts
 */

// Load environment variables FIRST
import * as dotenv from 'dotenv';
dotenv.config();

import { uploadService } from './src/services/upload.service';

console.log('Testing Dynamic SAS URL Generation\n');
console.log('=====================================\n');

// Test 1: Extract blob name from full URL
console.log('Test 1: Extract blob name from full URL');
const fullUrl = 'https://declutterimg.blob.core.windows.net/images/123-1234567890-uuid.jpg?sp=racwdli&sig=abc123';
try {
  const result = uploadService.generateDynamicSasUrl(fullUrl);
  console.log('Input:', fullUrl);
  console.log('Output:', result);
  console.log('✅ Successfully generated URL\n');
} catch (error: any) {
  console.error('❌ Error:', error.message, '\n');
}

// Test 2: Extract blob name from blob path
console.log('Test 2: Generate SAS from blob path');
const blobPath = '123-1234567890-uuid.jpg';
try {
  const result = uploadService.generateDynamicSasUrl(blobPath);
  console.log('Input:', blobPath);
  console.log('Output:', result);
  console.log('✅ Successfully generated URL\n');
} catch (error: any) {
  console.error('❌ Error:', error.message, '\n');
}

// Test 3: Handle empty string
console.log('Test 3: Handle empty string');
try {
  const result = uploadService.generateDynamicSasUrl('');
  console.log('Input: (empty string)');
  console.log('Output:', result);
  console.log('✅ Returned empty string as expected\n');
} catch (error: any) {
  console.error('❌ Error:', error.message, '\n');
}

// Test 4: Check if credential is initialized
console.log('Test 4: Check credential initialization');
const service = uploadService as any;
if (service.sharedKeyCredential) {
  console.log('✅ StorageSharedKeyCredential is initialized');
  console.log('   Account:', service.sharedKeyCredential.accountName);
} else {
  console.log('⚠️  StorageSharedKeyCredential not initialized');
  console.log('   This is expected if AZURE_STORAGE_ACCOUNT_KEY is not set');
  console.log('   Service will fall back to static SAS token');
}

console.log('\n=====================================');
console.log('Testing Complete!');
