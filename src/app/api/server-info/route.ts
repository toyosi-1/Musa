import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/requireAuth';

/**
 * GET /api/server-info
 *
 * Returns the server's current outbound IP address.
 * Use this to verify what IP Netlify is using when calling Flutterwave,
 * so you can confirm if the whitelisted IP is still correct.
 *
 * Admin-only: the IP is not strictly secret but diagnostic routes are a
 * reconnaissance surface and shouldn't be open to the public.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { roles: ['admin'] });
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse();
    throw err;
  }

  try {
    const [ipifyRes, ifconfigRes] = await Promise.allSettled([
      fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(5000) }),
      fetch('https://ifconfig.me/ip', { signal: AbortSignal.timeout(5000) }),
    ]);

    let serverIp: string | null = null;
    let source = '';

    if (ipifyRes.status === 'fulfilled' && ipifyRes.value.ok) {
      const data = await ipifyRes.value.json();
      serverIp = data.ip;
      source = 'ipify.org';
    } else if (ifconfigRes.status === 'fulfilled' && ifconfigRes.value.ok) {
      serverIp = (await ifconfigRes.value.text()).trim();
      source = 'ifconfig.me';
    }

    return NextResponse.json({
      serverIp,
      source,
      timestamp: new Date().toISOString(),
      note: serverIp
        ? `This is the outbound IP Netlify used for this request. Flutterwave must whitelist this IP for bill payments. NOTE: Netlify uses dynamic IPs — this IP may change between deployments or function cold starts.`
        : 'Could not determine server IP',
      action: serverIp
        ? `Log in to Flutterwave Dashboard → Settings → API → Whitelist IPs, and ensure ${serverIp} is listed.`
        : 'Try again or check Netlify function logs.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to determine server IP', detail: err?.message },
      { status: 500 }
    );
  }
}
