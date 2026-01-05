
-- SQLServer idempotent insert/update for Tiers
MERGE INTO PricingTiers AS target
USING (
    VALUES 
        ('Basic', 3, 1.00, 'All ads posted to Instagram. Available on the platform indefinitely. Available on Instagram for the visibility days', 1),
        ('Standard', 7, 2.00, 'All ads posted to Instagram. Available on the platform indefinitely. Available on Instagram for the visibility days', 1),
        ('Premium', 30, 3.00, 'All ads posted to Instagram. Available on the platform indefinitely. Available on Instagram for the visibility days', 1)
) AS source (TierName, VisibilityDays, Price, Description, IsActive)
ON target.TierName = source.TierName
WHEN MATCHED THEN
    UPDATE SET 
        VisibilityDays = source.VisibilityDays,
        Price = source.Price,
        Description = source.Description,
        IsActive = source.IsActive
WHEN NOT MATCHED THEN
    INSERT (TierName, VisibilityDays, Price, Description, IsActive)
    VALUES (source.TierName, source.VisibilityDays, source.Price, source.Description, source.IsActive);

-- Verify the operation



-- PostgreSQL idempotent insert/update for Tiers
INSERT INTO "PricingTiers" ("TierName", "VisibilityDays", "Price", "Description", "IsActive")
VALUES 
    ('Basic', 3, 1.00, 'All ads posted to Instagram. Available on the platform indefinitely. Available on Instagram for the visibility days', true),
    ('Standard', 7, 2.00, 'All ads posted to Instagram. Available on the platform indefinitely. Available on Instagram for the visibility days', true),
    ('Premium', 30, 3.00, 'All ads posted to Instagram. Available on the platform indefinitely. Available on Instagram for the visibility days', true)
ON CONFLICT ("TierName") 
DO UPDATE SET
    "VisibilityDays" = EXCLUDED."VisibilityDays",
    "Price" = EXCLUDED."Price",
    "Description" = EXCLUDED."Description",
    "IsActive" = EXCLUDED."IsActive";

-- Verify the operation
SELECT * FROM "Tiers" ORDER BY "Price";