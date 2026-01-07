# Seller Rating System - Deployment Guide

## Overview

This guide covers the complete deployment process for the Seller Rating System, including pre-deployment checks, migration steps, monitoring setup, and rollback procedures.

## Pre-Deployment Checklist

### 1. Backend Verification
- [ ] All unit tests passing (`npm test`)
- [ ] Integration tests passing
- [ ] TypeScript compilation successful (`npx tsc --noEmit`)
- [ ] Environment variables configured:
  - `JWT_SECRET`
  - `DATABASE_URL`
  - `RATE_LIMIT_WINDOW_MS`
  - `RATE_LIMIT_MAX_REQUESTS`

### 2. Database Verification
- [ ] Backup current database
- [ ] Test database connection
- [ ] Verify migration scripts:
  - `20240101000000_add_seller_ratings.sql`
  - `backfill-rating-aggregates.sql`
- [ ] Test migration on staging environment

### 3. Frontend Verification
- [ ] Build successful (`npm run build`)
- [ ] All components tested
- [ ] API integration verified
- [ ] Dark mode compatibility checked

### 4. Infrastructure
- [ ] Server resources adequate (CPU, memory, disk)
- [ ] Load balancer configured
- [ ] SSL certificates valid
- [ ] CDN configured (if applicable)
- [ ] Monitoring tools ready

## Deployment Strategy

### Phase 1: Database Migration (Zero Downtime)

**Objective:** Add new tables and columns without breaking existing functionality.

#### Step 1.1: Apply Schema Changes
```sql
-- Run migration script
sqlcmd -S TYCHOSTATION -d MARKETPLACE_DB -i "apps/api/prisma/migrations/20240101000000_add_seller_ratings.sql"
```

#### Step 1.2: Verify Schema
```sql
-- Check table exists
SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'SellerRatings';

-- Check indexes
EXEC sp_helpindex 'SellerRatings';

-- Check User table columns
SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'Users' AND COLUMN_NAME IN ('SellerRating', 'TotalRatings', 'PositiveRatings');
```

#### Step 1.3: Regenerate Prisma Client
```bash
cd apps/api
npx prisma generate
```

### Phase 2: Backend Deployment (API Only)

**Objective:** Deploy backend API with rating endpoints, keeping frontend unchanged.

#### Step 2.1: Deploy Backend
```bash
# Build API
cd apps/api
npm run build

# Stop current API server
pm2 stop marketplace-api

# Deploy new version
pm2 start dist/index.js --name marketplace-api

# Check status
pm2 status
pm2 logs marketplace-api
```

#### Step 2.2: Verify API Endpoints
```bash
# Health check
curl http://localhost:3000/health

# Test rating endpoint (should return 401 without auth)
curl http://localhost:3000/api/v1/ratings/seller/1

# Test with authentication
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/ratings/can-rate/1
```

#### Step 2.3: Run Smoke Tests
```bash
# Run integration tests against production API
npm run test:integration:prod
```

**Wait 24 hours and monitor for issues before proceeding to Phase 3.**

### Phase 3: Frontend Deployment (Full Feature Release)

**Objective:** Enable frontend rating components for users.

#### Step 3.1: Deploy Frontend
```bash
# Build web app
cd apps/web
npm run build

# Deploy to hosting (example with static hosting)
# Option 1: Copy to web server
cp -r build/* /var/www/marketplace/

# Option 2: Deploy to CDN
aws s3 sync build/ s3://marketplace-frontend/

# Option 3: Deploy with PM2 (SvelteKit SSR)
pm2 stop marketplace-web
pm2 start build/index.js --name marketplace-web
```

#### Step 3.2: Verify Frontend
- Navigate to a seller profile page
- Check that "New Seller" or rating badge displays
- Test rating submission flow (if eligible)
- Verify rating list loads correctly
- Test edit/delete functionality (on own ratings)

#### Step 3.3: Gradual Rollout (Optional)
If using feature flags:
```typescript
// Enable for 10% of users initially
if (Math.random() < 0.1) {
  showRatingFeatures = true;
}

// Increase over time: 25% → 50% → 100%
```

### Phase 4: Data Backfill (If Needed)

**Objective:** Calculate aggregate scores for existing users (if any ratings were created via API during Phase 2).

```bash
# Run backfill script
sqlcmd -S TYCHOSTATION -d MARKETPLACE_DB -i "apps/api/prisma/migrations/backfill-rating-aggregates.sql"

# Verify results
sqlcmd -S TYCHOSTATION -d MARKETPLACE_DB -Q "SELECT TOP 10 Id, FullName, TotalRatings, SellerRating FROM Users WHERE TotalRatings > 0"
```

## Monitoring & Analytics

### Key Metrics to Track

#### 1. Application Performance
```typescript
// Monitor API response times
// Rating API endpoints should respond in < 500ms

// Track database query performance
// Aggregate queries should complete in < 100ms

// Monitor rate limit hits
// Track createLimiter and readLimiter violations
```

