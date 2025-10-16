/**
 * Authentication Service
 * Handles login, tenant context switching, and JWT management
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

/**
 * Tenant information returned from initialize_tenant_context
 */
export interface TenantInfo {
  tenant_id: string;
  tenant_name: string;
  tenant_status: string;
  role_id: string;
  role_code: string;
  role_name: string;
  is_active: boolean;
}

/**
 * Response from initialize_tenant_context RPC
 */
export interface InitializeTenantContextResponse {
  success: boolean;
  auto_switched: boolean;
  has_context: boolean;
  current_tenant_id?: string;
  role_id?: string;
  role_code?: string;
  tenants: TenantInfo[];
  requires_token_refresh?: boolean;
  message?: string;
  error?: string;
}

/**
 * Login result with tenant context
 */
export interface LoginResult {
  user: {
    id: string;
    email: string;
    app_metadata: Record<string, unknown>;
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_at?: number;
  };
  tenants: TenantInfo[];
  activeTenant: {
    tenant_id: string;
    role_code: string;
  } | null;
  requiresTenantSelection: boolean;
}

/**
 * Authentication service class
 */
export class AuthService {
  constructor(private client: SupabaseClient<Database>) {}

  /**
   * Login with email and password, automatically initialize tenant context
   *
   * @param email User email
   * @param password User password
   * @returns Login result with tenant context
   *
   * @example
   * const authService = new AuthService(supabase);
   * const result = await authService.login('user@example.com', 'password');
   *
   * if (result.requiresTenantSelection) {
   *   // Show tenant picker UI
   *   console.log('Available tenants:', result.tenants);
   * } else {
   *   // User is ready to use the app
   *   console.log('Active tenant:', result.activeTenant);
   * }
   */
  async login(email: string, password: string): Promise<LoginResult> {
    // Step 1: Sign in with Supabase
    const { data: authData, error: authError } =
      await this.client.auth.signInWithPassword({
        email,
        password,
      });

    if (authError || !authData.user || !authData.session) {
      throw new Error(`Login failed: ${authError?.message || 'Unknown error'}`);
    }

    // Step 2: Initialize tenant context
    const { data: contextData, error: contextError } = await this.client.rpc(
      'initialize_tenant_context'
    );

    if (contextError) {
      throw new Error(
        `Failed to initialize tenant context: ${contextError.message}`
      );
    }

    if (!contextData.success) {
      throw new Error(
        contextData.error || 'Failed to initialize tenant context'
      );
    }

    // Step 3: If auto-switched or already has context, refresh JWT
    if (
      contextData.requires_token_refresh ||
      contextData.auto_switched ||
      contextData.has_context
    ) {
      const { data: sessionData, error: refreshError } =
        await this.client.auth.refreshSession();

      if (refreshError || !sessionData.session) {
        throw new Error(
          `Failed to refresh session: ${refreshError?.message || 'Unknown error'}`
        );
      }

      return {
        user: {
          id: sessionData.user!.id,
          email: sessionData.user!.email!,
          app_metadata: sessionData.user!.app_metadata,
        },
        session: {
          access_token: sessionData.session.access_token,
          refresh_token: sessionData.session.refresh_token,
          expires_at: sessionData.session.expires_at,
        },
        tenants: contextData.tenants || [],
        activeTenant: contextData.current_tenant_id
          ? {
              tenant_id: contextData.current_tenant_id,
              role_code: contextData.role_code || '',
            }
          : null,
        requiresTenantSelection: false,
      };
    }

    // Step 4: Multiple tenants or no tenants - user needs to select
    return {
      user: {
        id: authData.user.id,
        email: authData.user.email!,
        app_metadata: authData.user.app_metadata,
      },
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at,
      },
      tenants: contextData.tenants || [],
      activeTenant: null,
      requiresTenantSelection: (contextData.tenants || []).length > 1,
    };
  }

  /**
   * Switch to a different tenant context
   *
   * @param tenantId UUID of the tenant to switch to
   * @returns Updated session with new tenant context
   *
   * @example
   * await authService.switchTenant('tenant-uuid');
   * // User can now access resources from the new tenant
   */
  async switchTenant(tenantId: string): Promise<void> {
    const { data, error } = await this.client.rpc('switch_tenant_context', {
      p_tenant_id: tenantId,
    });

    if (error) {
      throw new Error(`Failed to switch tenant: ${error.message}`);
    }

    if (!data.success) {
      throw new Error(data.error || 'Failed to switch tenant context');
    }

    // Refresh JWT to get updated tenant_id
    const { error: refreshError } = await this.client.auth.refreshSession();

    if (refreshError) {
      throw new Error(
        `Failed to refresh session after tenant switch: ${refreshError.message}`
      );
    }
  }

  /**
   * Get all tenants accessible to the current user
   *
   * @returns List of accessible tenants
   */
  async getTenants(): Promise<TenantInfo[]> {
    const { data, error } = await this.client.rpc('get_user_tenants');

    if (error) {
      throw new Error(`Failed to get user tenants: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Clear tenant context and logout
   */
  async logout(): Promise<void> {
    // Clear tenant context
    await this.client.rpc('clear_tenant_context');

    // Sign out
    const { error } = await this.client.auth.signOut();

    if (error) {
      throw new Error(`Logout failed: ${error.message}`);
    }
  }

  /**
   * Get current tenant ID from JWT
   *
   * @returns Current tenant ID or null
   */
  async getCurrentTenantId(): Promise<string | null> {
    const {
      data: { user },
    } = await this.client.auth.getUser();

    if (!user) {
      return null;
    }

    return (user.app_metadata.tenant_id as string) || null;
  }

  /**
   * Get current role ID from JWT
   *
   * @returns Current role ID or null
   */
  async getCurrentRoleId(): Promise<string | null> {
    const {
      data: { user },
    } = await this.client.auth.getUser();

    if (!user) {
      return null;
    }

    return (user.app_metadata.role_id as string) || null;
  }
}

/**
 * Create an auth service instance
 *
 * @param client Supabase client
 * @returns AuthService instance
 */
export function createAuthService(
  client: SupabaseClient<Database>
): AuthService {
  return new AuthService(client);
}
