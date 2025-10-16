# Feature Specification: Multi-Tenant Backend with RBAC

**Feature Branch**: `001-multi-tenant-backend`
**Created**: 2025-10-09
**Status**: Draft
**Input**: User description: "Multi-tenant backend with RBAC for residential community management"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tenant Onboarding & User Access (Priority: P1)

A platform administrator creates a new residential community tenant and assigns the first admin user who can then manage their community independently.

**Why this priority**: Foundation for all multi-tenant functionality. Without tenant isolation and initial user setup, no other features can operate securely.

**Independent Test**: Can be fully tested by creating a tenant, assigning an admin user, and verifying they can only access their tenant's data and delivers a working isolated environment for one community.

**Acceptance Scenarios**:

1. **Given** a platform administrator is logged in, **When** they create a new tenant with community details, **Then** a new isolated tenant environment is created with unique identifier
2. **Given** a tenant exists, **When** the platform admin assigns a user as "admin-head" for that tenant, **Then** the user can log in and access only that tenant's data
3. **Given** a user belongs to multiple tenants, **When** they log in, **Then** they can switch between tenant contexts and see different data for each

---

### User Story 2 - Role-Based Access Control (Priority: P1)

Community administrators assign different roles to users (residents, security personnel, staff) and each role has appropriate permissions for their responsibilities.

**Why this priority**: Core security requirement. Ensures users can only perform actions and access data appropriate to their role within the community.

**Independent Test**: Create users with different roles (household-head, security-officer, admin-officer) and verify each can only access features and data permitted by their role.

**Acceptance Scenarios**:

1. **Given** an admin-head user, **When** they assign "household-head" role to a resident, **Then** the resident can manage their household but cannot access admin functions
2. **Given** a security-head user, **When** they assign "security-officer" role to a guard, **Then** the guard can log entries and report incidents but cannot modify household data
3. **Given** a household-head user, **When** they try to access construction permit approvals, **Then** access is denied with appropriate message
4. **Given** a user with "household-beneficial-user" role, **When** they access the system, **Then** they can only view vehicle pass information and basic household details

---

### User Story 3 - Household Management & Member Roles (Priority: P2)

Community administrators create household accounts and household heads manage their family members with different permission levels within the household.

**Why this priority**: Enables the residential community structure. Households are the primary organizational unit for all community operations.

**Independent Test**: Create a household, assign a household-head, add household members and beneficial users, and verify each has appropriate access to household features.

**Acceptance Scenarios**:

1. **Given** an admin-head user, **When** they create a new household with address and sticker quota, **Then** the household is created and linked to the tenant
2. **Given** a household-head user, **When** they add a family member as "household-member", **Then** the member can access household features based on assigned permissions
3. **Given** a household-head user, **When** they add a non-resident as "household-beneficial-user", **Then** the beneficial user gets limited access (vehicle pass only, no household management)
4. **Given** a household with multiple members, **When** household-head grants visiting rights to a member, **Then** that member can announce guests

---

### User Story 4 - Cross-Tenant User Management (Priority: P2)

A platform user can belong to multiple residential communities (e.g., a security company manager overseeing multiple villages) with different roles in each.

**Why this priority**: Supports real-world scenarios where users need access to multiple communities with different responsibilities in each.

**Independent Test**: Assign a single user to multiple tenants with different roles, and verify they can switch contexts and see appropriate data and permissions for each tenant.

**Acceptance Scenarios**:

1. **Given** a user assigned to Tenant A as "security-head" and Tenant B as "admin-officer", **When** they switch to Tenant A context, **Then** they see security management features
2. **Given** a user in multiple tenant contexts, **When** they switch to Tenant B, **Then** they see admin functions and all Tenant A data is completely hidden
3. **Given** a user creates data in Tenant A context, **When** they switch to Tenant B, **Then** the created data remains isolated to Tenant A and is not visible in Tenant B

---

### User Story 5 - Data Isolation & Security Enforcement (Priority: P1)

All data access is automatically filtered by tenant context, preventing users from accessing or modifying data from other communities regardless of role.

**Why this priority**: Critical security requirement. Tenant isolation must be enforced at the database level to prevent data leaks.

**Independent Test**: Attempt to access another tenant's data through various means (API calls, direct queries, role escalation) and verify all attempts are blocked with proper error handling.

**Acceptance Scenarios**:

1. **Given** two tenants (Village A and Village B) with similar data, **When** a Village A admin queries households, **Then** only Village A households are returned, never Village B
2. **Given** a user knows a household ID from another tenant, **When** they attempt to access it via API, **Then** access is denied with 404 (not found) response
3. **Given** a superadmin user viewing Tenant A, **When** they perform operations, **Then** operations are scoped to Tenant A only unless explicitly switching tenant context
4. **Given** database queries for any tenant-scoped table, **When** executed, **Then** Row-Level Security policies automatically filter by current user's tenant context

---

### Edge Cases

- What happens when a user is removed from a tenant but still has active sessions? Session should be invalidated and user logged out.
- What happens when a user has the same role in multiple tenants? System maintains separate role assignments per tenant and enforces appropriate permissions in each context.
- What happens when a household-head is demoted to household-member? User loses household management permissions immediately but retains member access.
- What happens when a tenant is suspended? All users of that tenant lose access; attempting login shows suspension notice.
- What happens when trying to assign a role that doesn't exist in the system? System rejects the assignment with validation error.
- What happens when a user tries to create a household in a tenant they don't belong to? Operation is blocked by RLS policies with appropriate error.
- What happens when a beneficial user tries to add household members? System denies the action as beneficial users have read-only access to household.

