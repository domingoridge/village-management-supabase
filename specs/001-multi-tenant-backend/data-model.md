# Data Model: Multi-Tenant Backend with RBAC

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)
**Created**: 2025-10-09
**Purpose**: Define database entities, relationships, and validation schemas for multi-tenant RBAC

## Entity Overview

This data model implements the core multi-tenant RBAC infrastructure. Entities are organized by functional domain:

- **Identity & Auth**: USER_PROFILE, TENANT_USER, ROLE
- **Multi-Tenancy**: TENANT, RESIDENTIAL_COMMUNITY_CONFIG
- **Household Management**: HOUSEHOLD, HOUSEHOLD_MEMBER

**Tenant Isolation**: All tenant-scoped entities include `tenant_id` (UUID FK → TENANT) with RLS policies enforcing isolation.

---

## Core Entities

### ROLE

**Purpose**: Defines the 8 predefined system roles with hierarchy and default permissions.

**State Transitions**: None (roles are seeded, not user-modifiable)

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, default: gen_random_uuid() | Unique role identifier |
| `code` | VARCHAR(50) | UNIQUE, NOT NULL | Machine-readable role code |
| `name` | VARCHAR(100) | NOT NULL | Human-readable display name |
| `description` | TEXT | | Role purpose and responsibilities |
| `scope` | ENUM | NOT NULL | Role scope: 'platform', 'tenant', 'household', 'security' |
| `permissions` | JSONB | NOT NULL, default: '{}' | Default permissions structure |
| `hierarchy_level` | INTEGER | NOT NULL, CHECK (hierarchy_level > 0) | 1 = highest privilege |
| `is_active` | BOOLEAN | NOT NULL, default: true | Soft delete flag |
| `created_at` | TIMESTAMPTZ | NOT NULL, default: now() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default: now() | Last update timestamp |

**Indexes**:
- Primary: `role_pkey` on `id`
- Unique: `role_code_key` on `code`
- Index: `idx_role_hierarchy` on `hierarchy_level`

**Validation Schema (Zod)**:
```typescript
import { z } from 'zod'

export const RoleCodeEnum = z.enum([
  'superadmin',
  'admin-head',
  'admin-officers',
  'household-head',
  'household-member',
  'household-beneficial-user',
  'security-head',
  'security-officer'
])

export const RoleScopeEnum = z.enum(['platform', 'tenant', 'household', 'security'])

export const RolePermissionsSchema = z.record(z.boolean()).default({})

export const RoleSchema = z.object({
  id: z.string().uuid(),
  code: RoleCodeEnum,
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  scope: RoleScopeEnum,
  permissions: RolePermissionsSchema,
  hierarchy_level: z.number().int().positive(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

export type Role = z.infer<typeof RoleSchema>
```

**Seed Data**:
```sql
INSERT INTO role (code, name, scope, hierarchy_level, permissions) VALUES
  ('superadmin', 'Super Administrator', 'platform', 1, '{"manage_all_tenants": true, "impersonate_users": true}'),
  ('admin-head', 'Head Administrator', 'tenant', 2, '{"manage_tenant_settings": true, "manage_users": true, "manage_households": true}'),
  ('admin-officers', 'Administrative Officer', 'tenant', 3, '{"manage_households": true, "view_reports": true}'),
  ('security-head', 'Security Head', 'security', 3, '{"manage_security_personnel": true, "escalate_incidents": true}'),
  ('household-head', 'Household Head', 'household', 4, '{"manage_residents": true, "announce_guests": true, "request_permits": true}'),
  ('security-officer', 'Security Officer', 'security', 4, '{"log_gate_entries": true, "report_incidents": true, "verify_guests": true}'),
  ('household-member', 'Resident', 'household', 5, '{"view_household": true, "announce_guests": false}'),
  ('household-beneficial-user', 'Beneficial User', 'household', 6, '{"view_vehicle_pass": true}');
```

