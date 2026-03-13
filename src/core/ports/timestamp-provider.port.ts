/**
 * ============================================================================
 * TIMESTAMP PROVIDER PORT - DATE/TIME ABSTRACTION
 * ============================================================================
 *
 * This file defines the port (interface) for providing timestamps
 * in audit log entries.
 *
 * Purpose:
 * - Abstract away date/time generation
 * - Enable controlled time in tests (freeze time, time travel)
 * - Support different time zones or UTC enforcement
 * - Allow custom time sources (NTP servers, atomic clocks, etc.)
 *
 * Pattern: Ports & Adapters (Hexagonal Architecture)
 * - This is a PORT (interface)
 * - Concrete implementations are ADAPTERS (e.g., SystemTimestampProvider)
 *
 * Architecture Rules:
 * - This interface is in core/ - framework-free
 * - Implementations go in infra/ - can use external libraries
 *
 * Why abstract timestamps?
 * - **Testing**: Mock time for deterministic tests
 * - **Consistency**: Ensure all audit logs use same time source
 * - **Compliance**: Some regulations require specific time sources
 * - **Accuracy**: Use NTP or atomic clock for critical applications
 *
 * @packageDocumentation
 */

// ============================================================================
// TIMESTAMP FORMAT OPTIONS
// ============================================================================

/**
 * Supported timestamp formats for serialization.
 */
export type TimestampFormat =
  | "iso" // ISO 8601 string (e.g., '2026-03-12T10:30:00.000Z')
  | "unix" // Unix timestamp in seconds (e.g., 1710241800)
  | "unix-ms" // Unix timestamp in milliseconds (e.g., 1710241800000)
  | "date"; // JavaScript Date object

/**
 * Timezone options for timestamp generation.
 */
export type TimezoneOption = "utc" | "local" | string; // string for IANA tz (e.g., 'America/New_York')

// ============================================================================
// TIMESTAMP PROVIDER OPTIONS
// ============================================================================

/**
 * Configuration options for timestamp generation.
 */
export interface TimestampOptions {
  /**
   * Output format for the timestamp.
   * Default: 'iso'
   */
  format?: TimestampFormat;

  /**
   * Timezone for timestamp generation.
   * Default: 'utc'
   *
   * For audit logs, UTC is strongly recommended for consistency.
   */
  timezone?: TimezoneOption;

  /**
   * Precision for timestamps.
   * - 'second': 1-second precision
   * - 'millisecond': 1-millisecond precision (default)
   * - 'microsecond': 1-microsecond precision (if supported)
   */
  precision?: "second" | "millisecond" | "microsecond";
}

// ============================================================================
// MAIN TIMESTAMP PROVIDER PORT
// ============================================================================

/**
 * Port (interface) for providing timestamps.
 *
 * Implementations must provide methods to:
 * - Get current timestamp
 * - Format timestamps in different representations
 * - Parse timestamps from strings
 * - Support time manipulation (for testing)
 *
 * Implementation Examples:
 * - SystemTimestampProvider (uses system clock - production default)
 * - FixedTimestampProvider (returns fixed time - testing)
 * - NTPTimestampProvider (syncs with NTP server - high accuracy)
 * - OffsetTimestampProvider (adjusts system time by offset)
 */
export interface ITimestampProvider {
  /**
   * Returns the current timestamp.
   *
   * By default, returns a JavaScript Date object representing "now".
   * Can be customized with options for format and timezone.
   *
   * @param options - Optional formatting and timezone options
   * @returns Current timestamp in the requested format
   *
   * @example Basic usage (Date object)
   * ```typescript
   * const now = provider.now();
   * // Date('2026-03-12T10:30:00.000Z')
   * ```
   *
   * @example ISO string format
   * ```typescript
   * const now = provider.now({ format: 'iso' });
   * // '2026-03-12T10:30:00.000Z'
   * ```
   *
   * @example Unix timestamp
   * ```typescript
   * const now = provider.now({ format: 'unix' });
   * // 1710241800
   * ```
   *
   * @example With timezone
   * ```typescript
   * const now = provider.now({
   *   format: 'iso',
   *   timezone: 'America/New_York'
   * });
   * // '2026-03-12T05:30:00.000-05:00'
   * ```
   */
  now(options?: TimestampOptions): Date | string | number;

  /**
   * Converts a Date object to the specified format.
   *
   * Useful when you have a Date and need it in a different format.
   *
   * @param date - The date to format
   * @param format - Desired output format
   * @returns Formatted timestamp
   *
   * @example
   * ```typescript
   * const date = new Date('2026-03-12T10:30:00.000Z');
   *
   * provider.format(date, 'iso');
   * // '2026-03-12T10:30:00.000Z'
   *
   * provider.format(date, 'unix');
   * // 1710241800
   *
   * provider.format(date, 'unix-ms');
   * // 1710241800000
   * ```
   */
  format(date: Date, format: TimestampFormat): string | number | Date;

  /**
   * Parses a timestamp string or number into a Date object.
   *
   * Handles multiple input formats and returns a normalized Date.
   *
   * @param timestamp - The timestamp to parse (ISO string, Unix, etc.)
   * @returns Date object
   * @throws Error if timestamp is invalid or unparseable
   *
   * @example
   * ```typescript
   * // Parse ISO string
   * provider.parse('2026-03-12T10:30:00.000Z');
   * // Date('2026-03-12T10:30:00.000Z')
   *
   * // Parse Unix timestamp (seconds)
   * provider.parse(1710241800);
   * // Date('2026-03-12T10:30:00.000Z')
   *
   * // Parse Unix timestamp (milliseconds)
   * provider.parse(1710241800000);
   * // Date('2026-03-12T10:30:00.000Z')
   * ```
   */
  parse(timestamp: string | number): Date;