## Requirements *(mandatory)*

### Functional Requirements

#### Tenant Management

- **FR-001**: System MUST support creation of independent tenant organizations with unique identifiers
- **FR-002**: System MUST isolate all tenant data using Row-Level Security (RLS) policies at the database level
- **FR-003**: System MUST allow configuration of tenant-specific settings (rules, operating hours, policies) without affecting other tenants
- **FR-004**: System MUST track tenant status (active, trial, suspended, cancelled) and enforce access accordingly

#### User & Authentication

- **FR-005**: System MUST integrate with Supabase Auth for user authentication
- **FR-006**: System MUST support users belonging to one or more tenants simultaneously
- **FR-007**: System MUST allow users to switch between tenant contexts when they belong to multiple tenants
- **FR-008**: System MUST maintain user profile information separately from tenant-specific roles

#### Role-Based Access Control

- **FR-009**: System MUST support eight predefined roles: superadmin, admin-head, admin-officers, household-head, household-member, household-beneficial-user, security-head, security-officer
- **FR-010**: System MUST assign roles per tenant (same user can have different roles in different tenants)
- **FR-011**: System MUST enforce role permissions at both database (RLS) and application layers
- **FR-012**: System MUST resolve user permissions from JWT claims containing user_id, tenant_id, and role
- **FR-013**: System MUST support role hierarchy: superadmin > admin-head > admin-officers > household-head > household-member > household-beneficial-user
- **FR-014**: System MUST allow role-specific permission overrides on a per-user basis

#### Household Management

- **FR-015**: System MUST support creation of households with address, sticker quota, and status
- **FR-016**: System MUST link households to specific tenants for data isolation
- **FR-017**: System MUST allow household-head users to manage household members and their permissions
- **FR-018**: System MUST distinguish between household members, beneficial users, and endorsed users with different access levels
- **FR-019**: System MUST track household member types: household-head (1 per household), household-member (multiple), household-beneficial-user (multiple)

#### Data Access & Security

- **FR-020**: System MUST enforce that all queries to tenant-scoped tables automatically filter by authenticated user's current tenant context
- **FR-021**: System MUST prevent cross-tenant data access even with role escalation attempts
- **FR-022**: System MUST validate tenant_id in all create/update operations matches user's current tenant context
- **FR-023**: System MUST return 404 (not found) when attempting to access another tenant's resources, never revealing their existence
- **FR-024**: System MUST audit all data access attempts with user, tenant, and action details

#### Session & Context Management

- **FR-025**: System MUST store current tenant context in user session/JWT when user selects a tenant
- **FR-026**: System MUST invalidate sessions when user is removed from a tenant
- **FR-027**: System MUST support graceful session expiration with re-authentication flows
- **FR-028**: System MUST log user authentication, context switches, and role changes

### Key Entities

- **Tenant**: Represents a residential community organization with isolated data, settings, and user access
- **User Profile**: Core user information linked to Supabase Auth, shared across all tenants user belongs to
- **Tenant User**: Junction entity linking a user to a specific tenant with assigned role and permissions
- **Role**: Defines access permissions and capabilities (8 predefined roles with hierarchy)
- **Household**: Primary organizational unit within a tenant representing a residential property
- **Resident**: Links tenant users to households with specific permissions (visiting rights, signatory rights, primary contact)
- **Residential Community Config**: Tenant-specific configuration for rules, policies, curfews, and operational settings

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Multiple residential communities can operate independently on the same platform with zero cross-tenant data leaks
- **SC-002**: Users can be assigned different roles in different tenants and switch contexts seamlessly within 2 seconds
- **SC-003**: 100% of database queries for tenant-scoped data return only data from authenticated user's current tenant context
- **SC-004**: System correctly enforces 8 distinct role permission sets with no unauthorized access across 100+ test scenarios
- **SC-005**: Household management operations (add member, change permissions) complete in under 1 second
- **SC-006**: User authentication and role resolution from JWT claims completes in under 500ms
- **SC-007**: System handles 10+ tenants with 1000+ users each with no performance degradation
- **SC-008**: All data access is auditable with complete trail of user, tenant, action, and timestamp
- **SC-009**: Session invalidation when user removed from tenant takes effect within 5 seconds across all devices
- **SC-010**: Role permission enforcement has zero false positives (blocking authorized users) and zero false negatives (allowing unauthorized access)

## Assumptions

- Supabase Auth is used for user authentication (email/password, OAuth, magic links)
- JWT tokens will include custom claims for tenant_id and role_id
- Single database schema with RLS policies for tenant isolation (not separate databases per tenant)
- Users explicitly switch tenant context; system doesn't auto-detect from URL or subdomain
- Role permissions are defined in code/configuration, not user-modifiable
- Beneficial users and endorsed users have read-only access to household data
- Superadmin role has platform-wide access but still operates within tenant context for data operations
- Tenant suspension immediately blocks all user access; no grace period
- Default session timeout follows Supabase Auth defaults (can be customized per tenant)
- Audit logs retained for compliance (duration configurable per tenant)
