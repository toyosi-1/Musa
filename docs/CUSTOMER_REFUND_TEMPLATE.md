# Customer Support - Failed Electricity Purchase

## Transaction Details (From Screenshot)
- **Transaction ID**: MUSA-PWR-1773484948069-jmLn826g
- **Payment Reference**: 00001726031410432858296614176
- **Amount Paid**: ₦510.00
- **Customer Paid**: ₦510.00
- **Transaction Fee**: ₦10
- **Amount Settled**: ₦499.25
- **Payment Method**: Bank Transfer
- **Date**: SAT MAR 14 2026
- **Customer**: Olatoyosi ajibola

## Issue
Payment was successful, but electricity token was not generated due to Flutterwave Bill Payment API configuration issue.

## Immediate Actions Required

### 1. Verify Transaction in Flutterwave Dashboard
1. Log into https://dashboard.flutterwave.com
2. Go to **Transactions**
3. Search for transaction ID: `1773484948069` or reference: `MUSA-PWR-1773484948069-jmLn826g`
4. Confirm payment status is "successful"

### 2. Check Customer's Meter Details
From your app database, retrieve:
- Meter number used for this purchase
- DisCo (electricity provider)
- Meter type (prepaid/postpaid)

### 3. Manual Token Purchase (Temporary Solution)
Since the API isn't working yet:

**Option A - Through Flutterwave Dashboard:**
1. Go to **Bills → Electricity**
2. Select the customer's DisCo
3. Enter their meter number
4. Purchase ₦500 worth of electricity
5. Copy the generated token
6. Send to customer via email/SMS

**Option B - Through Your Personal Account:**
1. Use your own Flutterwave account or bank app
2. Buy electricity for the customer's meter
3. Keep receipt for reimbursement
4. Send token to customer

### 4. Customer Communication Template

**Email Subject**: Your Electricity Purchase - Token Delivery

**Email Body**:
```
Dear Olatoyosi,

Thank you for your electricity purchase of ₦510.00 on March 14, 2026.

We experienced a temporary technical issue that delayed your token generation. We sincerely apologize for the inconvenience.

Your electricity token has been manually processed:

📱 Meter Number: [METER_NUMBER]
🔑 Token: [ELECTRICITY_TOKEN]
💡 Units: [UNITS] kWh
💰 Amount: ₦500

Transaction Reference: MUSA-PWR-1773484948069-jmLn826g

To load your token:
1. Dial *your DisCo's token code* on your meter
2. Enter the token above
3. Press enter/confirm

Your meter should be credited within a few minutes.

We're working to resolve the technical issue to prevent this from happening again. Thank you for your patience and understanding.

If you have any questions or issues loading the token, please reply to this email or contact us at [SUPPORT_EMAIL].

Best regards,
Musa Security Team
```

### 5. Refund Process (If Token Cannot Be Generated)

If you cannot manually purchase the token:

**Email Subject**: Refund for Electricity Purchase

**Email Body**:
```
Dear Olatoyosi,

We sincerely apologize, but we're unable to complete your electricity purchase at this time due to a technical issue with our payment provider.

We're processing a full refund of ₦510.00 to your account.

Transaction Details:
- Original Payment: ₦510.00
- Refund Amount: ₦510.00
- Transaction Reference: MUSA-PWR-1773484948069-jmLn826g
- Refund Timeline: 3-5 business days

The refund will be credited to the same account/card you used for payment.

We're working to resolve this issue and will notify you once electricity purchases are fully operational again.

Thank you for your understanding.

Best regards,
Musa Security Team
```

### 6. Process Refund in Flutterwave

1. Go to **Transactions** in Flutterwave dashboard
2. Find transaction: `MUSA-PWR-1773484948069-jmLn826g`
3. Click **Refund**
4. Enter refund amount: ₦510.00
5. Confirm refund
6. Keep screenshot for records

## Prevention (Long-term Fix)

Follow the steps in `FLUTTERWAVE_BILL_PAYMENT_SETUP.md`:
1. Contact Flutterwave to enable Bill Payment API
2. Verify API key permissions
3. Check account balance requirements
4. Set up IP whitelisting if needed

## Record Keeping

Create a spreadsheet to track failed transactions:

| Date | Transaction ID | Customer | Amount | Meter | Status | Resolution | Notes |
|------|---------------|----------|---------|-------|---------|------------|-------|
| 2026-03-14 | MUSA-PWR-1773484948069 | Olatoyosi ajibola | ₦510 | [METER] | Failed | [Refunded/Token Sent] | Bill API not enabled |

## Customer Compensation (Optional)

Consider offering:
- Free service fee on next purchase
- Small discount (₦50-100) on next transaction
- Priority support for future issues

This helps maintain customer trust and satisfaction.
