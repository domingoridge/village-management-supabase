<!--
SYNC IMPACT REPORT
==================
Version Change: [none] → 1.0.0 (Initial constitution)
Rationale: MINOR version bump - New constitution established with foundational principles

Modified Principles: N/A (initial creation)
Added Sections:
  - Core Principles (I-VIII): Centralized Backend, Security by Default, API-First Design,
    Automated Migrations & Database-Driven Logic, Static Typing & Validation,
    Testable Infrastructure, Observability & Environment Isolation, Minimal External Dependencies
  - Architecture Standards: Database-Driven Architecture, Authentication & Authorization, Repository Structure
  - Collaboration Standards: Change Management, Code Quality, Documentation
  - Tooling & Infrastructure: Required Tooling, Configuration Management
  - Governance: Constitution Authority, Amendment Process, Ownership & Governance, Future-Proofing, Complexity Justification

Removed Sections: N/A

Templates Updated:
✅ .specify/templates/plan-template.md - Constitution Check section populated with specific gates aligned to all principles
✅ .specify/templates/spec-template.md - Verified, no changes required (technology-agnostic by design)
✅ .specify/templates/tasks-template.md - Verified, no changes required (supports any architecture)
✅ .claude/commands/*.md - Verified, no generic guidance issues found

Follow-up TODOs:
- None - all placeholders resolved, all templates updated
-->

# Village Management Backend Constitution

## Core Principles

### I. Centralized Backend & Single Source of Truth

This repository is the canonical backend interface for all frontend portals (web and mobile). All database schema, Row Level Security (RLS) policies, and migrations MUST originate from this repository. Frontend teams consume this backend through generated clients, REST, or GraphQL endpoints and MUST NOT modify backend logic directly.

**Rationale**: Maintaining a single source of truth prevents schema drift, ensures consistent security policies across all consuming applications, and enables coordinated evolution of the backend infrastructure.

### II. Security by Default

Every query, API route, and RPC function MUST enforce the principle of least privilege and apply Row Level Security (RLS). Authentication and authorization MUST be integrated via Supabase Auth using JWT claims. All data access MUST be validated at the database level.

**Rationale**: Defense in depth requires security at every layer. RLS policies ensure data isolation even if application-level security is bypassed, protecting against privilege escalation and unauthorized data access.

### III. API-First Design

All data and services MUST be exposed through a consistent and documented API layer using PostgREST, RPC functions, or edge functions. API contracts MUST be versioned following semantic versioning (semver) for schema evolution. Breaking changes MUST include a migration path for consuming applications.

**Rationale**: Well-defined API contracts enable independent evolution of frontend and backend systems, support multiple client applications, and provide clear integration points for future extensions.

### IV. Automated Migrations & Database-Driven Logic

Database schema and migration changes MUST be versioned and applied via Supabase CLI workflows. Manual SQL edits outside of migrations are PROHIBITED. Critical business rules MUST be implemented as database functions, triggers, or RLS policies where appropriate.

**Rationale**: Automated migrations ensure reproducibility across environments, enable version control of schema changes, and allow rollback capabilities. Database-driven logic centralizes business rules and ensures consistency regardless of client implementation.

### V. Static Typing & Validation

TypeScript MUST be used for all backend and edge function code. Data validation MUST use Zod schemas for strong typing in both client and server contexts. All external inputs MUST be validated before processing.

**Rationale**: Static typing catches errors at compile time, improves code maintainability, and provides better developer experience through autocomplete and type inference. Schema validation ensures data integrity at system boundaries.

### VI. Testable Infrastructure

Backend code and database logic (triggers, RPCs, stored procedures) MUST be covered by integration tests where feasible. Test environments MUST mirror production configuration. Critical user flows MUST have automated test coverage.

**Rationale**: Automated testing prevents regressions, documents expected behavior, and enables confident refactoring. Database logic is as critical as application code and requires equivalent test coverage.

### VII. Observability & Environment Isolation

All errors, logs, and metrics MUST be traceable through a consistent logging strategy. Separate environments (local, staging, production) MUST maintain strict separation of credentials and keys. Environment-specific configurations MUST be loaded securely via environment variables or secret managers.

**Rationale**: Observability enables rapid debugging and system monitoring. Environment isolation prevents accidental production impacts during development and ensures proper testing before deployment.

### VIII. Minimal External Dependencies

The system MUST rely primarily on Supabase's native capabilities (Postgres, Edge Functions, Auth) to reduce maintenance overhead. External dependencies MUST be justified by clear value addition and evaluated for long-term maintainability.

**Rationale**: Reducing external dependencies minimizes security vulnerabilities, simplifies upgrades, and leverages the full power of the chosen platform. Every dependency is a maintenance burden and potential failure point.

## Architecture Standards

### Database-Driven Architecture

- Critical business rules MUST be implemented as Postgres functions, triggers, or RLS policies
- Edge functions MUST remain stateless and delegate persistence to the database
- Schema design MUST support multi-tenancy and horizontal scaling
- All database objects (functions, triggers, views) MUST be created via migrations

### Authentication & Authorization

- Supabase Auth MUST serve as the identity provider
- User roles and permissions MUST be integrated via JWT claims
- RLS policies MUST reference auth.uid() and JWT claims for access control
- Session management MUST follow Supabase Auth best practices

### Repository Structure

The repository MUST maintain clear separation:

- `/supabase/` → migrations, policies, seeds, database functions
- `/src/` → TypeScript helpers, server logic, edge functions
- `/tests/` → unit and integration tests
- `/docs/` → API documentation, architecture decisions, runbooks

## Collaboration Standards

### Change Management

- All schema or RLS policy changes MUST be peer-reviewed via pull requests
- Each migration MUST include a descriptive name and rationale comment
- Breaking changes MUST include impact assessment and migration guide
- Database migrations MUST be tested in non-production environments first

### Code Quality

- Environment variables MUST NEVER be committed to version control
- `.env.example` MUST document all required environment variables
- All changes MUST pass CI tests including linting, type checking, and migration validation
- Code reviews MUST verify compliance with constitution principles

### Documentation

- API changes MUST update corresponding documentation
- Breaking changes MUST be documented in CHANGELOG.md
- Architecture Decision Records (ADRs) MUST capture significant technical decisions
- Runbooks MUST be maintained for operational procedures

## Tooling & Infrastructure

### Required Tooling

- **TypeScript**: All backend and edge function code
- **Supabase CLI**: Migrations, local development, deployment automation
- **Vitest**: Unit and integration testing
- **ESLint + Prettier**: Linting and code formatting
- **Git**: Version control with conventional commit messages

### Configuration Management

- All configurations MUST be environment-specific
- Secrets MUST be loaded via `dotenv` or platform-provided secret managers
- Local development MUST use Supabase local development environment
- CI/CD pipelines MUST validate migrations before deployment

## Governance

### Constitution Authority

This constitution supersedes all other development practices and conventions. When conflicts arise, constitution principles take precedence. All pull requests and code reviews MUST verify compliance with constitutional requirements.

### Amendment Process

1. Constitutional amendments MUST be proposed via pull request
2. Amendments MUST include rationale and impact assessment
3. Breaking changes require MAJOR version bump
4. New principles or substantial additions require MINOR version bump
5. Clarifications and corrections require PATCH version bump
6. Amendments require approval from project maintainers

### Ownership & Governance

- This repository owns the **database schema**, **security policies**, and **API contracts**
- Frontend teams consume services through defined interfaces
- Frontend teams MUST NOT modify backend logic, schema, or policies
- API versioning follows Semantic Versioning (semver)
- Deprecation notices MUST provide minimum 2 release cycles before removal

### Future-Proofing

- Schema and APIs MUST support multiple tenants and future extensions
- Design decisions MUST consider mobile and third-party integrations
- System architecture MUST enable horizontal scaling via Supabase's capabilities
- Technology choices MUST prioritize long-term maintainability over short-term convenience

### Complexity Justification

Any violation of constitutional principles MUST be explicitly justified in design documentation with:

- Clear explanation of why the principle cannot be followed
- Simpler alternatives considered and why they were rejected
- Mitigation strategy for risks introduced by the violation
- Plan to return to constitutional compliance if possible

**Version**: 1.0.0 | **Ratified**: 2025-10-09 | **Last Amended**: 2025-10-09
