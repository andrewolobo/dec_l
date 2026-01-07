/**
 * API Endpoint Test Script for Rating System
 * 
 * This script provides curl commands and expected responses for testing
 * all rating API endpoints.
 * 
 * Prerequisites:
 * 1. API server running on http://localhost:3001 (or configured port)
 * 2. Valid JWT token for authenticated endpoints
 * 3. At least 2 users in database (one buyer, one seller)
 * 4. Message exchange between buyer and seller
 * 
 * Setup Instructions:
 * 1. Login to get JWT token: POST /api/v1/auth/login
 * 2. Replace <TOKEN> with your actual JWT token
 * 3. Replace <SELLER_ID>, <POST_ID> with actual IDs from your database
 */

// ============================================================================
// CONFIGURATION
// ============================================================================
const BASE_URL = "http://localhost:3001/api/v1";
const TOKEN = "<YOUR_JWT_TOKEN_HERE>";
const SELLER_ID = "<SELLER_ID>";
const POST_ID = "<POST_ID>";

// ============================================================================
// TEST 1: Create Rating
// ============================================================================
console.log("TEST 1: Create Rating");
console.log("POST /api/v1/ratings");
console.log(`
curl -X POST ${BASE_URL}/ratings \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${TOKEN}" \\
  -d '{
    "sellerId": ${SELLER_ID},
    "postId": ${POST_ID},
    "rating": 5,
    "comment": "Excellent seller! Fast shipping and great communication."
  }'
`);

// ============================================================================
// TEST 2: Update Rating
// ============================================================================
console.log("\nTEST 2: Update Rating");
console.log("PUT /api/v1/ratings/:id");
console.log(`
curl -X PUT ${BASE_URL}/ratings/1 \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${TOKEN}" \\
  -d '{
    "rating": 4,
    "comment": "Updated review: Good seller overall."
  }'
`);

// ============================================================================
// TEST 3: Delete Rating
// ============================================================================
console.log("\nTEST 3: Delete Rating");
console.log("DELETE /api/v1/ratings/:id");
console.log(`
curl -X DELETE ${BASE_URL}/ratings/1 \\
  -H "Authorization: Bearer ${TOKEN}"
`);

// ============================================================================
// TEST 4: Get Seller Ratings
// ============================================================================
console.log("\nTEST 4: Get Seller Ratings (Public)");
console.log("GET /api/v1/ratings/seller/:sellerId");
console.log(`
curl -X GET "${BASE_URL}/ratings/seller/${SELLER_ID}?limit=10&offset=0"
`);

// ============================================================================
// TEST 5: Get Seller Score
// ============================================================================
console.log("\nTEST 5: Get Seller Score (Public)");
console.log("GET /api/v1/ratings/seller/:sellerId/score");
console.log(`
curl -X GET "${BASE_URL}/ratings/seller/${SELLER_ID}/score"
`);

// ============================================================================
// TEST 6: Get Rating Distribution
// ============================================================================
console.log("\nTEST 6: Get Rating Distribution (Public)");
console.log("GET /api/v1/ratings/seller/:sellerId/distribution");
console.log(`
curl -X GET "${BASE_URL}/ratings/seller/${SELLER_ID}/distribution"
`);

// ============================================================================
// TEST 7: Get My Ratings
// ============================================================================
console.log("\nTEST 7: Get My Ratings (Private)");
console.log("GET /api/v1/ratings/my-ratings");
console.log(`
curl -X GET "${BASE_URL}/ratings/my-ratings?limit=10&offset=0" \\
  -H "Authorization: Bearer ${TOKEN}"
`);

// ============================================================================
// TEST 8: Get Top Rated Sellers
// ============================================================================
console.log("\nTEST 8: Get Top Rated Sellers (Public)");
console.log("GET /api/v1/ratings/top-sellers");
console.log(`
curl -X GET "${BASE_URL}/ratings/top-sellers?limit=10&minRatings=3"
`);

// ============================================================================
// TEST 9: Check Can Rate Seller
// ============================================================================
console.log("\nTEST 9: Check Can Rate Seller (Private)");
console.log("GET /api/v1/ratings/can-rate");
console.log(`
curl -X GET "${BASE_URL}/ratings/can-rate?sellerId=${SELLER_ID}&postId=${POST_ID}" \\
  -H "Authorization: Bearer ${TOKEN}"
`);

// ============================================================================
// EXPECTED RESPONSES
// ============================================================================
console.log("\n\n=== EXPECTED RESPONSES ===\n");

console.log("1. Create Rating (201 Created):");
console.log(`{
  "success": true,
  "data": {
    "id": 1,
    "sellerId": ${SELLER_ID},
    "raterId": <YOUR_USER_ID>,
    "postId": ${POST_ID},
    "rating": 5,
    "comment": "Excellent seller! Fast shipping and great communication.",
    "createdAt": "2025-01-XX...",
    "updatedAt": "2025-01-XX..."
  }
}`);

