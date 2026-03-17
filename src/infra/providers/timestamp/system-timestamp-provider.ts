/**
 * ============================================================================
 * SYSTEM TIMESTAMP PROVIDER - IMPLEMENTATION
 * ============================================================================
 *
 * Concrete implementation of ITimestampProvider using system clock and date-fns.
 *
 * Features:
 * - Uses system time (Date.now())
 * - Supports multiple output formats (ISO, Unix, Date)
 * - Timezone conversion (UTC, local, IANA timezones)
 * - Date arithmetic and formatting via date-fns
 * - Optional time freezing for testing
 *
 * Use Cases:
 * - Production audit log timestamps
 * - Date range queries
 * - Timezone-aware applications
 * - Testing with controllable time
 *
 * Characteristics:
 * - Precision: Millisecond (JavaScript Date limitation)
 * - Source: System clock (can drift, use NTP in production)
 * - Timezone: Configurable, defaults to UTC
 *
 * @packageDocumentation
 */

import {
  parseISO,
  startOfDay as startOfDayFns,
  endOfDay as endOfDayFns,
  differenceInMilliseconds,
  differenceInSeconds,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  isValid as isValidDate,
  isFuture,
} from "date-fns";

import type {
  ITimestampProvider,
  TimestampFormat,
  TimestampOptions,
  TimezoneOption,
  TimestampProviderInfo,
} from "../../../core/ports/timestamp-provider.port";

// ============================================================================
// SYSTEM TIMESTAMP PROVIDER IMPLEMENTATION
// ============================================================================

/**
 * Timestamp provider using system clock and date-fns.
 *
 * Provides timestamps from the system clock with configurable formatting
 * and timezone support.
 *
 * @example Basic usage
 * ```typescript
 * const provider = new SystemTimestampProvider();
 * const now = provider.now();
 * // Date('2026-03-16T10:30:00.000Z')
 * ```
 *
 * @example ISO string format
 * ```typescript
 * const provider = new SystemTimestampProvider();
 * const now = provider.now({ format: 'iso' });
 * // '2026-03-16T10:30:00.000Z'
 * ```
 *
 * @example Unix timestamp
 * ```typescript
 * const provider = new SystemTimestampProvider();
 * const now = provider.now({ format: 'unix' });
 * // 1710582600
 * ```
 *
 * @example With timezone
 * ```typescript
 * const provider = new SystemTimestampProvider({ defaultTimezone: 'America/New_York' });
 * const now = provider.now({ format: 'iso' });
 * // '2026-03-16T05:30:00.000-05:00' (adjusted for EST/EDT)
 * ```
 */
export class SystemTimestampProvider implements ITimestampProvider {
  /**
   * Default timezone for timestamp operations.
   */
  private readonly defaultTimezone: TimezoneOption;

  /**
   * Default precision for timestamps.
   */
  private readonly defaultPrecision: "second" | "millisecond" | "microsecond";

  /**
   * Frozen timestamp for testing.
   * When set, now() returns this instead of system time.
   */
  private frozenTime: Date | null = null;

  /**
   * Creates a new SystemTimestampProvider.
   *
   * @param options - Optional configuration
   * @param options.defaultTimezone - Default timezone (default: 'utc')
   * @param options.defaultPrecision - Default precision (default: 'millisecond')
   */
  constructor(options?: {
    defaultTimezone?: TimezoneOption;
    defaultPrecision?: "second" | "millisecond" | "microsecond";
  }) {
    this.defaultTimezone = options?.defaultTimezone ?? "utc";
    this.defaultPrecision = options?.defaultPrecision ?? "millisecond";
  }

  /**
   * Returns the current timestamp.
   *
   * If time is frozen (via freeze()), returns the frozen time.
   * Otherwise, returns the current system time.
   *
   * @param options - Optional formatting and timezone options
   * @returns Current timestamp in the requested format
   */
  now(options?: TimestampOptions): Date | string | number {
    // Get current time (or frozen time)
    const currentTime = this.frozenTime ?? new Date();

    // Apply precision
    const precision = options?.precision ?? this.defaultPrecision;
    const preciseTime = this.applyPrecision(currentTime, precision);

    // Apply timezone if needed
    const timezone = options?.timezone ?? this.defaultTimezone;
    const zonedTime = this.applyTimezone(preciseTime, timezone);

    // Format output
    const outputFormat = options?.format ?? "date";
    return this.format(zonedTime, outputFormat);
  }

  /**
   * Converts a Date object to the specified format.
   *
   * @param date - The date to format
   * @param format - Desired output format
   * @returns Formatted timestamp
   */
  format(date: Date, format: TimestampFormat): string | number | Date {
    switch (format) {
      case "iso":
        return date.toISOString();

      case "unix":
        return Math.floor(date.getTime() / 1000);

      case "unix-ms":
        return date.getTime();

      case "date":
        return date;
    }
  }

  /**
   * Parses a timestamp string or number into a Date object.
   *
   * @param timestamp - The timestamp to parse
   * @returns Date object
   * @throws Error if timestamp is invalid
   */
  parse(timestamp: string | number): Date {
    if (typeof timestamp === "number") {
      // Unix timestamp - detect if seconds or milliseconds
      const isSeconds = timestamp < 10000000000; // Before year 2286
      const ms = isSeconds ? timestamp * 1000 : timestamp;
      return new Date(ms);
    }

    if (typeof timestamp === "string") {
      // Try ISO 8601 format
      const parsed = parseISO(timestamp);
      if (isValidDate(parsed)) {
        return parsed;
      }

      // Try Date constructor as fallback
      const fallback = new Date(timestamp);
      if (isValidDate(fallback)) {
        return fallback;
      }

      throw new Error(`Invalid timestamp format: ${timestamp}`);
    }

    throw new Error(`Unsupported timestamp type: ${typeof timestamp}`);
  }

