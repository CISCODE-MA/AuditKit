/**
 * AuditInterceptor - intercepts requests and creates audit events.
 *
 * Key principles:
 * - Passive observation: never modifies req or res
 * - Fail-safe: audit failures don't affect the request
 * - Performance: uses RxJS tap to audit after response is sent
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Optional,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

import type { AuditConfig } from "../core/config";

import { AUDIT_CONFIG } from "./constants";
import { AuditService } from "./service";

interface RequestLike {
  method?: string;
  url?: string;
  path?: string;
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
  user?: { id?: string; _id?: string; sub?: string } | string;
  body?: Record<string, unknown>;
}

interface ResponseLike {
  statusCode?: number;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly _auditService: AuditService,
    // eslint-disable-next-line no-unused-vars
    @Optional() @Inject(AUDIT_CONFIG) private readonly _auditConfig?: AuditConfig,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startTime = Date.now();
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<RequestLike>();
    const response = ctx.getResponse<ResponseLike>();

    const method = request.method || "UNKNOWN";
    const path = request.path || request.url || "/";

    // Check if this request should be audited
    if (!this._auditService.shouldAudit(method, path)) {
      return next.handle();
    }

    // Extract request context (read-only)
    const actor = this.extractActor(request);
    const ip = request.ip;
    const userAgent = this.getHeader(request, "user-agent");
    const correlationId =
      this.getHeader(request, "x-request-id") || this.getHeader(request, "x-correlation-id");
    const action = this.getAction(context);

    // Capture request body for diff (clone to avoid mutation)
    const requestBody = request.body ? JSON.parse(JSON.stringify(request.body)) : undefined;

    return next.handle().pipe(
      tap({
        next: (responseBody) => {
          // Audit on success - uses tap to run after response
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode || 200;

          // Fire and forget - don't await
          void this._auditService.audit({
            actor,
            method,
            path,
            action,
            statusCode,
            duration,
            ip,
            userAgent,
            correlationId,
            before: requestBody,
            after: responseBody as Record<string, unknown>,
          });
        },
        error: (error) => {
          // Audit on error
          const duration = Date.now() - startTime;
          const statusCode = error?.status || error?.statusCode || 500;

          void this._auditService.audit({
            actor,
            method,
            path,
            action,
            statusCode,
            duration,
            ip,
            userAgent,
            correlationId,
            before: requestBody,
            error: error?.message || "Unknown error",
          });
        },
      }),
    );
  }

  /**
   * Extract actor from request (user ID or 'GUEST').
   */
  private extractActor(request: RequestLike): string {
    // Use custom extractor if provided
    if (this._auditConfig?.actorExtractor) {
      try {
        const result = this._auditConfig.actorExtractor(request);
        if (typeof result === "string") return result;
        // Handle promise - fallback to sync extraction
      } catch {
        // Fall through to default extraction
      }
    }

    // Default extraction from common auth patterns
    const user = request.user;
    if (!user) return "GUEST";

    if (typeof user === "string") return user;
    return user.id || user._id?.toString() || user.sub || "GUEST";
  }

  /**
   * Get controller and handler name.
   */
  private getAction(context: ExecutionContext): string {
    const controller = context.getClass().name;
    const handler = context.getHandler().name;
    return `${controller}.${handler}`;
  }

  /**
   * Safely get a header value.
   */
  private getHeader(request: RequestLike, name: string): string | undefined {
    const value = request.headers?.[name];
    if (Array.isArray(value)) return value[0];
    return value;
  }
}
