/**
 * Configuration types for AuditKit - framework-free.
 */

import type { ActorExtractor, ResourceExtractor, SensitiveKey } from "./types";

/** Configuration for AuditKit */
export interface AuditConfig {
  /** Enable/disable auditing (default: true) */
  enabled?: boolean;
  /** Log level threshold (default: 'info') */
  level?: "info" | "warn" | "error";
  /** HTTP methods to audit (default: all mutation methods) */
  methods?: string[];
  /** Paths to exclude from auditing (supports glob patterns) */
  excludePaths?: string[];
  /** Additional sensitive keys to mask */
  sensitiveKeys?: SensitiveKey[];
  /** Custom actor extractor function */
  actorExtractor?: ActorExtractor;
  /** Custom resource extractor function */
  resourceExtractor?: ResourceExtractor;
  /** Whether to capture request body changes (default: true for mutations) */
  captureChanges?: boolean;
  /** Maximum depth for deep diff (default: 10) */
  maxDiffDepth?: number;
  /** Mask value to use (default: '[REDACTED]') */
  maskValue?: string;
}

/** Default configuration values */
export const DEFAULT_CONFIG: Required<
  Pick<
    AuditConfig,
    "enabled" | "level" | "methods" | "captureChanges" | "maxDiffDepth" | "maskValue"
  >
> = {
  enabled: true,
  level: "info",
  methods: ["POST", "PUT", "PATCH", "DELETE"],
  captureChanges: true,
  maxDiffDepth: 10,
  maskValue: "[REDACTED]",
};
