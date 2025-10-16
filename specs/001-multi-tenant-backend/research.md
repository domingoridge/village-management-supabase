# Research: Multi-Tenant Backend with RBAC

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)
**Created**: 2025-10-09
**Purpose**: Document technical research findings for implementation decisions

## Research Questions

### 1. Supabase RLS Multi-Tenancy Patterns

**Question**: What are the proven patterns for implementing multi-tenant Row-Level Security in Supabase?

**Findings**:

- **Single Database with RLS** is the recommended approach for Supabase multi-tenancy
  - Each tenant-scoped table includes a `tenant_id` column (UUID)
  - RLS policies filter all queries using `tenant_id = auth.jwt()->>'tenant_id'`
  - Postgres RLS is enforced at database level, preventing application-layer bypasses

- **Alternative Approaches Rejected**:
  - Separate databases per tenant: Excessive operational overhead, difficult schema migrations
  - Schema-per-tenant: Not natively supported in Supabase, complicates PostgREST routing
  - Application-level filtering: Vulnerable to implementation errors, not enforced at DB level

- **Best Practices**:
  - Use `USING` clause for SELECT/READ permissions
  - Use `WITH CHECK` clause for INSERT/UPDATE permissions
  - Combine `auth.uid()` for user-level and custom JWT claims for tenant-level filtering
  - Create helper functions to extract JWT claims for cleaner policies
  - Apply RLS to ALL tenant-scoped tables without exception

**Sources**:
- Supabase Official Docs: Row Level Security Policies
- Supabase Blog: "Multi-tenancy with Postgres Row Level Security"
- Community patterns from Supabase GitHub discussions

---

### 2. Custom JWT Claims in Supabase Auth

**Question**: How do we implement custom JWT claims for `tenant_id` and `role_id` in Supabase Auth?

**Findings**:

- **Database Triggers Approach** (Recommended):
  - Create a database trigger on `auth.users` table
  - Trigger fires on user login and updates `raw_app_meta_data` JSONB field
  - Supabase Auth automatically includes `app_metadata` in JWT claims
  - Claims accessible in RLS policies via `auth.jwt()->'app_metadata'->>'tenant_id'`

- **Implementation Pattern**:
  ```sql
  -- Helper function to get current tenant from session
  CREATE OR REPLACE FUNCTION auth.get_current_tenant_id()
  RETURNS UUID AS $$
    SELECT COALESCE(
      (current_setting('request.jwt.claims', true)::jsonb->>'tenant_id')::uuid,
      NULL
    );
  $$ LANGUAGE SQL STABLE;

  -- Helper function to get current role
  CREATE OR REPLACE FUNCTION auth.get_current_role_id()
  RETURNS UUID AS $$
    SELECT COALESCE(
      (current_setting('request.jwt.claims', true)::jsonb->>'role_id')::uuid,
      NULL
    );
  $$ LANGUAGE SQL STABLE;
  ```

- **Tenant Context Switching**:
  - Implement RPC function `switch_tenant_context(tenant_id UUID)`
  - Function validates user belongs to target tenant
  - Updates `raw_app_meta_data` with new `tenant_id` and corresponding `role_id`
  - Forces JWT refresh on client side to pick up new claims

- **Session Management**:
  - Supabase JWT default expiry: 1 hour (configurable)
  - Use Supabase client's `onAuthStateChange` to detect token refresh
  - Store current `tenant_id` in client state for UI tenant switcher

**Sources**:
- Supabase Auth: Custom Claims Documentation
- Postgres: `current_setting()` function for accessing JWT claims
- Community examples: Multi-tenant context switching patterns

---

### 3. RBAC Permission Modeling

**Question**: How should we model the 8-role hierarchy with granular permissions?

**Findings**:

- **Role Hierarchy Strategy**:
  - Store hierarchy as `hierarchy_level` integer (1 = highest privilege)
  - Role codes: `superadmin` (1), `admin-head` (2), `admin-officers` (3), `security-head` (3), `household-head` (4), `household-member` (5), `household-beneficial-user` (6), `security-officer` (4)
  - Security roles have separate hierarchy from administrative roles

- **Permission Enforcement Layers**:
  1. **Database RLS**: Enforce data access (which rows user can see/modify)
  2. **Application Logic**: Enforce action permissions (which operations user can perform)
  3. **UI**: Hide/show features based on role (user experience optimization)

