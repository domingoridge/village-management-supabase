## # Village Management Backend - API Documentation

## Overview

This document provides comprehensive API documentation for the Village Management multi-tenant backend system built on Supabase.

## Table of Contents

- [Authentication](#authentication)
- [Tenant Management](#tenant-management)
- [User Management](#user-management)
- [Household Management](#household-management)
- [RBAC & Permissions](#rbac--permissions)
- [RPC Functions](#rpc-functions)
- [Error Handling](#error-handling)

---

## Authentication

### JWT Token Structure

All authenticated requests require a valid JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

### JWT Claims

The JWT contains custom claims in `app_metadata`:

```json
{
  "app_metadata": {
    "tenant_id": "uuid",
    "role_id": "uuid"
  },
  "user_metadata": {
    "first_name": "string",
    "last_name": "string"
  }
}
```

### Authentication Flow

1. **Sign Up**: Create user via Supabase Auth
2. **Sign In**: Get JWT token
3. **Assign to Tenant**: Use `assign_user_to_tenant` RPC
4. **Switch Context**: Use `switch_tenant_context` RPC to set tenant
5. **Refresh Token**: Token expires after 1 hour (configurable)

---

## Tenant Management

### Get User Tenants

Retrieves all tenants accessible to the current user.

**RPC Function**: `get_user_tenants()`

**Returns**:
```typescript
Array<{
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  tenant_status: 'active' | 'trial' | 'suspended' | 'cancelled';
  role_id: string;
  role_code: string;
  role_name: string;
  is_active: boolean;
  joined_at: string; // ISO datetime
}>
```

**Example**:
```typescript
const { data, error } = await supabase.rpc('get_user_tenants');
```

**Response**:
```json
[
  {
    "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
    "tenant_name": "Sunset Village",
    "tenant_slug": "sunset-village",
    "tenant_status": "active",
    "role_id": "660e8400-e29b-41d4-a716-446655440000",
    "role_code": "admin-head",
    "role_name": "Head Administrator",
    "is_active": true,
    "joined_at": "2025-10-09T10:30:00Z"
  }
]
```

---

### Switch Tenant Context

Switches the active tenant context for multi-tenant users.

**RPC Function**: `switch_tenant_context(p_tenant_id: UUID)`

**Parameters**:
- `p_tenant_id` (UUID): Target tenant ID

**Returns**:
```typescript
{
  success: boolean;
  tenant_id?: string;
  role_id?: string;
  role_code?: string;
  message?: string;
  error?: string;
}
```

**Example**:
```typescript
const { data, error } = await supabase.rpc('switch_tenant_context', {
  p_tenant_id: '550e8400-e29b-41d4-a716-446655440000'
});
```

**Success Response**:
```json
{
  "success": true,
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "role_id": "660e8400-e29b-41d4-a716-446655440000",
  "role_code": "admin-head",
  "message": "Tenant context switched successfully. Please refresh your JWT token."
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "User does not have access to this tenant"
}
```

---

### Create Tenant

Creates a new tenant organization. Requires superadmin role.

**Table**: `tenant`

**Insert**:
```typescript
const { data, error } = await supabase
  .from('tenant')
  .insert({
    name: 'Sunset Village',
    slug: 'sunset-village',
    subscription_plan: { tier: 'basic' },
    status: 'trial'
  })
  .select()
  .single();
```

**Validation** (Zod):
```typescript
import { CreateTenantSchema } from '@/validation';

const validated = CreateTenantSchema.parse({
  name: 'Sunset Village',
  slug: 'sunset-village'
});
```

---

## User Management

### Assign User to Tenant

Assigns a user to a tenant with a specific role.

**RPC Function**: `assign_user_to_tenant(p_user_profile_id, p_tenant_id, p_role_id, p_permissions?)`

**Parameters**:
- `p_user_profile_id` (UUID): User profile ID
- `p_tenant_id` (UUID): Target tenant ID
- `p_role_id` (UUID): Role ID to assign
- `p_permissions` (JSON, optional): User-specific permission overrides

**Returns**:
```typescript
{
  success: boolean;
  tenant_user_id?: string;
  tenant_id?: string;
  user_profile_id?: string;
  role_id?: string;
  role_code?: string;
  message?: string;
  error?: string;
}
```

**Example**:
```typescript
const { data, error } = await supabase.rpc('assign_user_to_tenant', {
  p_user_profile_id: 'user-profile-uuid',
  p_tenant_id: 'tenant-uuid',
  p_role_id: 'role-uuid',
  p_permissions: { view_reports: true }
});
```

**Success Response**:
```json
{
  "success": true,
  "tenant_user_id": "770e8400-e29b-41d4-a716-446655440000",
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_profile_id": "880e8400-e29b-41d4-a716-446655440000",
  "role_id": "660e8400-e29b-41d4-a716-446655440000",
  "role_code": "household-head",
  "message": "User successfully assigned to tenant"
}
```

---

### Get User Profile

Retrieves the current user's profile information.

**Table**: `user_profile`

**Query**:
```typescript
const { data, error } = await supabase
  .from('user_profile')
  .select('*')
  .eq('auth_user_id', user.id)
  .single();
```

**Response**:
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440000",
  "auth_user_id": "990e8400-e29b-41d4-a716-446655440000",
  "first_name": "John",
  "last_name": "Doe",
  "contact_number": "+1234567890",
  "preferences": {
    "language": "en",
    "theme": "auto"
  },
  "created_at": "2025-10-09T10:00:00Z",
  "updated_at": "2025-10-09T10:00:00Z"
}
```

---

## Household Management

### Create Household

Creates a new household in the current tenant. Requires admin-head or admin-officers role.

**Table**: `household`

**Insert**:
```typescript
const { data, error } = await supabase
  .from('household')
  .insert({
    tenant_id: 'current-tenant-uuid',
    address: '123 Main Street',
    lot_number: 'LOT-001',
    block_number: 'BLOCK-A',
    sticker_quota: 2,
    status: 'active'
  })
  .select()
  .single();
```

**Validation** (Zod):
```typescript
import { CreateHouseholdSchema } from '@/validation';

const validated = CreateHouseholdSchema.parse({
  tenant_id: 'tenant-uuid',
  address: '123 Main Street',
  sticker_quota: 2
});
```

---

### List Households

Lists all households in the current tenant.

**Table**: `household`

**Query**:
```typescript
const { data, error } = await supabase
  .from('household')
  .select('*')
  .eq('status', 'active')
  .order('created_at', { ascending: false });
```

**Filter Examples**:
```typescript
// Filter by block
.eq('block_number', 'BLOCK-A')

// Search by address
.ilike('address', '%Main Street%')

// Filter by status
.eq('status', 'active')
```

---

### Add Resident

Adds a user to a household as a resident.

**Table**: `resident`

**Insert**:
```typescript
const { data, error } = await supabase
  .from('resident')
  .insert({
    household_id: 'household-uuid',
    tenant_user_id: 'tenant-user-uuid',
    has_visiting_rights: true,
    has_signatory_rights: false
  })
  .select()
  .single();
```

**Validation** (Zod):
```typescript
import { AddResidentSchema } from '@/validation';

const validated = AddResidentSchema.parse({
  household_id: 'household-uuid',
  tenant_user_id: 'tenant-user-uuid',
  has_visiting_rights: true
});
```

---

## RBAC & Permissions

### Check User Permission

Checks if the current user has a specific permission.

**RPC Function**: `check_user_permission(p_permission_key: string)`

**Parameters**:
- `p_permission_key` (string): Permission key to check

**Returns**: `boolean`

**Example**:
```typescript
const { data: hasPermission, error } = await supabase.rpc('check_user_permission', {
  p_permission_key: 'manage_users'
});
```

---

### Check Multiple Permissions

Checks multiple permissions at once.

**RPC Function**: `check_user_permissions(p_permission_keys: string[])`

**Parameters**:
- `p_permission_keys` (string[]): Array of permission keys

**Returns**:
```typescript
Array<{
  permission_key: string;
  has_permission: boolean;
}>
```

**Example**:
```typescript
const { data, error } = await supabase.rpc('check_user_permissions', {
  p_permission_keys: ['manage_users', 'view_reports', 'manage_households']
});
```

**Response**:
```json
[
  { "permission_key": "manage_users", "has_permission": true },
  { "permission_key": "view_reports", "has_permission": true },
  { "permission_key": "manage_households", "has_permission": false }
]
```

---

### Get All User Permissions

Retrieves all permissions for the current user (merged role + overrides).

**RPC Function**: `get_current_user_permissions()`

**Returns**: `JSON` (permissions object)

**Example**:
```typescript
const { data: permissions, error } = await supabase.rpc('get_current_user_permissions');
```

**Response**:
```json
{
  "manage_users": true,
  "view_reports": true,
  "manage_households": true,
  "view_gate_logs": false,
  "custom_permission": true
}
```

---

### Roles

**Predefined Roles** (hierarchy 1-6):

| Code | Name | Scope | Hierarchy | Description |
|------|------|-------|-----------|-------------|
| `superadmin` | Super Administrator | platform | 1 | Full platform access |
| `admin-head` | Head Administrator | tenant | 2 | Full tenant access |
| `admin-officers` | Administrator Officers | tenant | 3 | Tenant management |
| `security-head` | Security Head | security | 3 | Security operations |
| `household-head` | Household Head | household | 4 | Household management |
| `security-officer` | Security Officer | security | 4 | Gate operations |
| `household-member` | Household Member | household | 5 | Basic household access |
| `household-beneficial-user` | Beneficial User | household | 6 | Read-only access |

---

## RPC Functions

### Validate Current Session

Validates the current user's session and returns comprehensive context.

**RPC Function**: `validate_current_session()`

**Returns**:
```typescript
{
  valid: boolean;
  session?: {
    auth_user_id: string;
    user_profile_id: string;
    tenant_user_id: string;
  };
  tenant?: {
    id: string;
    name: string;
    slug: string;
    status: string;
  };
  role?: {
    id: string;
    code: string;
    name: string;
    scope: string;
    hierarchy_level: number;
  };
  permissions?: {
    role_permissions: object;
    user_overrides: object;
  };
  joined_at?: string;
  error?: string;
  code?: string;
}
```

**Example**:
```typescript
const { data: validation, error } = await supabase.rpc('validate_current_session');

if (validation.valid) {
  console.log('Current tenant:', validation.tenant.name);
  console.log('Current role:', validation.role.code);
} else {
  console.error('Invalid session:', validation.error);
}
```

---

## Error Handling

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `NO_AUTH` | No authenticated user | 401 |
| `NO_PROFILE` | User profile not found | 404 |
| `NO_TENANT_CONTEXT` | No tenant context in JWT | 400 |
| `TENANT_NOT_FOUND` | Tenant does not exist | 404 |
| `TENANT_INACTIVE` | Tenant is not active | 403 |
| `USER_NOT_IN_TENANT` | User not assigned to tenant | 403 |
| `USER_INACTIVE` | User account is inactive | 403 |
| `ROLE_NOT_FOUND` | Role does not exist | 404 |

### Error Response Format

**RLS Policy Errors**:
```json
{
  "code": "PGRST116",
  "message": "Row-level security violation",
  "details": "Policy check failed"
}
```

**RPC Function Errors**:
```json
{
  "success": false,
  "error": "User does not have access to this tenant",
  "code": "USER_NOT_IN_TENANT"
}
```

### Best Practices

1. **Always Check Tenant Context**: Validate session before operations
2. **Handle Token Expiration**: Refresh tokens proactively (5 min buffer)
3. **Use Validation Schemas**: Validate all inputs with Zod
4. **Log Errors**: Use structured logging for debugging
5. **Test RLS Policies**: Verify data isolation in tests

---

## Helper Utilities

### JWT Helpers

```typescript
import { getCurrentTenantId, getCurrentRoleId, isAuthenticated } from '@/utils';

// Get current tenant ID
const tenantId = await getCurrentTenantId(supabase);

// Check authentication
const isAuth = await isAuthenticated(supabase);

// Refresh token if needed
await refreshTokenIfNeeded(supabase);
```

### RLS Helpers

```typescript
import {
  validateSession,
  hasPermission,
  switchTenantContext,
  ensureValidTenantContext
} from '@/utils';

// Validate session
const validation = await validateSession(supabase);

// Check permission
const canManage = await hasPermission(supabase, 'manage_users');

// Ensure context (throws if invalid)
await ensureValidTenantContext(supabase);

// Switch tenant
await switchTenantContext(supabase, 'tenant-uuid');
```

---

## Rate Limiting

- **RPC Functions**: 100 requests/minute per user
- **Table Operations**: 1000 requests/minute per user
- **Auth Operations**: 50 requests/minute per IP

---

## Pagination

All list queries support pagination:

```typescript
const { data, error, count } = await supabase
  .from('household')
  .select('*', { count: 'exact' })
  .range(0, 9) // First 10 items
  .order('created_at', { ascending: false });

// Next page
.range(10, 19) // Items 11-20
```

---

## Webhooks

Coming soon: Webhook support for tenant events.

---

## SDK Examples

See `/examples` directory for complete SDK usage examples in:
- TypeScript/JavaScript
- Python
- Dart/Flutter

---

## Support

For issues or questions:
- GitHub Issues: [repository-url]/issues
- Documentation: [docs-url]
- Email: support@example.com
