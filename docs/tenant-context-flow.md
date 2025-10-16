# Tenant Context Management

## Overview

The multi-tenant system uses JWT `app_metadata` to store the current tenant context (`tenant_id` and `role_id`). This allows Row-Level Security (RLS) policies to filter data based on the user's active tenant.

## Problem

RLS policies use `get_current_tenant_id()` which extracts `tenant_id` from the JWT's `app_metadata`:

```sql
-- From 20251009000008_auth_helper_functions.sql
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'tenant_id')::uuid,
    NULL
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

If `tenant_id` is not in the JWT's `app_metadata`, this function returns `NULL`, causing RLS policies to fail and return no rows.

## Solution

The system **automatically handles tenant context** for you:

1. **First tenant assignment** → Auto-sets in JWT
2. **Single tenant users** → Auto-switches on login
3. **Multiple tenant users** → Returns tenant list for UI selection

### Simplified Flow (Recommended)

Using the `AuthService` class:

```typescript
import { createClient } from '@supabase/supabase-js'
import { createAuthService } from './services/auth.service'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const authService = createAuthService(supabase)

// Login - automatically handles tenant context
const result = await authService.login('user@example.com', 'password')

if (result.requiresTenantSelection) {
  // User has multiple tenants - show picker UI
  console.log('Please select a tenant:', result.tenants)

  // User selects a tenant
  await authService.switchTenant(selectedTenantId)
} else {
  // Single tenant user - ready to go!
  console.log('Active tenant:', result.activeTenant)
}

// Now make API calls - RLS works automatically
const { data: households } = await supabase.from('household').select('*')
```

### Manual Flow (If not using AuthService)

1. **User logs in** → JWT created with `user_profile_id` in `app_metadata`

2. **Initialize tenant context** → Call `initialize_tenant_context()`
   - If user has 1 tenant → Auto-switches and returns `auto_switched: true`
   - If user has multiple tenants → Returns tenant list
   - If user already has context → Returns current context

3. **Refresh JWT if needed** → If `requires_token_refresh: true`, call `auth.refreshSession()`

4. **Make API calls** → RLS policies work automatically

### Example Usage (JavaScript/TypeScript)

#### Using AuthService (Recommended)

```typescript
import { createClient } from '@supabase/supabase-js'
import { createAuthService } from './services/auth.service'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const authService = createAuthService(supabase)

// Login
const result = await authService.login('user@example.com', 'password')

if (result.requiresTenantSelection) {
  // Show tenant picker
  const selectedTenant = result.tenants[0] // User selects from UI
  await authService.switchTenant(selectedTenant.tenant_id)
}

// Get current tenant info
const tenantId = await authService.getCurrentTenantId()
console.log('Active tenant:', tenantId)

// Logout
await authService.logout()
```

#### Manual RPC Calls

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// 1. User logs in
const { data: authData } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})

// 2. Initialize tenant context
const { data: contextResult } = await supabase.rpc('initialize_tenant_context')

console.log('Context result:', contextResult)
// Single tenant: { success: true, auto_switched: true, current_tenant_id: '...', requires_token_refresh: true }
// Multiple tenants: { success: true, auto_switched: false, tenants: [...] }

// 3. Refresh JWT if needed
if (contextResult.requires_token_refresh) {
  await supabase.auth.refreshSession()
}

// 4. If multiple tenants, let user choose
if (!contextResult.auto_switched && contextResult.tenants.length > 1) {
  const selectedTenantId = contextResult.tenants[0].tenant_id // From UI
  await supabase.rpc('switch_tenant_context', { p_tenant_id: selectedTenantId })
  await supabase.auth.refreshSession()
}

// 5. Make API calls - RLS works!
const { data: households } = await supabase.from('household').select('*')
```

## Key Functions

### `initialize_tenant_context()` (New!)

Automatically initializes tenant context after login. This is the recommended function to call after authentication.

**Returns:**
```json
// Single tenant user (auto-switched)
{
  "success": true,
  "auto_switched": true,
  "has_context": true,
  "current_tenant_id": "uuid",
  "role_id": "uuid",
  "role_code": "admin-head",
  "tenants": [...],
  "requires_token_refresh": true,
  "message": "Automatically switched to your only accessible tenant"
}

// Multiple tenants
{
  "success": true,
  "auto_switched": false,
  "has_context": false,
  "tenants": [...],
  "message": "Multiple tenants available. Please select one."
}

// Already has context
{
  "success": true,
  "auto_switched": false,
  "has_context": true,
  "current_tenant_id": "uuid",
  "tenants": [...],
  "message": "Tenant context already set"
}
```

