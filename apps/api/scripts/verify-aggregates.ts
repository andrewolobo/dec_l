/**
 * Script to verify seller aggregate scores
 * Run periodically to ensure data integrity
 */

import prisma from "../src/dal/prisma.client";
import { analytics } from "../src/utils/rating-analytics";

async function verifyAggregates() {
  console.log("🔍 Verifying seller aggregate scores...\n");

  const result = await analytics.verifySellersAggregateScores();

  console.log(`✅ Total sellers checked: ${result.totalSellers}`);
  console.log(
    `${result.sellersWithDiscrepancies === 0 ? "✅" : "⚠️"} Sellers with discrepancies: ${result.sellersWithDiscrepancies}\n`
  );

  if (result.discrepancies.length > 0) {
    console.log("⚠️ Discrepancies found:\n");

    result.discrepancies.forEach((d) => {
      console.log(`Seller: ${d.sellerName} (ID: ${d.sellerId})`);

      if (!d.issues.totalRatings.match) {
        console.log(
          `  - Total Ratings: stored=${d.issues.totalRatings.stored}, actual=${d.issues.totalRatings.actual}`
        );
      }

      if (!d.issues.positiveRatings.match) {
        console.log(
          `  - Positive Ratings: stored=${d.issues.positiveRatings.stored}, actual=${d.issues.positiveRatings.actual}`
        );
      }

      if (!d.issues.sellerRating.match) {
        console.log(
          `  - Seller Rating: stored=${d.issues.sellerRating.stored.toFixed(2)}, expected=${d.issues.sellerRating.expected.toFixed(2)}`
        );
      }

      console.log("");
    });

    console.log("💡 To fix discrepancies, run: npm run fix-aggregates\n");
  } else {
    console.log("✅ All aggregate scores are correct!\n");
  }

  await prisma.$disconnect();
  process.exit(result.sellersWithDiscrepancies > 0 ? 1 : 0);
}

verifyAggregates().catch((error) => {
  console.error("❌ Error verifying aggregates:", error);
  process.exit(1);
});