console.log("\n2. Update Rating (200 OK):");
console.log(`{
  "success": true,
  "data": {
    "id": 1,
    "rating": 4,
    "comment": "Updated review: Good seller overall.",
    ...
  }
}`);

console.log("\n3. Delete Rating (200 OK):");
console.log(`{
  "success": true,
  "message": "Rating deleted successfully"
}`);

console.log("\n4. Get Seller Ratings (200 OK):");
console.log(`{
  "success": true,
  "data": [
    {
      "id": 1,
      "sellerId": ${SELLER_ID},
      "rating": 5,
      "comment": "Great seller!",
      "createdAt": "...",
      "raterName": "John Doe"
    },
    ...
  ]
}`);

console.log("\n5. Get Seller Score (200 OK):");
console.log(`{
  "success": true,
  "data": {
    "sellerId": ${SELLER_ID},
    "averageRating": 4.5,
    "totalRatings": 10,
    "positiveRatings": 8,
    "displayText": "4.5 ★"
  }
}`);

console.log("\n6. Get Rating Distribution (200 OK):");
console.log(`{
  "success": true,
  "data": {
    "sellerId": ${SELLER_ID},
    "distribution": {
      "1": 0,
      "2": 1,
      "3": 1,
      "4": 3,
      "5": 5
    },
    "totalRatings": 10
  }
}`);

console.log("\n7. Can Rate Seller (200 OK):");
console.log(`{
  "success": true,
  "data": {
    "canRate": true,
    "reason": "Eligible to rate",
    "alreadyRated": false
  }
}`);

// ============================================================================
// ERROR SCENARIOS
// ============================================================================
console.log("\n\n=== ERROR SCENARIOS TO TEST ===\n");

console.log("1. Self-Rating (should fail with 403):");
console.log("   - Try to rate yourself (sellerId = your userId)");

console.log("\n2. Duplicate Rating (should fail with 409):");
console.log("   - Try to rate same seller twice for same post");

console.log("\n3. No Message Exchange (should fail with 403):");
console.log("   - Try to rate seller without any message exchange");

console.log("\n4. Invalid Rating Value (should fail with 400):");
console.log("   - Try rating with value 0 or 6");

console.log("\n5. Missing Authentication (should fail with 401):");
console.log("   - Try POST/PUT/DELETE without token");

console.log("\n6. Update Others' Rating (should fail with 403):");
console.log("   - Try to update/delete rating created by different user");

// ============================================================================
// POSTMAN COLLECTION SETUP
// ============================================================================
console.log("\n\n=== POSTMAN COLLECTION SETUP ===\n");
console.log(`
1. Create new collection: "DEC_L Rating System"
2. Create environment with variables:
   - BASE_URL: http://localhost:3001/api/v1
   - TOKEN: <will be set after login>
   - SELLER_ID: <actual seller ID>
   - POST_ID: <actual post ID>

3. Add requests:
   ✓ POST Login (save token to environment)
   ✓ POST Create Rating
   ✓ PUT Update Rating
   ✓ DELETE Delete Rating
   ✓ GET Seller Ratings
   ✓ GET Seller Score
   ✓ GET Rating Distribution
   ✓ GET My Ratings
   ✓ GET Top Sellers
   ✓ GET Can Rate Seller

4. Use {{TOKEN}} variable in Authorization header for private routes
`);

// ============================================================================
// INTEGRATION TEST FLOW
// ============================================================================
console.log("\n\n=== RECOMMENDED TEST FLOW ===\n");
console.log(`
1. Setup:
   ✓ Create 2 test users (buyer and seller)
   ✓ Login as buyer, save token
   ✓ Create a post as seller
   ✓ Send messages between buyer and seller

2. Happy Path:
   ✓ Check can rate seller (should return true)
   ✓ Create rating (5 stars with comment)
   ✓ Get seller score (should show 1 rating)
   ✓ Get seller ratings (should show your rating)
   ✓ Update rating (change to 4 stars)
   ✓ Get my ratings (should show updated rating)

3. Validation Tests:
   ✓ Try duplicate rating (should fail)
   ✓ Try self-rating (should fail)
   ✓ Try rating without message exchange (should fail)
   ✓ Try invalid rating values (0, 6, -1)

4. Authorization Tests:
   ✓ Update someone else's rating (should fail)
   ✓ Delete someone else's rating (should fail)

5. Cleanup:
   ✓ Delete test rating
   ✓ Verify seller score updated
`);

console.log("\n=== Test Script Ready ===");
console.log("Replace placeholders and run tests!");
