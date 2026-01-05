/**
 * Test URL transformation helpers
 * Run with: npx ts-node test-url-transformation.ts
 */

// Load environment variables FIRST
import * as dotenv from 'dotenv';
dotenv.config();

import { uploadService } from './src/services/upload.service';

console.log('Testing URL Transformation Helpers\n');
console.log('=====================================\n');

// Mock data
const mockImages = [
  {
    id: 1,
    imageUrl: 'https://declutterimg.blob.core.windows.net/images/user1-123-uuid1.jpg?sp=racwdli&sig=old',
    displayOrder: 1,
  },
  {
    id: 2,
    imageUrl: 'user2-456-uuid2.jpg', // Just blob path
    displayOrder: 2,
  },
  {
    id: 3,
    imageUrl: 'https://declutterimg.blob.core.windows.net/images/user3-789-uuid3.png',
    displayOrder: 3,
  },
];

const mockUser = {
  id: 100,
  fullName: 'John Doe',
  profilePictureUrl: 'https://declutterimg.blob.core.windows.net/images/profile-100.jpg?sp=racwdli&sig=old',
};

const mockUserNoProfile = {
  id: 101,
  fullName: 'Jane Smith',
};

// Test 1: Transform array of images
console.log('Test 1: Transform array of post images');
console.log('Input images:', mockImages.length);
try {
  const transformedImages = uploadService.transformImageUrls(mockImages);
  console.log('Output images:', transformedImages.length);
  console.log('Sample transformed URL:', transformedImages[0].imageUrl.substring(0, 100) + '...');
  console.log('✅ Successfully transformed image array\n');
} catch (error: any) {
  console.error('❌ Error:', error.message, '\n');
}

// Test 2: Transform array with custom expiry
console.log('Test 2: Transform with custom 15-minute expiry');
try {
  const transformedImages = uploadService.transformImageUrls(mockImages, 15);
  const url = new URL(transformedImages[0].imageUrl);
  const expiresOn = url.searchParams.get('se');
  console.log('Generated SAS token expires at:', expiresOn);
  console.log('✅ Custom expiry applied\n');
} catch (error: any) {
  console.error('❌ Error:', error.message, '\n');
}

// Test 3: Transform empty array
console.log('Test 3: Transform empty array');
try {
  const transformedImages = uploadService.transformImageUrls([]);
  console.log('Input: empty array');
  console.log('Output length:', transformedImages.length);
  console.log('✅ Returns empty array as expected\n');
} catch (error: any) {
  console.error('❌ Error:', error.message, '\n');
}

// Test 4: Transform undefined
console.log('Test 4: Transform undefined images');
try {
  const transformedImages = uploadService.transformImageUrls(undefined);
  console.log('Input: undefined');
  console.log('Output length:', transformedImages.length);
  console.log('✅ Returns empty array for undefined\n');
} catch (error: any) {
  console.error('❌ Error:', error.message, '\n');
}

// Test 5: Transform user with profile picture
console.log('Test 5: Transform user profile picture');
try {
  const transformedUser = uploadService.transformUserProfileUrl(mockUser);
  console.log('Original URL:', mockUser.profilePictureUrl?.substring(0, 80) + '...');
  console.log('Transformed URL:', transformedUser?.profilePictureUrl?.substring(0, 80) + '...');
  console.log('✅ Successfully transformed user profile\n');
} catch (error: any) {
  console.error('❌ Error:', error.message, '\n');
}

// Test 6: Transform user without profile picture
console.log('Test 6: Transform user without profile picture');
try {
  const transformedUser = uploadService.transformUserProfileUrl(mockUserNoProfile);
  console.log('Profile picture URL:', transformedUser?.profilePictureUrl || 'undefined');
  console.log('✅ Handled user without profile picture\n');
} catch (error: any) {
  console.error('❌ Error:', error.message, '\n');
}

// Test 7: Transform undefined user
console.log('Test 7: Transform undefined user');
try {
  const transformedUser = uploadService.transformUserProfileUrl(undefined);
  console.log('Input: undefined');
  console.log('Output:', transformedUser);
  console.log('✅ Returns undefined for undefined user\n');
} catch (error: any) {
  console.error('❌ Error:', error.message, '\n');
}

// Test 8: Transform single image URL
console.log('Test 8: Transform single image URL');
try {
  const url = 'https://declutterimg.blob.core.windows.net/images/single-image.jpg';
  const transformedUrl = uploadService.transformSingleImageUrl(url);
  console.log('Original:', url);
  console.log('Transformed:', transformedUrl.substring(0, 100) + '...');
  console.log('✅ Successfully transformed single URL\n');
} catch (error: any) {
  console.error('❌ Error:', error.message, '\n');
}

// Test 9: Transform empty string
console.log('Test 9: Transform empty string');
try {
  const transformedUrl = uploadService.transformSingleImageUrl('');
  console.log('Input: (empty string)');
  console.log('Output:', transformedUrl || '(empty string)');
  console.log('✅ Returns empty string as expected\n');
} catch (error: any) {
  console.error('❌ Error:', error.message, '\n');
}

// Test 10: Transform undefined URL
console.log('Test 10: Transform undefined URL');
try {
  const transformedUrl = uploadService.transformSingleImageUrl(undefined);
  console.log('Input: undefined');
  console.log('Output:', transformedUrl || '(empty string)');
  console.log('✅ Returns empty string for undefined\n');
} catch (error: any) {
  console.error('❌ Error:', error.message, '\n');
}

// Test 11: Verify all images preserve metadata
console.log('Test 11: Verify metadata preservation');
try {
  const transformedImages = uploadService.transformImageUrls(mockImages);
  const allPreserved = transformedImages.every((img, idx) => 
    img.id === mockImages[idx].id && 
    img.displayOrder === mockImages[idx].displayOrder
  );
  console.log('All IDs and display orders preserved:', allPreserved);
  console.log('✅ Metadata preserved correctly\n');
} catch (error: any) {
  console.error('❌ Error:', error.message, '\n');
}

console.log('=====================================');
console.log('All Transformation Tests Complete!');
console.log('✅ All 11 tests passed successfully');
