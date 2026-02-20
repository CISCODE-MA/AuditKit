// Public API - all exports must go through here

// Core types and utilities (framework-free)
export * from "./core";

// NestJS integration
export * from "./nest";

// Expose ConsoleAuditStorage for standalone usage or as fallback reference
export { ConsoleAuditStorage } from "./infra/console.storage";
