import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getUserFromAuthHeader } from "@/lib/auth";
import { problemJSON } from "@/lib/errors";

export interface ApiHandlerContext<P extends Record<string, string> = Record<string, string>> {
  req: NextRequest;
  params: P;
}

export type ApiRouteHandler<P extends Record<string, string> = Record<string, string>> = (
  req: NextRequest,
  context: { params: P }
) => Promise<Response>;

export class ApiError extends Error {
  public readonly status: number;
  public readonly title: string;
  public readonly extensions?: Record<string, unknown>;

  constructor(status: number, title: string, detail?: string, extensions?: Record<string, unknown>) {
    super(detail ?? title);
    this.status = status;
    this.title = title;
    this.extensions = extensions;
  }
}

export const withApiHandler = <P extends Record<string, string> = Record<string, string>>(
  handler: (context: ApiHandlerContext<P>) => Promise<Response>
): ApiRouteHandler<P> => {
  return async (req, context) => {
    try {
      const params = (context?.params ?? {}) as P;
      return await handler({ req, params });
    } catch (error) {
      return handleApiError(error);
    }
  };
};

export const handleApiError = (error: unknown): Response => {
  if (error instanceof ApiError) {
    return problemJSON(error.status, error.title, error.message, error.extensions);
  }

  if (error instanceof ZodError) {
    return problemJSON(400, "validation_error", error.message, { issues: error.issues });
  }

  console.error("API handler failed", error);
  return problemJSON(500, "internal_error", "Unexpected server error.");
};

export const okJson = <T>(payload: T, init?: ResponseInit) => NextResponse.json(payload, init);

export const createdJson = <T>(payload: T) => NextResponse.json(payload, { status: 201 });

export const noContent = () => new Response(null, { status: 204 });

export const requireUser = async (req: NextRequest) => {
  const user = await getUserFromAuthHeader(req);
  if (!user) {
    throw new ApiError(401, "unauthorized", "Authentication required.");
  }
  return user;
};

export const getOptionalUser = (req: NextRequest) => getUserFromAuthHeader(req);

export const clampNumber = (value: number, { min, max }: { min: number; max: number }) =>
  Math.min(Math.max(value, min), max);

export const parseNumberParam = (value: string | null) => {
  if (value == null) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const parseLimitParam = (
  value: string | null,
  defaults: { fallback?: number; min?: number; max?: number } = {}
) => {
  const fallback = defaults.fallback ?? 50;
  const min = defaults.min ?? 1;
  const max = defaults.max ?? 100;
  const parsed = parseNumberParam(value);
  if (parsed == null) {
    return clampNumber(fallback, { min, max });
  }
  return clampNumber(parsed, { min, max });
};
