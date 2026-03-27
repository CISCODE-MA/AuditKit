/**
 * ============================================================================
 * CURSOR UTILITY - OPAQUE CURSOR ENCODING FOR CURSOR PAGINATION
 * ============================================================================
 *
 * Provides encode/decode helpers that turn an internal `{ t, id }` pair into
 * an opaque base64url string that is safe to surface in API responses.
 *
 * Cursor format (before encoding):
 *   { t: number, id: string }
 *   where `t` is the timestamp in milliseconds and `id` is the audit log ID.
 *
 * Why base64url?  Pure ascii, URL-safe, and hides the internal structure from
 * API consumers (opaque cursor contract).
 *
 * @packageDocumentation
 */

/**
 * Internal cursor data (before encoding).
 */
export interface CursorData {
  /** Timestamp in milliseconds */
  t: number;
  /** Audit log ID */
  id: string;
}

/**
 * Encodes a cursor data object into an opaque base64url string.
 *
 * @param data - The cursor data to encode
 * @returns Base64url-encoded cursor string
 */
export function encodeCursor(data: CursorData): string {
  return Buffer.from(JSON.stringify(data)).toString("base64url");
}

/**
 * Decodes an opaque cursor string back into cursor data.
 *
 * @param cursor - The base64url cursor string
 * @returns Decoded cursor data
 * @throws Error if the cursor is malformed
 */
export function decodeCursor(cursor: string): CursorData {
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as unknown;

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as Record<string, unknown>)["t"] !== "number" ||
      typeof (parsed as Record<string, unknown>)["id"] !== "string"
    ) {
      throw new Error("Cursor has unexpected shape");
    }

    return parsed as CursorData;
  } catch {
    throw new Error(`Invalid pagination cursor: "${cursor}"`);
  }
}
