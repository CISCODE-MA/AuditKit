/**
 * Console storage adapter - default fallback when no storage is provided.
 */

import type { AuditEvent, AuditStorage } from "../core/types";

/**
 * Default storage that logs audit events to console.
 * Used when no custom storage is provided.
 */
export class ConsoleAuditStorage implements AuditStorage {
  async save(event: AuditEvent): Promise<void> {
    const logLevel = event.level === "error" ? "error" : event.level === "warn" ? "warn" : "log";
    const prefix = `[AUDIT] [${event.timestamp.toISOString()}]`;
    const summary = `${event.method} ${event.path} - ${event.statusCode} (${event.duration}ms) - Actor: ${event.actor}`;

    console[logLevel](prefix, summary);

    if (event.changes?.modifiedFields?.length) {
      console[logLevel](`  Modified: ${event.changes.modifiedFields.join(", ")}`);
    }

    if (event.error) {
      console.error(`  Error: ${event.error}`);
    }
  }
}
