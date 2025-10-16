/**
 * Integration Tests: Tenant Onboarding (US1)
 * Tests the complete tenant onboarding flow including:
 * - Creating tenants
 * - Assigning first admin user
 * - Tenant context switching
 * - User tenant access verification
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/types/database.types';

// Test configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

describe('US1: Tenant Onboarding & User Access', () => {
  let serviceClient: SupabaseClient<Database>;
  let userClient: SupabaseClient<Database>;
  let testUserId: string;
  let testUserEmail: string;
  let testTenantId: string;
  let adminRoleId: string;

  beforeAll(async () => {
    // Initialize service role client (full access)
    serviceClient = createClient<Database>(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    // Get admin-head role ID
    const { data: roleData, error: roleError } = await serviceClient
      .from('role')
      .select('id')
      .eq('code', 'admin-head')
      .single();

    if (roleError || !roleData) {
      throw new Error('Failed to fetch admin-head role');
    }
    adminRoleId = roleData.id;
  });

  beforeEach(async () => {
    // Create a test user for each test
    testUserEmail = `test-${Date.now()}@example.com`;
    const { data: authData, error: authError } =
      await serviceClient.auth.admin.createUser({
        email: testUserEmail,
        password: 'Test1234!',
        email_confirm: true,
        user_metadata: {
          first_name: 'Test',
          last_name: 'User',
        },
      });

    if (authError || !authData.user) {
      throw new Error(`Failed to create test user: ${authError?.message}`);
    }
    testUserId = authData.user.id;

    // Create test tenant
    const { data: tenantData, error: tenantError } = await serviceClient
      .from('tenant')
      .insert({
        name: `Test Community ${Date.now()}`,
        slug: `test-community-${Date.now()}`,
        status: 'active',
      })
      .select()
      .single();

    if (tenantError || !tenantData) {
      throw new Error(`Failed to create test tenant: ${tenantError?.message}`);
    }
    testTenantId = tenantData.id;
  });

  afterAll(async () => {
    // Cleanup: Delete test data
    if (testTenantId) {
      await serviceClient.from('tenant').delete().eq('id', testTenantId);
    }
    if (testUserId) {
      await serviceClient.auth.admin.deleteUser(testUserId);
    }
  });

  describe('Tenant Creation', () => {
    it('should create a tenant with valid data', async () => {
      const tenantName = `Community ${Date.now()}`;
      const tenantSlug = `community-${Date.now()}`;

      const { data, error } = await serviceClient
        .from('tenant')
        .insert({
          name: tenantName,
          slug: tenantSlug,
          status: 'trial',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.name).toBe(tenantName);
      expect(data?.slug).toBe(tenantSlug);
      expect(data?.status).toBe('trial');

      // Verify residential_community_config was auto-created
      const { data: configData } = await serviceClient
        .from('residential_community_config')
        .select('*')
        .eq('tenant_id', data!.id)
        .single();

      expect(configData).toBeDefined();

      // Cleanup
      await serviceClient.from('tenant').delete().eq('id', data!.id);
    });

    it('should reject duplicate tenant slug', async () => {
      const slug = `duplicate-slug-${Date.now()}`;

      // Create first tenant
      const { data: firstTenant } = await serviceClient
        .from('tenant')
        .insert({
          name: 'First Community',
          slug: slug,
        })
        .select()
        .single();

      // Attempt to create second tenant with same slug
      const { error: duplicateError } = await serviceClient
        .from('tenant')
        .insert({
          name: 'Second Community',
          slug: slug,
        })
        .select()
        .single();

      expect(duplicateError).toBeDefined();
      expect(duplicateError?.message).toContain('duplicate');

      // Cleanup
      if (firstTenant) {
        await serviceClient.from('tenant').delete().eq('id', firstTenant.id);
      }
    });
  });

  describe('User Assignment', () => {
    it('should assign a user to tenant with admin role', async () => {
      // Get user profile ID
      const { data: profileData } = await serviceClient
        .from('user_profile')
        .select('id')
        .eq('auth_user_id', testUserId)
        .single();

      const userProfileId = profileData!.id;

      // Sign in as the test user
      const { data: sessionData } = await serviceClient.auth.signInWithPassword(
        {
          email: testUserEmail,
          password: 'Test1234!',
        }
      );
      userClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
          headers: {
            Authorization: `Bearer ${sessionData.session!.access_token}`,
          },
        },
      });

      // Assign user to tenant using service client (requires admin permissions)
      const { data: assignData, error: assignError } = await serviceClient.rpc(
        'assign_user_to_tenant',
        {
          p_user_profile_id: userProfileId,
          p_tenant_id: testTenantId,
          p_role_id: adminRoleId,
        }
      );

      expect(assignError).toBeNull();
      expect(assignData).toBeDefined();
      expect(assignData.success).toBe(true);
      expect(assignData.tenant_id).toBe(testTenantId);
      expect(assignData.role_code).toBe('admin-head');
    });

    it('should reject assignment with invalid role', async () => {
      const { data: profileData } = await serviceClient
        .from('user_profile')
        .select('id')
        .eq('auth_user_id', testUserId)
        .single();

      const invalidRoleId = '00000000-0000-0000-0000-000000000000';

      const { data, error } = await serviceClient.rpc('assign_user_to_tenant', {
        p_user_profile_id: profileData!.id,
        p_tenant_id: testTenantId,
        p_role_id: invalidRoleId,
      });

      expect(data).toBeDefined();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid role_id');
    });

    it('should reject duplicate user assignment', async () => {
      const { data: profileData } = await serviceClient
        .from('user_profile')
        .select('id')
        .eq('auth_user_id', testUserId)
        .single();

      const userProfileId = profileData!.id;

      // First assignment
      await serviceClient.rpc('assign_user_to_tenant', {
        p_user_profile_id: userProfileId,
        p_tenant_id: testTenantId,
        p_role_id: adminRoleId,
      });

      // Second assignment (should fail)
      const { data: duplicateData } = await serviceClient.rpc(
        'assign_user_to_tenant',
        {
          p_user_profile_id: userProfileId,
          p_tenant_id: testTenantId,
          p_role_id: adminRoleId,
        }
      );

      expect(duplicateData.success).toBe(false);
      expect(duplicateData.error).toContain('already assigned');
    });
  });

  describe('Get User Tenants', () => {
    beforeEach(async () => {
      // Assign user to tenant
      const { data: profileData } = await serviceClient
        .from('user_profile')
        .select('id')
        .eq('auth_user_id', testUserId)
        .single();

      await serviceClient.rpc('assign_user_to_tenant', {
        p_user_profile_id: profileData!.id,
        p_tenant_id: testTenantId,
        p_role_id: adminRoleId,
      });

      // Sign in as test user
      const { data: sessionData } = await serviceClient.auth.signInWithPassword(
        {
          email: testUserEmail,
          password: 'Test1234!',
        }
      );
      userClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
          headers: {
            Authorization: `Bearer ${sessionData.session!.access_token}`,
          },
        },
      });
    });

    it('should return all tenants accessible to user', async () => {
      const { data, error } = await userClient.rpc('get_user_tenants');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
      expect(data!.length).toBeGreaterThan(0);

      const userTenant = data!.find((t) => t.tenant_id === testTenantId);
      expect(userTenant).toBeDefined();
      expect(userTenant!.role_code).toBe('admin-head');
      expect(userTenant!.is_active).toBe(true);
    });

    it('should return empty array for user with no tenant assignments', async () => {
      // Create new user without tenant assignment
      const newUserEmail = `new-user-${Date.now()}@example.com`;
      const { data: newAuthData } =
        await serviceClient.auth.admin.createUser({
          email: newUserEmail,
          password: 'Test1234!',
          email_confirm: true,
        });

      const { data: newSessionData } =
        await serviceClient.auth.signInWithPassword({
          email: newUserEmail,
          password: 'Test1234!',
        });

      const newUserClient = createClient<Database>(
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

      const { data, error } = await newUserClient.rpc('get_user_tenants');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBe(0);

      // Cleanup
      await serviceClient.auth.admin.deleteUser(newAuthData.user!.id);
    });
  });

  describe('Switch Tenant Context', () => {
    beforeEach(async () => {
      // Assign user to tenant
      const { data: profileData } = await serviceClient
        .from('user_profile')
        .select('id')
        .eq('auth_user_id', testUserId)
        .single();

      await serviceClient.rpc('assign_user_to_tenant', {
        p_user_profile_id: profileData!.id,
        p_tenant_id: testTenantId,
        p_role_id: adminRoleId,
      });

      // Sign in as test user
      const { data: sessionData } = await serviceClient.auth.signInWithPassword(
        {
          email: testUserEmail,
          password: 'Test1234!',
        }
      );
      userClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
          headers: {
            Authorization: `Bearer ${sessionData.session!.access_token}`,
          },
        },
      });
    });

    it('should switch to accessible tenant', async () => {
      const { data, error } = await userClient.rpc('switch_tenant_context', {
        p_tenant_id: testTenantId,
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.success).toBe(true);
      expect(data.tenant_id).toBe(testTenantId);
      expect(data.role_id).toBe(adminRoleId);
    });

    it('should reject switching to inaccessible tenant', async () => {
      // Create another tenant
      const { data: otherTenantData } = await serviceClient
        .from('tenant')
        .insert({
          name: 'Other Community',
          slug: `other-${Date.now()}`,
        })
        .select()
        .single();

      const { data, error } = await userClient.rpc('switch_tenant_context', {
        p_tenant_id: otherTenantData!.id,
      });

      expect(error).toBeNull();
      expect(data.success).toBe(false);
      expect(data.error).toContain('does not have access');

      // Cleanup
      await serviceClient.from('tenant').delete().eq('id', otherTenantData!.id);
    });

    it('should reject switching to inactive tenant', async () => {
      // Update tenant status to suspended
      await serviceClient
        .from('tenant')
        .update({ status: 'suspended' })
        .eq('id', testTenantId);

      const { data } = await userClient.rpc('switch_tenant_context', {
        p_tenant_id: testTenantId,
      });

      expect(data.success).toBe(false);
      expect(data.error).toContain('not active');

      // Restore tenant status
      await serviceClient
        .from('tenant')
        .update({ status: 'active' })
        .eq('id', testTenantId);
    });
  });
});
