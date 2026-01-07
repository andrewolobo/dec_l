/**
 * Quick script to check if a user exists and their rating fields
 * Run with: npx ts-node scripts/check-user.ts [userId]
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkUser() {
  const userId = process.argv[2] ? parseInt(process.argv[2]) : null;

  try {
    if (userId) {
      // Check specific user
      console.log(`\nChecking user ID: ${userId}...`);
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          fullName: true,
          email: true,
          sellerRating: true,
          totalRatings: true,
          positiveRatings: true,
          isActive: true,
          createdAt: true,
        },
      });

      if (user) {
        console.log("\n✅ User found:");
        console.log(JSON.stringify(user, null, 2));
      } else {
        console.log("\n❌ User not found!");
      }
    } else {
      // List all users
      console.log("\nListing all users...\n");
      const users = await prisma.user.findMany({
        select: {
          id: true,
          fullName: true,
          email: true,
          sellerRating: true,
          totalRatings: true,
          positiveRatings: true,
          isActive: true,
        },
        orderBy: { id: "asc" },
      });

      if (users.length === 0) {
        console.log("❌ No users found in database!");
      } else {
        console.log(`✅ Found ${users.length} users:\n`);
        console.table(users);
      }
    }

    // Check SellerRatings table
    console.log("\nChecking SellerRatings table...");
    const ratingsCount = await prisma.sellerRating.count();
    console.log(`Total ratings in database: ${ratingsCount}`);

    if (ratingsCount === 0) {
      console.log(
        "ℹ️  The SellerRatings table is empty (this is normal for new users)"
      );
    } else {
      const ratings = await prisma.sellerRating.findMany({
        take: 5,
        include: {
          seller: { select: { fullName: true } },
          rater: { select: { fullName: true } },
        },
      });
      console.log("\nSample ratings:");
      console.table(
        ratings.map((r) => ({
          RatingID: r.id,
          Seller: r.seller.fullName,
          Rater: r.rater.fullName,
          Rating: r.rating,
          Comment: r.comment?.substring(0, 30),
        }))
      );
    }
  } catch (error) {
    console.error("\n❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
