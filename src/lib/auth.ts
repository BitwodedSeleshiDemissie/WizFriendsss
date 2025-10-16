import type { NextRequest } from "next/server";
import { adminAuth, adminDb } from "./firebaseAdmin";
import { problemJSON } from "./errors";

export type AppRole = "user" | "moderator" | "customer_service" | "admin";

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  role: AppRole;
}

const ROLE_ORDER: AppRole[] = ["user", "moderator", "customer_service", "admin"];

const normalizeAuthHeader = (authHeader: string | null) => {
  if (!authHeader) {
    return null;
  }

  const value = authHeader.trim();
  if (!value.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return value.slice(7).trim();
};

const resolveRoleFromClaims = (claims: Record<string, unknown> | undefined): AppRole | null => {
  if (!claims) {
    return null;
  }
  const role = claims.role;
  if (role === "user" || role === "moderator" || role === "customer_service" || role === "admin") {
    return role;
  }
  return null;
};

const fetchRoleFromProfile = async (uid: string): Promise<AppRole | null> => {
  const doc = await adminDb.collection("users").doc(uid).get();
  const data = doc.data();
  if (!data) {
    return null;
  }
  const role = data.role;
  if (role === "user" || role === "moderator" || role === "customer_service" || role === "admin") {
    return role;
  }
  return null;
};

export async function getUserFromAuthHeader(
  reqOrHeader: NextRequest | Request | string | null | undefined
): Promise<AuthenticatedUser | null> {
  try {
    let headerValue: string | null = null;
    if (typeof reqOrHeader === "string") {
      headerValue = reqOrHeader;
    } else if (reqOrHeader && "headers" in reqOrHeader) {
      headerValue = (reqOrHeader as Request).headers.get("authorization");
    }

    const token = normalizeAuthHeader(headerValue);
    if (!token) {
      return null;
    }

    const decoded = await adminAuth.verifyIdToken(token, true);
    const role =
      resolveRoleFromClaims(decoded as Record<string, unknown>) ?? (await fetchRoleFromProfile(decoded.uid)) ?? "user";

    return {
      uid: decoded.uid,
      email: decoded.email ?? undefined,
      role,
    };
  } catch (error) {
    console.warn("Failed to verify auth token:", error);
    return null;
  }
}
export const requireRole = (user: AuthenticatedUser, allowed: AppRole[] | AppRole) => {
  const allowedRoles = Array.isArray(allowed) ? allowed : [allowed];
  if (allowedRoles.includes(user.role) || user.role === "admin") {
    return true;
  }
  throw problemJSON(403, "forbidden", "You do not have permission to perform this action.");
};

export const roleAtLeast = (user: AuthenticatedUser, minimum: AppRole) => {
  return ROLE_ORDER.indexOf(user.role) >= ROLE_ORDER.indexOf(minimum);
};
