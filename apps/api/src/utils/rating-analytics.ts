/**
 * Monitoring and Analytics Utilities
 * Database-agnostic queries using Prisma for rating system metrics
 */

import prisma from "../dal/prisma.client";

/**
 * Get daily rating creation statistics
 */
export async function getDailyRatingStats(days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const ratings = await prisma.sellerRating.findMany({
    where: {
      createdAt: {
        gte: startDate,
      },
    },
    select: {
      createdAt: true,
      rating: true,
    },
  });

  // Group by date
  const statsByDate = new Map<string, { count: number; sum: number }>();

  ratings.forEach((r) => {
    const date = r.createdAt.toISOString().split("T")[0];
    const existing = statsByDate.get(date) || { count: 0, sum: 0 };
    statsByDate.set(date, {
      count: existing.count + 1,
      sum: existing.sum + r.rating,
    });
  });

  return Array.from(statsByDate.entries()).map(([date, stats]) => ({
    date,
    ratingsCreated: stats.count,
    averageRating: stats.sum / stats.count,
  }));
}

/**
 * Get rating distribution across all ratings
 */
export async function getRatingDistribution() {
  const total = await prisma.sellerRating.count();

  const distribution = await Promise.all(
    [1, 2, 3, 4, 5].map(async (stars) => {
      const count = await prisma.sellerRating.count({
        where: { rating: stars },
      });
      return {
        stars,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      };
    })
  );

  return {
    total,
    distribution,
  };
}

/**
 * Get top-rated sellers
 */
export async function getTopRatedSellers(
  limit: number = 10,
  minRatings: number = 3
) {
  const sellers = await prisma.user.findMany({
    where: {
      totalRatings: {
        gte: minRatings,
      },
    },
    select: {
      id: true,
      fullName: true,
      sellerRating: true,
      totalRatings: true,
      positiveRatings: true,
    },
    orderBy: [{ sellerRating: "desc" }, { totalRatings: "desc" }],
    take: limit,
  });

  return sellers.map((seller) => ({
    ...seller,
    positivePercentage:
      seller.totalRatings > 0
        ? (seller.positiveRatings / seller.totalRatings) * 100
        : 0,
  }));
}

/**
 * Get rating participation rate
 */
export async function getRatingParticipationRate() {
  const totalUsers = await prisma.user.count();

  const usersWhoRated = await prisma.sellerRating
    .groupBy({
      by: ["raterId"],
    })
    .then((result) => result.length);

  const usersWhoReceived = await prisma.sellerRating
    .groupBy({
      by: ["sellerId"],
    })
    .then((result) => result.length);

  return {
    totalUsers,
    usersWhoRated,
    usersWhoReceived,
    raterParticipationRate:
      totalUsers > 0 ? (usersWhoRated / totalUsers) * 100 : 0,
    sellerParticipationRate:
      totalUsers > 0 ? (usersWhoReceived / totalUsers) * 100 : 0,
  };
}

/**
 * Get average rating trend over time
 */
