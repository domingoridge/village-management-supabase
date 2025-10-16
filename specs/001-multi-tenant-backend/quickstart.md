# Developer Quickstart: Multi-Tenant Backend with RBAC

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Data Model**: [data-model.md](./data-model.md)
**Created**: 2025-10-09
**Audience**: Developers setting up local environment for first time

## Prerequisites

Before starting, ensure you have:

- **Node.js** 18+ (LTS recommended)
- **Docker Desktop** installed and running
- **Supabase CLI** installed: `npm install -g supabase`
- **Git** for version control
- **Code Editor** (VS Code recommended)

**Verify installations**:

```bash
node --version       # v18.0.0 or higher
docker --version     # Docker version 20.10.0 or higher
supabase --version   # 1.0.0 or higher
```

---

## Local Development Setup

### Step 1: Clone Repository

```bash
cd ~/Workspace/98Labs/village-management
git clone <repository-url> village-management-backend-supabase
cd village-management-backend-supabase
git checkout 001-multi-tenant-backend
```

### Step 2: Install Dependencies

```bash
npm install
```

**Expected packages**:
- `@supabase/supabase-js` - Supabase JavaScript client
- `zod` - Schema validation
- `vitest` - Testing framework
- `typescript` - Type checking

### Step 3: Start Supabase Local Instance

```bash
supabase start
```

**What this does**:
- Starts Postgres database (Docker container)
- Starts Supabase Studio (web UI at http://localhost:54323)
- Starts PostgREST API server
- Starts Auth server
- Starts Storage server

**Expected output**:

```
Started supabase local development setup.

         API URL: http://localhost:54321
     GraphQL URL: http://localhost:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
    Inbucket URL: http://localhost:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Save these values** - you'll need them for environment configuration.

### Step 4: Configure Environment Variables

Create `.env.local` file in project root:

```bash
cp .env.example .env.local
```

Edit `.env.local` with values from `supabase start` output:

```env
# Supabase Local Development
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=<anon_key_from_supabase_start>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key_from_supabase_start>

# Database (for migrations)
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres

# Application
NODE_ENV=development
```

**⚠️ IMPORTANT**: Never commit `.env.local` to version control.

### Step 5: Apply Database Migrations

```bash
supabase db reset
```

**What this does**:
- Drops existing database (if any)
- Applies all migrations in `supabase/migrations/` sequentially
- Runs seed data from `supabase/seed.sql`

**Expected output**:

```
Applying migration 00001_create_roles.sql...
Applying migration 00002_create_tenants.sql...
Applying migration 00003_create_user_profiles.sql...
...
Applying migration 00012_auth_triggers_and_functions.sql...
Seeding data...
Database reset complete!
```

### Step 6: Verify Setup

**Check Supabase Studio**: Open http://localhost:54323

- Navigate to **Table Editor** → You should see tables: `role`, `tenant`, `user_profile`, `tenant_user`, `household`, `resident`, `residential_community_config`
- Navigate to **Database** → **Policies** → Verify RLS policies exist
- Navigate to **Authentication** → **Users** → Should be empty (no users yet)

**Check API**: Test PostgREST endpoint

```bash
curl http://localhost:54321/rest/v1/role?select=* \
  -H "apikey: <anon_key>" \
  -H "Content-Type: application/json"
```

**Expected response**: Array of 8 roles (seeded data)

```json
[
  {
    "id": "uuid",
    "code": "superadmin",
    "name": "Super Administrator",
    "hierarchy_level": 1
  },
  ...
]
```

---

## Creating Test Data

### Step 1: Create Test Tenant

**Open Supabase Studio SQL Editor**: http://localhost:54323/project/default/sql

**Run SQL**:

```sql
-- Insert test tenant
INSERT INTO tenant (name, slug, address, status)
VALUES (
  'Greenfield Village',
  'greenfield-village',
  '123 Main Street, City, Country',
  'active'
)
RETURNING *;
```

**Save the returned `id` (tenant_id)** for next steps.

### Step 2: Create Test User

**Via Supabase Studio**: Navigate to **Authentication** → **Users** → **Add User**

- Email: `admin@greenfield.test`
- Password: `TestPassword123!`
- Auto-confirm email: ✅

**Save the returned `id` (auth_user_id)**.

**Verify user_profile auto-created**:

```sql
SELECT * FROM user_profile WHERE auth_user_id = '<auth_user_id>';
```

**If not auto-created** (trigger not fired), create manually:

```sql
INSERT INTO user_profile (auth_user_id, first_name, last_name)
VALUES ('<auth_user_id>', 'Admin', 'User')
RETURNING *;
```

### Step 3: Assign User to Tenant with Role

**Get role_id for admin-head**:

```sql
SELECT id FROM role WHERE code = 'admin-head';
```

**Assign user to tenant**:

```sql
INSERT INTO tenant_user (tenant_id, user_profile_id, role_id)
VALUES (
  '<tenant_id>',
  (SELECT id FROM user_profile WHERE auth_user_id = '<auth_user_id>'),
  (SELECT id FROM role WHERE code = 'admin-head')
)
RETURNING *;
```

### Step 4: Update JWT Claims (Simulate Tenant Context)

**Set custom claims in auth.users**:

```sql
UPDATE auth.users
SET raw_app_meta_data = jsonb_build_object(
  'tenant_id', '<tenant_id>',
  'role_id', (SELECT id FROM role WHERE code = 'admin-head')
)
WHERE id = '<auth_user_id>';
```

### Step 5: Create Test Household

**Authenticate as test user**:

```bash
# Get JWT token (via Supabase client or Studio)
# For local testing, use service_role key (bypasses RLS)

curl -X POST http://localhost:54321/rest/v1/household \
  -H "apikey: <service_role_key>" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <service_role_key>" \
  -d '{
    "tenant_id": "<tenant_id>",
    "address": "Block A, Lot 15",
    "block_lot": "A-15",
    "sticker_quota": 3
  }'
