# Estate Admin System Design

## Overview
Implement a hierarchical admin system where each estate has its own admin who handles approvals and HoH assignments for their estate only, reducing main admin workload while maintaining security.

---

## Role Structure

### 1. **Super Admin** (`role: 'admin'`)
**Permissions:**
- ✅ Full system access
- ✅ Create/manage estate admins
- ✅ Create/manage/lock estates
- ✅ View all users across all estates
- ✅ Approve/reject any user
- ✅ Override estate admin decisions
- ✅ Access security logs
- ✅ System-wide analytics

**Use Cases:**
- Emergency interventions
- System oversight
- Creating new estates and estate admins
- Handling cross-estate issues

---

### 2. **Estate Admin** (`role: 'estate_admin'`)
**Permissions:**
- ✅ View pending users for THEIR estate only
- ✅ Approve/reject users in their estate
- ✅ Assign HoH status during approval
- ✅ View/manage users in their estate
- ✅ View estate statistics
- ❌ Cannot access other estates
- ❌ Cannot create/delete estates
- ❌ Cannot modify estate admins
- ❌ Cannot access system-wide data

**Use Cases:**
- Daily user approvals for their estate
- HoH assignment for residents
- Managing residents and guards in their estate

**Key Field:**
```typescript
{
  role: 'estate_admin',
  estateId: 'estate-123', // LOCKED to this estate
  canApproveUsers: true,
  canAssignHoH: true
}
```

---

## Database Schema Changes

### User Type Extension
```typescript
type UserRole = 'admin' | 'estate_admin' | 'resident' | 'guard';

interface User {
  uid: string;
  email: string;
  role: UserRole;
  estateId?: string; // Required for estate_admin, resident, guard
  isHouseholdHead?: boolean; // For residents
  status: 'pending' | 'approved' | 'rejected';
  
  // New fields for estate_admin
  canApproveUsers?: boolean; // For estate_admin
  canAssignHoH?: boolean; // For estate_admin
  createdBy?: string; // Track who created this user
  approvedBy?: string; // Track who approved
  
  // Existing fields
  createdAt: number;
  approvedAt?: number;
}
```

### Database Rules
```json
{
  "users": {
    "$uid": {
      ".read": "
        auth != null && (
          auth.uid === $uid || 
          root.child('users').child(auth.uid).child('role').val() === 'admin' ||
          (
            root.child('users').child(auth.uid).child('role').val() === 'estate_admin' &&
            root.child('users').child(auth.uid).child('estateId').val() === data.child('estateId').val()
          )
        )
      ",
      "status": {
        ".write": "
          auth != null && (
            root.child('users').child(auth.uid).child('role').val() === 'admin' ||
            (
              root.child('users').child(auth.uid).child('role').val() === 'estate_admin' &&
              root.child('users').child(auth.uid).child('estateId').val() === newData.parent().child('estateId').val()
            )
          )
        "
      }
    }
  }
}
```

---

## UI Changes

### 1. **Super Admin Dashboard**
**New Section: "Estate Admins"**
- List all estate admins
- Create new estate admin (assign to estate)
- Edit/remove estate admin
- View estate admin activity

**Enhanced Pending Approvals:**
- Show all pending users (all estates)
- Filter by estate
- Can override any decision

---

### 2. **Estate Admin Dashboard**
**Simplified Interface:**
- See only THEIR estate's data
- Pending approvals for their estate only
- User management for their estate only
- Estate statistics

**Pending Approvals Page:**
- Auto-filtered to their estate
- Approve/reject users
- Assign HoH checkbox during approval
- Cannot see other estates' pending users

**Users Page:**
- List users in their estate only
- Manage HoH status
- View household information

**NO ACCESS TO:**
- Estate creation/deletion
- Other estates' data
- Estate admin management
- System settings

---

