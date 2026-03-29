/**
 * ============================================================================
 * DEEP DIFF CHANGE DETECTOR - UNIT TESTS
 * ============================================================================
 *
 * Tests for DeepDiffChangeDetector implementation.
 *
 * Coverage:
 * - Change detection
 * - Field exclusion
 * - Field masking
 * - Deep comparison
 * - Custom comparators
 * - Change formatting
 *
 * @packageDocumentation
 */

import { DeepDiffChangeDetector } from "./deep-diff-change-detector";

describe("DeepDiffChangeDetector", () => {
  let detector: DeepDiffChangeDetector;

  beforeEach(() => {
    detector = new DeepDiffChangeDetector();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("detectChanges", () => {
    it("should detect changed primitive fields", () => {
      const before = { name: "John", age: 30, email: "john@old.com" };
      const after = { name: "John", age: 31, email: "john@new.com" };

      const changes = detector.detectChanges(before, after);

      expect(changes).toEqual({
        age: { from: 30, to: 31 },
        email: { from: "john@old.com", to: "john@new.com" },
      });
    });

    it("should detect added fields", () => {
      const before = { name: "John" };
      const after = { name: "John", age: 30 };

      const changes = detector.detectChanges(before, after);

      expect(changes).toEqual({
        age: { from: undefined, to: 30 },
      });
    });

    it("should detect removed fields", () => {
      const before = { name: "John", age: 30 };
      const after = { name: "John" };

      const changes = detector.detectChanges(before, after);

      expect(changes).toEqual({
        age: { from: 30, to: undefined },
      });
    });

    it("should detect nested object changes", () => {
      const before = { user: { name: "John", age: 30 } };
      const after = { user: { name: "Jane", age: 30 } };

      const changes = detector.detectChanges(before, after);

      expect(changes).toHaveProperty("user");
      expect(changes.user?.from).toEqual({ name: "John", age: 30 });
      expect(changes.user?.to).toEqual({ name: "Jane", age: 30 });
    });

    it("should detect array changes", () => {
      const before = { tags: ["a", "b"] };
      const after = { tags: ["a", "c"] };

      const changes = detector.detectChanges(before, after);

      expect(changes).toEqual({
        tags: { from: ["a", "b"], to: ["a", "c"] },
      });
    });

    it("should detect Date changes", () => {
      const before = { createdAt: new Date("2023-01-01") };
      const after = { createdAt: new Date("2023-01-02") };

      const changes = detector.detectChanges(before, after);

      expect(changes).toHaveProperty("createdAt");
    });

    it("should return empty object when nothing changed", () => {
      const before = { name: "John", age: 30 };
      const after = { name: "John", age: 30 };

      const changes = detector.detectChanges(before, after);

      expect(changes).toEqual({});
    });
  });

  describe("field exclusion", () => {
    it("should exclude specified fields", () => {
      const before = { name: "John", updatedAt: new Date("2023-01-01") };
      const after = { name: "Jane", updatedAt: new Date("2023-02-01") };

      const changes = detector.detectChanges(before, after, {
        excludeFields: ["updatedAt"],
      });

      expect(changes).toEqual({
        name: { from: "John", to: "Jane" },
      });
      expect(changes).not.toHaveProperty("updatedAt");
    });

    it("should exclude multiple fields", () => {
      const before = { name: "John", updatedAt: new Date(), version: 1 };
      const after = { name: "Jane", updatedAt: new Date(), version: 2 };

      const changes = detector.detectChanges(before, after, {
        excludeFields: ["updatedAt", "version"],
      });

      expect(changes).toEqual({
        name: { from: "John", to: "Jane" },
      });
    });
  });

  describe("field masking", () => {
    it("should mask fields with 'full' strategy", () => {
      const before = { username: "user1", password: "oldpass123" };
      const after = { username: "user1", password: "newpass456" };

      const changes = detector.detectChanges(before, after, {
        maskFields: ["password"],
        maskStrategy: "full",
      });

      expect(changes).toEqual({
        password: { from: "***", to: "***" },
      });
    });

    it("should mask fields with 'partial' strategy", () => {
      const before = { creditCard: "1234567890123456" };
      const after = { creditCard: "6543210987654321" };

      const changes = detector.detectChanges(before, after, {
        maskFields: ["creditCard"],
        maskStrategy: "partial",
      });

      expect(changes.creditCard?.from).toBe("1234****3456");
      expect(changes.creditCard?.to).toBe("6543****4321");
    });

    it("should mask fields with 'hash' strategy", () => {
      const before = { ssn: "123-45-6789" };
      const after = { ssn: "987-65-4321" };

      const changes = detector.detectChanges(before, after, {
        maskFields: ["ssn"],
        maskStrategy: "hash",
      });

      expect(changes.ssn?.from).toMatch(/^[0-9a-f]{16}$/);
      expect(changes.ssn?.to).toMatch(/^[0-9a-f]{16}$/);
      expect(changes.ssn?.from).not.toBe(changes.ssn?.to);
    });

    it("should mask short strings with full strategy", () => {
      const before = { pin: "1234" };
      const after = { pin: "5678" };

      const changes = detector.detectChanges(before, after, {
        maskFields: ["pin"],
        maskStrategy: "partial", // Will fallback to *** for short strings
      });

      expect(changes.pin?.from).toBe("***");
      expect(changes.pin?.to).toBe("***");
    });
  });

  describe("includeUnchanged option", () => {
    it("should include unchanged fields when option is true", () => {
      const before = { name: "John", age: 30 };
      const after = { name: "John", age: 31 };

      const changes = detector.detectChanges(before, after, {
        includeUnchanged: true,
      });

      expect(changes).toHaveProperty("name");
      expect(changes).toHaveProperty("age");
      expect(changes.name).toEqual({ from: "John", to: "John" });
    });
  });

  describe("hasChanged", () => {
    it("should detect primitive changes", () => {
      expect(detector.hasChanged("old", "new")).toBe(true);
      expect(detector.hasChanged(1, 2)).toBe(true);
      expect(detector.hasChanged(true, false)).toBe(true);
    });

    it("should detect no change for equal primitives", () => {
      expect(detector.hasChanged("same", "same")).toBe(false);
      expect(detector.hasChanged(42, 42)).toBe(false);
      expect(detector.hasChanged(true, true)).toBe(false);
    });

    it("should detect null/undefined differences", () => {
      expect(detector.hasChanged(null, undefined)).toBe(true);
      expect(detector.hasChanged(null, "value")).toBe(true);
      expect(detector.hasChanged(null, null)).toBe(false);
    });

    it("should detect Date changes", () => {
      const date1 = new Date("2023-01-01");
      const date2 = new Date("2023-01-02");

      expect(detector.hasChanged(date1, date2)).toBe(true);
      expect(detector.hasChanged(date1, new Date(date1))).toBe(false);
    });

    it("should detect array changes", () => {
      expect(detector.hasChanged([1, 2, 3], [1, 2, 4])).toBe(true);
      expect(detector.hasChanged([1, 2, 3], [1, 2, 3])).toBe(false);
    });

    it("should detect object changes", () => {
      expect(detector.hasChanged({ a: 1 }, { a: 2 })).toBe(true);
      expect(detector.hasChanged({ a: 1 }, { a: 1 })).toBe(false);
    });
  });

  describe("maskValue", () => {
    it("should mask with full strategy", () => {
      expect(detector.maskValue("sensitive", "full")).toBe("***");
    });

    it("should mask with partial strategy", () => {
      expect(detector.maskValue("1234567890", "partial")).toBe("1234****7890");
    });

    it("should mask short value with partial strategy", () => {
      expect(detector.maskValue("short", "partial")).toBe("***");
    });

    it("should mask with hash strategy", () => {
      const masked = detector.maskValue("password123", "hash");

      expect(masked).toMatch(/^[0-9a-f]{16}$/);
    });

    it("should handle null/undefined", () => {
      expect(detector.maskValue(null, "full")).toBe("null");
      expect(detector.maskValue(undefined, "full")).toBe("undefined");
    });
  });

  describe("formatChanges", () => {
    it("should format changes as human-readable string", () => {
      const changes = {
        name: { from: "John", to: "Jane" },
        age: { from: 30, to: 31 },
      };

      const formatted = detector.formatChanges(changes);

      expect(formatted).toContain("name");
      expect(formatted).toContain('"John"');
      expect(formatted).toContain('"Jane"');
      expect(formatted).toContain("age");
      expect(formatted).toContain("30");
      expect(formatted).toContain("31");
    });

    it("should format no changes", () => {
      const formatted = detector.formatChanges({});

      expect(formatted).toBe("No changes detected");
    });

    it("should format Date changes", () => {
      const changes = {
        createdAt: {
          from: new Date("2023-01-01T00:00:00.000Z"),
          to: new Date("2023-01-02T00:00:00.000Z"),
        },
      };

      const formatted = detector.formatChanges(changes);

      expect(formatted).toContain("2023-01-01");
      expect(formatted).toContain("2023-01-02");
    });

    it("should format array and object changes", () => {
      const changes = {
        tags: { from: ["a", "b"], to: ["c", "d"] },
        metadata: { from: { x: 1 }, to: { y: 2 } },
      };

      const formatted = detector.formatChanges(changes);

      expect(formatted).toContain("[2 items]");
      expect(formatted).toContain("{object}");
    });
  });

  describe("max depth", () => {
    it("should stop at max depth", () => {
      const deepObject = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  value: "deep",
                },
              },
            },
          },
        },
      };

      const modified = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  value: "modified",
                },
              },
            },
          },
        },
      };

      const changes = detector.detectChanges(deepObject, modified, {
        maxDepth: 3,
      });

      // Should detect change at level 3 or above
      expect(Object.keys(changes).length).toBeGreaterThan(0);
    });
  });

  describe("custom comparators", () => {
    it("should use custom comparator for specific fields", () => {
      const before = { value: 10 };
      const after = { value: 10.1 };

      // Custom comparator that considers values within 0.2 as equal
      const customComparators = {
        value: (a: unknown, b: unknown) => Math.abs((a as number) - (b as number)) < 0.2,
      };

      const changes = detector.detectChanges(before, after, {
        customComparators,
      });

      expect(changes).toEqual({}); // Should be considered unchanged
    });
  });
});