#### 2. User Engagement Metrics

**Database Queries:**

```sql
-- Total ratings created (daily)
SELECT 
    CAST(CreatedAt AS DATE) as RatingDate,
    COUNT(*) as RatingsCreated
FROM SellerRatings
WHERE CreatedAt >= DATEADD(day, -30, GETUTCDATE())
GROUP BY CAST(CreatedAt AS DATE)
ORDER BY RatingDate DESC;

-- Rating distribution
SELECT 
    Rating,
    COUNT(*) as Count,
    CAST(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM SellerRatings) AS DECIMAL(5,2)) as Percentage
FROM SellerRatings
GROUP BY Rating
ORDER BY Rating DESC;

-- Top-rated sellers
SELECT TOP 10
    u.Id,
    u.FullName,
    u.SellerRating,
    u.TotalRatings,
    u.PositiveRatings
FROM Users u
WHERE u.TotalRatings >= 3
ORDER BY u.SellerRating DESC, u.TotalRatings DESC;

-- Rating activity by week
SELECT 
    DATEPART(year, CreatedAt) as Year,
    DATEPART(week, CreatedAt) as Week,
    COUNT(*) as RatingsCount,
    AVG(CAST(Rating AS FLOAT)) as AvgRating
FROM SellerRatings
GROUP BY DATEPART(year, CreatedAt), DATEPART(week, CreatedAt)
ORDER BY Year DESC, Week DESC;

-- User rating participation rate
SELECT 
    (SELECT COUNT(DISTINCT RaterId) FROM SellerRatings) as UsersWhoRated,
    (SELECT COUNT(*) FROM Users) as TotalUsers,
    CAST((SELECT COUNT(DISTINCT RaterId) FROM SellerRatings) * 100.0 / 
         (SELECT COUNT(*) FROM Users) AS DECIMAL(5,2)) as ParticipationRate;
```

#### 3. System Health Monitoring

**Prisma Queries (Database-Agnostic):**

```typescript
import prisma from './prisma.client';

// Monitor rating creation rate
export async function getRatingCreationRate() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return await prisma.sellerRating.count({
    where: {
      createdAt: {
        gte: today,
      },
    },
  });
}

// Monitor average rating trend
export async function getAverageRatingTrend(days: number = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const ratings = await prisma.sellerRating.groupBy({
    by: ['createdAt'],
    _avg: {
      rating: true,
    },
    where: {
      createdAt: {
        gte: startDate,
      },
    },
  });

  return ratings;
}

// Monitor seller score accuracy
export async function verifySellersScores() {
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
    const actualCount = await prisma.sellerRating.count({
      where: { sellerId: seller.id },
    });

    const actualPositive = await prisma.sellerRating.count({
      where: {
        sellerId: seller.id,
        rating: { gte: 4 },
      },
    });

    if (actualCount !== seller.totalRatings || actualPositive !== seller.positiveRatings) {
      discrepancies.push({
        sellerId: seller.id,
        sellerName: seller.fullName,
        storedTotal: seller.totalRatings,
        actualTotal: actualCount,
        storedPositive: seller.positiveRatings,
        actualPositive: actualPositive,
      });
    }
  }

  return discrepancies;
}

// Monitor API error rates
export async function getErrorRate(endpoint: string, timeWindow: number = 3600) {
  // This assumes you have error logging in your system
  // Adjust based on your actual logging implementation
  const startTime = new Date(Date.now() - timeWindow * 1000);

  // Example query - adjust to your logging schema
  // return await prisma.apiLog.groupBy({
  //   by: ['statusCode'],
  //   _count: true,
  //   where: {
  //     endpoint: endpoint,
  //     timestamp: { gte: startTime },
  //   },
  // });
}
```

### Monitoring Dashboard Setup

**Create a monitoring dashboard with:**

1. **Real-time Metrics**
   - Ratings created (last hour)
   - Average rating trend
   - API response times
   - Error rate

2. **Daily Metrics**
   - Total ratings created
   - Active raters
   - Top-rated sellers
   - Rating distribution

3. **Alerts**
   - Error rate > 5%
   - API response time > 1s
   - Aggregate score discrepancies detected
   - Unusual spike in ratings (potential abuse)

**Example Alert Configuration (using PM2 or similar):**

```javascript
// pm2.config.js
module.exports = {
  apps: [
    {
      name: 'marketplace-api',
      script: './dist/index.js',
      instances: 4,
      exec_mode: 'cluster',
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
      // Health check
      health_check: {
        endpoint: '/health',
        interval: 10000,
        timeout: 5000,
      },
      // Error monitoring
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
```

## Success Criteria

### 30-Day Goals
- ✅ 20% of users who complete transactions rate sellers
- ✅ Average rating >= 4.0
- ✅ < 1% error rate on rating endpoints
- ✅ API response times < 500ms (p95)
- ✅ Zero data inconsistencies detected

