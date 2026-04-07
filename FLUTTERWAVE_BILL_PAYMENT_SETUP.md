# Flutterwave Bill Payment Setup Guide

## Current Issue
- ✅ Payment collection works (₦510 was successfully charged)
- ❌ Bill creation fails after payment (no electricity token generated)
- Error: "Unauthorized" when calling Flutterwave Bills API

## Root Cause
Flutterwave's **Bill Payment API** requires special activation and configuration that's separate from regular payment collection.

## Steps to Fix

### 1. Enable Bill Payments API Access
Your Flutterwave account needs Bill Payment API enabled:

1. **Log into Flutterwave Dashboard**: https://dashboard.flutterwave.com
2. **Contact Flutterwave Support**:
   - Email: developers@flutterwavego.com or hi@flutterwavego.com
   - Subject: "Enable Bill Payment API for my account"
   - Message template:
   ```
   Hello Flutterwave Team,
   
   I need to enable the Bill Payment API for my account to allow electricity purchases through my application.
   
   Account Email: [your email]
   Business Name: Musa Security
   Use Case: Electricity bill payments (prepaid/postpaid meters)
   
   Please activate Bill Payment API access and provide any additional setup instructions.
   
   Thank you!
   ```

### 2. Verify API Key Permissions
Once bill payments are enabled, verify your API key has the right permissions:

1. Go to **Settings → API Keys** in your Flutterwave dashboard
2. Check that your **Secret Key** has "Bill Payments" permission
3. If not, regenerate the key with bill payment access enabled

### 3. Check Account Balance
Bill payments debit from your **Flutterwave merchant balance** (not the customer's payment):

1. Go to **Wallet/Balance** in your dashboard
2. Ensure you have sufficient balance to cover electricity purchases
3. Top up if needed

### 4. Whitelist Server IPs (If Required)
After bill payments are enabled, Flutterwave may require IP whitelisting:

1. Go to **Settings → API Settings → Whitelist IPs**
2. If you see this option, you'll need to add Netlify's IP ranges:
   - Contact Netlify support for their current IP ranges
   - OR use a proxy service with a static IP (Google Cloud Function, AWS Lambda with Elastic IP)

## Alternative Solution (Temporary)
While waiting for Flutterwave to enable bill payments, you can:

1. **Manual Processing**: When a payment succeeds, manually purchase the electricity through Flutterwave dashboard and send the token to the customer
2. **Use a Different Provider**: Consider using Paystack Bills API or Interswitch QuickTeller as alternatives

## Testing After Setup
Once Flutterwave confirms bill payments are enabled:

1. Visit: `https://your-app.netlify.app/api/utilities/test-bill-payment`
2. Check the response for any remaining issues
3. Try a small test purchase (₦500-1000)

## Current Workaround
For customers who already paid but didn't get tokens:

1. Check Flutterwave dashboard for the transaction: `MUSA-PWR-1773484948069-jmLn826g`
2. Manually purchase electricity for that meter number
3. Send the token to the customer via email/SMS
4. Keep a record for refund if needed

## Questions to Ask Flutterwave Support
1. Is Bill Payment API enabled on my account?
2. Does my API key have bill payment permissions?
3. Do I need IP whitelisting? If yes, what IPs should I whitelist?
4. Is there a minimum balance requirement?
5. Are there any additional verification steps needed?

## Next Steps
1. ✅ Contact Flutterwave support (use email template above)
2. ⏳ Wait for confirmation (usually 1-3 business days)
3. ✅ Update API key if needed
4. ✅ Test the diagnostic endpoint
5. ✅ Try a small test purchase
