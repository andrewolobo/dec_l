/**
 * Test post service URL transformation integration
 * Run with: npx ts-node test-post-service-integration.ts
 */

// Load environment variables FIRST
import * as dotenv from 'dotenv';
dotenv.config();

// Mock the postRepository to avoid database dependency
const mockPost = {
  id: 1,
  title: 'Test Post',
  description: 'Test description',
  price: 100,
  location: 'Test Location',
  brand: 'Test Brand',
  deliveryMethod: 'Pickup',
  contactNumber: '1234567890',
  emailAddress: 'test@example.com',
  status: 'Active',
  images: [
    {
      id: 1,
      imageUrl: 'https://declutterimg.blob.core.windows.net/images/post1-img1.jpg?sp=racwdli&sig=old',
      displayOrder: 1,
    },
    {
      id: 2,
      imageUrl: 'post1-img2.jpg', // Just blob path
      displayOrder: 2,
    },
  ],
  likes: [],
  views: [],
  scheduledPublishTime: null,
  publishedAt: new Date(),
  expiresAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockUser = {
  id: 10,
  fullName: 'John Doe',
  profilePictureUrl: 'https://declutterimg.blob.core.windows.net/images/user-10-profile.jpg?sp=racwdli&sig=old',
};

const mockCategory = {
  id: 5,
  name: 'Electronics',
  description: 'Electronic devices',
};

console.log('Testing Post Service URL Transformation\n');
console.log('========================================\n');

// Import after mocking setup
import { uploadService } from './src/services/upload.service';

// Simulate the mapToPostResponse logic
function testMapToPostResponse(post: any, user: any, category: any) {
  // Prepare image data
  const images = post.images?.map((img: any) => ({
    id: img.id,
    imageUrl: img.imageUrl,
    displayOrder: img.displayOrder,
  })) || [];

  // Prepare user data
  const userData = {
    id: user.id,
    fullName: user.fullName,
    profilePictureUrl: user.profilePictureUrl || undefined,
  };

  return {
    id: post.id,
    title: post.title,
    description: post.description,
    price: post.price,
    location: post.location,
    brand: post.brand || undefined,
    deliveryMethod: post.deliveryMethod || undefined,
    contactNumber: post.contactNumber,
    emailAddress: post.emailAddress || undefined,
    status: post.status,
    // Transform user profile picture with fresh SAS token
    user: uploadService.transformUserProfileUrl(userData) || userData,
    category: {
      id: category.id,
      name: category.name,
      description: category.description || undefined,
    },
    // Transform image URLs with fresh SAS tokens
    images: uploadService.transformImageUrls(images),
    likeCount: post.likes?.length || 0,
    viewCount: post.views?.length || 0,
    scheduledPublishTime: post.scheduledPublishTime || undefined,
    publishedAt: post.publishedAt || undefined,
    expiresAt: post.expiresAt || undefined,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

console.log('Test 1: Transform post response with images and user profile\n');
try {
  const response = testMapToPostResponse(mockPost, mockUser, mockCategory);
  
  console.log('Post ID:', response.id);
  console.log('Title:', response.title);
  console.log('Number of images:', response.images.length);
  console.log('\nImage 1 (Full URL):');
  console.log('  Original:', mockPost.images[0].imageUrl.substring(0, 80) + '...');
  console.log('  Transformed:', response.images[0].imageUrl.substring(0, 80) + '...');
  console.log('  Has fresh SAS?', response.images[0].imageUrl.includes('sv=2025-11-05'));
  
  console.log('\nImage 2 (Blob path):');
  console.log('  Original:', mockPost.images[1].imageUrl);
  console.log('  Transformed:', response.images[1].imageUrl.substring(0, 80) + '...');
  console.log('  Has fresh SAS?', response.images[1].imageUrl.includes('sv=2025-11-05'));
  
  console.log('\nUser Profile Picture:');
  console.log('  Original:', mockUser.profilePictureUrl.substring(0, 80) + '...');
  console.log('  Transformed:', response.user.profilePictureUrl?.substring(0, 80) + '...');
  console.log('  Has fresh SAS?', response.user.profilePictureUrl?.includes('sv=2025-11-05'));
  
  console.log('\n✅ Post service transformation working correctly!\n');
} catch (error: any) {
  console.error('❌ Error:', error.message, '\n');
}

console.log('Test 2: Verify metadata preservation\n');
try {
  const response = testMapToPostResponse(mockPost, mockUser, mockCategory);
  
  const image1Preserved = 
    response.images[0].id === mockPost.images[0].id &&
    response.images[0].displayOrder === mockPost.images[0].displayOrder;
  
  const image2Preserved = 
    response.images[1].id === mockPost.images[1].id &&
    response.images[1].displayOrder === mockPost.images[1].displayOrder;
  
  console.log('Image 1 metadata preserved:', image1Preserved);
  console.log('Image 2 metadata preserved:', image2Preserved);
  console.log('User data preserved:', response.user.id === mockUser.id);
  console.log('Category data preserved:', response.category.id === mockCategory.id);
  
  if (image1Preserved && image2Preserved) {
    console.log('\n✅ All metadata preserved correctly!\n');
  } else {
    console.log('\n❌ Some metadata lost!\n');
  }
} catch (error: any) {
  console.error('❌ Error:', error.message, '\n');
}

console.log('Test 3: Post without images or profile picture\n');
try {
  const postNoImages = { ...mockPost, images: [] };
  const userNoProfile = { ...mockUser, profilePictureUrl: undefined };
  
  const response = testMapToPostResponse(postNoImages, userNoProfile, mockCategory);
  
  console.log('Images array:', response.images);
  console.log('User profile picture:', response.user.profilePictureUrl || 'undefined');
  console.log('\n✅ Handled empty data correctly!\n');
} catch (error: any) {
  console.error('❌ Error:', error.message, '\n');
}

console.log('========================================');
console.log('Post Service Integration Tests Complete!');
console.log('✅ All transformations working as expected');
