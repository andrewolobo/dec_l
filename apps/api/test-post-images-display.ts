/**
 * Test script to verify post images are properly returned
 * Tests the complete flow: create post with images -> fetch post -> verify images display
 */

import { postService } from './src/services/post.service';
import { uploadService } from './src/services/upload.service';
import * as fs from 'fs';
import * as path from 'path';

async function testPostImages() {
  console.log('🧪 Testing Post Images Display\n');

  try {
    // Step 1: Upload a test image
    console.log('📤 Step 1: Uploading test image...');
    const testImagePath = path.join(__dirname, 'test-image.jpg');
    
    if (!fs.existsSync(testImagePath)) {
      // Create a minimal JPEG (1x1 red pixel)
      const minimalJpeg = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
        0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
        0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
        0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
        0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
        0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
        0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x09, 0xFF, 0xC4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00,
        0x7F, 0xA0, 0x0F, 0xFF, 0xD9
      ]);
      fs.writeFileSync(testImagePath, minimalJpeg);
    }

    const buffer = fs.readFileSync(testImagePath);
    const fileName = 'test-post-image-' + Date.now() + '.jpg';

    const mockFile: Express.Multer.File = {
      fieldname: 'image',
      originalname: fileName,
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: buffer.length,
      buffer: buffer,
      destination: '',
      filename: fileName,
      path: '',
      stream: null as any,
    };

    const uploadResult = await uploadService.uploadSingleImage(1, mockFile);
    
    if (!uploadResult.success || !uploadResult.data) {
      console.error('❌ Upload failed:', uploadResult.error);
      process.exit(1);
    }

    const blobPath = uploadResult.data.url;
    console.log('✅ Image uploaded:', blobPath);
    console.log('   Preview URL:', uploadResult.data.previewUrl.substring(0, 60) + '...\n');

    // Step 2: Create a test post with the image
    console.log('📝 Step 2: Creating test post with image...');
    const createResult = await postService.createPost({
      userId: 1,
      title: 'Test Post - Image Display Verification',
      categoryId: 1,
      description: 'This is a test post to verify images display correctly on single post page.',
      price: 100,
      location: 'Test Location',
      contactNumber: '1234567890',
      images: [
        { imageUrl: blobPath, displayOrder: 0 }
      ]
    });

    if (!createResult.success || !createResult.data) {
      console.error('❌ Post creation failed:', createResult.error);
      process.exit(1);
    }

    const postId = createResult.data.id;
    console.log('✅ Post created with ID:', postId);
    console.log('   Images in response:', createResult.data.images.length, '\n');

    // Step 3: Fetch the post and verify images
    console.log('🔍 Step 3: Fetching post to verify images...');
    const getResult = await postService.getPost(postId);

    if (!getResult.success || !getResult.data) {
      console.error('❌ Failed to fetch post:', getResult.error);
      process.exit(1);
    }

    const post = getResult.data;
    console.log('📊 Post Retrieval Results:');
    console.log('─────────────────────────────────────────────────────────────');
    console.log('Post ID:', post.id);
    console.log('Title:', post.title);
    console.log('Images count:', post.images.length);
    
    if (post.images.length > 0) {
      post.images.forEach((img, index) => {
        console.log(`\nImage ${index + 1}:`);
        console.log('  - ID:', img.id);
        console.log('  - Display Order:', img.displayOrder);
        console.log('  - Image URL (first 80 chars):', img.imageUrl.substring(0, 80));
        console.log('  - Is full URL:', img.imageUrl.startsWith('https://'));
        console.log('  - Has SAS token:', img.imageUrl.includes('?sv=') || img.imageUrl.includes('&sv='));
      });
    }
    console.log('─────────────────────────────────────────────────────────────\n');

    // Validation
    console.log('🔍 Validation:');
    const hasImages = post.images.length > 0;
    console.log(hasImages ? '✅' : '❌', 'Post has images:', post.images.length);
    
    if (hasImages) {
      const firstImage = post.images[0];
      const isFullUrl = firstImage.imageUrl.startsWith('https://');
      const hasSasToken = firstImage.imageUrl.includes('?sv=');
      
      console.log(isFullUrl ? '✅' : '❌', 'Image URL is full URL');
      console.log(hasSasToken ? '✅' : '❌', 'Image URL has SAS token');
      
      if (isFullUrl && hasSasToken) {
        console.log('\n🎉 All validation checks passed!');
        console.log('✅ Post images are properly returned with SAS URLs');
        console.log(`\n🌐 Test the post in browser: http://localhost:5173/post/${postId}`);
      } else {
        console.log('\n❌ Validation failed');
        process.exit(1);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testPostImages()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