export async function getAverageRatingTrend(weeks: number = 12) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - weeks * 7);

  const ratings = await prisma.sellerRating.findMany({
    where: {
      createdAt: {
        gte: startDate,
      },
    },
    select: {
      createdAt: true,
      rating: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // Group by week
  const weeklyStats = new Map<string, { count: number; sum: number }>();

  ratings.forEach((r) => {
    const weekNumber = getWeekNumber(r.createdAt);
    const existing = weeklyStats.get(weekNumber) || { count: 0, sum: 0 };
    weeklyStats.set(weekNumber, {
      count: existing.count + 1,
      sum: existing.sum + r.rating,
    });
  });

  return Array.from(weeklyStats.entries())
    .map(([week, stats]) => ({
      week,
      ratingsCount: stats.count,
      averageRating: stats.sum / stats.count,
    }))
    .sort((a, b) => a.week.localeCompare(b.week));
}

/**
 * Verify seller aggregate score accuracy
 */
export async function verifySellersAggregateScores() {
  const sellers = await prisma.user.findMany({
    where: {
      totalRatings: {
        gt: 0,
      },
    },
    select: {
      id: true,
      fullName: true,
      sellerRating: true,
      totalRatings: true,
      positiveRatings: true,
    },
  });

  const discrepancies = [];

  for (const seller of sellers) {
    const actualRatings = await prisma.sellerRating.findMany({
      where: { sellerId: seller.id },
      select: { rating: true },
    });

    const actualTotal = actualRatings.length;
    const actualPositive = actualRatings.filter((r) => r.rating >= 4).length;
    const expectedScore =
      actualTotal > 0 ? (actualPositive / actualTotal) * 5 : 0;

    const totalMatch = actualTotal === seller.totalRatings;
    const positiveMatch = actualPositive === seller.positiveRatings;
    const scoreMatch = Math.abs(expectedScore - seller.sellerRating) < 0.01;

    if (!totalMatch || !positiveMatch || !scoreMatch) {
      discrepancies.push({
        sellerId: seller.id,
        sellerName: seller.fullName,
        issues: {
          totalRatings: {
            stored: seller.totalRatings,
            actual: actualTotal,
            match: totalMatch,
          },
          positiveRatings: {
            stored: seller.positiveRatings,
            actual: actualPositive,
            match: positiveMatch,
          },
          sellerRating: {
            stored: seller.sellerRating,
            expected: expectedScore,
            match: scoreMatch,
          },
        },
      });
    }
  }

  return {
    totalSellers: sellers.length,
    sellersWithDiscrepancies: discrepancies.length,
    discrepancies,
  };
}

/**
 * Get recent rating activity
 */
export async function getRecentRatingActivity(limit: number = 20) {
  const ratings = await prisma.sellerRating.findMany({
    take: limit,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      seller: {
        select: {
          id: true,
          fullName: true,
        },
      },
      rater: {
        select: {
          id: true,
          fullName: true,
        },
      },
      post: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  return ratings.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt,
    seller: {
      id: r.seller.id,
      name: r.seller.fullName,
    },
    rater: {
      id: r.rater.id,
      name: r.rater.fullName,
    },
    post: r.post
      ? {
          id: r.post.id,
          title: r.post.title,
        }
      : null,
  }));
}

/**
 * Get seller performance metrics
 */
export async function getSellerPerformanceMetrics(sellerId: number) {
  const [seller, ratings, recentRatings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sellerId },
      select: {
        id: true,
        fullName: true,
        sellerRating: true,
        totalRatings: true,
        positiveRatings: true,
      },
    }),
    prisma.sellerRating.findMany({
      where: { sellerId },
      select: { rating: true, createdAt: true },
    }),
    prisma.sellerRating.findMany({
      where: { sellerId },
      take: 10,
      orderBy: { createdAt: "desc" },
      select: { rating: true, createdAt: true },
    }),
  ]);

  if (!seller) {
    return null;
  }

  // Calculate distribution
  const distribution = [1, 2, 3, 4, 5].map((stars) => ({
    stars,
    count: ratings.filter((r) => r.rating === stars).length,
  }));

  // Calculate trend (last 30 days vs previous 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const last30Days = ratings.filter((r) => r.createdAt >= thirtyDaysAgo);
  const previous30Days = ratings.filter(
    (r) => r.createdAt >= sixtyDaysAgo && r.createdAt < thirtyDaysAgo
  );

  const avgLast30 =
    last30Days.length > 0
      ? last30Days.reduce((sum, r) => sum + r.rating, 0) / last30Days.length
      : 0;
  const avgPrevious30 =
    previous30Days.length > 0
      ? previous30Days.reduce((sum, r) => sum + r.rating, 0) /
        previous30Days.length
      : 0;

  return {
    seller: {
      id: seller.id,
      name: seller.fullName,
      aggregateScore: seller.sellerRating,
      totalRatings: seller.totalRatings,
      positiveRatings: seller.positiveRatings,
    },
    distribution,
    trend: {
      last30Days: {
        count: last30Days.length,
        averageRating: avgLast30,
      },
      previous30Days: {
        count: previous30Days.length,
        averageRating: avgPrevious30,
      },
      change: avgLast30 - avgPrevious30,
    },
    recentRatings: recentRatings.map((r) => ({
      rating: r.rating,
      createdAt: r.createdAt,
    })),
  };
}

/**
 * Get system health metrics
 */
export async function getSystemHealthMetrics() {
  const [totalRatings, totalUsers, avgRating, recentActivity] =
    await Promise.all([
      prisma.sellerRating.count(),
      prisma.user.count(),
      prisma.sellerRating.aggregate({
        _avg: {
          rating: true,
        },
      }),
      prisma.sellerRating.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
    ]);

  const sellersWithRatings = await prisma.user.count({
    where: {
      totalRatings: {
        gt: 0,
      },
    },
  });

  return {
    totalRatings,
    totalUsers,
    sellersWithRatings,
    averageRating: avgRating._avg.rating || 0,
    ratingsLast24Hours: recentActivity,
    healthStatus: recentActivity > 0 ? "active" : "idle",
  };
}

/**
 * Helper function to get week number
 */
function getWeekNumber(date: Date): string {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  const weekNumber = Math.ceil(
    (pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7
  );
  return `${date.getFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

/**
 * Export all analytics functions
 */
export const analytics = {
  getDailyRatingStats,
  getRatingDistribution,
  getTopRatedSellers,
  getRatingParticipationRate,
  getAverageRatingTrend,
  verifySellersAggregateScores,
  getRecentRatingActivity,
  getSellerPerformanceMetrics,
  getSystemHealthMetrics,
};

export default analytics;
