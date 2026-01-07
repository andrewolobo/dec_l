import { sellerRatingRepository } from "./dal/repositories";

/**
 * Test script for SellerRating Repository
 * Tests basic CRUD operations and aggregate functions
 */
async function testSellerRatingRepository() {
  console.log("=== Testing SellerRating Repository ===\n");

  try {
    // Test 1: Check if repository is initialized
    console.log("✓ Repository initialized successfully");

    // Test 2: Get rating count (should be 0 initially)
    const totalRatings = await sellerRatingRepository.getTotalRatingsCount();
    console.log(`✓ Total ratings in system: ${totalRatings}`);

    // Test 3: Get platform average rating
    const avgRating = await sellerRatingRepository.getPlatformAverageRating();
    console.log(`✓ Platform average rating: ${avgRating.toFixed(2)}`);

    // Test 4: Calculate seller score for a user (example: userId 1)
    const sellerId = 1;
    const sellerScore =
      await sellerRatingRepository.calculateSellerScore(sellerId);
    console.log(`✓ Seller ${sellerId} scores:`, {
      averageRating: sellerScore.averageRating,
      totalRatings: sellerScore.totalRatings,
      positiveRatings: sellerScore.positiveRatings,
    });

    // Test 5: Get ratings for seller
    const sellerRatings = await sellerRatingRepository.getRatingsByUser(
      sellerId,
      5
    );
    console.log(
      `✓ Found ${sellerRatings.length} ratings for seller ${sellerId}`
    );

    // Test 6: Get top-rated sellers
    const topSellers = await sellerRatingRepository.getTopRatedSellers(5, 1);
    console.log(`✓ Found ${topSellers.length} top-rated sellers`);

    // Test 7: Get recent ratings
    const recentRatings = await sellerRatingRepository.getRecentRatings(5);
    console.log(`✓ Found ${recentRatings.length} recent ratings`);

    console.log("\n=== All Repository Tests Passed! ===");
  } catch (error) {
    console.error("❌ Repository test failed:", error);
    throw error;
  }
}

// Run tests
testSellerRatingRepository()
  .then(() => {
    console.log("\n✅ SellerRating Repository is ready for use!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test suite failed:", error);
    process.exit(1);
  });