- **Permission Patterns**:
  - **Superadmin**: Platform-wide access, can impersonate any tenant context
  - **Admin-Head**: Full tenant admin, can manage all tenant settings and users
  - **Admin-Officers**: Limited admin rights, cannot modify critical settings
  - **Household-Head**: Full household management, can add/remove members
  - **Household-Member**: Limited household access, can announce guests if permitted
  - **Household-Beneficial-User**: Read-only household data, vehicle pass only
  - **Security-Head**: Manage security personnel, incident escalation
  - **Security-Officer**: Log entries, report incidents, verify guests

- **Permission Overrides**:
  - `tenant_users.permissions` JSONB field allows per-user overrides
  - Overrides merge with base role permissions (additive or subtractive)
  - Use for temporary permission grants (e.g., acting admin during absence)

**Sources**:
- NIST RBAC Model: Core and Hierarchical RBAC
- Postgres JSONB operators for permission checking
- Real-world residential community access patterns

---

### 4. RLS Performance Optimization

**Question**: How do we maintain query performance with RLS policies at scale (1000+ users per tenant)?

**Findings**:

- **Indexing Strategy**:
  - Create composite indexes on `(tenant_id, id)` for all tenant-scoped tables
  - Index foreign keys that join across tenant-scoped tables
  - Example: `CREATE INDEX idx_households_tenant ON households(tenant_id, id);`
  - Postgres query planner uses indexes efficiently with RLS filters

- **RLS Policy Optimization**:
  - Keep policies simple: Single `tenant_id` check whenever possible
  - Avoid complex subqueries in RLS policies (move to views if needed)
  - Use `SECURITY DEFINER` functions for complex permission logic
  - Cache JWT claim extraction in helper functions marked as `STABLE`

- **Query Patterns**:
  - PostgREST automatically applies RLS to all queries
  - Tenant filter applied at Postgres level (not post-fetch filtering)
  - Use `EXPLAIN ANALYZE` to verify RLS policies don't cause seq scans
  - Expected query plan: Index Scan using `idx_households_tenant`

- **Monitoring**:
  - Track slow queries using `pg_stat_statements`
  - Monitor RLS policy execution time separately from application logic
  - Alert on queries > 1s for tenant-scoped operations (per performance goals)

- **Scaling Considerations**:
  - Postgres connection pooling via Supabase (PgBouncer)
  - Read replicas for analytics queries (future)
  - Tenant-based sharding strategy (if exceeding 100 tenants)

**Sources**:
- Postgres Performance Documentation: RLS and Indexing
- Supabase Performance Best Practices
- Real-world benchmarks: RLS overhead typically <5% with proper indexing

---

### 5. Testing RLS Policies

**Question**: How do we comprehensively test tenant isolation and role permissions?

**Findings**:

- **Testing Approach**:
  1. **Unit Tests for RLS Policies**: Test each policy in isolation
  2. **Integration Tests for User Flows**: Test complete user scenarios
  3. **Security Tests for Isolation**: Attempt cross-tenant access

- **RLS Testing Pattern**:
  ```typescript
  // Set up test users in different tenants
  const tenantA = await createTenant({ name: 'Village A' })
  const tenantB = await createTenant({ name: 'Village B' })

  const adminA = await createTenantUser(tenantA.id, 'admin-head')
  const residentA = await createTenantUser(tenantA.id, 'household-head')
  const adminB = await createTenantUser(tenantB.id, 'admin-head')

  // Test 1: Tenant isolation
  const householdsAsAdminA = await supabase
    .from('households')
    .select('*')
    .eq('tenant_id', tenantA.id)

  expect(householdsAsAdminA.data).toHaveLength(tenantAHouseholdCount)
  expect(householdsAsAdminA.data.every(h => h.tenant_id === tenantA.id)).toBe(true)

  // Test 2: Cross-tenant access denied
  const attemptAccessTenantBFromA = await supabase
    .from('households')
    .select('*')
    .eq('id', householdInTenantB.id) // AdminA tries to access TenantB household

  expect(attemptAccessTenantBFromA.data).toHaveLength(0) // RLS filters it out
  ```

- **Test Coverage Requirements**:
  - ✅ User can only see their own tenant's data
  - ✅ User cannot access another tenant's data by ID
  - ✅ User with multiple tenants sees correct data after context switch
  - ✅ Role permissions enforced (e.g., household-member cannot create household)
  - ✅ Session invalidation works when user removed from tenant
  - ✅ Beneficial users have read-only access to household

- **Test Tooling**:
  - Vitest for test runner
  - Supabase test client with `setAuth()` to simulate different users
  - Database transaction rollback for test isolation
  - Factory functions for creating test tenants/users/households

