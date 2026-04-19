/**
 * Server-side authentication middleware for Next.js App Router API routes.
 *
 * Verifies the caller's Firebase ID token from the Authorization header and,
 * optionally, their role and approval status. Every mutating API route should
 * call `requireAuth` as its first operation.
 *
 * Example:
 *
 *   export async function POST(request: NextRequest) {
 *     try {
 *       const user = await requireAuth(request, { roles: ['admin', 'estate_admin'] });
 *       // ...user.uid is trusted from here on...
 *     } catch (err) {
 *       if (err instanceof AuthError) return err.toResponse();
 *       throw err;
 *     }
 *   }
 *
 * Or, more concisely, use the `withAuth` wrapper.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import { getAdminDatabase } from './firebaseAdmin';

export type Role = 'admin' | 'estate_admin' | 'resident' | 'guard' | 'operator' | 'head_of_house';

export interface AuthenticatedUser {
  /** Firebase UID — treat as the trusted identity. */
  uid: string;
  email?: string;
  role?: Role;
  estateId?: string;
  status?: 'pending' | 'approved' | 'rejected' | string;
  /** Full decoded token, for custom claim access if needed. */
  token: DecodedIdToken;
}

export interface RequireAuthOptions {
  /** If provided, user must have one of these roles. */
  roles?: Role[];
  /** If true, user.status must be 'approved'. Defaults to false. */
  requireApproved?: boolean;
}

/**
 * Thrown from requireAuth when the request cannot be authenticated or
 * authorized. Call `.toResponse()` to convert into a NextResponse.
 */
export class AuthError extends Error {
  constructor(
    public readonly status: 401 | 403,
    public readonly userMessage: string,
    public readonly code: 'missing_token' | 'invalid_token' | 'no_profile' | 'forbidden_role' | 'not_approved',
  ) {
    super(userMessage);
    this.name = 'AuthError';
  }

  toResponse(): NextResponse {
    return NextResponse.json(
      { success: false, message: this.userMessage, code: this.code },
      { status: this.status },
    );
  }
}

/**
 * Extract the Bearer token from the Authorization header.
 * Returns null if no token is present or the header is malformed.
 */
function extractBearerToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  return match[1].trim() || null;
}

/**
 * Verify the Firebase ID token in the Authorization header and load the
 * user's profile from RTDB. Throws AuthError on any failure.
 */
export async function requireAuth(
  request: NextRequest,
  opts: RequireAuthOptions = {},
): Promise<AuthenticatedUser> {
  const token = extractBearerToken(request);
  if (!token) {
    throw new AuthError(401, 'Authentication required. Please sign in.', 'missing_token');
  }

  // Verify token via Firebase Admin SDK. Any failure (expired, revoked,
  // forged) surfaces as an exception we map to 401.
  let decoded: DecodedIdToken;
  try {
    decoded = await getAuth().verifyIdToken(token, /* checkRevoked */ true);
  } catch (err) {
    throw new AuthError(
      401,
      'Your session is invalid or expired. Please sign in again.',
      'invalid_token',
    );
  }

  // Load the user's profile to check role and status. A missing profile means
  // the user was deleted out of the database but still has a valid auth
  // account — treat as unauthorized.
  let profile: { role?: Role; estateId?: string; status?: string } | null = null;
  try {
    const snap = await getAdminDatabase().ref(`users/${decoded.uid}`).once('value');
    profile = snap.val();
  } catch {
    // Fall through to the null-profile branch below.
  }
  if (!profile) {
    throw new AuthError(
      401,
      'Your user profile is missing. Please contact support.',
      'no_profile',
    );
  }

  // Role check — does not run when opts.roles is undefined / empty.
  if (opts.roles && opts.roles.length > 0) {
    if (!profile.role || !opts.roles.includes(profile.role)) {
      throw new AuthError(
        403,
        'You do not have permission to perform this action.',
        'forbidden_role',
      );
    }
  }

  if (opts.requireApproved && profile.status !== 'approved') {
    throw new AuthError(
      403,
      'Your account is pending approval. An admin must approve you first.',
      'not_approved',
    );
  }

  return {
    uid: decoded.uid,
    email: decoded.email,
    role: profile.role,
    estateId: profile.estateId,
    status: profile.status,
    token: decoded,
  };
}

/**
 * Higher-order wrapper that handles AuthError → response conversion for you.
 *
 *   export const POST = withAuth(async (request, user) => {
 *     return NextResponse.json({ uid: user.uid });
 *   }, { roles: ['admin'] });
 */
export function withAuth<TBody = unknown>(
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<NextResponse<TBody> | Response>,
  opts: RequireAuthOptions = {},
): (request: NextRequest) => Promise<Response> {
  return async (request: NextRequest) => {
    let user: AuthenticatedUser;
    try {
      user = await requireAuth(request, opts);
    } catch (err) {
      if (err instanceof AuthError) return err.toResponse();
      throw err;
    }
    return handler(request, user);
  };
}
