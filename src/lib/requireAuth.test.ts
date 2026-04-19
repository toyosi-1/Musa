import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────
// We mock before importing requireAuth so the mocks are in place when the
// module is first evaluated.
const verifyIdToken = vi.fn();
const once = vi.fn();
const refMock = vi.fn(() => ({ once }));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ verifyIdToken }),
}));

vi.mock('./firebaseAdmin', () => ({
  getAdminDatabase: () => ({ ref: refMock }),
}));

// Import after mocks are registered.
import { requireAuth, AuthError, withAuth } from './requireAuth';

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(new Request('http://localhost/api/test', {
    method: 'POST',
    headers,
  }));
}

function mockProfile(profile: Record<string, unknown> | null): void {
  once.mockResolvedValueOnce({ val: () => profile });
}

describe('requireAuth', () => {
  beforeEach(() => {
    verifyIdToken.mockReset();
    once.mockReset();
    refMock.mockClear();
  });

  it('throws AuthError(missing_token) when no Authorization header is present', async () => {
    const req = makeRequest();
    await expect(requireAuth(req)).rejects.toMatchObject({
      status: 401,
      code: 'missing_token',
    });
  });

  it('throws AuthError(missing_token) when header is malformed', async () => {
    const req = makeRequest({ authorization: 'NotBearer xyz' });
    await expect(requireAuth(req)).rejects.toMatchObject({ code: 'missing_token' });
  });

  it('throws AuthError(invalid_token) when Firebase rejects the token', async () => {
    verifyIdToken.mockRejectedValueOnce(new Error('expired'));
    const req = makeRequest({ authorization: 'Bearer bad.token.here' });
    await expect(requireAuth(req)).rejects.toMatchObject({
      status: 401,
      code: 'invalid_token',
    });
  });

  it('throws AuthError(no_profile) when the user exists in Auth but not in RTDB', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'u1', email: 'a@b.co' });
    mockProfile(null);
    const req = makeRequest({ authorization: 'Bearer valid.token.here' });
    await expect(requireAuth(req)).rejects.toMatchObject({
      status: 401,
      code: 'no_profile',
    });
  });

  it('returns the authenticated user when token + profile are valid', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'u1', email: 'a@b.co' });
    mockProfile({ role: 'resident', estateId: 'e1', status: 'approved' });
    const req = makeRequest({ authorization: 'Bearer valid' });
    const user = await requireAuth(req);
    expect(user.uid).toBe('u1');
    expect(user.email).toBe('a@b.co');
    expect(user.role).toBe('resident');
    expect(user.estateId).toBe('e1');
    expect(user.status).toBe('approved');
  });

  it('accepts the lowercase "authorization" header too', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'u1' });
    mockProfile({ role: 'admin' });
    const req = makeRequest({ authorization: 'bearer sometoken' });
    const user = await requireAuth(req);
    expect(user.uid).toBe('u1');
  });

  it('enforces role restrictions when opts.roles is provided', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'u1' });
    mockProfile({ role: 'resident' });
    const req = makeRequest({ authorization: 'Bearer x' });
    await expect(requireAuth(req, { roles: ['admin', 'estate_admin'] })).rejects.toMatchObject({
      status: 403,
      code: 'forbidden_role',
    });
  });

  it('allows a matching role', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'u1' });
    mockProfile({ role: 'admin' });
    const req = makeRequest({ authorization: 'Bearer x' });
    const user = await requireAuth(req, { roles: ['admin', 'estate_admin'] });
    expect(user.role).toBe('admin');
  });

  it('blocks unapproved users when requireApproved is true', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'u1' });
    mockProfile({ role: 'resident', status: 'pending' });
    const req = makeRequest({ authorization: 'Bearer x' });
    await expect(requireAuth(req, { requireApproved: true })).rejects.toMatchObject({
      status: 403,
      code: 'not_approved',
    });
  });

  it('allows approved users when requireApproved is true', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'u1' });
    mockProfile({ role: 'resident', status: 'approved' });
    const req = makeRequest({ authorization: 'Bearer x' });
    const user = await requireAuth(req, { requireApproved: true });
    expect(user.status).toBe('approved');
  });
});

describe('AuthError.toResponse', () => {
  it('serialises to a JSON response with the right status', async () => {
    const err = new AuthError(403, 'Nope', 'forbidden_role');
    const res = err.toResponse();
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Nope');
    expect(body.code).toBe('forbidden_role');
  });
});

describe('withAuth', () => {
  beforeEach(() => {
    verifyIdToken.mockReset();
    once.mockReset();
  });

  it('invokes the handler with the authenticated user on success', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'u1' });
    mockProfile({ role: 'admin' });
    const handler = vi.fn(async (_req, user) => {
      return new Response(JSON.stringify({ uid: user.uid }));
    });
    const wrapped = withAuth(handler);
    const req = makeRequest({ authorization: 'Bearer x' });
    const res = await wrapped(req);
    expect(handler).toHaveBeenCalledOnce();
    expect(res.status).toBe(200);
  });

  it('returns a 401 response without invoking the handler on auth failure', async () => {
    const handler = vi.fn();
    const wrapped = withAuth(handler);
    const req = makeRequest(); // no auth header
    const res = await wrapped(req);
    expect(handler).not.toHaveBeenCalled();
    expect(res.status).toBe(401);
  });
});
