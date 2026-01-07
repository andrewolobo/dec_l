-- =============================================
-- Seller Rating System - Data Migration Script
-- Backfills aggregate scores for existing users
-- =============================================

-- This script should be run during deployment to calculate
-- aggregate scores for any existing users who have received ratings

USE [MARKETPLACE_DB];
GO

-- Step 1: Update User aggregate fields based on existing ratings
PRINT 'Updating user aggregate scores...';

UPDATE u
SET 
    u.TotalRatings = ISNULL(r.rating_count, 0),
    u.PositiveRatings = ISNULL(r.positive_count, 0),
    u.SellerRating = CASE 
        WHEN ISNULL(r.rating_count, 0) = 0 THEN 0
        ELSE (CAST(ISNULL(r.positive_count, 0) AS FLOAT) / CAST(r.rating_count AS FLOAT)) * 5.0
    END,
    u.UpdatedAt = GETUTCDATE()
FROM Users u
LEFT JOIN (
    SELECT 
        SellerId,
        COUNT(*) as rating_count,
        SUM(CASE WHEN Rating >= 4 THEN 1 ELSE 0 END) as positive_count
    FROM SellerRatings
    GROUP BY SellerId
) r ON u.Id = r.SellerId;

PRINT 'User aggregate scores updated.';

-- Step 2: Verify results
PRINT 'Verification of updated scores:';

SELECT 
    u.Id,
    u.FullName,
    u.TotalRatings,
    u.PositiveRatings,
    u.SellerRating,
    COUNT(sr.Id) as ActualRatingCount,
    SUM(CASE WHEN sr.Rating >= 4 THEN 1 ELSE 0 END) as ActualPositiveCount
FROM Users u
LEFT JOIN SellerRatings sr ON u.Id = sr.SellerId
WHERE u.TotalRatings > 0 OR COUNT(sr.Id) > 0
GROUP BY u.Id, u.FullName, u.TotalRatings, u.PositiveRatings, u.SellerRating;

-- Step 3: Identify any discrepancies
PRINT 'Checking for discrepancies...';

SELECT 
    u.Id,
    u.FullName,
    u.TotalRatings as StoredTotal,
    COUNT(sr.Id) as ActualTotal,
    u.PositiveRatings as StoredPositive,
    SUM(CASE WHEN sr.Rating >= 4 THEN 1 ELSE 0 END) as ActualPositive
FROM Users u
LEFT JOIN SellerRatings sr ON u.Id = sr.SellerId
GROUP BY u.Id, u.FullName, u.TotalRatings, u.PositiveRatings
HAVING 
    u.TotalRatings != COUNT(sr.Id) 
    OR u.PositiveRatings != SUM(CASE WHEN sr.Rating >= 4 THEN 1 ELSE 0 END);

PRINT 'Migration complete!';

-- Step 4: Create backup before migration (optional)
-- Uncomment if you want to backup before running

/*
SELECT *
INTO Users_Backup_BeforeRatingMigration
FROM Users;

PRINT 'Backup created: Users_Backup_BeforeRatingMigration';
*/

-- Step 5: Rollback script (in case of issues)
-- Save this for emergency rollback

/*
-- ROLLBACK SCRIPT
UPDATE Users
SET 
    TotalRatings = 0,
    PositiveRatings = 0,
    SellerRating = 0
WHERE TotalRatings > 0;

PRINT 'Rolled back all aggregate scores.';
*/

GO
