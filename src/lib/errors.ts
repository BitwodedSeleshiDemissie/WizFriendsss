import { NextResponse } from "next/server";

export interface ProblemDetails {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  [key: string]: unknown;
}

export const buildProblemDetails = (
  status: number,
  title: string,
  detail?: string,
  extensions?: Record<string, unknown>
): ProblemDetails => ({
  type: "about:blank",
  title,
  status,
  ...(detail ? { detail } : {}),
  ...(extensions ?? {}),
});

export const problemJSON = (
  status: number,
  title: string,
  detail?: string,
  extensions?: Record<string, unknown>
) => NextResponse.json(buildProblemDetails(status, title, detail, extensions), { status });

export const handleRouteError = (error: unknown) => {
  if (error instanceof Error) {
    return problemJSON(400, "bad_request", error.message);
  }

  if (typeof error === "string") {
    return problemJSON(400, "bad_request", error);
  }

  return problemJSON(500, "internal_error", "Unexpected server error.");
};
