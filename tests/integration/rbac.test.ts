/**
 * Integration Tests: Role-Based Access Control (US2)
 * Tests the complete RBAC system including:
 * - Role hierarchy enforcement
 * - Permission checking
 * - User-specific permission overrides
 * - Cross-role access patterns
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/types/database.types';

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

describe('US2: Role-Based Access Control (RBAC)', () => {
  let serviceClient: SupabaseClient<Database>;
  let testTenantId: string;
  let roleIds: Record<string, string> = {};

  // Test users with different roles
  let adminUser: { id: string; email: string; profileId: string };
  let securityOfficerUser: { id: string; email: string; profileId: string };
  let householdHeadUser: { id: string; email: string; profileId: string };
  let householdMemberUser: { id: string; email: string; profileId: string };

  beforeAll(async () => {
    serviceClient = createClient<Database>(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    // Fetch all role IDs
    const { data: rolesData, error: rolesError } = await serviceClient
      .from('role')
      .select('id, code');

    if (rolesError || !rolesData) {
      throw new Error('Failed to fetch roles');
    }

    rolesData.forEach((role) => {
      roleIds[role.code] = role.id;
    });

    // Create test tenant
    const { data: tenantData, error: tenantError } = await serviceClient
      .from('tenant')
      .insert({
        name: `RBAC Test Community ${Date.now()}`,
        slug: `rbac-test-${Date.now()}`,
        status: 'active',
      })
      .select()
      .single();

    if (tenantError || !tenantData) {
      throw new Error('Failed to create test tenant');
    }
    testTenantId = tenantData.id;
  });

  beforeEach(async () => {
    // Create test users with different roles
    const timestamp = Date.now();

    // Admin user
    const adminEmail = `admin-${timestamp}@example.com`;
    const { data: adminAuthData } = await serviceClient.auth.admin.createUser({
      email: adminEmail,
      password: 'Test1234!',
      email_confirm: true,
      user_metadata: { first_name: 'Admin', last_name: 'User' },
    });
    const { data: adminProfileData } = await serviceClient
      .from('user_profile')
      .select('id')
      .eq('auth_user_id', adminAuthData.user!.id)
      .single();
    adminUser = {
      id: adminAuthData.user!.id,
      email: adminEmail,
      profileId: adminProfileData!.id,
    };
    await serviceClient.rpc('assign_user_to_tenant', {
      p_user_profile_id: adminUser.profileId,
      p_tenant_id: testTenantId,
      p_role_id: roleIds['admin-head'],
    });

    // Security officer user
    const securityEmail = `security-${timestamp}@example.com`;
    const { data: securityAuthData } =
      await serviceClient.auth.admin.createUser({
        email: securityEmail,
        password: 'Test1234!',
        email_confirm: true,
        user_metadata: { first_name: 'Security', last_name: 'Officer' },
      });
    const { data: securityProfileData } = await serviceClient
      .from('user_profile')
      .select('id')
      .eq('auth_user_id', securityAuthData.user!.id)
      .single();
    securityOfficerUser = {
      id: securityAuthData.user!.id,
      email: securityEmail,
      profileId: securityProfileData!.id,
    };
    await serviceClient.rpc('assign_user_to_tenant', {
      p_user_profile_id: securityOfficerUser.profileId,
      p_tenant_id: testTenantId,
      p_role_id: roleIds['security-officer'],
    });

    // Household head user
    const headEmail = `head-${timestamp}@example.com`;
    const { data: headAuthData } = await serviceClient.auth.admin.createUser({
      email: headEmail,
      password: 'Test1234!',
      email_confirm: true,
      user_metadata: { first_name: 'Household', last_name: 'Head' },
    });
    const { data: headProfileData } = await serviceClient
      .from('user_profile')
      .select('id')
      .eq('auth_user_id', headAuthData.user!.id)
      .single();
    householdHeadUser = {
      id: headAuthData.user!.id,
      email: headEmail,
      profileId: headProfileData!.id,
    };
    await serviceClient.rpc('assign_user_to_tenant', {
      p_user_profile_id: householdHeadUser.profileId,
      p_tenant_id: testTenantId,
      p_role_id: roleIds['household-head'],
    });

    // Household member user
    const memberEmail = `member-${timestamp}@example.com`;
    const { data: memberAuthData } = await serviceClient.auth.admin.createUser(
      {
        email: memberEmail,
        password: 'Test1234!',
        email_confirm: true,
        user_metadata: { first_name: 'Household', last_name: 'Member' },
      }
    );
    const { data: memberProfileData } = await serviceClient
      .from('user_profile')
      .select('id')
      .eq('auth_user_id', memberAuthData.user!.id)
      .single();
    householdMemberUser = {
      id: memberAuthData.user!.id,
      email: memberEmail,
      profileId: memberProfileData!.id,
    };
    await serviceClient.rpc('assign_user_to_tenant', {
      p_user_profile_id: householdMemberUser.profileId,
      p_tenant_id: testTenantId,
      p_role_id: roleIds['household-member'],
    });
  });

  afterAll(async () => {
    // Cleanup
    if (testTenantId) {
      await serviceClient.from('tenant').delete().eq('id', testTenantId);
    }
    if (adminUser) {
      await serviceClient.auth.admin.deleteUser(adminUser.id);
    }
    if (securityOfficerUser) {
      await serviceClient.auth.admin.deleteUser(securityOfficerUser.id);
    }
    if (householdHeadUser) {
      await serviceClient.auth.admin.deleteUser(householdHeadUser.id);
    }
    if (householdMemberUser) {
      await serviceClient.auth.admin.deleteUser(householdMemberUser.id);
    }
  });

  describe('Permission Checking', () => {
    it('should grant admin user management permissions', async () => {
      // Sign in as admin
      const { data: sessionData } = await serviceClient.auth.signInWithPassword(
        {
          email: adminUser.email,
          password: 'Test1234!',
        }
      );

      const adminClient = createClient<Database>(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
          global: {
            headers: {
              Authorization: `Bearer ${sessionData.session!.access_token}`,
            },
          },
        }
      );

      // Update app_metadata with tenant context
      await serviceClient.auth.admin.updateUserById(adminUser.id, {
        app_metadata: {
          tenant_id: testTenantId,
          role_id: roleIds['admin-head'],
        },
      });

      // Get new session with updated metadata
      const { data: newSessionData } =
        await serviceClient.auth.signInWithPassword({
          email: adminUser.email,
          password: 'Test1234!',
        });

      const adminClientWithContext = createClient<Database>(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
          global: {
            headers: {
              Authorization: `Bearer ${newSessionData.session!.access_token}`,
            },
          },
        }
      );

      const { data: hasManageUsers, error } =
        await adminClientWithContext.rpc('check_user_permission', {
          p_permission_key: 'manage_users',
        });

      expect(error).toBeNull();
      expect(hasManageUsers).toBe(true);
    });

    it('should deny household member management permissions', async () => {
      // Sign in as household member
      const { data: sessionData } = await serviceClient.auth.signInWithPassword(
        {
          email: householdMemberUser.email,
          password: 'Test1234!',
        }
      );

      // Update app_metadata with tenant context
      await serviceClient.auth.admin.updateUserById(householdMemberUser.id, {
        app_metadata: {
          tenant_id: testTenantId,
          role_id: roleIds['household-member'],
        },
      });

      // Get new session
      const { data: newSessionData } =
        await serviceClient.auth.signInWithPassword({
          email: householdMemberUser.email,
          password: 'Test1234!',
        });

      const memberClient = createClient<Database>(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
          global: {
            headers: {
              Authorization: `Bearer ${newSessionData.session!.access_token}`,
            },
          },
        }
      );

      const { data: hasManageUsers } = await memberClient.rpc(
        'check_user_permission',
        {
          p_permission_key: 'manage_users',
        }
      );

      expect(hasManageUsers).toBe(false);
    });

    it('should check multiple permissions at once', async () => {
      // Sign in as security officer
      const { data: sessionData } = await serviceClient.auth.signInWithPassword(
        {
          email: securityOfficerUser.email,
          password: 'Test1234!',
        }
      );

      // Update app_metadata
      await serviceClient.auth.admin.updateUserById(securityOfficerUser.id, {
        app_metadata: {
          tenant_id: testTenantId,
          role_id: roleIds['security-officer'],
        },
      });

      // Get new session
      const { data: newSessionData } =
        await serviceClient.auth.signInWithPassword({
          email: securityOfficerUser.email,
          password: 'Test1234!',
        });

      const securityClient = createClient<Database>(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
          global: {
            headers: {
              Authorization: `Bearer ${newSessionData.session!.access_token}`,
            },
          },
        }
      );

      const { data: permissions, error } = await securityClient.rpc(
        'check_user_permissions',
        {
          p_permission_keys: [
            'view_gate_logs',
            'manage_visitors',
            'manage_users',
          ],
        }
      );

      expect(error).toBeNull();
      expect(permissions).toBeDefined();
      expect(Array.isArray(permissions)).toBe(true);

      // Security officer should have gate-related permissions
      const viewGateLogs = permissions!.find(
        (p) => p.permission_key === 'view_gate_logs'
      );
      const manageVisitors = permissions!.find(
        (p) => p.permission_key === 'manage_visitors'
      );
      const manageUsers = permissions!.find(
        (p) => p.permission_key === 'manage_users'
      );

      expect(viewGateLogs?.has_permission).toBe(true);
      expect(manageVisitors?.has_permission).toBe(true);
      expect(manageUsers?.has_permission).toBe(false);
    });
  });

  describe('Permission Overrides', () => {
    it('should allow user-specific permission overrides', async () => {
      // Give household member a specific permission override
      await serviceClient
        .from('tenant_user')
        .update({
          permissions: { view_reports: true },
        })
        .eq('user_profile_id', householdMemberUser.profileId)
        .eq('tenant_id', testTenantId);

      // Sign in and set context
      await serviceClient.auth.admin.updateUserById(householdMemberUser.id, {
        app_metadata: {
          tenant_id: testTenantId,
          role_id: roleIds['household-member'],
        },
      });

      const { data: sessionData } = await serviceClient.auth.signInWithPassword(
        {
          email: householdMemberUser.email,
          password: 'Test1234!',
        }
      );

      const memberClient = createClient<Database>(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
          global: {
            headers: {
              Authorization: `Bearer ${sessionData.session!.access_token}`,
            },
          },
        }
      );

      const { data: hasViewReports } = await memberClient.rpc(
        'check_user_permission',
        {
          p_permission_key: 'view_reports',
        }
      );

      expect(hasViewReports).toBe(true);
    });

    it('should prioritize user override over role permission', async () => {
      // Admin normally has manage_users permission
      // Override to deny it for this specific admin user
      await serviceClient
        .from('tenant_user')
        .update({
          permissions: { manage_users: false },
        })
        .eq('user_profile_id', adminUser.profileId)
        .eq('tenant_id', testTenantId);

      // Sign in and set context
      await serviceClient.auth.admin.updateUserById(adminUser.id, {
        app_metadata: {
          tenant_id: testTenantId,
          role_id: roleIds['admin-head'],
        },
      });

      const { data: sessionData } = await serviceClient.auth.signInWithPassword(
        {
          email: adminUser.email,
          password: 'Test1234!',
        }
      );

      const adminClient = createClient<Database>(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
          global: {
            headers: {
              Authorization: `Bearer ${sessionData.session!.access_token}`,
            },
          },
        }
      );

      const { data: hasManageUsers } = await adminClient.rpc(
        'check_user_permission',
        {
          p_permission_key: 'manage_users',
        }
      );

      // Should be false due to override
      expect(hasManageUsers).toBe(false);
    });
  });

  describe('Get All Permissions', () => {
    it('should return merged permissions for user', async () => {
      // Set user-specific override
      await serviceClient
        .from('tenant_user')
        .update({
          permissions: { custom_permission: true },
        })
        .eq('user_profile_id', householdHeadUser.profileId)
        .eq('tenant_id', testTenantId);

      // Sign in and set context
      await serviceClient.auth.admin.updateUserById(householdHeadUser.id, {
        app_metadata: {
          tenant_id: testTenantId,
          role_id: roleIds['household-head'],
        },
      });

      const { data: sessionData } = await serviceClient.auth.signInWithPassword(
        {
          email: householdHeadUser.email,
          password: 'Test1234!',
        }
      );

      const headClient = createClient<Database>(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
          global: {
            headers: {
              Authorization: `Bearer ${sessionData.session!.access_token}`,
            },
          },
        }
      );

      const { data: allPermissions, error } = await headClient.rpc(
        'get_current_user_permissions'
      );

      expect(error).toBeNull();
      expect(allPermissions).toBeDefined();
      expect(typeof allPermissions).toBe('object');

      // Should include both role permissions and user override
      expect(allPermissions).toHaveProperty('manage_household');
      expect(allPermissions).toHaveProperty('custom_permission');
      expect(allPermissions.custom_permission).toBe(true);
    });
  });

  describe('Role Hierarchy', () => {
    it('should enforce hierarchy levels in role table', async () => {
      const { data: rolesData } = await serviceClient
        .from('role')
        .select('code, hierarchy_level')
        .order('hierarchy_level', { ascending: true });

      expect(rolesData).toBeDefined();

      // Verify hierarchy order
      const superadmin = rolesData!.find((r) => r.code === 'superadmin');
      const adminHead = rolesData!.find((r) => r.code === 'admin-head');
      const householdMember = rolesData!.find(
        (r) => r.code === 'household-member'
      );

      expect(superadmin!.hierarchy_level).toBeLessThan(
        adminHead!.hierarchy_level
      );
      expect(adminHead!.hierarchy_level).toBeLessThan(
        householdMember!.hierarchy_level
      );
    });
  });
});