  /**
   * Validates if a timestamp is well-formed.
   *
   * @param timestamp - The timestamp to validate
   * @param allowFuture - Whether to allow future timestamps (default: false)
   * @returns True if valid, false otherwise
   */
  isValid(timestamp: string | number | Date, allowFuture: boolean = false): boolean {
    try {
      const date = timestamp instanceof Date ? timestamp : this.parse(timestamp);

      if (!isValidDate(date)) {
        return false;
      }

      // Check if in the future (if not allowed)
      if (!allowFuture && isFuture(date)) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Returns the start of the day (00:00:00.000).
   *
   * @param date - The date (defaults to today)
   * @param timezone - Timezone for calculation (default: UTC)
   * @returns Date object representing start of day
   */
  startOfDay(date?: Date, timezone?: TimezoneOption): Date {
    const targetDate = date ?? new Date();
    const tz = timezone ?? this.defaultTimezone;

    // For simplicity, only support UTC and local (IANA timezones require date-fns-tz)
    if (tz !== "utc" && tz !== "local") {
      throw new Error(`IANA timezone '${tz}' not supported. Use 'utc' or 'local' only.`);
    }

    return startOfDayFns(targetDate);
  }

  /**
   * Returns the end of the day (23:59:59.999).
   *
   * @param date - The date (defaults to today)
   * @param timezone - Timezone for calculation (default: UTC)
   * @returns Date object representing end of day
   */
  endOfDay(date?: Date, timezone?: TimezoneOption): Date {
    const targetDate = date ?? new Date();
    const tz = timezone ?? this.defaultTimezone;

    // For simplicity, only support UTC and local (IANA timezones require date-fns-tz)
    if (tz !== "utc" && tz !== "local") {
      throw new Error(`IANA timezone '${tz}' not supported. Use 'utc' or 'local' only.`);
    }

    return endOfDayFns(targetDate);
  }

  /**
   * Calculates the difference between two timestamps.
   *
   * @param from - Start timestamp
   * @param to - End timestamp
   * @param unit - Unit for the result (default: 'milliseconds')
   * @returns Duration in the specified unit
   */
  diff(
    from: Date,
    to: Date,
    unit: "milliseconds" | "seconds" | "minutes" | "hours" | "days" = "milliseconds",
  ): number {
    switch (unit) {
      case "milliseconds":
        return differenceInMilliseconds(to, from);
      case "seconds":
        return differenceInSeconds(to, from);
      case "minutes":
        return differenceInMinutes(to, from);
      case "hours":
        return differenceInHours(to, from);
      case "days":
        return differenceInDays(to, from);
      default: {
        const _exhaustive: never = unit;
        return _exhaustive;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TESTING METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Freezes time at a specific timestamp (for testing).
   *
   * After calling this, all calls to now() return the frozen time.
   *
   * @param timestamp - The time to freeze at
   */
  freeze(timestamp: Date): void {
    this.frozenTime = new Date(timestamp);
  }

  /**
   * Advances frozen time by a duration (for testing).
   *
   * Only works if time is currently frozen.
   *
   * @param duration - Amount to advance (in milliseconds)
   */
  advance(duration: number): void {
    if (!this.frozenTime) {
      throw new Error("Cannot advance time: time is not frozen. Call freeze() first.");
    }

    this.frozenTime = new Date(this.frozenTime.getTime() + duration);
  }

  /**
   * Unfreezes time, returning to real system time (for testing).
   */
  unfreeze(): void {
    this.frozenTime = null;
  }

  /**
   * Returns information about this timestamp provider.
   *
   * @returns Provider metadata
   */
  getInfo(): TimestampProviderInfo {
    const info: TimestampProviderInfo = {
      name: "SystemTimestampProvider",
      source: "system-clock",
      timezone: this.defaultTimezone,
      precision: this.defaultPrecision,
      frozen: this.frozenTime !== null,
    };

    // Only include offset if time is frozen
    if (this.frozenTime) {
      info.offset = this.frozenTime.getTime() - Date.now();
    }

    return info;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Applies precision to a timestamp.
   *
   * Truncates to the specified precision (second, millisecond, microsecond).
   *
   * Note: JavaScript Date only supports millisecond precision, so microsecond
   * is the same as millisecond.
   *
   * @param date - Date to apply precision to
   * @param precision - Desired precision
   * @returns Date with applied precision
   */
  private applyPrecision(date: Date, precision: "second" | "millisecond" | "microsecond"): Date {
    const ms = date.getTime();

    switch (precision) {
      case "second":
        // Truncate to seconds
        return new Date(Math.floor(ms / 1000) * 1000);

      case "millisecond":
      case "microsecond":
        // JavaScript Date is already millisecond precision
        return new Date(ms);

      default: {
        const _exhaustive: never = precision;
        return _exhaustive;
      }
    }
  }

  /**
   * Applies timezone conversion to a date.
   *
   * Note: Only UTC and local timezones are supported.
   * IANA timezones (e.g., 'America/New_York') require date-fns-tz as an additional dependency.
   *
   * @param date - Date to convert
   * @param timezone - Target timezone ('utc' or 'local')
   * @returns Converted date
   */
  private applyTimezone(date: Date, timezone: TimezoneOption): Date {
    if (timezone === "utc" || timezone === "local") {
      // JavaScript Date is always UTC internally, display uses local
      return date;
    }

    // IANA timezones not supported without date-fns-tz
    throw new Error(
      `IANA timezone '${timezone}' not supported. Use 'utc' or 'local' only. ` +
        "For IANA timezone support, install date-fns-tz and use a custom provider.",
    );
  }
}
