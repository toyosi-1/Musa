# Head of Household (HoH) Security Strategy

## Problem
Currently, anyone can register as "resident" and immediately become a Head of Household by creating a household. This creates security risks:
- Unauthorized users can generate access codes
- No verification of actual residency
- Potential for abuse and unauthorized access

## Recommended Solutions (Choose One)

---

### **Option 1: Admin Approval for HoH Status (RECOMMENDED)** ⭐

**How it works:**
1. All users register as "Household Member" by default
2. Users request HoH status through the app
3. Admin reviews and approves/rejects HoH requests
4. Only approved HoH users can create households and access codes

**Pros:**
- ✅ Aligns with existing admin approval workflow
- ✅ Admin has full control over HoH privileges
- ✅ Simple to implement and manage
- ✅ Can verify residency during approval

**Cons:**
- ❌ Requires admin action for each HoH request
- ❌ Adds workload for admins

**Implementation:**
- Add `isHouseholdHead` field (defaults to `false`)
- Add "Request HoH Status" button in resident dashboard
- Add HoH approval queue in admin dashboard
- Block household/access code creation if not HoH

---

### **Option 2: Registration Codes/Tokens**

**How it works:**
1. Admin generates unique registration codes for verified residents
2. Users must enter a valid code during signup to become HoH
3. Each code can only be used once
4. Codes can be tied to specific estates

**Pros:**
- ✅ No admin approval needed after initial code generation
- ✅ Self-service for residents
- ✅ Can batch-create codes for new residents
- ✅ Codes can have expiration dates

**Cons:**
- ❌ Requires code distribution system
- ❌ Users might lose/share codes
- ❌ More complex to implement

**Implementation:**
- Create `registrationCodes` collection in database
- Add code input field on signup page
- Verify code validity and mark as used
- Tie codes to estates for automatic assignment

---

### **Option 3: Two-Tier Registration (Simplest)**

**How it works:**
1. Remove "resident" role during signup
2. All new users register as "Household Member" only
3. Admin assigns "Resident" role during approval
4. Only "Resident" role can create households

**Pros:**
- ✅ Simplest to implement
- ✅ Uses existing approval system
- ✅ Clear role hierarchy
- ✅ No additional UI needed

**Cons:**
- ❌ Requires admin to assign role manually
- ❌ Less flexible than Option 1

**Role Hierarchy:**
- `household_member` → Can join households, needs invitation
- `resident` → Can create households and access codes (HoH)
- `guard` → Verifies access codes
- `admin` → Full system control

---

## Recommended Implementation: **Option 1**

### Why Option 1 is Best:
1. Most aligned with current admin approval workflow
2. Gives admins granular control
3. Can verify residency documents before approval
4. Easy to revoke HoH status if needed
5. Clear audit trail of who approved whom

### Implementation Steps:

1. **Database Changes:**
   - Add `isHouseholdHead: boolean` to User type (default: false)
   - Add `hohRequestedAt: timestamp` field
   - Add `hohApprovedBy: adminUid` field

2. **User Interface:**
   - Resident Dashboard: "Request Head of Household Status" button
   - Shows current status (pending/approved/not requested)
   - Explains HoH benefits and requirements

3. **Admin Dashboard:**
   - New section: "HoH Approval Queue"
   - Shows users who requested HoH status
   - Admin can approve/reject with notes
   - View user's estate assignment and verification docs

4. **Access Control:**
   - Block `createHousehold()` if not HoH
   - Block `createAccessCode()` if not HoH
   - Show informative message directing to request HoH status

5. **Migration:**
   - Existing users with households → auto-approve as HoH
   - New users → must request HoH status

---

## Security Benefits

✅ **Prevents Unauthorized HoH Creation**
- Admin verification required before HoH privileges granted

✅ **Estate Verification**
- Admin can verify user actually lives in assigned estate

✅ **Audit Trail**
- Track who requested, when, who approved, and why

✅ **Revocable Privileges**
- Admin can demote HoH to member if needed

✅ **Prevents Account Sharing**
- Each HoH tied to verified resident

---

## Alternative: Hybrid Approach

Combine Option 1 + Option 2:
1. Admin approval required for HoH (Option 1)
2. Admin can also generate registration codes for bulk approval (Option 2)
3. Best of both worlds: manual + automated approval

---

## Next Steps

1. Review and choose option (recommend Option 1)
2. Implement database schema changes
3. Add HoH request UI for residents
4. Add HoH approval UI for admins
5. Update access control in household/access code services
6. Test thoroughly
7. Deploy with migration script for existing users