```

**Expected response**: Household object with status `201 Created`

---

## Testing Tenant Isolation (RLS)

### Step 1: Create Second Tenant

```sql
INSERT INTO tenant (name, slug, address, status)
VALUES (
  'Sunset Heights',
  'sunset-heights',
  '456 Oak Avenue, City, Country',
  'active'
)
RETURNING id;
```

**Save `id` as `tenant_b_id`**.

### Step 2: Create Household in Tenant B

```sql
INSERT INTO household (tenant_id, address, block_lot, sticker_quota)
VALUES (
  '<tenant_b_id>',
  'Block Z, Lot 99',
  'Z-99',
  2
)
RETURNING id;
```

**Save `id` as `household_b_id`**.

### Step 3: Verify RLS Isolation

**Attempt to access Tenant B household from Tenant A user**:

```bash
# Set Authorization header with JWT containing tenant_a_id in claims
curl http://localhost:54321/rest/v1/household?id=eq.<household_b_id>&select=* \
  -H "apikey: <anon_key>" \
  -H "Authorization: Bearer <jwt_token_with_tenant_a_id>"
```

**Expected response**: Empty array `[]` (RLS filtered it out)

**Verify Tenant A household IS accessible**:

```bash
curl http://localhost:54321/rest/v1/household?tenant_id=eq.<tenant_a_id>&select=* \
  -H "apikey: <anon_key>" \
  -H "Authorization: Bearer <jwt_token_with_tenant_a_id>"
```

**Expected response**: Array with Tenant A households

**✅ RLS Working**: User from Tenant A cannot see Tenant B data.

---

## Running Tests

### Unit Tests

```bash
npm run test:unit
```

**Tests located in**: `tests/unit/`

**Example tests**:
- JWT helper functions
- Zod schema validation
- Utility functions

### RLS Policy Tests

```bash
npm run test:rls
```

**Tests located in**: `tests/rls/`

**Example tests**:
- Tenant isolation (cross-tenant access denied)
- Role permissions (household-member cannot create household)
- User context switching

### Integration Tests

```bash
npm run test:integration
```

**Tests located in**: `tests/integration/`

**Example tests**:
- Complete user flows (tenant onboarding, household creation)
- Multi-tenant user scenarios
- RBAC permission enforcement

### Run All Tests

```bash
npm test
```

**Coverage Report**:

```bash
npm run test:coverage
```

**Expected coverage**: >80% for database functions, >90% for TypeScript utilities

---

## Common Development Tasks

### Reset Database

**Drop all data and re-apply migrations**:

```bash
supabase db reset
```

**⚠️ WARNING**: This deletes ALL local data.

### Create New Migration

**Generate migration from schema diff**:

```bash
supabase db diff -f add_new_field_to_household
```

**Manually create migration**:

```bash
touch supabase/migrations/$(date +%Y%m%d%H%M%S)_description.sql
```

### View Database Logs

```bash
supabase db logs
```

### Generate TypeScript Types

**Auto-generate types from database schema**:

```bash
supabase gen types typescript --local > src/types/database.types.ts
```

**Update whenever schema changes.**

### Stop Supabase

```bash
supabase stop
```

**Preserve data**:

```bash
supabase stop --no-backup
```

---

## API Usage Examples

### Get User's Tenants

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

// Sign in
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: 'admin@greenfield.test',
  password: 'TestPassword123!'
})

if (authError) throw authError

// Get user's tenants
const { data, error } = await supabase.rpc('get_user_tenants')

console.log(data)
// [
//   {
//     tenant_id: 'uuid',
//     tenant_name: 'Greenfield Village',
//     role_code: 'admin-head',
//     ...
//   }
// ]
```

