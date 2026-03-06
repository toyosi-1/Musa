# Flutterwave IP Whitelisting Setup

## Issue
Electricity purchases are failing with error: "Transaction Failed - Please enable IP Whitelisting to access this service"

## Root Cause
Flutterwave requires server IP addresses to be whitelisted when making API calls from backend servers (like Netlify).

## Solution

### Step 1: Get Netlify's IP Addresses
Netlify uses dynamic IPs, but you can whitelist their IP ranges:
- Contact Netlify support for current IP ranges, OR
- Use a proxy service, OR
- Move bill payment API calls to client-side (recommended for now)

### Step 2: Whitelist IPs in Flutterwave Dashboard
1. Log in to https://dashboard.flutterwave.com
2. Go to **Settings** → **API Keys**
3. Scroll to **IP Whitelisting** section
4. Add the following IPs (if using client-side approach, add `0.0.0.0/0` temporarily):
   - For production: Add specific Netlify IPs
   - For testing: Add `0.0.0.0/0` (allows all IPs - NOT recommended for production)

### Step 3: Alternative Solution (Recommended)
Since Netlify uses dynamic IPs, the best approach is to:
1. Make Flutterwave API calls directly from the client (browser)
2. Only use server-side for validation and recording transactions
3. This way, the user's IP is used (not Netlify's server IP)

## Temporary Fix
To allow testing while you set up proper whitelisting:
1. Go to Flutterwave Dashboard → Settings → API Keys
2. Under IP Whitelisting, add: `0.0.0.0/0`
3. **WARNING**: This allows all IPs - only use for testing, remove after proper setup

## Long-term Solution
Implement client-side Flutterwave integration:
- Use Flutterwave's JavaScript SDK directly in the browser
- Server only validates and records completed transactions
- No IP whitelisting needed since requests come from user's browser
