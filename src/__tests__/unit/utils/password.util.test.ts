import { describe, it, expect, beforeEach } from "@jest/globals";
import { PasswordUtil } from "../../../utils/password.util";

describe("PasswordUtil", () => {
  describe("hash", () => {
    it("should hash a password successfully", async () => {
      const password = "TestPassword123!";
      const hashed = await PasswordUtil.hash(password);

      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(password);
      expect(hashed.length).toBeGreaterThan(0);
      expect(hashed.startsWith("$2b$")).toBe(true);
    });

    it("should generate different hashes for the same password", async () => {
      const password = "TestPassword123!";
      const hash1 = await PasswordUtil.hash(password);
      const hash2 = await PasswordUtil.hash(password);

      expect(hash1).not.toBe(hash2);
    });

    it("should handle special characters", async () => {
      const password = "P@ssw0rd!#$%^&*()";
      const hashed = await PasswordUtil.hash(password);

      expect(hashed).toBeDefined();
      expect(hashed.startsWith("$2b$")).toBe(true);
    });
  });

  describe("verify", () => {
    it("should verify correct password", async () => {
      const password = "TestPassword123!";
      const hashed = await PasswordUtil.hash(password);
      const isValid = await PasswordUtil.verify(password, hashed);

      expect(isValid).toBe(true);
    });

    it("should reject incorrect password", async () => {
      const password = "TestPassword123!";
      const wrongPassword = "WrongPassword123!";
      const hashed = await PasswordUtil.hash(password);
      const isValid = await PasswordUtil.verify(wrongPassword, hashed);

      expect(isValid).toBe(false);
    });

    it("should be case-sensitive", async () => {
      const password = "TestPassword123!";
      const hashed = await PasswordUtil.hash(password);
      const isValid = await PasswordUtil.verify("testpassword123!", hashed);

      expect(isValid).toBe(false);
    });

    it("should handle empty password comparison", async () => {
      const password = "TestPassword123!";
      const hashed = await PasswordUtil.hash(password);
      const isValid = await PasswordUtil.verify("", hashed);

      expect(isValid).toBe(false);
    });
  });

  describe("validateStrength", () => {
    it("should validate a strong password", () => {
      const result = PasswordUtil.validateStrength("StrongP@ss123");

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject password that is too short", () => {
      const result = PasswordUtil.validateStrength("Short1!");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must be at least 8 characters long"
      );
    });

    it("should reject password without uppercase letter", () => {
      const result = PasswordUtil.validateStrength("weakpass123!");

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("uppercase"))).toBe(true);
    });

    it("should reject password without lowercase letter", () => {
      const result = PasswordUtil.validateStrength("WEAKPASS123!");

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("lowercase"))).toBe(true);
    });

    it("should reject password without number", () => {
      const result = PasswordUtil.validateStrength("WeakPassword!");

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("number"))).toBe(true);
    });

    it("should reject password without special character", () => {
      const result = PasswordUtil.validateStrength("WeakPassword123");

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("special character"))).toBe(
        true
      );
    });

    it("should return all validation errors for a weak password", () => {
      const result = PasswordUtil.validateStrength("weak");

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it("should accept password with various special characters", () => {
      const passwords = [
        "StrongP@ss123",
        "StrongP#ss123",
        "StrongP$ss123",
        "StrongP%ss123",
        "StrongP&ss123",
      ];

      passwords.forEach((password) => {
        const result = PasswordUtil.validateStrength(password);
        expect(result.valid).toBe(true);
      });
    });
  });
});
