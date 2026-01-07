# Seller Rating System - Testing & Scripts

## Quick Start

### Running Tests

```bash
# Backend tests (Unit + Integration)
cd apps/api
npm test

# API endpoint tests
npm run test:api

# Service integration tests
npm run test:service

# E2E tests (requires Playwright)
npm run test:e2e

# All tests with coverage
npm run test:coverage
```

### Health Check & Monitoring

```bash
# Check system health
npm run check-health

# Verify aggregate scores
npm run verify-aggregates
```

## Test Files

### Backend Tests

1. **`rating.service.integration.test.ts`** - RatingService tests
   - Creating ratings
   - Business validations
   - Aggregate calculations
   - Update/delete operations

2. **`rating.api.test.ts`** - API endpoint tests
   - All 9 REST endpoints
   - Authentication & authorization
   - Validation & error handling
   - Database constraints

3. **`test-utils.ts`** - Test utilities
   - TestDataFactory
   - DatabaseTestHelper
   - MockDataGenerator
   - TestAssertions
   - PerformanceTestHelper

### Frontend Tests

4. **`rating-flow.spec.ts`** - E2E user flows
   - Complete rating flow
   - Edit/delete ratings
   - Duplicate prevention
   - Self-rating prevention
   - Message exchange requirement

## Scripts

### Health Check (`check-health.ts`)

Displays system statistics:
- Total ratings and users
- Rating participation rate
- Rating distribution
- Top-rated sellers
- Recent activity
- Data integrity status
- Success criteria progress

**Run:**
```bash
npm run check-health
```

**Output:**
```
🏥 Seller Rating System - Health Check

📊 System Health Metrics
Total Users: 1250
Sellers with Ratings: 320
Total Ratings: 856
Average Rating: 4.32 ⭐
Ratings (Last 24h): 12
Status: ✅ Active

👥 User Participation
Users Who Rated: 425 (34.0%)
Users Who Received: 320 (25.6%)

⭐ Rating Distribution
5 ⭐: ████████████████ 320 (37.4%)
4 ⭐: ██████████████ 280 (32.7%)
3 ⭐: ████████ 150 (17.5%)
2 ⭐: ████ 68 (7.9%)
1 ⭐: ██ 38 (4.4%)

🏆 Top Rated Sellers
1. John Smith - 4.95 ⭐ (42 ratings, 100% positive)
2. Jane Doe - 4.87 ⭐ (38 ratings, 97% positive)
...

✅ Health check complete!
```

### Verify Aggregates (`verify-aggregates.ts`)

Checks data integrity of seller aggregate scores:
- Compares stored vs calculated values
- Detects discrepancies
- Reports issues

**Run:**
```bash
npm run verify-aggregates
```

**Output (no issues):**
```
🔍 Verifying seller aggregate scores...

✅ Total sellers checked: 320
✅ Sellers with discrepancies: 0

✅ All aggregate scores are correct!
```

**Output (with issues):**
```
🔍 Verifying seller aggregate scores...

✅ Total sellers checked: 320
⚠️ Sellers with discrepancies: 2

⚠️ Discrepancies found:

Seller: John Smith (ID: 123)
  - Total Ratings: stored=10, actual=12
  - Seller Rating: stored=4.20, expected=4.50

💡 To fix discrepancies, run: npm run fix-aggregates
```

## Test Configuration

### Jest Configuration (`package.test.json`)

```json
{
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "testMatch": ["**/__tests__/**/*.test.ts"],
    "collectCoverageFrom": [
      "src/services/**/*.ts",
      "src/dal/repositories/**/*.ts",
      "src/routes/**/*.ts"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

### Playwright Configuration

```typescript
// playwright.config.ts
export default {
  testDir: './src/__tests__/e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
};
```

## Writing Tests

### Unit Test Example

```typescript
import { RatingService } from '../services/rating.service';

describe('RatingService', () => {
  it('should create rating successfully', async () => {
    const service = new RatingService();
    const result = await service.createRating(userId, {
      sellerId: 123,
      rating: 5,
      comment: 'Great seller!',
    });

    expect(result.success).toBe(true);
    expect(result.data.rating).toBe(5);
  });
});
```

### Integration Test Example

```typescript
import request from 'supertest';
import app from '../app';

