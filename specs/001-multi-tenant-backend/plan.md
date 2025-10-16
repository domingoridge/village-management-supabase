# Implementation Plan: Multi-Tenant Backend with RBAC

**Branch**: `001-multi-tenant-backend` | **Date**: 2025-10-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-multi-tenant-backend/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a foundational multi-tenant Supabase backend with Row-Level Security (RLS) that supports residential community management. The system enables multiple independent organizations (tenants) to operate on a shared infrastructure with complete data isolation. Implements 8-role RBAC system with JWT-based authentication, supporting users who can belong to multiple tenants with different roles in each.

## Technical Context

**Language/Version**: TypeScript 5.x (Latest stable)
**Primary Dependencies**:
- Supabase (Postgres 15+ with RLS, Auth, Storage, Edge Functions)
- Zod 3.x for schema validation
- Vitest for testing

**Storage**: PostgreSQL 15+ (via Supabase) with Row-Level Security policies
**Testing**: Vitest for unit and integration tests
**Target Platform**: Supabase Cloud / Self-hosted Supabase (Docker-based local development)
**Project Type**: Backend-only (single project structure - Supabase backend)
**Performance Goals**:
- JWT auth/role resolution: <500ms
- Tenant context switching: <2s
- Household operations: <1s
- Support 10+ tenants with 1000+ users each

**Constraints**:
- Must enforce 100% data isolation via RLS (no cross-tenant data leaks)
- Session invalidation within 5s when user removed from tenant
- All queries auto-filtered by tenant context
- Zero false positives/negatives in role permission enforcement

**Scale/Scope**:
- Initial: 10-50 tenants, 100-1000 users per tenant
- Future: 100+ tenants, 10,000+ users per tenant
- 8 predefined roles with hierarchy
- 7 core tables (tenant, user_profile, tenant_user, role, household, resident, residential_community_config)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with constitution v1.0.0 principles:

### Security & Access Control
- [x] All database queries enforce Row Level Security (RLS) - **Core feature: Multi-tenant RLS policies**
- [x] API endpoints authenticated via Supabase Auth with JWT claims - **Using Supabase Auth with custom JWT claims for tenant_id and role**
- [x] Least privilege principle applied to all data access - **8-role RBAC with hierarchy enforcement**
- [x] All external inputs validated using Zod schemas - **Zod validation for all API inputs**

### Database & Migrations
- [x] Schema changes implemented via Supabase CLI migrations only - **All schema via Supabase CLI migrations**
- [x] Critical business rules implemented as database functions/triggers/RLS - **RLS policies for tenant isolation, triggers for audit**
- [x] Multi-tenancy support in schema design - **Tenant_id column in all tenant-scoped tables**
- [x] All migrations tested in non-production environments first - **Local Supabase instance for testing**

### API & Integration
- [x] API contracts documented (OpenAPI/GraphQL schema) - **PostgREST auto-generated from schema + RPC functions**
- [x] API versioning follows semver - **API version in schema, migration-based evolution**
- [x] Breaking changes include migration guide - **Migration scripts document schema changes**
- [x] Edge functions are stateless (delegate persistence to database) - **Edge functions for complex logic, database for state**

### Code Quality & Testing
- [x] TypeScript used for all backend/edge function code - **TypeScript for all server-side code**
- [x] Integration tests cover critical user flows - **Vitest tests for tenant isolation, RBAC, user flows**
- [x] Database logic (triggers, RPCs) has test coverage - **Test RLS policies, triggers, RPC functions**
- [x] Linting (ESLint) and formatting (Prettier) configured - **ESLint + Prettier setup**

### Environment & Configuration
- [x] Environment isolation (local/staging/production) configured - **Supabase projects per environment**
- [x] No credentials committed (use .env.example + secret managers) - **.env.example for required vars**
- [x] Consistent logging strategy for errors/metrics - **Structured logging for auth, data access, errors**
- [x] Supabase local development environment used - **Docker-based Supabase local dev**

### Architecture Standards
- [x] Repository structure follows: /supabase, /src, /tests, /docs - **Standard Supabase project structure**
- [x] Dependencies justified and minimal (prefer Supabase native) - **Only Supabase native + Zod for validation**
- [x] Horizontal scaling considerations in design - **Tenant-based sharding ready, Postgres replication support**
- [x] Change management via peer-reviewed PRs - **All schema/RLS changes via PR**

**✅ All gates PASSED - No complexity justification needed**

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
supabase/
├── migrations/
│   ├── 00001_create_roles.sql
│   ├── 00002_create_tenants.sql
│   ├── 00003_create_user_profiles.sql
│   ├── 00004_create_tenant_users.sql
│   ├── 00005_create_households.sql
│   ├── 00006_create_residents.sql
│   ├── 00007_create_residential_community_config.sql
│   ├── 00008_rls_policies_tenants.sql
│   ├── 00009_rls_policies_tenant_users.sql
│   ├── 00010_rls_policies_households.sql
│   ├── 00011_rls_policies_residents.sql
│   └── 00012_auth_triggers_and_functions.sql
├── functions/
│   ├── get-user-tenants/        # RPC: Get tenants for current user
│   ├── switch-tenant-context/   # RPC: Switch user's active tenant
│   ├── assign-user-to-tenant/   # RPC: Add user to tenant with role
│   └── check-user-permission/   # RPC: Validate user permission in tenant
├── seed.sql                     # Seed data: roles, test tenants
└── config.toml                  # Supabase local config

src/
├── types/
│   ├── database.types.ts        # Generated from Supabase schema
│   ├── auth.types.ts            # JWT claim types
│   └── api.types.ts             # API request/response types
├── validation/
│   ├── tenant.schema.ts         # Zod schemas for tenant operations
│   ├── user.schema.ts           # Zod schemas for user operations
│   └── household.schema.ts      # Zod schemas for household operations
├── utils/
│   ├── jwt-helpers.ts           # JWT claim extraction/validation
│   ├── rls-helpers.ts           # RLS policy testing utilities
│   └── logger.ts                # Structured logging
└── edge-functions/              # Optional: Complex business logic
    └── validate-tenant-access/  # Edge function for access validation

tests/
├── integration/
│   ├── tenant-isolation.test.ts        # Test cross-tenant data isolation
│   ├── rbac-permissions.test.ts        # Test role permissions
│   ├── user-multi-tenant.test.ts       # Test multi-tenant user scenarios
│   └── household-management.test.ts    # Test household operations
├── rls/
│   ├── tenant-rls.test.ts             # Test tenant RLS policies
│   ├── household-rls.test.ts          # Test household RLS policies
│   └── user-context.test.ts           # Test user context switching
└── unit/
    ├── jwt-helpers.test.ts
    └── validation.test.ts

docs/
├── architecture/
│   ├── multi-tenancy-design.md
│   ├── rbac-model.md
│   └── rls-strategy.md
└── api/
    └── api-reference.md            # Generated API docs
```

**Structure Decision**: Using Supabase-standard single-project structure. All backend logic lives in `/supabase` (migrations, functions, RLS policies) and `/src` (TypeScript utilities, validation). This aligns with constitution's repository structure principle and Supabase best practices. No frontend code in this repository per constitution (frontend teams consume via generated clients/APIs).

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
