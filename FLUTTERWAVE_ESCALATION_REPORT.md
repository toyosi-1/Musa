# Flutterwave Bill Payment API - Escalation Report

## Merchant ID
[Your Flutterwave Merchant ID - find this in your Flutterwave Dashboard under Settings → Account Details]

## Business Name
Musa Security

## Environment
**Production** - This issue occurs in the Production environment.

## API Version
**Flutterwave API v3**

## API Endpoint
**POST** `https://api.flutterwave.com/v3/bills`

## Summary
Bill Payment API returns "Unauthorized" error when attempting to create electricity bill payments, despite successful payment verification. Payment collection works correctly, but bill creation fails, preventing electricity token generation for customers.

## Description

### Issue Overview
Our application successfully collects payments from customers using Flutterwave's payment widget, but when we attempt to create the corresponding electricity bill payment via the Bills API, we receive an "Unauthorized" error response.

### Steps to Reproduce
1. Customer initiates electricity purchase through our web application
2. Customer completes payment via Flutterwave Inline payment widget (₦510.00)
3. Payment verification succeeds via `GET /v3/transactions/{id}/verify`
4. Application attempts to create bill payment via `POST /v3/bills`
5. API returns "Unauthorized" error
6. Customer does not receive electricity token

### Expected Behavior
After successful payment verification, the `POST /v3/bills` endpoint should:
1. Accept the bill payment request
2. Process the electricity purchase with the DisCo
3. Return the electricity token in the response or via status polling

### Actual Behavior
The `POST /v3/bills` endpoint returns an "Unauthorized" error, preventing bill creation despite valid authentication credentials.

### Steps Already Taken
1. ✅ Verified `FLUTTERWAVE_SECRET_KEY` is correctly configured
2. ✅ Confirmed payment collection and verification endpoints work correctly
3. ✅ Tested bill categories endpoint (`GET /v3/bill-categories`) - works successfully
4. ✅ Reviewed Flutterwave dashboard - can manually purchase electricity through UI
5. ✅ Checked API key is active and not expired
6. ❌ Bill Payment API endpoint continues to return "Unauthorized"

### Suspected Root Cause
Bill Payment API feature may not be enabled on our merchant account, or our API key may not have the necessary permissions for bill payments.

## Identifiers

### Failed Transaction Example
- **Transaction ID**: `1773484948069`
- **Payment Reference**: `MUSA-PWR-1773484948069-jmLn826g`
- **Flutterwave Payment Reference**: `00001726031410432858296614176`
- **Amount**: ₦510.00
- **Date**: March 14, 2026
- **Payment Status**: Successful (verified)
- **Bill Creation Status**: Failed (Unauthorized)

### Customer Details
- **Customer Name**: Olatoyosi ajibola
- **Payment Method**: Bank Transfer
- **Transaction Amount**: ₦510.00
- **Transaction Fee**: ₦10.00
- **Amount Settled**: ₦499.25

## Example Request & Response

### Request 1: Payment Verification (SUCCESS)
```bash
curl -X GET \
  'https://api.flutterwave.com/v3/transactions/1773484948069/verify' \
  -H 'Authorization: Bearer FLWSECK-[REDACTED]' \
  -H 'Content-Type: application/json'
```

**Response** (Status: 200 OK):
```json
{
  "status": "success",
  "message": "Transaction verified successfully",
  "data": {
    "id": 1773484948069,
    "tx_ref": "MUSA-PWR-1773484948069-jmLn826g",
    "flw_ref": "00001726031410432858296614176",
    "amount": 510,
    "currency": "NGN",
    "charged_amount": 510,
    "status": "successful",
    "payment_type": "bank_transfer",
    "created_at": "2026-03-14T...",
    "customer": {
      "email": "customer@example.com",
      "phone_number": "080XXXXXXXX",
      "name": "Olatoyosi ajibola"
    }
  }
}
```

### Request 2: Bill Payment Creation (FAILED)
```bash
curl -X POST \
  'https://api.flutterwave.com/v3/bills' \
  -H 'Authorization: Bearer FLWSECK-[REDACTED]' \
  -H 'Content-Type: application/json' \
  -d '{
    "country": "NG",
    "customer_id": "1234567890",
    "amount": 500,
    "recurrence": "ONCE",
    "type": "PREPAID",
    "reference": "MUSA-PWR-1773484948069-1773484948069",
    "biller_name": "IKEDC"
  }'
```

**Response** (Status: 401 Unauthorized):
```json
{
  "status": "error",
  "message": "Unauthorized",
  "data": null
}
```

OR

```json
{
  "status": "error",
  "message": "This request cannot be processed. Please contact your account administrator",
  "data": null
}
```

### Request 3: Bill Categories (SUCCESS - for comparison)
```bash
curl -X GET \
  'https://api.flutterwave.com/v3/bill-categories?power=1&country=NG' \
  -H 'Authorization: Bearer FLWSECK-[REDACTED]' \
  -H 'Content-Type: application/json'
```

**Response** (Status: 200 OK):
```json
{
  "status": "success",
  "message": "Bill categories fetched",
  "data": [
    {
      "id": 1,
      "biller_code": "BIL099",
      "name": "IKEJA ELECTRIC PREPAID",
      "item_code": "AT099",
      "short_name": "IKEDC",
      "fee": 100,
      "commission": 0.5,
      "country": "NG"
    }
  ]
}
```

## Attachments

### Screenshot 1: Successful Payment Receipt
![Payment Success Email](attachment-payment-receipt.png)
- Shows successful payment of ₦510.00
- Transaction ID: MUSA-PWR-1773484948069-jmLn826g
- Payment Reference: 00001726031410432858296614176
- Customer: Olatoyosi ajibola
- Date: SAT MAR 14 2026

### Screenshot 2: Application Error
- User interface shows "Unauthorized" error after payment
- Payment was deducted but no electricity token generated

## Impact

### Business Impact
- **Customer Dissatisfaction**: Customers pay but don't receive electricity tokens
- **Manual Processing Required**: Each failed transaction requires manual intervention
- **Revenue Loss**: Unable to process electricity purchases automatically
- **Support Overhead**: Increased customer support tickets for failed transactions

### Current Workaround
Manually purchasing electricity through Flutterwave dashboard and sending tokens to customers via email, which is:
- Time-consuming
- Not scalable
- Poor customer experience

## Questions for Flutterwave Support

1. **Is Bill Payment API enabled on our merchant account?**
2. **Does our API key have the necessary permissions for bill payments?**
3. **Are there additional verification or activation steps required?**
4. **Is IP whitelisting required? If yes, what IPs should we whitelist?**
5. **Is there a minimum merchant balance requirement for bill payments?**
6. **Are there any account-level restrictions preventing bill payment API access?**

## Requested Resolution

1. Enable Bill Payment API access on our merchant account
2. Ensure our API key has bill payment permissions
3. Provide any additional setup instructions or requirements
4. Confirm if IP whitelisting is needed and provide instructions
5. Test credentials to verify bill payment functionality

## Contact Information

**Technical Contact**: [Your Name]
**Email**: [Your Email]
**Phone**: [Your Phone Number]
**Application URL**: https://your-musa-app.netlify.app
**Preferred Response Method**: Email

## Additional Notes

- We can successfully access read-only endpoints (bill categories, transaction verification)
- Manual bill purchases through Flutterwave dashboard work correctly
- Issue is specific to the Bill Payment API endpoint (`POST /v3/bills`)
- Urgent resolution needed as customers are affected

---

**Report Generated**: March 14, 2026
**Report Version**: 1.0
**Priority**: High - Customer-Impacting Issue
