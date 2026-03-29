/**
 * ============================================================================
 * SYSTEM TIMESTAMP PROVIDER - UNIT TESTS
 * ============================================================================
 *
 * Tests for SystemTimestampProvider implementation.
 *
 * Coverage:
 * - Timestamp generation
 * - Format conversion
 * - Parsing
 * - Validation
 * - Date calculations (start/end of day, diff)
 * - Time freezing (testing utilities)
 *
 * @packageDocumentation
 */

import { startOfDay as dateFnsStartOfDay, endOfDay as dateFnsEndOfDay } from "date-fns";

import { SystemTimestampProvider } from "./system-timestamp-provider";

describe("SystemTimestampProvider", () => {
  let provider: SystemTimestampProvider;

  beforeEach(() => {
    provider = new SystemTimestampProvider();
  });

  afterEach(() => {
    // Unfreeze time if frozen
    provider.unfreeze?.();
    jest.clearAllMocks();
  });

  describe("now", () => {
    it("should return current Date by default", () => {
      const now = provider.now();

      expect(now).toBeInstanceOf(Date);
    });

    it("should return ISO string when format is 'iso'", () => {
      const now = provider.now({ format: "iso" });

      expect(typeof now).toBe("string");
      expect(now).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it("should return Unix timestamp (seconds) when format is 'unix'", () => {
      const now = provider.now({ format: "unix" });

      expect(typeof now).toBe("number");
      expect(now).toBeGreaterThan(1700000000); // After 2023
    });

    it("should return Unix timestamp (ms) when format is 'unix-ms'", () => {
      const now = provider.now({ format: "unix-ms" });

      expect(typeof now).toBe("number");
      expect(now).toBeGreaterThan(1700000000000); // After 2023
    });

    it("should return Date when format is 'date'", () => {
      const now = provider.now({ format: "date" });

      expect(now).toBeInstanceOf(Date);
    });
  });

  describe("format", () => {
    const testDate = new Date("2026-03-19T10:30:00.000Z");

    it("should format to ISO string", () => {
      const formatted = provider.format(testDate, "iso");

      expect(formatted).toBe("2026-03-19T10:30:00.000Z");
    });

    it("should format to Unix seconds", () => {
      const formatted = provider.format(testDate, "unix");

      expect(formatted).toBe(Math.floor(testDate.getTime() / 1000));
    });

    it("should format to Unix milliseconds", () => {
      const formatted = provider.format(testDate, "unix-ms");

      expect(formatted).toBe(testDate.getTime());
    });

    it("should return Date object when format is 'date'", () => {
      const formatted = provider.format(testDate, "date");

      expect(formatted).toBeInstanceOf(Date);
      expect(formatted).toEqual(testDate);
    });
  });

  describe("parse", () => {
    it("should parse ISO string", () => {
      const parsed = provider.parse("2026-03-19T10:30:00.000Z");

      expect(parsed).toBeInstanceOf(Date);
      expect(parsed.toISOString()).toBe("2026-03-19T10:30:00.000Z");
    });

    it("should parse Unix timestamp (seconds)", () => {
      const timestamp = 1710841800; // Seconds
      const parsed = provider.parse(timestamp);

      expect(parsed).toBeInstanceOf(Date);
      expect(parsed.getTime()).toBe(timestamp * 1000);
    });

    it("should parse Unix timestamp (milliseconds)", () => {
      const timestamp = 1710841800000; // Milliseconds
      const parsed = provider.parse(timestamp);

      expect(parsed).toBeInstanceOf(Date);
      expect(parsed.getTime()).toBe(timestamp);
    });

    it("should throw error for invalid string", () => {
      expect(() => provider.parse("invalid-date")).toThrow("Invalid timestamp format");
    });

    it("should throw error for unsupported type", () => {
      expect(() => provider.parse({} as any)).toThrow("Unsupported timestamp type");
    });
  });

  describe("isValid", () => {
    it("should validate correct past Date", () => {
      const pastDate = new Date("2023-01-01");

      expect(provider.isValid(pastDate)).toBe(true);
    });

    it("should reject future Date by default", () => {
      const futureDate = new Date("2027-01-01");

      expect(provider.isValid(futureDate)).toBe(false);
    });

    it("should accept future Date when allowFuture is true", () => {
      const futureDate = new Date("2027-01-01");

      expect(provider.isValid(futureDate, true)).toBe(true);
    });

    it("should validate ISO string", () => {
      expect(provider.isValid("2023-01-01T00:00:00.000Z")).toBe(true);
    });

    it("should validate Unix timestamp", () => {
      expect(provider.isValid(1700000000)).toBe(true);
    });

    it("should reject invalid string", () => {
      expect(provider.isValid("not-a-date")).toBe(false);
    });

    it("should reject invalid Date", () => {
      expect(provider.isValid(new Date("invalid"))).toBe(false);
    });
  });

  describe("startOfDay", () => {
    it("should return start of day for given date", () => {
      const date = new Date("2026-03-19T15:30:45.123Z");
      const start = provider.startOfDay(date);

      expect(start.toISOString()).toBe(dateFnsStartOfDay(date).toISOString());
    });

    it("should return start of today when no date provided", () => {
      const start = provider.startOfDay();
      const expected = dateFnsStartOfDay(new Date());

      // Within 1 second tolerance
      expect(Math.abs(start.getTime() - expected.getTime())).toBeLessThan(1000);
    });

    it("should throw error for IANA timezone (not supported)", () => {
      expect(() => provider.startOfDay(new Date(), "America/New_York")).toThrow("IANA timezone");
    });
  });

  describe("endOfDay", () => {
    it("should return end of day for given date", () => {
      const date = new Date("2026-03-19T15:30:45.123Z");
      const end = provider.endOfDay(date);

      expect(end.toISOString()).toBe(dateFnsEndOfDay(date).toISOString());
    });

    it("should return end of today when no date provided", () => {
      const end = provider.endOfDay();
      const expected = dateFnsEndOfDay(new Date());

      // Within 1 second tolerance
      expect(Math.abs(end.getTime() - expected.getTime())).toBeLessThan(1000);
    });

    it("should throw error for IANA timezone (not supported)", () => {
      expect(() => provider.endOfDay(new Date(), "America/New_York")).toThrow("IANA timezone");
    });
  });

  describe("diff", () => {
    const start = new Date("2026-03-19T10:00:00.000Z");
    const end = new Date("2026-03-19T10:30:00.000Z");

    it("should calculate difference in milliseconds", () => {
      const diff = provider.diff(start, end, "milliseconds");

      expect(diff).toBe(1800000); // 30 minutes
    });

    it("should calculate difference in seconds", () => {
      const diff = provider.diff(start, end, "seconds");

      expect(diff).toBe(1800); // 30 minutes
    });

    it("should calculate difference in minutes", () => {
      const diff = provider.diff(start, end, "minutes");

      expect(diff).toBe(30);
    });

    it("should calculate difference in hours", () => {
      const endPlusTwoHours = new Date("2026-03-19T12:00:00.000Z");
      const diff = provider.diff(start, endPlusTwoHours, "hours");

      expect(diff).toBe(2);
    });

    it("should calculate difference in days", () => {
      const endPlusDay = new Date("2026-03-20T10:00:00.000Z");
      const diff = provider.diff(start, endPlusDay, "days");

      expect(diff).toBe(1);
    });

    it("should default to milliseconds", () => {
      const diff = provider.diff(start, end);

      expect(diff).toBe(1800000);
    });
  });

  describe("freeze", () => {
    it("should freeze time at specific timestamp", () => {
      const frozenTime = new Date("2026-03-19T12:00:00.000Z");
      provider.freeze?.(frozenTime);

      const now1 = provider.now();
      const now2 = provider.now();

      expect(now1).toEqual(frozenTime);
      expect(now2).toEqual(frozenTime);
    });

    it("should keep returning frozen time", () => {
      const frozenTime = new Date("2026-03-19T12:00:00.000Z");
      provider.freeze?.(frozenTime);

      // Frozen time should stay constant
      const now = provider.now();
      expect(now).toEqual(frozenTime);
    });
  });

  describe("advance", () => {
    it("should advance frozen time by duration", () => {
      const frozenTime = new Date("2026-03-19T12:00:00.000Z");
      provider.freeze?.(frozenTime);
      provider.advance?.(60000); // Advance by 1 minute

      const now = provider.now();

      expect(now).toEqual(new Date("2026-03-19T12:01:00.000Z"));
    });

    it("should throw error if time is not frozen", () => {
      expect(() => provider.advance?.(60000)).toThrow("Cannot advance time: time is not frozen");
    });
  });

  describe("unfreeze", () => {
    it("should return to real time", () => {
      const frozenTime = new Date("2020-01-01T00:00:00.000Z");
      provider.freeze?.(frozenTime);
      provider.unfreeze?.();

      const now = provider.now() as Date;

      expect(now.getFullYear()).toBeGreaterThan(2023);
    });
  });

  describe("getInfo", () => {
    it("should return provider information", () => {
      const info = provider.getInfo();

      expect(info).toEqual({
        name: "SystemTimestampProvider",
        source: "system-clock",
        timezone: "utc",
        precision: "millisecond",
        frozen: false,
      });
    });

    it("should show frozen status when time is frozen", () => {
      provider.freeze?.(new Date());
      const info = provider.getInfo();

      expect(info.frozen).toBe(true);
      expect(info.offset).toBeDefined();
    });

    it("should reflect custom configuration", () => {
      const customProvider = new SystemTimestampProvider({
        defaultTimezone: "local",
        defaultPrecision: "second",
      });
      const info = customProvider.getInfo();

      expect(info.timezone).toBe("local");
      expect(info.precision).toBe("second");
    });
  });
});
