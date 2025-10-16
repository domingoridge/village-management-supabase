/**
 * RLS (Row-Level Security) Helper Utilities
 * Helper functions for working with RLS policies and tenant context
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

/**
 * Validates the current session and tenant context
 * @param client Supabase client instance
 * @returns validation result with session details
 */
export async function validateSession(client: SupabaseClient<Database>) {
  const { data, error } = await client.rpc('validate_current_session');

  if (error) {
    throw new Error(`Session validation failed: ${error.message}`);
  }

  return data;
}

/**
 * Checks if the current session is valid and has tenant context
 * @param client Supabase client instance
 * @returns true if session is valid
 */
export async function hasValidTenantContext(
  client: SupabaseClient<Database>
): Promise<boolean> {
  try {
    const validation = await validateSession(client);
    return validation.valid === true;
  } catch {
    return false;
  }
}

/**
 * Gets the current user's tenant information
 * @param client Supabase client instance
 * @returns tenant info or null
 */
export async function getCurrentTenantInfo(client: SupabaseClient<Database>) {
  try {
    const validation = await validateSession(client);
    if (!validation.valid) {
      return null;
    }
    return validation.tenant;
  } catch {
    return null;
  }
}

/**
 * Gets the current user's role information
 * @param client Supabase client instance
 * @returns role info or null
 */
export async function getCurrentRoleInfo(client: SupabaseClient<Database>) {
  try {
    const validation = await validateSession(client);
    if (!validation.valid) {
      return null;
    }
    return validation.role;
  } catch {
    return null;
  }
}

/**
 * Checks if the current user has a specific permission
 * @param client Supabase client instance
 * @param permissionKey Permission key to check
 * @returns true if user has permission
 */
export async function hasPermission(
  client: SupabaseClient<Database>,
  permissionKey: string
): Promise<boolean> {
  const { data, error } = await client.rpc('check_user_permission', {
    p_permission_key: permissionKey,
  });

  if (error) {
    console.error(`Permission check failed: ${error.message}`);
    return false;
  }

  return data === true;
}

/**
 * Checks multiple permissions at once
 * @param client Supabase client instance
 * @param permissionKeys Array of permission keys to check
 * @returns Map of permission key to boolean
 */
export async function hasPermissions(
  client: SupabaseClient<Database>,
  permissionKeys: string[]
): Promise<Map<string, boolean>> {
  const { data, error } = await client.rpc('check_user_permissions', {
    p_permission_keys: permissionKeys,
  });

  if (error) {
    console.error(`Batch permission check failed: ${error.message}`);
    return new Map(permissionKeys.map((key) => [key, false]));
  }

  return new Map(data?.map((p) => [p.permission_key, p.has_permission]) || []);
}

/**
 * Gets all permissions for the current user
 * @param client Supabase client instance
 * @returns permissions object or null
 */
export async function getAllPermissions(client: SupabaseClient<Database>) {
  const { data, error } = await client.rpc('get_current_user_permissions');

  if (error) {
    console.error(`Get all permissions failed: ${error.message}`);
    return null;
  }

  return data;
}

/**
 * Switches tenant context for multi-tenant users
 * @param client Supabase client instance
 * @param tenantId Target tenant ID
 * @returns switch result
 */
export async function switchTenantContext(
  client: SupabaseClient<Database>,
  tenantId: string
) {
  const { data, error } = await client.rpc('switch_tenant_context', {
    p_tenant_id: tenantId,
  });

  if (error) {
    throw new Error(`Context switch failed: ${error.message}`);
  }

  if (!data.success) {
    throw new Error(`Context switch failed: ${data.error}`);
  }

  return data;
}

/**
 * Gets all tenants accessible to the current user
 * @param client Supabase client instance
 * @returns array of user tenants
 */
export async function getUserTenants(client: SupabaseClient<Database>) {
  const { data, error } = await client.rpc('get_user_tenants');

  if (error) {
    throw new Error(`Get user tenants failed: ${error.message}`);
  }

  return data || [];
}

/**
 * Checks if user has access to a specific tenant
 * @param client Supabase client instance
 * @param tenantId Tenant ID to check
 * @returns true if user has access
 */
export async function hasAccessToTenant(
  client: SupabaseClient<Database>,
  tenantId: string
): Promise<boolean> {
  const tenants = await getUserTenants(client);
  return tenants.some((t) => t.tenant_id === tenantId);
}

/**
 * Ensures user has valid tenant context, throws if not
 * @param client Supabase client instance
 * @throws Error if no valid tenant context
 */
export async function ensureValidTenantContext(
  client: SupabaseClient<Database>
): Promise<void> {
  const isValid = await hasValidTenantContext(client);
  if (!isValid) {
    throw new Error(
      'No valid tenant context. Please switch to a tenant first.'
    );
  }
}

/**
 * Ensures user has a specific permission, throws if not
 * @param client Supabase client instance
 * @param permissionKey Permission key to check
 * @throws Error if user doesn't have permission
 */
export async function ensurePermission(
  client: SupabaseClient<Database>,
  permissionKey: string
): Promise<void> {
  const has = await hasPermission(client, permissionKey);
  if (!has) {
    throw new Error(`Permission denied: ${permissionKey}`);
  }
}

/**
 * Creates a safe query builder that ensures tenant context
 * Useful for wrapping queries that must respect tenant isolation
 * @param client Supabase client instance
 * @returns query builder function
 */
export function createTenantSafeQuery(client: SupabaseClient<Database>) {
  return async function <T>(queryFn: () => Promise<T>): Promise<T> {
    await ensureValidTenantContext(client);
    return queryFn();
  };
}
