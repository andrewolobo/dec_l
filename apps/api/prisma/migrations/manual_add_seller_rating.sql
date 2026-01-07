-- Manual Migration: Add Seller Rating System
-- Date: January 7, 2026
-- Database: SQL Server

-- Step 1: Add rating aggregate columns to Users table
ALTER TABLE [Users] ADD [SellerRating] DECIMAL(3, 2) DEFAULT 0;
ALTER TABLE [Users] ADD [TotalRatings] INT DEFAULT 0;
ALTER TABLE [Users] ADD [PositiveRatings] INT DEFAULT 0;
GO

-- Step 2: Create SellerRatings table
CREATE TABLE [SellerRatings] (
    [RatingID] INT IDENTITY(1,1) NOT NULL,
    [SellerID] INT NOT NULL,
    [RaterID] INT NOT NULL,
    [PostID] INT NULL,
    [Rating] INT NOT NULL,
    [Comment] NVARCHAR(MAX) NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),

    CONSTRAINT [PK_SellerRatings] PRIMARY KEY ([RatingID])
);
GO

-- Step 3: Create unique constraint (handle NULL postId case)
-- For SQL Server, we'll create a unique constraint that treats NULL distinctly
CREATE UNIQUE NONCLUSTERED INDEX [UQ_SellerRatings_Seller_Rater_Post_NotNull] 
ON [SellerRatings]([SellerID], [RaterID], [PostID])
WHERE [PostID] IS NOT NULL;
GO

-- Create a unique constraint for NULL PostID cases separately
CREATE UNIQUE NONCLUSTERED INDEX [UQ_SellerRatings_Seller_Rater_PostNull]
ON [SellerRatings]([SellerID], [RaterID])
WHERE [PostID] IS NULL;
GO

-- Step 4: Create indexes for performance
CREATE NONCLUSTERED INDEX [IX_SellerRatings_SellerID] ON [SellerRatings]([SellerID]);
CREATE NONCLUSTERED INDEX [IX_SellerRatings_RaterID] ON [SellerRatings]([RaterID]);
CREATE NONCLUSTERED INDEX [IX_SellerRatings_PostID] ON [SellerRatings]([PostID]);
GO

PRINT 'Seller Rating System tables and columns created successfully!';
GO