### 3. **Login/Role Detection**
Update dashboard routing to detect role:
```typescript
if (user.role === 'admin') {
  // Full admin dashboard
  router.push('/admin/dashboard');
} else if (user.role === 'estate_admin') {
  // Estate admin dashboard (scoped)
  router.push('/estate-admin/dashboard');
} else if (user.role === 'resident') {
  router.push('/dashboard');
} else if (user.role === 'guard') {
  router.push('/dashboard');
}
```

---

## Implementation Steps

### Step 1: Database & Types
- [x] Update User type to include estate_admin role
- [ ] Update database rules for estate_admin permissions
- [ ] Add estate_admin specific fields

### Step 2: Services
- [ ] Create `estateAdminService.ts`:
  - `createEstateAdmin(email, estateId, createdBy)`
  - `listEstateAdmins()`
  - `removeEstateAdmin(uid)`
  - `getEstateAdminPermissions(uid)`

- [ ] Update `userService.ts`:
  - `approveUserWithHoH(uid, estateId, isHoH, approvedBy)`
  - Add estate filtering for estate_admin role

### Step 3: Estate Admin UI
- [ ] Create `/src/app/estate-admin/` directory
- [ ] Create estate admin dashboard (scoped to their estate)
- [ ] Create estate admin pending approvals (filtered)
- [ ] Create estate admin users page (filtered)
- [ ] Add HoH checkbox to approval UI

### Step 4: Super Admin UI Enhancements
- [ ] Add "Estate Admins" management page
- [ ] Add "Create Estate Admin" form
- [ ] Add estate admin activity logs
- [ ] Keep existing full access

### Step 5: Access Control
- [ ] Update StatusGuard to recognize estate_admin
- [ ] Add EstateAdminGuard component (checks estateId match)
- [ ] Update all API calls to enforce estate boundaries

### Step 6: Migration
- [ ] Existing admin remains as super admin
- [ ] Create first estate admin for testing
- [ ] Document how to create estate admins

---

## Security Features

### Estate Isolation
✅ Estate admins can ONLY see/manage users in their estate
✅ Database rules enforce estate boundaries
✅ UI filters automatically by estate

### Permission Hierarchy
✅ Super admin > Estate admin > Resident/Guard
✅ Super admin can override any estate admin decision
✅ Estate admins cannot elevate their own permissions

### Audit Trail
✅ Track who created each user (`createdBy`)
✅ Track who approved each user (`approvedBy`)
✅ Security logs for admin actions

---

## User Flow Examples

### Creating Estate Admin (Super Admin)
1. Super admin goes to "Estate Admins" page
2. Click "Create Estate Admin"
3. Enter email, select estate, confirm
4. System creates account with:
   - `role: 'estate_admin'`
   - `estateId: selected_estate`
   - `status: 'approved'`
5. Email sent to estate admin with login credentials

### Approving User with HoH (Estate Admin)
1. Estate admin logs in → sees their dashboard
2. Goes to "Pending Approvals"
3. Sees only pending users for their estate
4. For each user:
   - Select estate (pre-filtered to their estate)
   - Check "Head of Household" if applicable
   - Click "Approve"
5. User gets:
   - `status: 'approved'`
   - `estateId: estate_admin's_estate`
   - `isHouseholdHead: true/false`
   - `approvedBy: estate_admin_uid`

---

## Benefits

✅ **Scales Easily**
- Each estate manages itself
- No bottleneck at super admin level

✅ **Reduces Admin Workload**
- Super admin only handles exceptions
- Daily approvals delegated to estates

✅ **Maintains Security**
- Estate admins can't cross boundaries
- Super admin retains full control

✅ **Clear Responsibility**
- Each estate accountable for their approvals
- Audit trail shows who approved whom

✅ **Seamless for Users**
- Faster approvals (estate admin nearby)
- No change to resident/guard experience

---

## Next: Implementation
Ready to build this system in the following order:
1. Update types and database schema
2. Create estate admin service layer
3. Build estate admin UI (dashboard, approvals, users)
4. Enhance super admin UI (estate admin management)
5. Update routing and guards
6. Test thoroughly
7. Deploy with migration guide