- **CI/CD Integration**:
  - Run RLS tests against local Supabase instance before merge
  - Separate test database seeded with test fixtures
  - Automated migration testing: apply + rollback + re-apply

**Sources**:
- Supabase Testing Guide: Client Library Testing
- Vitest Documentation: Database Testing Patterns
- Security testing frameworks: OWASP API Security Testing

---

### 6. Migration Strategy

**Question**: What's the safest approach for applying migrations across environments?

**Findings**:

- **Migration Workflow**:
  1. Develop migrations locally using Supabase CLI: `supabase db diff -f <migration_name>`
  2. Test migration on local instance: `supabase db reset` (drops + re-applies all)
  3. Peer review SQL in pull request
  4. Apply to staging: `supabase db push --db-url <staging-url>`
  5. Run integration tests on staging
  6. Apply to production: `supabase db push --db-url <production-url>`
  7. Monitor for errors, have rollback migration ready

- **Migration File Naming**:
  - Pattern: `YYYYMMDDHHMMSS_description.sql`
  - Supabase CLI auto-generates timestamp
  - Example: `20251009120000_create_roles.sql`
  - Sequential numbering in plan.md (00001-00012) for clarity

- **RLS Policy Migrations**:
  - Separate migration files for RLS policies (easier to review)
  - Always include `DROP POLICY IF EXISTS` before `CREATE POLICY`
  - Test both creation and idempotency (re-running migration)

- **Rollback Strategy**:
  - For schema changes: Create explicit `down` migration
  - For RLS policies: Can toggle `ENABLE/DISABLE ROW LEVEL SECURITY`
  - For data migrations: Store backup before applying
  - Emergency: Restore from automated Supabase backup (point-in-time recovery)

- **Zero-Downtime Migrations**:
  - Additive changes: Safe to apply anytime (new columns with defaults, new tables)
  - Destructive changes: Require multi-phase approach (deprecate → migrate → remove)
  - Column renames: Use views as compatibility layer during transition

**Sources**:
- Supabase CLI Documentation: Database Migrations
- Postgres Migration Best Practices
- Blue-green deployment patterns for database changes

---

## Technical Decision Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Multi-Tenancy Pattern** | Single DB + RLS | Aligns with Supabase best practices, reduces ops overhead, Postgres-native security |
| **Tenant Context Storage** | JWT custom claims (`app_metadata`) | Automatic inclusion in all requests, enforced at DB level via RLS policies |
| **Role Hierarchy** | Integer `hierarchy_level` + JSONB permissions | Simple comparison for privilege checks, flexible per-user overrides |
| **RLS Helper Functions** | `STABLE` SQL functions for JWT claim extraction | Performance optimization, cleaner policy syntax |
| **Indexing Strategy** | Composite `(tenant_id, id)` indexes | Ensures index-only scans for tenant-filtered queries |
| **Testing Approach** | Vitest + Supabase test client | Native TypeScript testing, easy auth simulation |
| **Migration Workflow** | Supabase CLI with peer review | Version controlled, reproducible, environment parity |

---

## Open Questions / Risks

### Risk 1: JWT Claim Propagation Delay
- **Risk**: User removed from tenant but JWT still valid for up to 1 hour
- **Mitigation**: Implement server-side session validation RPC that checks `tenant_users.is_active`
- **Action**: Add RPC function `validate_current_session()` called on sensitive operations

### Risk 2: RLS Policy Complexity
- **Risk**: As role permissions grow, RLS policies become complex and hard to maintain
- **Mitigation**: Start with simple `tenant_id` filtering, add role checks incrementally
- **Action**: Document each RLS policy with comments explaining the security model

### Risk 3: Cross-Tenant Data Leaks via JOINs
- **Risk**: Poorly written JOIN might bypass RLS if joining to non-RLS-protected table
- **Mitigation**: Apply RLS to ALL tables (even lookup tables like `roles`)
- **Action**: Code review checklist item: "Are all joined tables RLS-protected?"

### Risk 4: Performance Degradation at Scale
- **Risk**: Tenant with 10,000+ households experiences slow queries
- **Mitigation**: Monitoring + indexing strategy already defined
- **Action**: Add performance test with large dataset (1000+ households per tenant)

---

## Next Steps

1. ✅ Research complete - all technical unknowns resolved
2. ⏭️ Proceed to Phase 1: Data Model design (data-model.md)
3. ⏭️ Define API contracts based on research findings
4. ⏭️ Create quickstart guide with local dev setup

**Research Status**: ✅ COMPLETE - No blocking unknowns remain