**RLS Policies**: Public read (needed for permission checks), no write access (seeded data only)

---

### TENANT

**Purpose**: Represents an independent residential community organization with isolated data.

**State Transitions**:
```
[Created] → active (trial starts)
active → suspended (payment issue, policy violation)
suspended → active (issue resolved)
active → cancelled (permanent closure)
trial → active (trial converted to paid)
trial → cancelled (trial expired)
```

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, default: gen_random_uuid() | Unique tenant identifier |
| `name` | VARCHAR(255) | NOT NULL | Tenant organization name |
| `slug` | VARCHAR(100) | UNIQUE, NOT NULL | URL-safe identifier (lowercase, hyphenated) |
| `address` | TEXT | | Physical address of community |
| `subscription_plan` | JSONB | NOT NULL, default: '{}' | Plan tier, limits, features |
| `status` | ENUM | NOT NULL, default: 'trial' | 'active', 'trial', 'suspended', 'cancelled' |
| `billing_email` | VARCHAR(255) | | Billing contact email |
| `contact_person` | VARCHAR(255) | | Primary contact name |
| `contact_phone` | VARCHAR(50) | | Primary contact phone |
| `trial_ends_at` | TIMESTAMPTZ | | Trial expiration (NULL if not trial) |
| `created_at` | TIMESTAMPTZ | NOT NULL, default: now() | Tenant creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default: now() | Last update timestamp |

**Indexes**:
- Primary: `tenant_pkey` on `id`
- Unique: `tenant_slug_key` on `slug`
- Index: `idx_tenant_status` on `status`

**Validation Schema (Zod)**:
```typescript
export const TenantStatusEnum = z.enum(['active', 'trial', 'suspended', 'cancelled'])

export const SubscriptionPlanSchema = z.object({
  tier: z.enum(['free', 'basic', 'premium', 'enterprise']).default('free'),
  max_households: z.number().int().positive().optional(),
  max_users: z.number().int().positive().optional(),
  features: z.array(z.string()).default([])
})

export const TenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  address: z.string().optional(),
  subscription_plan: SubscriptionPlanSchema,
  status: TenantStatusEnum,
  billing_email: z.string().email().optional(),
  contact_person: z.string().max(255).optional(),
  contact_phone: z.string().max(50).optional(),
  trial_ends_at: z.string().datetime().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

export type Tenant = z.infer<typeof TenantSchema>

// Input validation for creating tenant
export const CreateTenantInputSchema = TenantSchema.pick({
  name: true,
  slug: true,
  address: true,
  billing_email: true,
  contact_person: true,
  contact_phone: true
}).partial({ address: true, billing_email: true, contact_person: true, contact_phone: true })

export type CreateTenantInput = z.infer<typeof CreateTenantInputSchema>
```

**RLS Policies**:
- Read: User must belong to tenant (via tenant_users)
- Insert: Superadmin only
- Update: Admin-head or higher for their own tenant
- Delete: Superadmin only (soft delete via status = 'cancelled')

---

### RESIDENTIAL_COMMUNITY_CONFIG

**Purpose**: Tenant-specific configuration for rules, curfews, and operational settings.

**State Transitions**: None (configuration updated atomically)

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, default: gen_random_uuid() | Unique config identifier |
| `tenant_id` | UUID | FK → TENANT, UNIQUE, NOT NULL | One config per tenant |
| `rules_and_guidelines` | JSONB | NOT NULL, default: '{}' | Village rules, policies, bylaws |
| `curfew_settings` | JSONB | NOT NULL, default: '{}' | Curfew enabled, times, exceptions |
| `gate_operating_hours` | JSONB | NOT NULL, default: '{}' | Weekday, weekend, holiday hours |
| `visitor_policies` | JSONB | NOT NULL, default: '{}' | Max visit duration, guest limits |
| `emergency_contacts` | JSONB | NOT NULL, default: '[]' | Array of {name, role, phone, email} |
| `maintenance_schedule` | JSONB | NOT NULL, default: '{}' | Regular maintenance windows |
| `notification_preferences` | JSONB | NOT NULL, default: '{}' | Email, SMS, push notification settings |
| `updated_by_tenant_user_id` | UUID | FK → TENANT_USER | Last editor |
| `created_at` | TIMESTAMPTZ | NOT NULL, default: now() | Config creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default: now() | Last update timestamp |