### `switch_tenant_context(p_tenant_id UUID)`

Manually switches to a specific tenant context. Used when user has multiple tenants.

**Returns:**
```json
{
  "success": true,
  "tenant_id": "uuid",
  "tenant_user_id": "uuid",
  "role_id": "uuid",
  "role_code": "admin-head",
  "message": "Tenant context switched successfully. Please refresh your JWT token.",
  "requires_token_refresh": true
}
```

### `clear_tenant_context()`

Removes `tenant_id` and `role_id` from JWT's `app_metadata`.

**Returns:**
```json
{
  "success": true,
  "message": "Tenant context cleared successfully. Please refresh your JWT token.",
  "requires_token_refresh": true
}
```

### `get_user_tenants()`

Returns all tenants the user has access to.

**Returns:**
```json
[
  {
    "tenant_id": "uuid",
    "tenant_name": "Village A",
    "tenant_status": "active",
    "role_id": "uuid",
    "role_code": "admin-head",
    "role_name": "Administrator Head",
    "is_active": true
  }
]
```

## Important Notes

1. **Use `initialize_tenant_context()` after login** - This handles single-tenant auto-switching automatically

2. **AuthService handles JWT refresh** - If using the AuthService class, JWT refresh is automatic

3. **First tenant assignment auto-sets context** - When a user is assigned to their first tenant, it's automatically set in their JWT

4. **Store active tenant in client state** - Track the current tenant to avoid unnecessary API calls

5. **Security** - RLS policies ensure users can only access data from tenants they have access to

6. **Multiple tenants** - Users with multiple tenants must explicitly select one via UI

## Troubleshooting

### RLS policies returning no rows after login

**Symptom:** Queries return empty results even though data exists

**Cause:** Tenant context was not initialized after login

**Solution:**
```typescript
// Using AuthService (recommended)
const authService = createAuthService(supabase)
const result = await authService.login(email, password)

// Or manually
const { data } = await supabase.rpc('initialize_tenant_context')
if (data.requires_token_refresh) {
  await supabase.auth.refreshSession()
}
```

### "User does not have access to this tenant" error

**Cause:** User is not assigned to the tenant or their tenant_user record is inactive

**Solution:**
1. Verify the user has a `tenant_user` record for this tenant
2. Check `tenant_user.is_active = true`
3. Use `get_user_tenants()` to see which tenants the user can access

### User has multiple tenants but none is set

**Symptom:** `initialize_tenant_context()` returns `auto_switched: false` with tenant list

**Solution:** This is expected! Show a tenant picker UI:
```typescript
const result = await authService.login(email, password)

if (result.requiresTenantSelection) {
  // Show UI with result.tenants
  const selectedId = await showTenantPicker(result.tenants)
  await authService.switchTenant(selectedId)
}
```

## Database Migrations

The tenant context functionality is implemented in:
- `supabase/migrations/20251009000008_auth_helper_functions.sql` - Helper functions (`get_current_tenant_id`, `get_current_role_id`)
- `supabase/migrations/20251009000017_rpc_switch_tenant_context.sql` - Manual context switching (`switch_tenant_context`, `clear_tenant_context`)
- `supabase/migrations/20251009000018_rpc_assign_user_to_tenant.sql` - User assignment with auto-context setting
- `supabase/migrations/20251014000001_rpc_initialize_tenant_context.sql` - **NEW!** Auto-initialize context after login

## Quick Start

1. **Run migrations**:
   ```bash
   npx supabase db reset  # Or migrate
   ```

2. **Create a user and assign to tenant**:
   ```sql
   -- User profile is auto-created on signup
   -- Assign user to tenant (auto-sets in JWT if first tenant)
   SELECT assign_user_to_tenant(
     user_profile_id,
     tenant_id,
     role_id
   );
   ```

3. **Use in your app**:
   ```typescript
   import { createAuthService } from './services/auth.service'

   const authService = createAuthService(supabase)
   const result = await authService.login(email, password)

   // That's it! Tenant context is ready
   ```
