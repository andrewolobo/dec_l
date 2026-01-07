/**
 * E2E Test: Complete Seller Rating User Flow
 * Tests the full journey from purchase to rating to profile display
 */

import { test, expect, Page } from '@playwright/test';
import { UserRepository } from '../api/src/dal/repositories/user.repository';
import { MessageRepository } from '../api/src/dal/repositories/message.repository';
import prisma from '../api/src/dal/prisma.client';

test.describe('Seller Rating E2E Flow', () => {
	let buyerEmail: string;
	let sellerEmail: string;
	let buyerPassword: string;
	let sellerPassword: string;
	let sellerId: number;
	let buyerId: number;
	let postId: number;

	test.beforeAll(async () => {
		const userRepo = new UserRepository();
		const messageRepo = new MessageRepository();

		// Create test users
		buyerEmail = `e2e_buyer_${Date.now()}@example.com`;
		buyerPassword = 'Test123!@#';
		sellerEmail = `e2e_seller_${Date.now()}@example.com`;
		sellerPassword = 'Test123!@#';

		const buyer = await userRepo.create({
			emailAddress: buyerEmail,
			passwordHash: buyerPassword, // Note: In real scenario, this would be hashed
			fullName: 'E2E Buyer',
			phoneNumber: '1234567890'
		});
		buyerId = buyer.id;

		const seller = await userRepo.create({
			emailAddress: sellerEmail,
			passwordHash: sellerPassword,
			fullName: 'E2E Seller',
			phoneNumber: '0987654321'
		});
		sellerId = seller.id;

		// Create test post
		const post = await prisma.post.create({
			data: {
				userId: sellerId,
				title: 'E2E Test Product',
				description: 'Test product for E2E testing',
				price: 99.99,
				categoryId: 1,
				location: 'Test City',
				status: 'Active'
			}
		});
		postId = post.id;

		// Create message exchange (required for rating)
		await messageRepo.create({
			senderId: buyerId,
			recipientId: sellerId,
			postId: postId,
			messageText: 'Is this still available?',
			isRead: false,
			isDeleted: false
		});

		await messageRepo.create({
			senderId: sellerId,
			recipientId: buyerId,
			postId: postId,
			messageText: 'Yes, it is!',
			isRead: false,
			isDeleted: false
		});
	});

	test.afterAll(async () => {
		// Cleanup
		await prisma.sellerRating.deleteMany({ where: { OR: [{ sellerId }, { raterId: buyerId }] } });
		await prisma.message.deleteMany({
			where: { OR: [{ senderId: buyerId }, { recipientId: buyerId }] }
		});
		await prisma.post.deleteMany({ where: { userId: sellerId } });
		await prisma.user.deleteMany({ where: { id: { in: [sellerId, buyerId] } } });
		await prisma.$disconnect();
	});

	test('Complete flow: Login → View Product → Rate Seller → View Profile', async ({ page }) => {
		// Step 1: Login as buyer
		await page.goto('http://localhost:5173/login');
		await page.fill('input[name="email"]', buyerEmail);
		await page.fill('input[name="password"]', buyerPassword);
		await page.click('button[type="submit"]');

		// Wait for redirect after login
		await page.waitForNavigation();
		expect(page.url()).toContain('/browse'); // Or wherever users land after login

		// Step 2: Navigate to seller's profile
		await page.goto(`http://localhost:5173/profile/${sellerId}`);

		// Verify seller profile displays "New Seller" (no ratings yet)
		await expect(page.locator('[data-testid="seller-rating-display"]')).toContainText('New Seller');

		// Step 3: Open rating modal
		await page.click('[data-testid="rate-seller-button"]');

		// Verify modal opened
		await expect(page.locator('[data-testid="rating-modal"]')).toBeVisible();

		// Step 4: Submit rating
		// Click on 5th star
		await page.click('[data-testid="star-5"]');

		// Add comment
		await page.fill(
			'[data-testid="rating-comment"]',
			'Excellent seller! Fast shipping and great communication.'
		);

		// Submit
		await page.click('[data-testid="submit-rating"]');

		// Wait for success message
		await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

		// Step 5: Verify rating appears on profile
		await page.reload();

		// Check seller rating display updated
		await expect(page.locator('[data-testid="seller-rating-display"]')).toContainText('5.0');

		// Check rating appears in list
		const ratingList = page.locator('[data-testid="rating-list"]');
		await expect(ratingList).toBeVisible();
		await expect(ratingList).toContainText('Excellent seller!');
		await expect(ratingList).toContainText('E2E Buyer'); // Rater name

		// Step 6: Verify rating distribution
		const distribution = page.locator('[data-testid="rating-distribution"]');
		await expect(distribution).toBeVisible();
		await expect(distribution.locator('[data-testid="star-5-bar"]')).toHaveCSS('width', /100%/);
	});

	test('Duplicate rating prevention', async ({ page }) => {
		// Login as buyer
		await page.goto('http://localhost:5173/login');
		await page.fill('input[name="email"]', buyerEmail);
		await page.fill('input[name="password"]', buyerPassword);
		await page.click('button[type="submit"]');
		await page.waitForNavigation();

		// Go to seller profile
		await page.goto(`http://localhost:5173/profile/${sellerId}`);

		// Try to open rating modal again
		const rateButton = page.locator('[data-testid="rate-seller-button"]');

		if (await rateButton.isVisible()) {
			await rateButton.click();

			// Should show error message
			await expect(page.locator('[data-testid="error-message"]')).toContainText('already rated');
		} else {
			// Button should be replaced with "Edit Rating" or disabled
			await expect(page.locator('[data-testid="edit-rating-button"]')).toBeVisible();
		}
	});

	test('Edit existing rating', async ({ page }) => {
		// Login as buyer
		await page.goto('http://localhost:5173/login');
		await page.fill('input[name="email"]', buyerEmail);
		await page.fill('input[name="password"]', buyerPassword);
		await page.click('button[type="submit"]');
		await page.waitForNavigation();

		// Go to seller profile
		await page.goto(`http://localhost:5173/profile/${sellerId}`);

		// Find and click edit button on own rating
		await page.click('[data-testid="edit-own-rating"]');

		// Modal should open in edit mode
		await expect(page.locator('[data-testid="rating-modal"]')).toBeVisible();
		await expect(page.locator('[data-testid="modal-title"]')).toContainText('Edit');

		// Change rating to 4 stars
		await page.click('[data-testid="star-4"]');

		// Update comment
		await page.fill(
			'[data-testid="rating-comment"]',
			'Good seller, minor issues but resolved quickly.'
		);

		// Submit update
		await page.click('[data-testid="submit-rating"]');

		// Wait for success
		await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

		// Verify changes
		await page.reload();
		await expect(page.locator('[data-testid="rating-list"]')).toContainText(
			'Good seller, minor issues'
		);
	});

	test('Delete rating', async ({ page }) => {
		// Login as buyer
		await page.goto('http://localhost:5173/login');
		await page.fill('input[name="email"]', buyerEmail);
		await page.fill('input[name="password"]', buyerPassword);
		await page.click('button[type="submit"]');
		await page.waitForNavigation();

		// Go to seller profile
		await page.goto(`http://localhost:5173/profile/${sellerId}`);

		// Click delete button on own rating
		await page.click('[data-testid="delete-own-rating"]');

		// Confirm deletion in modal
		await page.click('[data-testid="confirm-delete"]');

		// Wait for success
		await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

		// Verify rating removed
		await page.reload();
		await expect(page.locator('[data-testid="seller-rating-display"]')).toContainText('New Seller');
		await expect(page.locator('[data-testid="rating-list"]')).not.toContainText('E2E Buyer');
	});

	test('Seller cannot rate themselves', async ({ page }) => {
		// Login as seller
		await page.goto('http://localhost:5173/login');
		await page.fill('input[name="email"]', sellerEmail);
		await page.fill('input[name="password"]', sellerPassword);
		await page.click('button[type="submit"]');
		await page.waitForNavigation();

		// Go to own profile
		await page.goto(`http://localhost:5173/profile/${sellerId}`);

		// "Rate Seller" button should not be visible
		await expect(page.locator('[data-testid="rate-seller-button"]')).not.toBeVisible();

		// Or if visible, should be disabled with tooltip
		const button = page.locator('[data-testid="rate-seller-button"]');
		if (await button.isVisible()) {
			await expect(button).toBeDisabled();
			await button.hover();
			await expect(page.locator('[data-testid="tooltip"]')).toContainText('cannot rate yourself');
		}
	});

	test('Rating requires message exchange', async ({ page, browser }) => {
		// Create new user without message exchange
		const userRepo = new UserRepository();
		const newUserEmail = `no_exchange_${Date.now()}@example.com`;
		const newUser = await userRepo.create({
			emailAddress: newUserEmail,
			passwordHash: 'Test123!@#',
			fullName: 'No Exchange User',
			phoneNumber: '5555555555'
		});

		try {
			// Login as new user
			await page.goto('http://localhost:5173/login');
			await page.fill('input[name="email"]', newUserEmail);
			await page.fill('input[name="password"]', 'Test123!@#');
			await page.click('button[type="submit"]');
			await page.waitForNavigation();

			// Go to seller profile
			await page.goto(`http://localhost:5173/profile/${sellerId}`);

			// Rate button should be disabled or show eligibility message
			const rateButton = page.locator('[data-testid="rate-seller-button"]');

			if (await rateButton.isVisible()) {
				if (await rateButton.isEnabled()) {
					await rateButton.click();

					// Should show error about no interaction
					await expect(page.locator('[data-testid="error-message"]')).toContainText(
						'message exchange'
					);
				} else {
					// Button disabled with tooltip
					await rateButton.hover();
					await expect(page.locator('[data-testid="tooltip"]')).toContainText('message');
				}
			} else {
				// No button shown - expected behavior
				expect(true).toBe(true);
			}
		} finally {
			// Cleanup
			await prisma.user.delete({ where: { id: newUser.id } });
		}
	});

	test('Rating statistics update correctly', async ({ page }) => {
		// Create multiple ratings from different users
		const userRepo = new UserRepository();
		const messageRepo = new MessageRepository();

		const raters = [];
		for (let i = 1; i <= 5; i++) {
			const user = await userRepo.create({
				emailAddress: `rater_${i}_${Date.now()}@example.com`,
				passwordHash: 'Test123!@#',
				fullName: `Rater ${i}`,
				phoneNumber: `55500000${i}`
			});
			raters.push(user);

			// Create message exchange
			await messageRepo.create({
				senderId: user.id,
				recipientId: sellerId,
				messageText: 'Test',
				isRead: false,
				isDeleted: false
			});

			// Create rating via API (for speed)
			await fetch('http://localhost:3000/api/v1/ratings', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${generateToken(user.id, user.emailAddress)}`
				},
				body: JSON.stringify({
					sellerId,
					rating: i, // 1, 2, 3, 4, 5
					comment: `Rating ${i} stars`
				})
			});
		}

		try {
			// View seller profile
			await page.goto(`http://localhost:5173/profile/${sellerId}`);

			// Check average rating (should be 3.0)
			await expect(page.locator('[data-testid="average-rating"]')).toContainText('3.0');

			// Check total ratings
			await expect(page.locator('[data-testid="total-ratings"]')).toContainText('5');

			// Check distribution
			const distribution = page.locator('[data-testid="rating-distribution"]');
			for (let stars = 1; stars <= 5; stars++) {
				const bar = distribution.locator(`[data-testid="star-${stars}-bar"]`);
				await expect(bar).toBeVisible();
				// Each rating should be 20% (1 out of 5)
				const barText = await bar.textContent();
				expect(barText).toContain('20%');
			}
		} finally {
			// Cleanup
			await prisma.sellerRating.deleteMany({
				where: { raterId: { in: raters.map((r) => r.id) } }
			});
			await prisma.message.deleteMany({
				where: { senderId: { in: raters.map((r) => r.id) } }
			});
			await prisma.user.deleteMany({
				where: { id: { in: raters.map((r) => r.id) } }
			});
		}
	});
});

// Helper function to generate JWT token
function generateToken(userId: number, email: string): string {
	const jwt = require('jsonwebtoken');
	const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
	return jwt.sign({ userId, email }, JWT_SECRET);
}
