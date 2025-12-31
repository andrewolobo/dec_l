/**
 * Standalone Azure Blob Upload Test
 * Run with: node test-azure-upload.js
 */

require('dotenv').config();
const { BlobServiceClient } = require("@azure/storage-blob");
const fs = require("fs");
const path = require("path");

// Azure configuration from .env
const SAS_TOKEN = process.env.SAS_TOKEN;
const BLOB_URL = process.env.BLOB_URL;

if (!SAS_TOKEN || !BLOB_URL) {
  console.error('❌ Missing required environment variables:');
  if (!SAS_TOKEN) console.error('   - SAS_TOKEN not found in .env');
  if (!BLOB_URL) console.error('   - BLOB_URL not found in .env');
  process.exit(1);
}

// Parse configuration
const BLOB_STORAGE_ACCOUNT = "declutterimg";
const CONTAINER_NAME = "images";
const ACCOUNT_URL = `https://${BLOB_STORAGE_ACCOUNT}.blob.core.windows.net`;

console.log('📋 Configuration loaded from .env:');
console.log('   - Storage Account:', BLOB_STORAGE_ACCOUNT);
console.log('   - Container:', CONTAINER_NAME);
console.log('   - SAS Token:', SAS_TOKEN.substring(0, 20) + '...');
console.log('');

// Create a simple test image buffer (minimal JPEG)
function createTestJpegBuffer() {
  // Minimal valid JPEG: FFD8 (SOI) + FFD9 (EOI) markers
  const header = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
  const filler = Buffer.alloc(100, 0xFF);
  const footer = Buffer.from([0xFF, 0xD9]);
  return Buffer.concat([header, filler, footer]);
}

async function testAzureUpload() {
  console.log("🚀 Starting Azure Blob Storage Upload Test\n");

  try {
    // 1. Initialize Azure Client
    console.log("📡 Connecting to Azure...");
    const blobServiceClient = new BlobServiceClient(`${ACCOUNT_URL}?${SAS_TOKEN}`);
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
    console.log("✅ Connected to container:", CONTAINER_NAME);

    // 2. Verify container exists (skip - may require additional permissions)
    console.log("\n🔍 Skipping container verification...");
    console.log("✅ Proceeding with upload test");

    // 3. Create test file
    console.log("\n📝 Creating test file...");
    const testBuffer = createTestJpegBuffer();
    const blobName = `test-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
    console.log("✅ Test file created:", blobName);
    console.log("   Size:", testBuffer.length, "bytes");

    // 4. Upload to Azure
    console.log("\n⬆️  Uploading to Azure...");
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.upload(testBuffer, testBuffer.length, {
      blobHTTPHeaders: {
        blobContentType: "image/jpeg",
      },
    });
    console.log("✅ Upload successful!");

    // 5. Verify upload
    console.log("\n🔍 Verifying uploaded blob...");
    const blobExists = await blockBlobClient.exists();
    if (!blobExists) {
      throw new Error("Blob was not uploaded!");
    }

    const properties = await blockBlobClient.getProperties();
    console.log("✅ Blob verified in Azure:");
    console.log("   Name:", blobName);
    console.log("   Content-Type:", properties.contentType);
    console.log("   Size:", properties.contentLength, "bytes");
    console.log("   Last Modified:", properties.lastModified.toISOString());

    // 6. Generate URL
    const fullBlobUrl = blockBlobClient.url;
    console.log("\n🔗 Blob URL:");
    console.log("   ", fullBlobUrl.substring(0, 100) + "...");

    // 7. Cleanup
    console.log("\n🧹 Cleaning up...");
    await blockBlobClient.delete();
    console.log("✅ Blob deleted");

    console.log("\n✅ ALL TESTS PASSED! ✅");
    console.log("================================================");
    console.log("Azure Blob Storage is configured correctly!");
    console.log("Upload service should work as expected.");
    console.log("================================================\n");

  } catch (error) {
    console.error("\n❌ TEST FAILED!");
    console.error("Error:", error.message);
    if (error.details) {
      console.error("Details:", error.details);
    }
    console.error("\nStack:", error.stack);
    process.exit(1);
  }
}

// Run the test
testAzureUpload();
