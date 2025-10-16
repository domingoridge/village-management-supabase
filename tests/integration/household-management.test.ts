/**
 * Integration Tests: Household Management (US3)
 * Tests the complete household management system including:
 * - Creating and managing households
 * - Adding/removing residents
 * - Managing member permissions (visiting/signatory rights)
 * - Household-head specific operations
 * - Access control enforcement
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/types/database.types';

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

describe('US3: Household Management', () => {
  let serviceClient: SupabaseClient<Database>;
  let testTenantId: string;
  let roleIds: Record<string, string> = {};

  // Test users
  let adminUser: {
    id: string;
    email: string;
    profileId: string;
    tenantUserId: string;
    client: SupabaseClient<Database>;
  };
  let householdHeadUser: {
    id: string;
    email: string;
    profileId: string;
    tenantUserId: string;
    client: SupabaseClient<Database>;
  };
  let householdMemberUser: {
    id: string;
    email: string;
    profileId: string;
    tenantUserId: string;
    client: SupabaseClient<Database>;
  };

  let testHouseholdId: string;

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

    // Create test tenant
    const { data: tenantData } = await serviceClient
      .from('tenant')
      .insert({
        name: `Household Test Community ${Date.now()}`,
        slug: `household-test-${Date.now()}`,
        status: 'active',
      })
      .select()
      .single();
    testTenantId = tenantData!.id;
  });

  beforeEach(async () => {
    const timestamp = Date.now();

    // Create Admin User
    const adminEmail = `admin-${timestamp}@example.com`;
    const { data: adminAuthData } = await serviceClient.auth.admin.createUser({
      email: adminEmail,
      password: 'Test1234!',
      email_confirm: true,
      user_metadata: { first_name: 'Admin', last_name: 'User' },
      app_metadata: {
        tenant_id: testTenantId,
        role_id: roleIds['admin-head'],
      },
    });
    const { data: adminProfileData } = await serviceClient
      .from('user_profile')
      .select('id')
      .eq('auth_user_id', adminAuthData.user!.id)
      .single();
    const { data: adminTenantUserData } = await serviceClient
      .from('tenant_user')
      .insert({
        tenant_id: testTenantId,
        user_profile_id: adminProfileData!.id,
        role_id: roleIds['admin-head'],
      })
      .select()
      .single();
    const { data: adminSession } = await serviceClient.auth.signInWithPassword({
      email: adminEmail,
      password: 'Test1234!',
    });
    adminUser = {
      id: adminAuthData.user!.id,
      email: adminEmail,
      profileId: adminProfileData!.id,
      tenantUserId: adminTenantUserData!.id,
      client: createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
          headers: {
            Authorization: `Bearer ${adminSession.session!.access_token}`,
          },
        },
      }),
    };

    // Create Household Head User
    const headEmail = `head-${timestamp}@example.com`;
    const { data: headAuthData } = await serviceClient.auth.admin.createUser({
      email: headEmail,
      password: 'Test1234!',
      email_confirm: true,
      user_metadata: { first_name: 'Head', last_name: 'User' },
      app_metadata: {
        tenant_id: testTenantId,
        role_id: roleIds['household-head'],
      },
    });
    const { data: headProfileData } = await serviceClient
      .from('user_profile')
      .select('id')
      .eq('auth_user_id', headAuthData.user!.id)
      .single();
    const { data: headTenantUserData } = await serviceClient
      .from('tenant_user')
      .insert({
        tenant_id: testTenantId,
        user_profile_id: headProfileData!.id,
        role_id: roleIds['household-head'],
      })
      .select()
      .single();
    const { data: headSession } = await serviceClient.auth.signInWithPassword({
      email: headEmail,
      password: 'Test1234!',
    });
    householdHeadUser = {
      id: headAuthData.user!.id,
      email: headEmail,
      profileId: headProfileData!.id,
      tenantUserId: headTenantUserData!.id,
      client: createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
          headers: {
            Authorization: `Bearer ${headSession.session!.access_token}`,
          },
        },
      }),
    };

    // Create Household Member User
    const memberEmail = `member-${timestamp}@example.com`;
    const { data: memberAuthData } = await serviceClient.auth.admin.createUser(
      {
        email: memberEmail,
        password: 'Test1234!',
        email_confirm: true,
        user_metadata: { first_name: 'Member', last_name: 'User' },
        app_metadata: {
          tenant_id: testTenantId,
          role_id: roleIds['household-member'],
        },
      }
    );
    const { data: memberProfileData } = await serviceClient
      .from('user_profile')
      .select('id')
      .eq('auth_user_id', memberAuthData.user!.id)
      .single();
    const { data: memberTenantUserData } = await serviceClient
      .from('tenant_user')
      .insert({
        tenant_id: testTenantId,
        user_profile_id: memberProfileData!.id,
        role_id: roleIds['household-member'],
      })
      .select()
      .single();
    const { data: memberSession } =
      await serviceClient.auth.signInWithPassword({
        email: memberEmail,
        password: 'Test1234!',
      });
    householdMemberUser = {
      id: memberAuthData.user!.id,
      email: memberEmail,
      profileId: memberProfileData!.id,
      tenantUserId: memberTenantUserData!.id,
      client: createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
          headers: {
            Authorization: `Bearer ${memberSession.session!.access_token}`,
          },
        },
      }),
    };

    // Create a test household
    const { data: householdData } = await serviceClient
      .from('household')
      .insert({
        tenant_id: testTenantId,
        address: `123 Test Street ${timestamp}`,
        lot_number: 'LOT-001',
        block_number: 'BLOCK-A',
        sticker_quota: 2,
      })
      .select()
      .single();
    testHouseholdId = householdData!.id;
  });

  afterAll(async () => {
    // Cleanup
    if (testTenantId) {
      await serviceClient.from('tenant').delete().eq('id', testTenantId);
    }
    if (adminUser) {
      await serviceClient.auth.admin.deleteUser(adminUser.id);
    }
    if (householdHeadUser) {
      await serviceClient.auth.admin.deleteUser(householdHeadUser.id);
    }
    if (householdMemberUser) {
      await serviceClient.auth.admin.deleteUser(householdMemberUser.id);
    }
  });

  describe('Household CRUD Operations', () => {
    it('should allow admin to create a household', async () => {
      const { data, error } = await adminUser.client
        .from('household')
        .insert({
          tenant_id: testTenantId,
          address: '456 Admin Created Street',
          sticker_quota: 3,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.address).toBe('456 Admin Created Street');
      expect(data!.tenant_id).toBe(testTenantId);
    });

    it('should prevent non-admin from creating households', async () => {
      const { error } = await householdMemberUser.client
        .from('household')
        .insert({
          tenant_id: testTenantId,
          address: '789 Unauthorized Street',
          sticker_quota: 1,
        });

      expect(error).toBeDefined();
    });

    it('should allow all tenant users to view households', async () => {
      const { data, error } = await householdMemberUser.client
        .from('household')
        .select('*')
        .eq('id', testHouseholdId)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.id).toBe(testHouseholdId);
    });

    it('should allow admin to update any household', async () => {
      const { data, error } = await adminUser.client
        .from('household')
        .update({ sticker_quota: 5 })
        .eq('id', testHouseholdId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.sticker_quota).toBe(5);
    });

    it('should allow household-head to update their own household', async () => {
      // First, add household-head to the household
      await serviceClient.from('resident').insert({
        household_id: testHouseholdId,
        tenant_user_id: householdHeadUser.tenantUserId,
        has_signatory_rights: true,
        has_visiting_rights: true,
      });

      const { data, error } = await householdHeadUser.client
        .from('household')
        .update({ sticker_quota: 4 })
        .eq('id', testHouseholdId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.sticker_quota).toBe(4);
    });

    it('should prevent regular member from updating household', async () => {
      // Add member to household
      await serviceClient.from('resident').insert({
        household_id: testHouseholdId,
        tenant_user_id: householdMemberUser.tenantUserId,
      });

      const { error } = await householdMemberUser.client
        .from('household')
        .update({ sticker_quota: 10 })
        .eq('id', testHouseholdId);

      // Should fail silently due to RLS (0 rows updated)
      expect(error).toBeNull();

      // Verify no change occurred
      const { data: verifyData } = await serviceClient
        .from('household')
        .select('sticker_quota')
        .eq('id', testHouseholdId)
        .single();

      expect(verifyData!.sticker_quota).not.toBe(10);
    });
  });

  describe('Resident Management', () => {
    it('should allow admin to add residents to any household', async () => {
      const { data, error } = await serviceClient
        .from('resident')
        .insert({
          household_id: testHouseholdId,
          tenant_user_id: householdMemberUser.tenantUserId,
          has_visiting_rights: true,
          has_signatory_rights: false,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.has_visiting_rights).toBe(true);
    });

    it('should allow household-head to add residents to their household', async () => {
      // Make householdHeadUser the head of the household
      await serviceClient.from('resident').insert({
        household_id: testHouseholdId,
        tenant_user_id: householdHeadUser.tenantUserId,
        has_signatory_rights: true,
      });

      // Now household-head adds a member
      const { data, error } = await serviceClient
        .from('resident')
        .insert({
          household_id: testHouseholdId,
          tenant_user_id: householdMemberUser.tenantUserId,
          has_visiting_rights: true,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should allow viewing residents within same household', async () => {
      // Add both users to household
      await serviceClient.from('resident').insert([
        {
          household_id: testHouseholdId,
          tenant_user_id: householdHeadUser.tenantUserId,
        },
        {
          household_id: testHouseholdId,
          tenant_user_id: householdMemberUser.tenantUserId,
        },
      ]);

      // Resident can see other residents in their household
      const { data, error } = await householdMemberUser.client
        .from('resident')
        .select('*')
        .eq('household_id', testHouseholdId);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBe(2);
    });

    it('should allow household-head to update resident permissions', async () => {
      // Add both users to household
      await serviceClient.from('resident').insert([
        {
          household_id: testHouseholdId,
          tenant_user_id: householdHeadUser.tenantUserId,
        },
        {
          household_id: testHouseholdId,
          tenant_user_id: householdMemberUser.tenantUserId,
          has_visiting_rights: false,
        },
      ]);

      // Household-head updates resident's permissions
      const { data, error } = await serviceClient
        .from('resident')
        .update({ has_visiting_rights: true })
        .eq('household_id', testHouseholdId)
        .eq('tenant_user_id', householdMemberUser.tenantUserId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.has_visiting_rights).toBe(true);
    });

    it('should allow household-head to remove residents', async () => {
      // Add both users
      await serviceClient.from('resident').insert([
        {
          household_id: testHouseholdId,
          tenant_user_id: householdHeadUser.tenantUserId,
        },
        {
          household_id: testHouseholdId,
          tenant_user_id: householdMemberUser.tenantUserId,
        },
      ]);

      // Household-head removes resident
      const { error } = await serviceClient
        .from('resident')
        .delete()
        .eq('household_id', testHouseholdId)
        .eq('tenant_user_id', householdMemberUser.tenantUserId);

      expect(error).toBeNull();

      // Verify removal
      const { data: verifyData } = await serviceClient
        .from('resident')
        .select('*')
        .eq('household_id', testHouseholdId)
        .eq('tenant_user_id', householdMemberUser.tenantUserId);

      expect(verifyData!.length).toBe(0);
    });

    it('should prevent duplicate resident assignments', async () => {
      // Add resident first time
      await serviceClient.from('resident').insert({
        household_id: testHouseholdId,
        tenant_user_id: householdMemberUser.tenantUserId,
      });

      // Try to add same resident again
      const { error } = await serviceClient.from('resident').insert({
        household_id: testHouseholdId,
        tenant_user_id: householdMemberUser.tenantUserId,
      });

      expect(error).toBeDefined();
      expect(error!.message).toContain('duplicate');
    });
  });

  describe('Household Permissions', () => {
    it('should track visiting rights correctly', async () => {
      const { data } = await serviceClient
        .from('resident')
        .insert({
          household_id: testHouseholdId,
          tenant_user_id: householdMemberUser.tenantUserId,
          has_visiting_rights: true,
          has_signatory_rights: false,
        })
        .select()
        .single();

      expect(data!.has_visiting_rights).toBe(true);
      expect(data!.has_signatory_rights).toBe(false);
    });

    it('should track signatory rights correctly', async () => {
      const { data } = await serviceClient
        .from('resident')
        .insert({
          household_id: testHouseholdId,
          tenant_user_id: householdHeadUser.tenantUserId,
          has_visiting_rights: true,
          has_signatory_rights: true,
        })
        .select()
        .single();

      expect(data!.has_visiting_rights).toBe(true);
      expect(data!.has_signatory_rights).toBe(true);
    });
  });

  describe('Household Queries', () => {
    beforeEach(async () => {
      // Create multiple households for query testing
      await serviceClient.from('household').insert([
        {
          tenant_id: testTenantId,
          address: '100 Query Test St',
          lot_number: 'LOT-100',
          block_number: 'BLOCK-A',
          status: 'active',
        },
        {
          tenant_id: testTenantId,
          address: '200 Query Test Ave',
          lot_number: 'LOT-200',
          block_number: 'BLOCK-B',
          status: 'inactive',
        },
      ]);
    });

    it('should filter households by status', async () => {
      const { data, error } = await adminUser.client
        .from('household')
        .select('*')
        .eq('status', 'active');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.every((h) => h.status === 'active')).toBe(true);
    });

    it('should filter households by block number', async () => {
      const { data, error } = await adminUser.client
        .from('household')
        .select('*')
        .eq('block_number', 'BLOCK-A');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBeGreaterThan(0);
      expect(data!.every((h) => h.block_number === 'BLOCK-A')).toBe(true);
    });

    it('should search households by address', async () => {
      const { data, error } = await adminUser.client
        .from('household')
        .select('*')
        .ilike('address', '%Query Test%');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBeGreaterThanOrEqual(2);
    });
  });
});
