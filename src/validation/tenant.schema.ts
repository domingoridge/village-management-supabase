/**
 * Zod Validation Schemas for Tenant entities
 */
import { z } from 'zod';

/**
 * Tenant status enum
 */
export const TenantStatusSchema = z.enum([
  'active',
  'trial',
  'suspended',
  'cancelled',
]);

/**
 * Subscription plan schema
 */
export const SubscriptionPlanSchema = z.object({
  tier: z.enum(['free', 'basic', 'premium', 'enterprise']),
  max_users: z.number().int().positive().optional(),
  max_households: z.number().int().positive().optional(),
  features: z.array(z.string()).optional(),
});

/**
 * Create tenant input schema
 */
export const CreateTenantSchema = z.object({
  name: z
    .string()
    .min(2, 'Tenant name must be at least 2 characters')
    .max(255, 'Tenant name must not exceed 255 characters')
    .trim(),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(100, 'Slug must not exceed 100 characters')
    .regex(
      /^[a-z0-9-]+$/,
      'Slug must contain only lowercase letters, numbers, and hyphens'
    )
    .trim(),
  subscription_plan: SubscriptionPlanSchema.optional(),
  status: TenantStatusSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Update tenant input schema
 */
export const UpdateTenantSchema = z.object({
  id: z.string().uuid('Invalid tenant ID'),
  name: z
    .string()
    .min(2, 'Tenant name must be at least 2 characters')
    .max(255, 'Tenant name must not exceed 255 characters')
    .trim()
    .optional(),
  subscription_plan: SubscriptionPlanSchema.optional(),
  status: TenantStatusSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Tenant response schema
 */
export const TenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  subscription_plan: SubscriptionPlanSchema,
  status: TenantStatusSchema,
  metadata: z.record(z.unknown()).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

/**
 * Switch tenant context input schema
 */
export const SwitchTenantContextSchema = z.object({
  tenant_id: z.string().uuid('Invalid tenant ID'),
});

/**
 * Get user tenants response schema
 */
export const UserTenantSchema = z.object({
  tenant_id: z.string().uuid(),
  tenant_name: z.string(),
  tenant_slug: z.string(),
  tenant_status: TenantStatusSchema,
  role_id: z.string().uuid(),
  role_code: z.string(),
  role_name: z.string(),
  is_active: z.boolean(),
  joined_at: z.string().datetime(),
});

/**
 * Type exports
 */
export type TenantStatus = z.infer<typeof TenantStatusSchema>;
export type SubscriptionPlan = z.infer<typeof SubscriptionPlanSchema>;
export type CreateTenantInput = z.infer<typeof CreateTenantSchema>;
export type UpdateTenantInput = z.infer<typeof UpdateTenantSchema>;
export type Tenant = z.infer<typeof TenantSchema>;
export type SwitchTenantContextInput = z.infer<
  typeof SwitchTenantContextSchema
>;
export type UserTenant = z.infer<typeof UserTenantSchema>;