### 90-Day Goals
- ✅ 40% rating participation rate
- ✅ 80% of active sellers have >= 3 ratings
- ✅ Feature satisfaction score >= 4.5/5
- ✅ < 0.1% error rate

## Rollback Procedures

### Rollback Phase 3 (Frontend)
If issues detected after frontend deployment:

```bash
# Revert to previous frontend version
pm2 stop marketplace-web
git checkout <previous-commit>
npm run build
pm2 start build/index.js --name marketplace-web

# Or use feature flag to disable
# Update config: ENABLE_RATING_FEATURE=false
```

### Rollback Phase 2 (Backend)
If critical backend issues:

```bash
# Stop current version
pm2 stop marketplace-api

# Restore previous version
git checkout <previous-commit>
npm run build
pm2 start dist/index.js --name marketplace-api
```

### Rollback Phase 1 (Database)
⚠️ **Use with extreme caution - may cause data loss**

```sql
-- Only if absolutely necessary and no ratings created yet
-- Backup first!

BEGIN TRANSACTION;

-- Remove aggregate columns from Users
ALTER TABLE Users DROP COLUMN SellerRating;
ALTER TABLE Users DROP COLUMN TotalRatings;
ALTER TABLE Users DROP COLUMN PositiveRatings;

-- Drop SellerRatings table
DROP TABLE SellerRatings;

-- If something goes wrong
-- ROLLBACK TRANSACTION;

-- If everything looks good
COMMIT TRANSACTION;
```

## Post-Deployment

### Day 1-7: Close Monitoring
- Check metrics dashboard hourly
- Monitor error logs continuously
- Watch for unusual patterns
- Respond to user feedback promptly

### Week 2-4: Regular Monitoring
- Check dashboard daily
- Review weekly metrics
- Analyze user engagement
- Optimize slow queries if needed

### Month 2+: Steady State
- Weekly metrics review
- Monthly performance optimization
- Quarterly feature enhancements
- Continuous user feedback integration

## Support & Troubleshooting

### Common Issues

#### Issue 1: Aggregate scores not updating
**Symptom:** Seller rating score doesn't change after rating submitted

**Solution:**
```bash
# Run aggregate recalculation script
npm run recalculate-aggregates

# Or manually:
node scripts/recalculate-seller-scores.js
```

#### Issue 2: High API latency
**Symptom:** Rating endpoints taking > 1s to respond

**Solution:**
```sql
-- Check index usage
EXEC sp_helpindex 'SellerRatings';

-- Check query plans for slow queries
SET STATISTICS IO ON;
SET STATISTICS TIME ON;

SELECT * FROM SellerRatings WHERE SellerId = 1;
```

#### Issue 3: Duplicate rating errors
**Symptom:** Users getting "Already rated" errors incorrectly

**Solution:**
```typescript
// Check canUserRateSeller logic
const eligibility = await ratingService.canUserRateSeller(userId, sellerId);
console.log('Eligibility check:', eligibility);

// Verify database constraint
// Ensure unique index exists on (SellerId, RaterId)
```

## Contact & Escalation

- **Development Team:** dev@marketplace.com
- **DevOps Team:** devops@marketplace.com
- **On-Call:** Use PagerDuty for critical issues
- **Documentation:** [Link to internal wiki]

## Appendix

### A. Environment Variables

```env
# API
NODE_ENV=production
PORT=3000
DATABASE_URL=sqlserver://TYCHOSTATION:1433;database=MARKETPLACE_DB
JWT_SECRET=<secure-random-string>

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Feature Flags (optional)
ENABLE_RATING_FEATURE=true
RATING_ROLLOUT_PERCENTAGE=100

# Monitoring
SENTRY_DSN=<sentry-dsn>
LOG_LEVEL=info
```

### B. Database Connection Strings

**Production:**
```
sqlserver://TYCHOSTATION:1433;database=MARKETPLACE_DB;encrypt=true;trustServerCertificate=false
```

**Staging:**
```
sqlserver://TYCHOSTATION-STAGING:1433;database=MARKETPLACE_DB_STAGING;encrypt=true
```

### C. Useful Commands

```bash
# Check API health
curl http://localhost:3000/health

# Check database connection
sqlcmd -S TYCHOSTATION -Q "SELECT @@VERSION"

# View PM2 logs
pm2 logs marketplace-api --lines 100

# Restart services
pm2 restart marketplace-api
pm2 restart marketplace-web

# Run tests
npm test
npm run test:integration
npm run test:e2e

# Database backup
sqlcmd -S TYCHOSTATION -Q "BACKUP DATABASE MARKETPLACE_DB TO DISK='C:\Backups\marketplace_$(date +%Y%m%d).bak'"

# Prisma commands
npx prisma generate
npx prisma db push
npx prisma studio
```

---

**Document Version:** 1.0  
**Last Updated:** 2024-01-15  
**Next Review:** 2024-02-15