describe('POST /api/v1/ratings', () => {
  it('should create rating with auth', async () => {
    const response = await request(app)
      .post('/api/v1/ratings')
      .set('Authorization', `Bearer ${token}`)
      .send({ sellerId: 123, rating: 5 });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test('rate seller flow', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'user@example.com');
  await page.click('button[type="submit"]');

  await page.goto('/profile/123');
  await page.click('[data-testid="rate-seller-button"]');
  await page.click('[data-testid="star-5"]');
  await page.click('[data-testid="submit-rating"]');

  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
});
```

## Test Data Management

### Using TestDataFactory

```typescript
import { TestDataFactory } from './__tests__/test-utils';

const factory = new TestDataFactory();

// Create test users
const seller = await factory.createUser({ fullName: 'Test Seller' });
const buyer = await factory.createUser({ fullName: 'Test Buyer' });

// Create message exchange (required for rating)
await factory.createMessageExchange(buyer.id, seller.id);

// Create rating
await createRating(buyer.id, { sellerId: seller.id, rating: 5 });

// Cleanup
await factory.cleanup();
```

## Analytics Utilities

### Using Analytics Functions

```typescript
import { analytics } from '../utils/rating-analytics';

// Get daily stats
const dailyStats = await analytics.getDailyRatingStats(30);

// Get rating distribution
const distribution = await analytics.getRatingDistribution();

// Get top sellers
const topSellers = await analytics.getTopRatedSellers(10, 3);

// Verify aggregates
const verification = await analytics.verifySellersAggregateScores();
if (verification.sellersWithDiscrepancies > 0) {
  console.log('Found discrepancies:', verification.discrepancies);
}
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test
      - run: npm run test:e2e
```

## Troubleshooting

### Tests Failing

**Issue:** Tests timeout or fail randomly

**Solution:**
```bash
# Increase timeout
npm test -- --testTimeout=10000

# Run tests sequentially
npm test -- --runInBand
```

**Issue:** Database connection errors

**Solution:**
```bash
# Check database connection
sqlcmd -S TYCHOSTATION -Q "SELECT 1"

# Verify DATABASE_URL environment variable
echo $DATABASE_URL
```

### E2E Tests Failing

**Issue:** Playwright can't find elements

**Solution:**
```typescript
// Use waitFor
await page.waitForSelector('[data-testid="rate-button"]');

// Use explicit timeout
await page.click('[data-testid="rate-button"]', { timeout: 5000 });
```

## Best Practices

1. **Isolate Tests**
   - Each test should be independent
   - Use beforeEach/afterEach for cleanup

2. **Use Test Data Factory**
   - Don't hardcode user IDs
   - Create fresh data for each test

3. **Verify Cleanup**
   - Always clean up test data
   - Check for leftover data after tests

4. **Mock External Services**
   - Don't rely on external APIs
   - Use mocks for third-party services

5. **Test Edge Cases**
   - Invalid inputs
   - Boundary values
   - Error conditions

## Coverage Reports

### Generate Coverage

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html
```

### Coverage Thresholds

- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%

## Performance Testing

### Load Test Example

```typescript
import { PerformanceTestHelper } from './__tests__/test-utils';

const result = await PerformanceTestHelper.runLoadTest(
  async () => {
    await ratingService.getSellerScore(sellerId);
  },
  10, // concurrency
  100 // iterations
);

console.log('Average time:', result.avgTime, 'ms');
console.log('Success rate:', result.successCount / (result.successCount + result.errorCount));
```

## Documentation

- [Phase 6 Implementation](../documentation/PHASE_6_IMPLEMENTATION_COMPLETE.md)
- [Deployment Guide](../documentation/DEPLOYMENT_GUIDE.md)
- [Complete System Summary](../documentation/COMPLETE_SYSTEM_SUMMARY.md)

---

**Questions?** Check the documentation or run `npm run check-health` to verify system status.
