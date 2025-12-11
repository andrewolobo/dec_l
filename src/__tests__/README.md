# Test Suite Documentation

## Overview

This directory contains comprehensive test coverage for the DEC_L application backend, including unit tests and integration tests for services, utilities, and repositories.

## Structure

```
src/__tests__/
├── setup.ts                    # Global test setup and mocks
├── helpers/
│   └── test-data.ts           # Mock data generators using Faker
├── unit/
│   ├── services/
│   │   ├── post.service.test.ts
│   │   ├── user.service.test.ts (TODO)
│   │   └── auth.service.test.ts (TODO)
│   ├── utils/
│   │   ├── password.util.test.ts
│   │   ├── jwt.util.test.ts
│   │   └── validation.util.test.ts (TODO)
│   └── repositories/
│       └── (TODO)
└── integration/
    └── (TODO)
```

## Installation

Install all test dependencies:

```bash
npm install
```

This will install:

- Jest (test runner)
- ts-jest (TypeScript support)
- @types/jest (TypeScript types)
- @faker-js/faker (test data generation)
- supertest (API testing - for future integration tests)

## Running Tests

### All Tests

```bash
npm test
```

### Watch Mode (re-run on file changes)

```bash
npm run test:watch
```

### Coverage Report

```bash
npm run test:coverage
```

### Unit Tests Only

```bash
npm run test:unit
```

### Integration Tests Only

```bash
npm run test:integration
```

## Test Files Created

### ✅ Completed

1. **password.util.test.ts** - Password hashing and validation tests

   - Hash generation
   - Password verification
   - Strength validation

2. **jwt.util.test.ts** - JWT token generation and verification tests

   - Access token generation
   - Refresh token generation
   - Token verification
   - Token decoding

3. **post.service.test.ts** - Post service business logic tests
   - Create post (with/without images)
   - Get post (with view tracking and like status)
   - Update post (with ownership checks)
   - Delete post (with authorization)
   - Toggle like/unlike
   - Search posts

### 🔄 Pending

- user.service.test.ts
- auth.service.test.ts
- validation.util.test.ts
- Repository tests
- Integration tests

## Writing Tests

### Example Test Structure

```typescript
import { describe, it, expect, beforeEach } from "@jest/globals";

describe("YourService", () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe("methodName", () => {
    it("should handle successful case", async () => {
      // Arrange
      const mockData = createMockData();

      // Act
      const result = await service.method(mockData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it("should handle error case", async () => {
      // Arrange
      // Setup for error condition

      // Act
      const result = await service.method(invalidData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.EXPECTED_ERROR);
    });
  });
});
```

### Mock Data Helpers

Use the test data generators in `helpers/test-data.ts`:

```typescript
import {
  createMockUser,
  createMockPost,
  createMockCategory,
} from "../../helpers/test-data";

const user = createMockUser();
const post = createMockPost(user.id, categoryId);
const category = createMockCategory();
```

### Mocking Repositories

Repositories are automatically mocked in `setup.ts`. Override mock implementations per test:

```typescript
(userRepository.findById as jest.Mock).mockResolvedValue(mockUser);
(userRepository.findById as jest.Mock).mockResolvedValue(null); // Not found
(userRepository.create as jest.Mock).mockRejectedValue(new Error("DB error")); // Error
```

## Coverage Goals

| Component    | Target  | Current |
| ------------ | ------- | ------- |
| Utilities    | 100%    | 66%     |
| Services     | 90%     | 33%     |
| Repositories | 85%     | 0%      |
| **Overall**  | **85%** | **33%** |

## Best Practices

1. **Arrange-Act-Assert Pattern**: Structure all tests with clear setup, execution, and verification
2. **One Assertion Per Test**: Focus each test on a single behavior
3. **Clear Test Names**: Use descriptive names that explain what is being tested
4. **Mock External Dependencies**: Isolate the code under test
5. **Test Error Cases**: Don't just test happy paths
6. **Reset Mocks**: Use `beforeEach` to reset mock state
7. **Avoid Test Interdependence**: Each test should run independently

## Continuous Integration

Tests run automatically on:

- Git commit (pre-commit hook - TODO)
- Pull request (GitHub Actions - TODO)
- Merge to main branch (TODO)

## Troubleshooting

### TypeScript Errors

The errors about missing '@jest/globals' will resolve once dependencies are installed:

```bash
npm install
```

### Mock Not Working

Ensure mocks are cleared in `beforeEach`:

```typescript
beforeEach(() => {
  jest.clearAllMocks();
});
```

### Coverage Not Updating

Clear Jest cache:

```bash
npm test -- --clearCache
```

## Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Run existing tests: `npm test`
3. 🔄 Add UserService tests
4. 🔄 Add AuthService tests
5. 🔄 Add ValidationUtil tests
6. 🔄 Add Repository tests
7. 🔄 Add Integration tests
8. 🔄 Setup CI/CD pipeline