### Switch Tenant Context

```typescript
const { data, error } = await supabase.rpc('switch_tenant_context', {
  target_tenant_id: 'uuid-of-tenant-b'
})

if (error) throw error

// Refresh session to get new JWT with updated tenant_id claim
const { data: sessionData } = await supabase.auth.refreshSession()
```

### Create Household

```typescript
const { data, error } = await supabase
  .from('household')
  .insert({
    address: 'Block B, Lot 20',
    block_lot: 'B-20',
    sticker_quota: 2
  })
  .select()
  .single()

// tenant_id auto-set from JWT claims
// RLS ensures user has permission to create
```

### Query Households with Members

```typescript
const { data, error } = await supabase
  .from('household')
  .select(`
    *,
    resident (
      id,
      has_visiting_rights,
      tenant_user:tenant_user_id (
        user_profile:user_profile_id (
          first_name,
          last_name,
          avatar_url
        ),
        role:role_id (
          code,
          name
        )
      )
    )
  `)
  .eq('status', 'active')
  .order('address')

console.log(data)
// Array of households with nested members and user info
```

---

## Troubleshooting

### Issue: Migrations Not Applying

**Symptom**: `supabase db reset` fails with error

**Solutions**:
1. Check migration SQL syntax in `supabase/migrations/`
2. Ensure migrations are numbered sequentially
3. Check Docker is running: `docker ps`
4. Reset Supabase: `supabase stop && supabase start`

### Issue: RLS Policies Not Working

**Symptom**: Users can see data from other tenants

**Solutions**:
1. Verify RLS is enabled on table: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';`
2. Check policies exist: Navigate to Supabase Studio → Database → Policies
3. Verify JWT claims are set: `SELECT raw_app_meta_data FROM auth.users;`
4. Test with service_role key (bypasses RLS) vs anon key (enforces RLS)

### Issue: Cannot Create User

**Symptom**: User signup fails with error

**Solutions**:
1. Check Auth settings in Supabase Studio → Authentication → Settings
2. Ensure email confirmation is disabled for local dev
3. Verify trigger `create_user_profile_on_signup` exists and is enabled

### Issue: Tests Failing

**Symptom**: `npm test` shows failures

**Solutions**:
1. Reset test database: `supabase db reset`
2. Regenerate types: `supabase gen types typescript --local`
3. Check test database connection in `.env.test`
4. Run single test file: `npx vitest run tests/rls/tenant-rls.test.ts`

---

## Next Steps

1. ✅ Local development environment set up
2. ✅ Test data created and RLS verified
3. ⏭️ Explore Supabase Studio features
4. ⏭️ Review data model in [data-model.md](./data-model.md)
5. ⏭️ Review API contracts in [contracts/rest-api.md](./contracts/rest-api.md)
6. ⏭️ Start building frontend integration

---

## Additional Resources

- **Supabase Docs**: https://supabase.com/docs
- **PostgREST API Reference**: https://postgrest.org/en/stable/
- **Postgres RLS Guide**: https://supabase.com/docs/guides/auth/row-level-security
- **Vitest Documentation**: https://vitest.dev/
- **Zod Documentation**: https://zod.dev/

**Project Documentation**:
- [Feature Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Research Findings](./research.md)
- [Data Model](./data-model.md)
- [REST API Contracts](./contracts/rest-api.md)

---

**Quickstart Status**: ✅ COMPLETE