  /**
   * Validates if a timestamp is well-formed and in the past.
   *
   * Useful for:
   * - Input validation
   * - Detecting clock skew
   * - Rejecting future timestamps (possible attack)
   *
   * @param timestamp - The timestamp to validate
   * @param allowFuture - Whether to allow future timestamps (default: false)
   * @returns True if valid, false otherwise
   *
   * @example
   * ```typescript
   * // Valid past timestamp
   * provider.isValid('2026-03-12T10:30:00.000Z');
   * // true
   *
   * // Future timestamp (rejected by default)
   * provider.isValid('2027-03-12T10:30:00.000Z');
   * // false
   *
   * // Future timestamp (allowed)
   * provider.isValid('2027-03-12T10:30:00.000Z', true);
   * // true
   *
   * // Invalid format
   * provider.isValid('not-a-date');
   * // false
   * ```
   */
  isValid(timestamp: string | number | Date, allowFuture?: boolean): boolean;

  /**
   * Returns the start of the day for the given date (00:00:00).
   *
   * Useful for date range queries in audit logs.
   *
   * @param date - The date (defaults to today)
   * @param timezone - Timezone for calculation (default: UTC)
   * @returns Date object representing start of day
   *
   * @example
   * ```typescript
   * const today = provider.startOfDay();
   * // Date('2026-03-12T00:00:00.000Z')
   *
   * const specific = provider.startOfDay(new Date('2026-03-15T14:30:00Z'));
   * // Date('2026-03-15T00:00:00.000Z')
   * ```
   */
  startOfDay(date?: Date, timezone?: TimezoneOption): Date;

  /**
   * Returns the end of the day for the given date (23:59:59.999).
   *
   * Useful for date range queries in audit logs.
   *
   * @param date - The date (defaults to today)
   * @param timezone - Timezone for calculation (default: UTC)
   * @returns Date object representing end of day
   *
   * @example
   * ```typescript
   * const today = provider.endOfDay();
   * // Date('2026-03-12T23:59:59.999Z')
   * ```
   */
  endOfDay(date?: Date, timezone?: TimezoneOption): Date;

  /**
   * Calculates the difference between two timestamps.
   *
   * Returns the duration in various units.
   *
   * @param from - Start timestamp
   * @param to - End timestamp
   * @param unit - Unit for the result (default: 'milliseconds')
   * @returns Duration in the specified unit
   *
   * @example
   * ```typescript
   * const start = new Date('2026-03-12T10:00:00Z');
   * const end = new Date('2026-03-12T10:30:00Z');
   *
   * provider.diff(start, end, 'minutes');
   * // 30
   *
   * provider.diff(start, end, 'seconds');
   * // 1800
   *
   * provider.diff(start, end, 'milliseconds');
   * // 1800000
   * ```
   */
  diff(
    from: Date,
    to: Date,
    unit?: "milliseconds" | "seconds" | "minutes" | "hours" | "days",
  ): number;

  // ─────────────────────────────────────────────────────────────────────────
  // OPTIONAL METHODS - Testing & Advanced Features
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Freezes time at a specific timestamp (for testing).
   *
   * After calling this, all calls to now() return the frozen time.
   * Only implemented in test-specific providers.
   *
   * @param timestamp - The time to freeze at
   *
   * @example
   * ```typescript
   * provider.freeze?.(new Date('2026-03-12T10:00:00Z'));
   * provider.now(); // Always returns 2026-03-12T10:00:00Z
   * provider.now(); // Still returns 2026-03-12T10:00:00Z
   * ```
   */
  freeze?(timestamp: Date): void;

  /**
   * Advances frozen time by a duration (for testing).
   *
   * Only works if time is currently frozen.
   *
   * @param duration - Amount to advance (in milliseconds)
   *
   * @example
   * ```typescript
   * provider.freeze?.(new Date('2026-03-12T10:00:00Z'));
   * provider.advance?.(60000); // Advance by 1 minute
   * provider.now(); // Returns 2026-03-12T10:01:00Z
   * ```
   */
  advance?(duration: number): void;

  /**
   * Unfreezes time, returning to real system time (for testing).
   *
   * @example
   * ```typescript
   * provider.freeze?.(new Date('2026-03-12T10:00:00Z'));
   * provider.unfreeze?.();
   * provider.now(); // Returns actual current time
   * ```
   */
  unfreeze?(): void;

  /**
   * Returns information about the timestamp provider implementation.
   *
   * @returns Provider information
   *
   * @example
   * ```typescript
   * const info = provider.getInfo();
   * // {
   * //   name: 'SystemTimestampProvider',
   * //   source: 'system-clock',
   * //   timezone: 'UTC',
   * //   precision: 'millisecond',
   * //   frozen: false
   * // }
   * ```
   */
  getInfo(): TimestampProviderInfo;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Information about a timestamp provider implementation.
 */
export interface TimestampProviderInfo {
  /** Name of the provider */
  name: string;

  /** Source of time (system-clock, ntp, fixed, etc.) */
  source: string;

  /** Default timezone */
  timezone: TimezoneOption;

  /** Precision of timestamps */
  precision: "second" | "millisecond" | "microsecond";

  /** Whether time is currently frozen (for testing) */
  frozen: boolean;

  /** Current time offset from system clock (if any) */
  offset?: number;
}
