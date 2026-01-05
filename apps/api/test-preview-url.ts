/**
 * Test script to verify preview URL implementation
 * Tests that upload returns both url (blob path) and previewUrl (full URL with SAS)
 */

import { uploadService } from './src/services/upload.service';
import * as fs from 'fs';
import * as path from 'path';

async function testPreviewUrl() {
  console.log('🧪 Testing Preview URL Implementation\n');

  try {
    // Create a test buffer (simulating an uploaded file)
    const testImagePath = path.join(__dirname, 'test-image.jpg');
    
    // Check if test image exists, if not create a minimal one
    if (!fs.existsSync(testImagePath)) {
      console.log('⚠️  Test image not found, creating a minimal test file...');
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
      console.log('✅ Created test image\n');
    }

    const buffer = fs.readFileSync(testImagePath);
    const fileName = 'test-preview-' + Date.now() + '.jpg';

    // Create a mock Multer file object
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

    console.log('📤 Uploading test image...');
    console.log('   File name:', fileName);
    console.log('   File size:', buffer.length, 'bytes\n');

    // Test single image upload (using userId 1 for testing)
    const result = await uploadService.uploadSingleImage(1, mockFile);

    if (!result.success || !result.data) {
      console.error('❌ Upload failed:', result.error);
      process.exit(1);
    }

    console.log('📊 Upload Result:');
    console.log('─────────────────────────────────────────────────────────────');
    console.log('✓ url (blob path):', result.data.url);
    console.log('✓ previewUrl (full URL):', result.data.previewUrl);
    console.log('  filename:', result.data.filename);
    console.log('  size:', result.data.size);
    console.log('  mimeType:', result.data.mimeType);
    console.log('─────────────────────────────────────────────────────────────\n');

    // Validation checks
    console.log('🔍 Validation:');
    
    // Check that url is a blob path (not a full URL)
    const isBlobPath = !result.data.url.startsWith('http://') && !result.data.url.startsWith('https://');
    console.log(isBlobPath ? '✅' : '❌', 'url is a blob path:', result.data.url);
    
    // Check that previewUrl is a full URL
    const isFullUrl = result.data.previewUrl.startsWith('https://');
    console.log(isFullUrl ? '✅' : '❌', 'previewUrl is a full URL');
    
    // Check that previewUrl contains SAS token
    const hasSasToken = result.data.previewUrl.includes('?sv=') || result.data.previewUrl.includes('&sv=');
    console.log(hasSasToken ? '✅' : '❌', 'previewUrl contains SAS token');
    
    // Check that both reference the same blob
    const blobName = result.data.url;
    const containsBlobName = result.data.previewUrl.includes(blobName);
    console.log(containsBlobName ? '✅' : '❌', 'previewUrl references the same blob');

    console.log('\n');
    if (isBlobPath && isFullUrl && hasSasToken && containsBlobName) {
      console.log('🎉 All validation checks passed!');
      console.log('✅ Implementation is correct');
    } else {
      console.log('❌ Some validation checks failed');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testPreviewUrl()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
