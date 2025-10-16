/**
 * Zod Validation Schemas for User entities
 */
import { z } from 'zod';

/**
 * User profile preferences schema
 */
export const UserPreferencesSchema = z.object({
  language: z.enum(['en', 'es', 'fr', 'de', 'zh']).default('en'),
  timezone: z.string().optional(),
  notifications: z
    .object({
      email: z.boolean().default(true),
      push: z.boolean().default(true),
      sms: z.boolean().default(false),
    })
    .optional(),
  theme: z.enum(['light', 'dark', 'auto']).default('auto').optional(),
});

/**
 * Create user profile input schema
 */
export const CreateUserProfileSchema = z.object({
  auth_user_id: z.string().uuid('Invalid auth user ID'),
  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name must not exceed 100 characters')
    .trim(),
  last_name: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must not exceed 100 characters')
    .trim(),
  contact_number: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .optional(),
  preferences: UserPreferencesSchema.optional(),
});

/**
 * Update user profile input schema
 */
export const UpdateUserProfileSchema = z.object({
  id: z.string().uuid('Invalid user profile ID'),
  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name must not exceed 100 characters')
    .trim()
    .optional(),
  last_name: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must not exceed 100 characters')
    .trim()
    .optional(),
  contact_number: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .optional()
    .nullable(),
  preferences: UserPreferencesSchema.optional(),
});

/**
 * User profile response schema
 */
export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  auth_user_id: z.string().uuid(),
  first_name: z.string(),
  last_name: z.string(),
  contact_number: z.string().nullable(),
  preferences: UserPreferencesSchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

/**
 * Assign user to tenant input schema
 */
export const AssignUserToTenantSchema = z.object({
  user_profile_id: z.string().uuid('Invalid user profile ID'),
  tenant_id: z.string().uuid('Invalid tenant ID'),
  role_id: z.string().uuid('Invalid role ID'),
  permissions: z.record(z.boolean()).optional(),
});

/**
 * Tenant user response schema
 */
export const TenantUserSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  user_profile_id: z.string().uuid(),
  role_id: z.string().uuid(),
  is_active: z.boolean(),
  permissions: z.record(z.boolean()),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

/**
 * Update tenant user input schema
 */
export const UpdateTenantUserSchema = z.object({
  id: z.string().uuid('Invalid tenant user ID'),
  role_id: z.string().uuid('Invalid role ID').optional(),
  is_active: z.boolean().optional(),
  permissions: z.record(z.boolean()).optional(),
});

/**
 * Type exports
 */
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
export type CreateUserProfileInput = z.infer<typeof CreateUserProfileSchema>;
export type UpdateUserProfileInput = z.infer<typeof UpdateUserProfileSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type AssignUserToTenantInput = z.infer<typeof AssignUserToTenantSchema>;
export type TenantUser = z.infer<typeof TenantUserSchema>;
export type UpdateTenantUserInput = z.infer<typeof UpdateTenantUserSchema>;