**Indexes**:
- Primary: `residential_community_config_pkey` on `id`
- Unique: `residential_community_config_tenant_id_key` on `tenant_id`
- Foreign Key: `fk_config_tenant` on `tenant_id`
- Foreign Key: `fk_config_updated_by` on `updated_by_tenant_user_id`

**Validation Schema (Zod)**:
```typescript
export const CurfewSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(), // HH:MM
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  exceptions: z.array(z.string()).default([]) // Roles exempt from curfew
})

export const GateOperatingHoursSchema = z.object({
  weekday_open: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  weekday_close: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  weekend_open: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  weekend_close: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  twenty_four_seven: z.boolean().default(true)
})

export const EmergencyContactSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional()
})

export const ResidentialCommunityConfigSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  rules_and_guidelines: z.record(z.any()).default({}),
  curfew_settings: CurfewSettingsSchema,
  gate_operating_hours: GateOperatingHoursSchema,
  visitor_policies: z.record(z.any()).default({}),
  emergency_contacts: z.array(EmergencyContactSchema),
  maintenance_schedule: z.record(z.any()).default({}),
  notification_preferences: z.record(z.boolean()).default({}),
  updated_by_tenant_user_id: z.string().uuid().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

export type ResidentialCommunityConfig = z.infer<typeof ResidentialCommunityConfigSchema>
```

**RLS Policies**:
- Read: All tenant users can view config
- Update: Admin-head and admin-officers only
- Insert: Auto-created on tenant creation (trigger)
- Delete: Never (cascade delete with tenant)

---

### USER_PROFILE

**Purpose**: Core user information linked to Supabase Auth, shared across all tenants.

**State Transitions**: None (profile updated atomically)

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, default: gen_random_uuid() | Unique profile identifier |
| `auth_user_id` | UUID | FK → auth.users, UNIQUE, NOT NULL | Links to Supabase Auth user |
| `first_name` | VARCHAR(100) | NOT NULL | User's first name |
| `last_name` | VARCHAR(100) | NOT NULL | User's last name |
| `avatar_url` | TEXT | | Supabase storage path to avatar image |
| `preferences` | JSONB | NOT NULL, default: '{}' | User UI/notification preferences |
| `created_at` | TIMESTAMPTZ | NOT NULL, default: now() | Profile creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default: now() | Last update timestamp |

**Indexes**:
- Primary: `user_profile_pkey` on `id`
- Unique: `user_profile_auth_user_id_key` on `auth_user_id`
- Foreign Key: `fk_user_profile_auth_user` on `auth_user_id`

**Validation Schema (Zod)**:
```typescript
export const UserPreferencesSchema = z.object({
  language: z.enum(['en', 'fil']).default('en'),
  timezone: z.string().default('Asia/Manila'),
  email_notifications: z.boolean().default(true),
  sms_notifications: z.boolean().default(false),
  theme: z.enum(['light', 'dark', 'auto']).default('auto')
})

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  auth_user_id: z.string().uuid(),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  avatar_url: z.string().url().optional(),
  preferences: UserPreferencesSchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

export type UserProfile = z.infer<typeof UserProfileSchema>

export const CreateUserProfileInputSchema = UserProfileSchema.pick({
  first_name: true,
  last_name: true,
  avatar_url: true
}).partial({ avatar_url: true })

export type CreateUserProfileInput = z.infer<typeof CreateUserProfileInputSchema>
```

