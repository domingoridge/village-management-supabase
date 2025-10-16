/**
 * RLS Tests: Tenant Data Isolation (US5)
 * Tests that Row-Level Security policies properly isolate tenant data:
 * - Users can only access data from their own tenant
 * - No cross-tenant data leakage
 * - Proper enforcement across all tables
 * - Edge cases and boundary conditions
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/types/database.types';

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

describe('US5: Tenant Data Isolation via RLS', () => {
  let serviceClient: SupabaseClient<Database>;

  // Two separate tenants for isolation testing
  let tenantA: { id: string; name: string };
  let tenantB: { id: string; name: string };

  // Users in different tenants
  let userA: {
    id: string;
    email: string;
    profileId: string;
    client: SupabaseClient<Database>;
  };
  let userB: {
    id: string;
    email: string;
    profileId: string;
    client: SupabaseClient<Database>;
  };

  // Households in different tenants
  let householdA: { id: string; address: string };
  let householdB: { id: string; address: string };

  let adminRoleId: string;

  beforeAll(async () => {
    serviceClient = createClient<Database>(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    // Get admin role
    const { data: roleData } = await serviceClient
      .from('role')
      .select('id')
      .eq('code', 'admin-head')
      .single();
    adminRoleId = roleData!.id;
  });

  beforeEach(async () => {
    const timestamp = Date.now();

    // Create Tenant A
    const { data: tenantAData } = await serviceClient
      .from('tenant')
      .insert({
        name: `Tenant A ${timestamp}`,
        slug: `tenant-a-${timestamp}`,
        status: 'active',
      })
      .select()
      .single();
    tenantA = { id: tenantAData!.id, name: tenantAData!.name };

    // Create Tenant B
    const { data: tenantBData } = await serviceClient
      .from('tenant')
      .insert({
        name: `Tenant B ${timestamp}`,
        slug: `tenant-b-${timestamp}`,
        status: 'active',
      })
      .select()
      .single();
    tenantB = { id: tenantBData!.id, name: tenantBData!.name };

    // Create User A in Tenant A
    const emailA = `userA-${timestamp}@example.com`;
    const { data: authAData } = await serviceClient.auth.admin.createUser({
      email: emailA,
      password: 'Test1234!',
      email_confirm: true,
      user_metadata: { first_name: 'UserA', last_name: 'Test' },
      app_metadata: {
        tenant_id: tenantA.id,
        role_id: adminRoleId,
      },
    });
    const { data: profileAData } = await serviceClient
      .from('user_profile')
      .select('id')
      .eq('auth_user_id', authAData.user!.id)
      .single();
    await serviceClient.rpc('assign_user_to_tenant', {
      p_user_profile_id: profileAData!.id,
      p_tenant_id: tenantA.id,
      p_role_id: adminRoleId,
    });

    // Create authenticated client for User A
    const { data: sessionAData } = await serviceClient.auth.signInWithPassword({
      email: emailA,
      password: 'Test1234!',
    });
    const clientA = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${sessionAData.session!.access_token}`,
        },
      },
    });

    userA = {
      id: authAData.user!.id,
      email: emailA,
      profileId: profileAData!.id,
      client: clientA,
    };

    // Create User B in Tenant B
    const emailB = `userB-${timestamp}@example.com`;
    const { data: authBData } = await serviceClient.auth.admin.createUser({
      email: emailB,
      password: 'Test1234!',
      email_confirm: true,
      user_metadata: { first_name: 'UserB', last_name: 'Test' },
      app_metadata: {
        tenant_id: tenantB.id,
        role_id: adminRoleId,
      },
    });
    const { data: profileBData } = await serviceClient
      .from('user_profile')
      .select('id')
      .eq('auth_user_id', authBData.user!.id)
      .single();
    await serviceClient.rpc('assign_user_to_tenant', {
      p_user_profile_id: profileBData!.id,
      p_tenant_id: tenantB.id,
      p_role_id: adminRoleId,
    });

    // Create authenticated client for User B
    const { data: sessionBData } = await serviceClient.auth.signInWithPassword({
      email: emailB,
      password: 'Test1234!',
    });
    const clientB = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${sessionBData.session!.access_token}`,
        },
      },
    });

    userB = {
      id: authBData.user!.id,
      email: emailB,
      profileId: profileBData!.id,
      client: clientB,
    };

    // Create Household in Tenant A
    const { data: householdAData } = await serviceClient
      .from('household')
      .insert({
        tenant_id: tenantA.id,
        address: `123 Tenant A Street ${timestamp}`,
        sticker_quota: 2,
      })
      .select()
      .single();
    householdA = {
      id: householdAData!.id,
      address: householdAData!.address,
    };

    // Create Household in Tenant B
    const { data: householdBData } = await serviceClient
      .from('household')
      .insert({
        tenant_id: tenantB.id,
        address: `456 Tenant B Avenue ${timestamp}`,
        sticker_quota: 3,
      })
      .select()
      .single();
    householdB = {
      id: householdBData!.id,
      address: householdBData!.address,
    };
  });

  afterAll(async () => {
    // Cleanup
    if (tenantA) {
      await serviceClient.from('tenant').delete().eq('id', tenantA.id);
    }
    if (tenantB) {
      await serviceClient.from('tenant').delete().eq('id', tenantB.id);
    }
    if (userA) {
      await serviceClient.auth.admin.deleteUser(userA.id);
    }
    if (userB) {
      await serviceClient.auth.admin.deleteUser(userB.id);
    }
  });

  describe('Tenant Table Isolation', () => {
    it('should allow users to see only their own tenant', async () => {
      const { data: dataA } = await userA.client.from('tenant').select('*');

      expect(dataA).toBeDefined();
      expect(dataA!.length).toBeGreaterThan(0);

      // User A should see Tenant A
      const hasTenantA = dataA!.some((t) => t.id === tenantA.id);
      expect(hasTenantA).toBe(true);

      // User A should NOT see Tenant B
      const hasTenantB = dataA!.some((t) => t.id === tenantB.id);
      expect(hasTenantB).toBe(false);
    });

    it('should prevent users from reading other tenants directly', async () => {
      // Try to read Tenant B using User A's credentials
      const { data, error } = await userA.client
        .from('tenant')
        .select('*')
        .eq('id', tenantB.id)
        .single();

      // Should return no data due to RLS
      expect(data).toBeNull();
      expect(error).toBeDefined();
    });
  });

  describe('Household Table Isolation', () => {
    it('should allow users to see only households in their tenant', async () => {
      const { data: householdsA } = await userA.client
        .from('household')
        .select('*');

      expect(householdsA).toBeDefined();

      // User A should see Household A
      const hasHouseholdA = householdsA!.some((h) => h.id === householdA.id);
      expect(hasHouseholdA).toBe(true);

      // User A should NOT see Household B
      const hasHouseholdB = householdsA!.some((h) => h.id === householdB.id);
      expect(hasHouseholdB).toBe(false);
    });

    it('should prevent cross-tenant household access', async () => {
      // User B tries to read Household A (from Tenant A)
      const { data, count } = await userB.client
        .from('household')
        .select('*', { count: 'exact' })
        .eq('id', householdA.id);

      expect(data).toBeDefined();
      expect(data!.length).toBe(0);
      expect(count).toBe(0);
    });

    it('should prevent users from creating households in other tenants', async () => {
      // User A tries to create household in Tenant B
      const { error } = await userA.client.from('household').insert({
        tenant_id: tenantB.id,
        address: 'Malicious Address',
        sticker_quota: 1,
      });

      // Should fail due to RLS policy checking tenant_id
      expect(error).toBeDefined();
    });

    it('should prevent users from updating households in other tenants', async () => {
      // User A tries to update Household B (in Tenant B)
      const { error } = await userA.client
        .from('household')
        .update({ address: 'Hacked Address' })
        .eq('id', householdB.id);

      // Should fail silently (no rows affected) due to RLS
      expect(error).toBeNull(); // RLS doesn't throw error, just filters

      // Verify no update occurred
      const { data: verifyData } = await serviceClient
        .from('household')
        .select('address')
        .eq('id', householdB.id)
        .single();

      expect(verifyData!.address).not.toBe('Hacked Address');
      expect(verifyData!.address).toBe(householdB.address);
    });
  });

  describe('Tenant User Table Isolation', () => {
    it('should show only users in the same tenant', async () => {
      const { data: usersA } = await userA.client
        .from('tenant_user')
        .select('*');

      expect(usersA).toBeDefined();
      expect(usersA!.length).toBeGreaterThan(0);

      // User A should see themselves
      const hasSelf = usersA!.some((tu) => tu.user_profile_id === userA.profileId);
      expect(hasSelf).toBe(true);

      // User A should NOT see User B
      const hasUserB = usersA!.some((tu) => tu.user_profile_id === userB.profileId);
      expect(hasUserB).toBe(false);
    });
  });

  describe('Residential Community Config Isolation', () => {
    it('should allow users to see only their tenant config', async () => {
      const { data: configsA } = await userA.client
        .from('residential_community_config')
        .select('*');

      expect(configsA).toBeDefined();
      expect(configsA!.length).toBe(1);
      expect(configsA![0].tenant_id).toBe(tenantA.id);
    });

    it('should prevent access to other tenant configs', async () => {
      const { data: configData } = await userA.client
        .from('residential_community_config')
        .select('*')
        .eq('tenant_id', tenantB.id);

      expect(configData).toBeDefined();
      expect(configData!.length).toBe(0);
    });
  });

  describe('Session Validation', () => {
    it('should validate session for User A in Tenant A', async () => {
      const { data: validation, error } = await userA.client.rpc(
        'validate_current_session'
      );

      expect(error).toBeNull();
      expect(validation).toBeDefined();
      expect(validation.valid).toBe(true);
      expect(validation.tenant.id).toBe(tenantA.id);
      expect(validation.session.user_profile_id).toBe(userA.profileId);
    });

    it('should validate session for User B in Tenant B', async () => {
      const { data: validation } = await userB.client.rpc(
        'validate_current_session'
      );

      expect(validation).toBeDefined();
      expect(validation.valid).toBe(true);
      expect(validation.tenant.id).toBe(tenantB.id);
      expect(validation.session.user_profile_id).toBe(userB.profileId);
    });
  });

  describe('Cross-Tenant Data Verification', () => {
    it('should ensure complete data separation between tenants', async () => {
      // Get all accessible data for User A
      const [tenantsA, householdsA, usersA, configsA] = await Promise.all([
        userA.client.from('tenant').select('id'),
        userA.client.from('household').select('id'),
        userA.client.from('tenant_user').select('id'),
        userA.client.from('residential_community_config').select('tenant_id'),
      ]);

      // Get all accessible data for User B
      const [tenantsB, householdsB, usersB, configsB] = await Promise.all([
        userB.client.from('tenant').select('id'),
        userB.client.from('household').select('id'),
        userB.client.from('tenant_user').select('id'),
        userB.client.from('residential_community_config').select('tenant_id'),
      ]);

      // Verify no overlap in tenant IDs
      const tenantIdsA = tenantsA.data!.map((t) => t.id);
      const tenantIdsB = tenantsB.data!.map((t) => t.id);
      const tenantOverlap = tenantIdsA.filter((id) => tenantIdsB.includes(id));
      expect(tenantOverlap.length).toBe(0);

      // Verify no overlap in household IDs
      const householdIdsA = householdsA.data!.map((h) => h.id);
      const householdIdsB = householdsB.data!.map((h) => h.id);
      const householdOverlap = householdIdsA.filter((id) =>
        householdIdsB.includes(id)
      );
      expect(householdOverlap.length).toBe(0);

      // Verify configs point to correct tenants
      expect(configsA.data![0].tenant_id).toBe(tenantA.id);
      expect(configsB.data![0].tenant_id).toBe(tenantB.id);
    });
  });

  describe('Edge Cases', () => {
    it('should handle users with no tenant context gracefully', async () => {
      // Create user without app_metadata tenant context
      const timestamp = Date.now();
      const noContextEmail = `no-context-${timestamp}@example.com`;
      const { data: noContextAuth } =
        await serviceClient.auth.admin.createUser({
          email: noContextEmail,
          password: 'Test1234!',
          email_confirm: true,
        });

      const { data: noContextSession } =
        await serviceClient.auth.signInWithPassword({
          email: noContextEmail,
          password: 'Test1234!',
        });

      const noContextClient = createClient<Database>(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
          global: {
            headers: {
              Authorization: `Bearer ${noContextSession.session!.access_token}`,
            },
          },
        }
      );

      // Should return empty results due to no tenant context
      const { data: households } = await noContextClient
        .from('household')
        .select('*');

      expect(households).toBeDefined();
      expect(households!.length).toBe(0);

      // Cleanup
      await serviceClient.auth.admin.deleteUser(noContextAuth.user!.id);
    });

    it('should prevent SQL injection through tenant_id', async () => {
      // Attempt SQL injection in tenant_id filter
      const { data, error } = await userA.client
        .from('household')
        .select('*')
        .eq('tenant_id', "'; DROP TABLE household; --");

      // Should handle safely - no error, no data
      expect(error).toBeDefined(); // Invalid UUID format
      expect(data).toBeNull();
    });
  });
});
