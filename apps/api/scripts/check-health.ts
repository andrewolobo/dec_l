/**
 * System Health Check Script
 * Displays current rating system statistics and health
 */

import { analytics } from "../src/utils/rating-analytics";
import prisma from "../src/dal/prisma.client";

async function checkHealth() {
  console.log("🏥 Seller Rating System - Health Check\n");
  console.log("=".repeat(50));
  console.log("\n");

  try {
    // System health metrics
    console.log("📊 System Health Metrics\n");
    const health = await analytics.getSystemHealthMetrics();

    console.log(`Total Users: ${health.totalUsers}`);
    console.log(`Sellers with Ratings: ${health.sellersWithRatings}`);
    console.log(`Total Ratings: ${health.totalRatings}`);
    console.log(`Average Rating: ${health.averageRating.toFixed(2)} ⭐`);
    console.log(`Ratings (Last 24h): ${health.ratingsLast24Hours}`);
    console.log(
      `Status: ${health.healthStatus === "active" ? "✅ Active" : "⚠️ Idle"}\n`
    );

    // Participation rate
    console.log("👥 User Participation\n");
    const participation = await analytics.getRatingParticipationRate();

    console.log(
      `Users Who Rated: ${participation.usersWhoRated} (${participation.raterParticipationRate.toFixed(1)}%)`
    );
    console.log(
      `Users Who Received: ${participation.usersWhoReceived} (${participation.sellerParticipationRate.toFixed(1)}%)\n`
    );

    // Rating distribution
    console.log("⭐ Rating Distribution\n");
    const distribution = await analytics.getRatingDistribution();

    distribution.distribution.forEach((d) => {
      const bar = "█".repeat(Math.round(d.percentage / 2));
      console.log(
        `${d.stars} ⭐: ${bar} ${d.count} (${d.percentage.toFixed(1)}%)`
      );
    });
    console.log("");

    // Top sellers
    console.log("🏆 Top Rated Sellers\n");
    const topSellers = await analytics.getTopRatedSellers(5, 3);

    if (topSellers.length > 0) {
      topSellers.forEach((seller, index) => {
        console.log(
          `${index + 1}. ${seller.fullName} - ${seller.sellerRating.toFixed(2)} ⭐ (${seller.totalRatings} ratings, ${seller.positivePercentage.toFixed(0)}% positive)`
        );
      });
    } else {
      console.log("No sellers with 3+ ratings yet.");
    }
    console.log("");

    // Recent activity
    console.log("🕐 Recent Activity\n");
    const recent = await analytics.getRecentRatingActivity(5);

    if (recent.length > 0) {
      recent.forEach((r) => {
        const timeAgo = getTimeAgo(r.createdAt);
        console.log(
          `${r.rating} ⭐ - ${r.rater.name} → ${r.seller.name} (${timeAgo})`
        );
      });
    } else {
      console.log("No recent rating activity.");
    }
    console.log("\n");

    // Verify integrity
    console.log("🔐 Data Integrity Check\n");
    const verification = await analytics.verifySellersAggregateScores();

    if (verification.sellersWithDiscrepancies === 0) {
      console.log("✅ All aggregate scores are correct!\n");
    } else {
      console.log(
        `⚠️ Found ${verification.sellersWithDiscrepancies} seller(s) with discrepancies!`
      );
      console.log("   Run: npm run verify-aggregates for details\n");
    }

    // Success criteria tracking
    console.log("🎯 Success Criteria Progress\n");
    const ratingRate = participation.raterParticipationRate;

    console.log("30-Day Goal: 20% participation");
    console.log(
      `Current: ${ratingRate.toFixed(1)}% ${ratingRate >= 20 ? "✅" : "❌"}`
    );
    console.log("");

    console.log("90-Day Goal: 40% participation");
    console.log(
      `Current: ${ratingRate.toFixed(1)}% ${ratingRate >= 40 ? "✅" : "❌"}`
    );
    console.log("");

    console.log("=".repeat(50));
    console.log("\n✅ Health check complete!\n");

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Health check failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

checkHealth();
