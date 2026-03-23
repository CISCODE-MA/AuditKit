/**
 * ============================================================================
 * NANOID ID GENERATOR - UNIT TESTS
 * ============================================================================
 *
 * Tests for NanoidIdGenerator implementation.
 *
 * Coverage:
 * - ID generation
 * - Batch generation
 * - Validation
 * - Custom options (prefix, suffix, length, alphabet)
 * - Generator info
 *
 * @packageDocumentation
 */

// Mock nanoid before importing the implementation
jest.mock("nanoid", () => ({
  nanoid: jest.fn((size?: number) => {
    const length = size || 21;
    let result = "";
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }),
  customAlphabet: jest.fn((alphabet: string, defaultSize?: number) => {
    return (size?: number) => {
      const length = size || defaultSize || 21;
      let result = "";
      for (let i = 0; i < length; i++) {
        result += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
      }
      return result;
    };
  }),
}));

import { NanoidIdGenerator } from "./nanoid-id-generator";

describe("NanoidIdGenerator", () => {
  let generator: NanoidIdGenerator;

  beforeEach(() => {
    generator = new NanoidIdGenerator();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("generate", () => {
    it("should generate a unique ID", () => {
      const id = generator.generate();

      expect(id).toBeDefined();
      expect(typeof id).toBe("string");
      expect(id.length).toBe(21); // Default nanoid length
    });

    it("should generate different IDs on multiple calls", () => {
      const id1 = generator.generate();
      const id2 = generator.generate();

      expect(id1).not.toBe(id2);
    });

    it("should generate ID with custom length", () => {
      const id = generator.generate({ length: 10 });

      expect(id.length).toBe(10);
    });

    it("should generate ID with prefix", () => {
      const id = generator.generate({ prefix: "audit_" });

      expect(id).toMatch(/^audit_/);
      expect(id.length).toBe(27); // 6 (prefix) + 21 (default)
    });

    it("should generate ID with suffix", () => {
      const id = generator.generate({ suffix: "_log" });

      expect(id).toMatch(/_log$/);
      expect(id.length).toBe(25); // 21 (default) + 4 (suffix)
    });

    it("should generate ID with both prefix and suffix", () => {
      const id = generator.generate({ prefix: "audit_", suffix: "_log" });

      expect(id).toMatch(/^audit_/);
      expect(id).toMatch(/_log$/);
      expect(id.length).toBe(31); // 6 + 21 + 4
    });

    it("should generate ID with custom alphabet", () => {
      const id = generator.generate({ alphabet: "0123456789", length: 10 });

      expect(id).toMatch(/^[0-9]+$/);
      expect(id.length).toBe(10);
    });
  });

  describe("generateBatch", () => {
    it("should generate multiple IDs", () => {
      const ids = generator.generateBatch(10);

      expect(ids).toHaveLength(10);
      expect(Array.isArray(ids)).toBe(true);
    });

    it("should generate all unique IDs", () => {
      const ids = generator.generateBatch(100);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(100);
    });

    it("should return empty array for count 0", () => {
      const ids = generator.generateBatch(0);

      expect(ids).toEqual([]);
    });

    it("should return empty array for negative count", () => {
      const ids = generator.generateBatch(-5);

      expect(ids).toEqual([]);
    });

    it("should apply options to all IDs", () => {
      const ids = generator.generateBatch(5, { prefix: "test_" });

      ids.forEach((id) => {
        expect(id).toMatch(/^test_/);
      });
    });
  });

  describe("isValid", () => {
    it("should validate correct nanoid format", () => {
      const id = generator.generate();

      expect(generator.isValid(id)).toBe(true);
    });

    it("should reject empty string", () => {
      expect(generator.isValid("")).toBe(false);
    });

    it("should reject null", () => {
      expect(generator.isValid(null as any)).toBe(false);
    });

    it("should reject undefined", () => {
      expect(generator.isValid(undefined as any)).toBe(false);
    });

    it("should reject non-string values", () => {
      expect(generator.isValid(123 as any)).toBe(false);
    });

    it("should reject IDs with invalid characters", () => {
      expect(generator.isValid("invalid!@#$%^&*()")).toBe(false);
    });

    it("should reject IDs that are too long", () => {
      const longId = "a".repeat(101);

      expect(generator.isValid(longId)).toBe(false);
    });

    it("should accept IDs with valid alphabet characters", () => {
      const validId = "V1StGXR8_Z5jdHi6B-myT";

      expect(generator.isValid(validId)).toBe(true);
    });
  });

  describe("extractMetadata", () => {
    it("should return null for nanoid (no metadata)", () => {
      const id = generator.generate();
      const metadata = generator.extractMetadata(id);

      expect(metadata).toBeNull();
    });
  });

  describe("getInfo", () => {
    it("should return generator information", () => {
      const info = generator.getInfo();

      expect(info).toEqual({
        name: "NanoidIdGenerator",
        version: "5.0.9",
        defaultLength: 21,
        alphabet: "A-Za-z0-9_-",
        collisionProbability: "~1% in ~450 years at 1000 IDs/hour (for 21-char IDs)",
        sortable: false,
        encoding: null,
      });
    });

    it("should reflect custom default length", () => {
      const customGenerator = new NanoidIdGenerator({ defaultLength: 16 });
      const info = customGenerator.getInfo();

      expect(info.defaultLength).toBe(16);
    });

    it("should reflect custom alphabet", () => {
      const customGenerator = new NanoidIdGenerator({
        defaultAlphabet: "0123456789",
      });
      const info = customGenerator.getInfo();

      expect(info.alphabet).toBe("0123456789");
    });
  });

  describe("custom configuration", () => {
    it("should use custom default length", () => {
      const customGenerator = new NanoidIdGenerator({ defaultLength: 16 });
      const id = customGenerator.generate();

      expect(id.length).toBe(16);
    });

    it("should use custom default alphabet", () => {
      const customGenerator = new NanoidIdGenerator({
        defaultAlphabet: "ABCDEF0123456789",
      });
      const id = customGenerator.generate({ length: 10 });

      expect(id).toMatch(/^[ABCDEF0123456789]+$/);
    });
  });
});