**RLS Policies**:
- Read: User can read their own profile OR any user in same tenant (for admin views)
- Update: User can only update their own profile
- Insert: Auto-created on auth.users insert (trigger)
- Delete: Cascade delete when auth.users deleted

**Trigger**: Auto-create user_profile when new auth.users record inserted

---

### TENANT_USER

**Purpose**: Junction table linking users to tenants with role assignment and permissions.

**State Transitions**:
```
[Created] → is_active: true
is_active: true → is_active: false (user removed from tenant, session invalidated)
is_active: false → is_active: true (user re-added to tenant)
```

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, default: gen_random_uuid() | Unique tenant user identifier |
| `tenant_id` | UUID | FK → TENANT, NOT NULL | Tenant this user belongs to |
| `user_profile_id` | UUID | FK → USER_PROFILE, NOT NULL | User profile reference |
| `role_id` | UUID | FK → ROLE, NOT NULL | Assigned role in this tenant |
| `is_active` | BOOLEAN | NOT NULL, default: true | Active status (for session invalidation) |
| `permissions` | JSONB | NOT NULL, default: '{}' | Role-specific permission overrides |
| `joined_at` | TIMESTAMPTZ | NOT NULL, default: now() | When user joined this tenant |
| `created_at` | TIMESTAMPTZ | NOT NULL, default: now() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default: now() | Last update timestamp |

**Indexes**:
- Primary: `tenant_user_pkey` on `id`
- Unique: `tenant_user_unique_user_tenant` on `(tenant_id, user_profile_id)` - One role per user per tenant
- Index: `idx_tenant_user_tenant` on `tenant_id`
- Index: `idx_tenant_user_profile` on `user_profile_id`
- Index: `idx_tenant_user_role` on `role_id`
- Foreign Keys: `fk_tenant_user_tenant`, `fk_tenant_user_profile`, `fk_tenant_user_role`

**Validation Schema (Zod)**:
```typescript
export const PermissionOverridesSchema = z.record(z.boolean()).default({})

export const TenantUserSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  user_profile_id: z.string().uuid(),
  role_id: z.string().uuid(),
  is_active: z.boolean(),
  permissions: PermissionOverridesSchema,
  joined_at: z.string().datetime(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

export type TenantUser = z.infer<typeof TenantUserSchema>

export const AssignUserToTenantInputSchema = z.object({
  tenant_id: z.string().uuid(),
  user_profile_id: z.string().uuid(),
  role_code: RoleCodeEnum, // Will be resolved to role_id
  permissions: PermissionOverridesSchema.optional()
})

export type AssignUserToTenantInput = z.infer<typeof AssignUserToTenantInputSchema>
```

**RLS Policies**:
- Read: Users can see other users in the same tenant
- Insert: Admin-head or higher in target tenant
- Update: Admin-head can update roles/permissions; users cannot update themselves
- Delete: Admin-head or higher (soft delete via is_active = false)

**Trigger**: Invalidate JWT claims when is_active changes to false

---

### HOUSEHOLD

**Purpose**: Represents a residential property unit within a tenant.

**State Transitions**:
```
[Created] → active
active → inactive (residents moved out)
active → suspended (HOA violation, dues unpaid)
suspended → active (issue resolved)
```

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, default: gen_random_uuid() | Unique household identifier |
| `tenant_id` | UUID | FK → TENANT, NOT NULL | Tenant isolation |
| `address` | VARCHAR(255) | NOT NULL | Full household address |
| `block_lot` | VARCHAR(50) | | Block/Lot/Phase identifier |
| `sticker_quota` | INTEGER | NOT NULL, default: 2, CHECK (sticker_quota >= 0) | Max vehicle stickers |
| `status` | ENUM | NOT NULL, default: 'active' | 'active', 'inactive', 'suspended' |
| `metadata` | JSONB | NOT NULL, default: '{}' | Custom household attributes |
| `created_at` | TIMESTAMPTZ | NOT NULL, default: now() | Household creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default: now() | Last update timestamp |

