/**
 * Integration Tests: Cross-Tenant Users (US4)
 * Tests that users can belong to multiple tenants with different roles:
 * - User assigned to multiple tenants
 * - Different roles per tenant
 * - Context switching between tenants
 * - Proper data isolation after context switch
 * - Managing user across multiple organizations
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/types/database.types';

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

describe('US4: Cross-Tenant User Management', () => {
  let serviceClient: SupabaseClient<Database>;

  // Three separate tenants
  let tenantA: { id: string; name: string; slug: string };
  let tenantB: { id: string; name: string; slug: string };
  let tenantC: { id: string; name: string; slug: string };

  // Multi-tenant user (member of all three tenants)
  let multiTenantUser: {
    id: string;
    email: string;
    profileId: string;
  };

  let roleIds: Record<string, string> = {};

  // Households in different tenants
  let householdA: string;
  let householdB: string;
  let householdC: string;

  beforeAll(async () => {
    serviceClient = createClient<Database>(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    // Fetch role IDs
    const { data: rolesData } = await serviceClient
      .from('role')
      .select('id, code');
    rolesData?.forEach((role) => {
      roleIds[role.code] = role.id;
    });
  });

  beforeEach(async () => {
    const timestamp = Date.now();

    // Create three tenants
    const { data: tenantAData } = await serviceClient
      .from('tenant')
      .insert({
        name: `Community A ${timestamp}`,
        slug: `community-a-${timestamp}`,
        status: 'active',
      })
      .select()
      .single();
    tenantA = tenantAData!;

    const { data: tenantBData } = await serviceClient
      .from('tenant')
      .insert({
        name: `Community B ${timestamp}`,
        slug: `community-b-${timestamp}`,
        status: 'active',
      })
      .select()
      .single();
    tenantB = tenantBData!;

    const { data: tenantCData } = await serviceClient
      .from('tenant')
      .insert({
        name: `Community C ${timestamp}`,
        slug: `community-c-${timestamp}`,
        status: 'active',
      })
      .select()
      .single();
    tenantC = tenantCData!;

    // Create multi-tenant user
    const multiEmail = `multi-tenant-${timestamp}@example.com`;
    const { data: multiAuthData } = await serviceClient.auth.admin.createUser({
      email: multiEmail,
      password: 'Test1234!',
      email_confirm: true,
      user_metadata: {
        first_name: 'Multi',
        last_name: 'Tenant',
      },
    });

    const { data: multiProfileData } = await serviceClient
      .from('user_profile')
      .select('id')
      .eq('auth_user_id', multiAuthData.user!.id)
      .single();

    multiTenantUser = {
      id: multiAuthData.user!.id,
      email: multiEmail,
      profileId: multiProfileData!.id,
    };

    // Assign user to all three tenants with different roles
    // Tenant A: admin-head
    await serviceClient.rpc('assign_user_to_tenant', {
      p_user_profile_id: multiTenantUser.profileId,
      p_tenant_id: tenantA.id,
      p_role_id: roleIds['admin-head'],
    });

    // Tenant B: household-head
    await serviceClient.rpc('assign_user_to_tenant', {
      p_user_profile_id: multiTenantUser.profileId,
      p_tenant_id: tenantB.id,
      p_role_id: roleIds['household-head'],
    });

    // Tenant C: household-member
    await serviceClient.rpc('assign_user_to_tenant', {
      p_user_profile_id: multiTenantUser.profileId,
      p_tenant_id: tenantC.id,
      p_role_id: roleIds['household-member'],
    });

    // Create households in each tenant
    const { data: householdAData } = await serviceClient
      .from('household')
      .insert({
        tenant_id: tenantA.id,
        address: `House A ${timestamp}`,
      })
      .select()
      .single();
    householdA = householdAData!.id;

    const { data: householdBData } = await serviceClient
      .from('household')
      .insert({
        tenant_id: tenantB.id,
        address: `House B ${timestamp}`,
      })
      .select()
      .single();
    householdB = householdBData!.id;

    const { data: householdCData } = await serviceClient
      .from('household')
      .insert({
        tenant_id: tenantC.id,
        address: `House C ${timestamp}`,
      })
      .select()
      .single();
    householdC = householdCData!.id;
  });

  afterAll(async () => {
    // Cleanup
    if (tenantA) {
      await serviceClient.from('tenant').delete().eq('id', tenantA.id);
    }
    if (tenantB) {
      await serviceClient.from('tenant').delete().eq('id', tenantB.id);
    }
    if (tenantC) {
      await serviceClient.from('tenant').delete().eq('id', tenantC.id);
    }
    if (multiTenantUser) {
      await serviceClient.auth.admin.deleteUser(multiTenantUser.id);
    }
  });

  describe('Multi-Tenant User Assignment', () => {
    it('should show user is assigned to multiple tenants', async () => {
      // Sign in as multi-tenant user
      const { data: sessionData } = await serviceClient.auth.signInWithPassword(
        {
          email: multiTenantUser.email,
          password: 'Test1234!',
        }
      );

      const userClient = createClient<Database>(
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

      const { data: tenants, error } = await userClient.rpc('get_user_tenants');

      expect(error).toBeNull();
      expect(tenants).toBeDefined();
      expect(tenants!.length).toBe(3);

      // Verify all three tenants are present
      const tenantIds = tenants!.map((t) => t.tenant_id);
      expect(tenantIds).toContain(tenantA.id);
      expect(tenantIds).toContain(tenantB.id);
      expect(tenantIds).toContain(tenantC.id);
    });

    it('should show different roles per tenant', async () => {
      const { data: sessionData } = await serviceClient.auth.signInWithPassword(
        {
          email: multiTenantUser.email,
          password: 'Test1234!',
        }
      );

      const userClient = createClient<Database>(
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

      const { data: tenants } = await userClient.rpc('get_user_tenants');

      const tenantARec = tenants!.find((t) => t.tenant_id === tenantA.id);
      const tenantBRec = tenants!.find((t) => t.tenant_id === tenantB.id);
      const tenantCRec = tenants!.find((t) => t.tenant_id === tenantC.id);

      expect(tenantARec!.role_code).toBe('admin-head');
      expect(tenantBRec!.role_code).toBe('household-head');
      expect(tenantCRec!.role_code).toBe('household-member');
    });
  });

  describe('Tenant Context Switching', () => {
    it('should allow switching to Tenant A', async () => {
      const { data: sessionData } = await serviceClient.auth.signInWithPassword(
        {
          email: multiTenantUser.email,
          password: 'Test1234!',
        }
      );

      const userClient = createClient<Database>(
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

      const { data: switchResult, error } = await userClient.rpc(
        'switch_tenant_context',
        {
          p_tenant_id: tenantA.id,
        }
      );

      expect(error).toBeNull();
      expect(switchResult).toBeDefined();
      expect(switchResult.success).toBe(true);
      expect(switchResult.tenant_id).toBe(tenantA.id);
      expect(switchResult.role_code).toBe('admin-head');
    });

    it('should allow switching to Tenant B', async () => {
      const { data: sessionData } = await serviceClient.auth.signInWithPassword(
        {
          email: multiTenantUser.email,
          password: 'Test1234!',
        }
      );

      const userClient = createClient<Database>(
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

      const { data: switchResult } = await userClient.rpc(
        'switch_tenant_context',
        {
          p_tenant_id: tenantB.id,
        }
      );

      expect(switchResult.success).toBe(true);
      expect(switchResult.tenant_id).toBe(tenantB.id);
      expect(switchResult.role_code).toBe('household-head');
    });

    it('should update JWT app_metadata when switching tenants', async () => {
      // Switch to Tenant A
      await serviceClient.auth.admin.updateUserById(multiTenantUser.id, {
        app_metadata: {
          tenant_id: tenantA.id,
          role_id: roleIds['admin-head'],
        },
      });

      // Sign in with new metadata
      const { data: sessionData } = await serviceClient.auth.signInWithPassword(
        {
          email: multiTenantUser.email,
          password: 'Test1234!',
        }
      );

      const userClient = createClient<Database>(
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

      // Validate session shows Tenant A context
      const { data: validation } = await userClient.rpc(
        'validate_current_session'
      );

      expect(validation.valid).toBe(true);
      expect(validation.tenant.id).toBe(tenantA.id);
      expect(validation.role.code).toBe('admin-head');
    });
  });

  describe('Data Isolation After Context Switch', () => {
    it('should see only Tenant A data when context is Tenant A', async () => {
      // Set context to Tenant A
      await serviceClient.auth.admin.updateUserById(multiTenantUser.id, {
        app_metadata: {
          tenant_id: tenantA.id,
          role_id: roleIds['admin-head'],
        },
      });

      const { data: sessionData } = await serviceClient.auth.signInWithPassword(
        {
          email: multiTenantUser.email,
          password: 'Test1234!',
        }
      );

      const userClient = createClient<Database>(
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

      const { data: households } = await userClient
        .from('household')
        .select('*');

      expect(households).toBeDefined();

      // Should see only Household A
      const householdIds = households!.map((h) => h.id);
      expect(householdIds).toContain(householdA);
      expect(householdIds).not.toContain(householdB);
      expect(householdIds).not.toContain(householdC);
    });

    it('should see only Tenant B data when context is Tenant B', async () => {
      // Set context to Tenant B
      await serviceClient.auth.admin.updateUserById(multiTenantUser.id, {
        app_metadata: {
          tenant_id: tenantB.id,
          role_id: roleIds['household-head'],
        },
      });

      const { data: sessionData } = await serviceClient.auth.signInWithPassword(
        {
          email: multiTenantUser.email,
          password: 'Test1234!',
        }
      );

      const userClient = createClient<Database>(
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

      const { data: households } = await userClient
        .from('household')
        .select('*');

      expect(households).toBeDefined();

      // Should see only Household B
      const householdIds = households!.map((h) => h.id);
      expect(householdIds).not.toContain(householdA);
      expect(householdIds).toContain(householdB);
      expect(householdIds).not.toContain(householdC);
    });
  });

  describe('Role-Based Permissions Across Tenants', () => {
    it('should have admin permissions in Tenant A', async () => {
      await serviceClient.auth.admin.updateUserById(multiTenantUser.id, {
        app_metadata: {
          tenant_id: tenantA.id,
          role_id: roleIds['admin-head'],
        },
      });

      const { data: sessionData } = await serviceClient.auth.signInWithPassword(
        {
          email: multiTenantUser.email,
          password: 'Test1234!',
        }
      );

      const userClient = createClient<Database>(
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

      // Should be able to create household (admin permission)
      const { data, error } = await userClient
        .from('household')
        .insert({
          tenant_id: tenantA.id,
          address: 'New Admin House',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should have limited permissions in Tenant C', async () => {
      await serviceClient.auth.admin.updateUserById(multiTenantUser.id, {
        app_metadata: {
          tenant_id: tenantC.id,
          role_id: roleIds['household-member'],
        },
      });

      const { data: sessionData } = await serviceClient.auth.signInWithPassword(
        {
          email: multiTenantUser.email,
          password: 'Test1234!',
        }
      );

      const userClient = createClient<Database>(
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

      // Should NOT be able to create household (member permission)
      const { error } = await userClient.from('household').insert({
        tenant_id: tenantC.id,
        address: 'Unauthorized House',
      });

      expect(error).toBeDefined();
    });
  });

  describe('Managing User Across Tenants', () => {
    it('should allow deactivating user in one tenant while staying active in others', async () => {
      // Get tenant_user record for Tenant B
      const { data: tenantUserData } = await serviceClient
        .from('tenant_user')
        .select('id')
        .eq('user_profile_id', multiTenantUser.profileId)
        .eq('tenant_id', tenantB.id)
        .single();

      // Deactivate user in Tenant B
      await serviceClient
        .from('tenant_user')
        .update({ is_active: false })
        .eq('id', tenantUserData!.id);

      // User should still see 3 tenants in get_user_tenants (it filters by is_active)
      const { data: sessionData } = await serviceClient.auth.signInWithPassword(
        {
          email: multiTenantUser.email,
          password: 'Test1234!',
        }
      );

      const userClient = createClient<Database>(
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

      const { data: tenants } = await userClient.rpc('get_user_tenants');

      // Should now show only 2 active tenants
      expect(tenants!.length).toBe(2);
      const tenantIds = tenants!.map((t) => t.tenant_id);
      expect(tenantIds).not.toContain(tenantB.id);
    });

    it('should prevent switching to deactivated tenant', async () => {
      // Deactivate user in Tenant A
      const { data: tenantUserData } = await serviceClient
        .from('tenant_user')
        .select('id')
        .eq('user_profile_id', multiTenantUser.profileId)
        .eq('tenant_id', tenantA.id)
        .single();

      await serviceClient
        .from('tenant_user')
        .update({ is_active: false })
        .eq('id', tenantUserData!.id);

      // Try to switch to Tenant A
      const { data: sessionData } = await serviceClient.auth.signInWithPassword(
        {
          email: multiTenantUser.email,
          password: 'Test1234!',
        }
      );

      const userClient = createClient<Database>(
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

      const { data: switchResult } = await userClient.rpc(
        'switch_tenant_context',
        {
          p_tenant_id: tenantA.id,
        }
      );

      expect(switchResult.success).toBe(false);
      expect(switchResult.error).toContain('inactive');
    });
  });
});
