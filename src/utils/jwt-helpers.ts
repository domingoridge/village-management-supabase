/**
 * JWT Helper Utilities
 * Helper functions for working with Supabase JWT tokens and custom claims
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Custom JWT claims interface for app_metadata
 */
export interface AppMetadata {
  tenant_id?: string;
  role_id?: string;
  [key: string]: unknown;
}

/**
 * User metadata interface
 */
export interface UserMetadata {
  first_name?: string;
  last_name?: string;
  [key: string]: unknown;
}

/**
 * Extracts tenant_id from JWT claims
 * @param client Supabase client instance
 * @returns tenant_id from JWT or null
 */
export async function getCurrentTenantId(
  client: SupabaseClient
): Promise<string | null> {
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return null;
  }

  const appMetadata = user.app_metadata as AppMetadata;
  return appMetadata.tenant_id || null;
}

/**
 * Extracts role_id from JWT claims
 * @param client Supabase client instance
 * @returns role_id from JWT or null
 */
export async function getCurrentRoleId(
  client: SupabaseClient
): Promise<string | null> {
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return null;
  }

  const appMetadata = user.app_metadata as AppMetadata;
  return appMetadata.role_id || null;
}

/**
 * Gets complete app_metadata from JWT
 * @param client Supabase client instance
 * @returns app_metadata object or null
 */
export async function getAppMetadata(
  client: SupabaseClient
): Promise<AppMetadata | null> {
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return null;
  }

  return (user.app_metadata as AppMetadata) || null;
}

/**
 * Gets user metadata from JWT
 * @param client Supabase client instance
 * @returns user_metadata object or null
 */
export async function getUserMetadata(
  client: SupabaseClient
): Promise<UserMetadata | null> {
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return null;
  }

  return (user.user_metadata as UserMetadata) || null;
}

/**
 * Checks if current user is authenticated
 * @param client Supabase client instance
 * @returns true if user is authenticated
 */
export async function isAuthenticated(
  client: SupabaseClient
): Promise<boolean> {
  const {
    data: { user },
  } = await client.auth.getUser();
  return !!user;
}

/**
 * Gets the current user's auth ID
 * @param client Supabase client instance
 * @returns auth user ID or null
 */
export async function getCurrentAuthUserId(
  client: SupabaseClient
): Promise<string | null> {
  const {
    data: { user },
  } = await client.auth.getUser();
  return user?.id || null;
}

/**
 * Validates JWT token expiration
 * @param client Supabase client instance
 * @returns true if token is expired or will expire within buffer seconds
 */
export async function isTokenExpired(
  client: SupabaseClient,
  bufferSeconds: number = 300 // 5 minutes default buffer
): Promise<boolean> {
  const {
    data: { session },
  } = await client.auth.getSession();

  if (!session) {
    return true;
  }

  const expiresAt = session.expires_at;
  if (!expiresAt) {
    return true;
  }

  const now = Math.floor(Date.now() / 1000);
  return expiresAt - now <= bufferSeconds;
}

/**
 * Refreshes the JWT token if expired or near expiration
 * @param client Supabase client instance
 * @returns new session or null if refresh failed
 */
export async function refreshTokenIfNeeded(
  client: SupabaseClient,
  bufferSeconds: number = 300
) {
  const expired = await isTokenExpired(client, bufferSeconds);

  if (!expired) {
    const {
      data: { session },
    } = await client.auth.getSession();
    return session;
  }

  const { data, error } = await client.auth.refreshSession();

  if (error) {
    throw new Error(`Failed to refresh token: ${error.message}`);
  }

  return data.session;
}

/**
 * Formats JWT claims for logging (sanitizes sensitive data)
 * @param client Supabase client instance
 * @returns sanitized claims object
 */
export async function getJWTClaimsForLogging(
  client: SupabaseClient
): Promise<Record<string, unknown>> {
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return { authenticated: false };
  }

  return {
    authenticated: true,
    user_id: user.id,
    email: user.email?.substring(0, 3) + '***', // Partially redact email
    tenant_id: (user.app_metadata as AppMetadata).tenant_id || null,
    role_id: (user.app_metadata as AppMetadata).role_id || null,
  };
}