**Indexes**:
- Primary: `household_pkey` on `id`
- Composite: `idx_household_tenant_id` on `(tenant_id, id)` - RLS optimization
- Index: `idx_household_status` on `status`
- Foreign Key: `fk_household_tenant` on `tenant_id`

**Validation Schema (Zod)**:
```typescript
export const HouseholdStatusEnum = z.enum(['active', 'inactive', 'suspended'])

export const HouseholdSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  address: z.string().min(1).max(255),
  block_lot: z.string().max(50).optional(),
  sticker_quota: z.number().int().nonnegative(),
  status: HouseholdStatusEnum,
  metadata: z.record(z.any()).default({}),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

export type Household = z.infer<typeof HouseholdSchema>

export const CreateHouseholdInputSchema = HouseholdSchema.pick({
  address: true,
  block_lot: true,
  sticker_quota: true
}).partial({ block_lot: true, sticker_quota: true })

export type CreateHouseholdInput = z.infer<typeof CreateHouseholdInputSchema>
```

**RLS Policies**:
- Read: All tenant users can view households in their tenant
- Insert: Admin-head and admin-officers only
- Update: Admin-head, admin-officers, household-head (for their own household)
- Delete: Admin-head only (soft delete via status = 'inactive')

---

### HOUSEHOLD_MEMBER

**Purpose**: Links tenant users to households with household-specific permissions.

**State Transitions**: None (member added/removed atomically)

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, default: gen_random_uuid() | Unique household member identifier |
| `household_id` | UUID | FK → HOUSEHOLD, NOT NULL | Household this member belongs to |
| `tenant_user_id` | UUID | FK → TENANT_USER, NOT NULL | User in tenant context |
| `has_visiting_rights` | BOOLEAN | NOT NULL, default: false | Can announce guests |
| `has_signatory_rights` | BOOLEAN | NOT NULL, default: false | Can sign documents/permits |
| `is_primary_contact` | BOOLEAN | NOT NULL, default: false | Primary contact for household |
| `created_at` | TIMESTAMPTZ | NOT NULL, default: now() | Member creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default: now() | Last update timestamp |

**Indexes**:
- Primary: `resident_pkey` on `id`
- Unique: `resident_unique_user_household` on `(household_id, tenant_user_id)` - User can't be member twice
- Index: `idx_resident_household` on `household_id`
- Index: `idx_resident_tenant_user` on `tenant_user_id`
- Foreign Keys: `fk_resident_household`, `fk_resident_tenant_user`

**Validation Schema (Zod)**:
```typescript
export const HouseholdMemberSchema = z.object({
  id: z.string().uuid(),
  household_id: z.string().uuid(),
  tenant_user_id: z.string().uuid(),
  has_visiting_rights: z.boolean(),
  has_signatory_rights: z.boolean(),
  is_primary_contact: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

export type HouseholdMember = z.infer<typeof HouseholdMemberSchema>

export const AddHouseholdMemberInputSchema = z.object({
  household_id: z.string().uuid(),
  tenant_user_id: z.string().uuid(),
  has_visiting_rights: z.boolean().default(false),
  has_signatory_rights: z.boolean().default(false),
  is_primary_contact: z.boolean().default(false)
})

export type AddHouseholdMemberInput = z.infer<typeof AddHouseholdMemberInputSchema>
```

**RLS Policies**:
- Read: All household members can view other members in their household
- Insert: Household-head for their household, admin-head/admin-officers for any household
- Update: Household-head can update permissions; cannot update own household-head status
- Delete: Household-head can remove members; admin-head can remove anyone

**Constraint**: Only one `is_primary_contact = true` per household (enforced by partial unique index or trigger)

---

## Entity Relationships

### One-to-Many Relationships

