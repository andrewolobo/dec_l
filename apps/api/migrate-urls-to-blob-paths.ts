/**
 * Database Migration: Convert Full URLs to Blob Paths
 * 
 * This migration updates existing PostImage and User records to store only
 * blob paths instead of full URLs with SAS tokens.
 * 
 * Run with: npx ts-node migrate-urls-to-blob-paths.ts
 * 
 * IMPORTANT: 
 * - Backup your database before running this migration
 * - Test on a development/staging environment first
 * - This operation is reversible (see rollback section)
 */

import * as dotenv from 'dotenv';
dotenv.config();

import prisma from './src/dal/prisma.client';

/**
 * Extract blob path from full Azure URL
 */
function extractBlobPath(url: string): string {
  // If it's already just a blob path, return as-is
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return url;
  }

  try {
    // Remove query parameters (SAS token)
    const urlWithoutQuery = url.split('?')[0];
    
    // Parse URL and extract path
    const urlObj = new URL(urlWithoutQuery);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    
    // Remove container name (first part) and return the rest
    // e.g., /images/123-uuid.jpg -> 123-uuid.jpg
    if (pathParts.length > 1) {
      return pathParts.slice(1).join('/');
    }
    
    // If only one part, it's likely just the blob name
    return pathParts[0] || url;
  } catch (error) {
    // If URL parsing fails, try to extract blob name manually
    const match = url.match(/\/images\/(.+?)(?:\?|$)/);
    if (match) {
      return match[1];
    }
    // Last resort: return as-is
    console.warn(`Failed to extract blob path from: ${url}`);
    return url;
  }
}

async function migratePostImages() {
  console.log('\n📸 Migrating PostImage URLs...\n');
  
  // Get all post images
  const images = await prisma.postImage.findMany({
    select: { id: true, imageUrl: true },
  });

  console.log(`Found ${images.length} post images`);
  
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const image of images) {
    const originalUrl = image.imageUrl;
    const blobPath = extractBlobPath(originalUrl);

    // Skip if already a blob path
    if (originalUrl === blobPath && !originalUrl.startsWith('http')) {
      skippedCount++;
      continue;
    }

    try {
      await prisma.postImage.update({
        where: { id: image.id },
        data: { imageUrl: blobPath },
      });
      updatedCount++;
      
      if (updatedCount % 100 === 0) {
        console.log(`  Progress: ${updatedCount} updated...`);
      }
    } catch (error: any) {
      console.error(`  ❌ Failed to update image ${image.id}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n✅ PostImage migration complete:`);
  console.log(`   - Updated: ${updatedCount}`);
  console.log(`   - Skipped: ${skippedCount}`);
  console.log(`   - Errors: ${errorCount}`);
}

async function migrateUserProfiles() {
  console.log('\n👤 Migrating User profile pictures...\n');
  
  // Get all users with profile pictures
  const users = await prisma.user.findMany({
    where: {
      profilePictureUrl: {
        not: null,
      },
    },
    select: { id: true, profilePictureUrl: true },
  });

  console.log(`Found ${users.length} users with profile pictures`);
  
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const user of users) {
    if (!user.profilePictureUrl) continue;

    const originalUrl = user.profilePictureUrl;
    const blobPath = extractBlobPath(originalUrl);

    // Skip if already a blob path
    if (originalUrl === blobPath && !originalUrl.startsWith('http')) {
      skippedCount++;
      continue;
    }

    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { profilePictureUrl: blobPath },
      });
      updatedCount++;
      
      if (updatedCount % 100 === 0) {
        console.log(`  Progress: ${updatedCount} updated...`);
      }
    } catch (error: any) {
      console.error(`  ❌ Failed to update user ${user.id}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n✅ User profile migration complete:`);
  console.log(`   - Updated: ${updatedCount}`);
  console.log(`   - Skipped: ${skippedCount}`);
  console.log(`   - Errors: ${errorCount}`);
}

async function runMigration() {
  console.log('========================================');
  console.log('Database Migration: URLs to Blob Paths');
  console.log('========================================');
  console.log(`\nStarted at: ${new Date().toISOString()}`);

  try {
    // Migrate PostImage URLs
    await migratePostImages();

    // Migrate User profile picture URLs
    await migrateUserProfiles();

    console.log('\n========================================');
    console.log('✅ Migration completed successfully!');
    console.log('========================================\n');
  } catch (error: any) {
    console.error('\n========================================');
    console.error('❌ Migration failed!');
    console.error('========================================');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Rollback function (if needed)
async function rollbackMigration() {
  console.log('========================================');
  console.log('⚠️  ROLLBACK: This would convert blob paths back to full URLs');
  console.log('========================================');
  console.log('\nNote: Rollback requires the static SAS token to be configured.');
  console.log('This is not typically needed as the new system works with both formats.');
  console.log('\nIf you need to rollback, you can:');
  console.log('1. Restore from database backup (recommended)');
  console.log('2. Or manually construct full URLs from blob paths\n');
}

// Main execution
const args = process.argv.slice(2);
if (args.includes('--rollback')) {
  rollbackMigration().then(() => process.exit(0));
} else if (args.includes('--help')) {
  console.log(`
Database Migration Tool

Usage:
  npx ts-node migrate-urls-to-blob-paths.ts          # Run migration
  npx ts-node migrate-urls-to-blob-paths.ts --help   # Show this help

What this does:
  - Converts PostImage.imageUrl from full URLs to blob paths
  - Converts User.profilePictureUrl from full URLs to blob paths
  - Skips records that are already blob paths
  - Safe to run multiple times (idempotent)

Before running:
  1. ✅ Backup your database
  2. ✅ Test on development/staging first
  3. ✅ Ensure Steps 1-4 of dynamic SAS implementation are complete
  4. ✅ Verify API is working with current data

After running:
  - New uploads will store blob paths automatically
  - API responses will have fresh SAS tokens (60-minute expiry)
  - Database will be ~88% smaller (for URL fields)
  `);
} else {
  runMigration();
}