1. **TENANT → RESIDENTIAL_COMMUNITY_CONFIG** (1:1 via unique constraint)
2. **TENANT → TENANT_USER** (1:N) - Tenant has many users
3. **TENANT → HOUSEHOLD** (1:N) - Tenant has many households
4. **ROLE → TENANT_USER** (1:N) - Role assigned to many users
5. **USER_PROFILE → TENANT_USER** (1:N) - User can belong to multiple tenants
6. **HOUSEHOLD → HOUSEHOLD_MEMBER** (1:N) - Household has many members
7. **TENANT_USER → HOUSEHOLD_MEMBER** (1:N) - User can be member of multiple households

### Key Foreign Key Constraints

- All tenant-scoped tables have `ON DELETE CASCADE` for `tenant_id` FK
- `user_profile.auth_user_id` has `ON DELETE CASCADE` to clean up orphaned profiles
- `tenant_user.user_profile_id` has `ON DELETE CASCADE` when profile deleted
- `resident.tenant_user_id` has `ON DELETE CASCADE` when user removed from tenant
- `residential_community_config.updated_by_tenant_user_id` has `ON DELETE SET NULL`

---

## RLS Policy Summary

All RLS policies use helper function `auth.get_current_tenant_id()` for cleaner syntax.

### Common Policy Patterns

**Pattern 1: Tenant Isolation (Read)**
```sql
CREATE POLICY "tenant_isolation_read" ON households
  FOR SELECT
  USING (tenant_id = auth.get_current_tenant_id());
```

**Pattern 2: Role-Based Write**
```sql
CREATE POLICY "admin_can_create" ON households
  FOR INSERT
  WITH CHECK (
    tenant_id = auth.get_current_tenant_id() AND
    EXISTS (
      SELECT 1 FROM tenant_user tu
      JOIN role r ON r.id = tu.role_id
      WHERE tu.user_profile_id = (SELECT id FROM user_profile WHERE auth_user_id = auth.uid())
      AND tu.tenant_id = auth.get_current_tenant_id()
      AND tu.is_active = true
      AND r.code IN ('superadmin', 'admin-head', 'admin-officers')
    )
  );
```

**Pattern 3: Self-Service**
```sql
CREATE POLICY "user_update_own_profile" ON user_profile
  FOR UPDATE
  USING (auth_user_id = auth.uid());
```

---

## Indexes for Performance

**Critical Indexes** (all tenant-scoped tables):
- Composite `(tenant_id, id)` - Ensures index-only scans for RLS-filtered queries
- Foreign key indexes - Speeds up JOIN operations

**Additional Indexes**:
- `tenant_user(user_profile_id)` - Fast user-to-tenants lookup
- `tenant_user(role_id)` - Role-based permission queries
- `resident(household_id)` - Household member listings

---

## Database Functions & Triggers

### Functions (to be implemented)

1. **`auth.get_current_tenant_id()`** - Extract tenant_id from JWT claims
2. **`auth.get_current_role_id()`** - Extract role_id from JWT claims
3. **`get_user_tenants(user_id UUID)`** - Return all tenants user belongs to
4. **`switch_tenant_context(tenant_id UUID)`** - Update JWT claims for tenant switch
5. **`assign_user_to_tenant(tenant_id UUID, user_id UUID, role_code VARCHAR)`** - Add user to tenant with role
6. **`check_user_permission(permission_key VARCHAR)`** - Validate user permission in current tenant

### Triggers (to be implemented)

1. **`create_user_profile_on_signup`** - Auto-create user_profile when auth.users inserted
2. **`create_residential_config_on_tenant_creation`** - Auto-create config when tenant created
3. **`update_updated_at_timestamp`** - Update `updated_at` on all table modifications
4. **`invalidate_session_on_tenant_user_deactivation`** - Set flag to force JWT refresh when is_active = false

---

## Next Steps

1. ✅ Data model complete with all 7 core entities defined
2. ⏭️ Proceed to API contract generation (contracts/)
3. ⏭️ Create quickstart.md with local development setup
4. ⏭️ Generate Supabase migration files from this data model

**Data Model Status**: ✅ COMPLETE
