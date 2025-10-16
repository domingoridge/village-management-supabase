/**
 * Zod Validation Schemas for Household entities
 */
import { z } from 'zod';

/**
 * Household status enum
 */
export const HouseholdStatusSchema = z.enum([
  'active',
  'inactive',
  'suspended',
]);

/**
 * Create household input schema
 */
export const CreateHouseholdSchema = z.object({
  tenant_id: z.string().uuid('Invalid tenant ID'),
  address: z
    .string()
    .min(5, 'Address must be at least 5 characters')
    .max(255, 'Address must not exceed 255 characters')
    .trim(),
  lot_number: z
    .string()
    .max(50, 'Lot number must not exceed 50 characters')
    .trim()
    .optional()
    .nullable(),
  block_number: z
    .string()
    .max(50, 'Block number must not exceed 50 characters')
    .trim()
    .optional()
    .nullable(),
  sticker_quota: z
    .number()
    .int()
    .min(0, 'Sticker quota cannot be negative')
    .default(2),
  status: HouseholdStatusSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Update household input schema
 */
export const UpdateHouseholdSchema = z.object({
  id: z.string().uuid('Invalid household ID'),
  address: z
    .string()
    .min(5, 'Address must be at least 5 characters')
    .max(255, 'Address must not exceed 255 characters')
    .trim()
    .optional(),
  lot_number: z
    .string()
    .max(50, 'Lot number must not exceed 50 characters')
    .trim()
    .optional()
    .nullable(),
  block_number: z
    .string()
    .max(50, 'Block number must not exceed 50 characters')
    .trim()
    .optional()
    .nullable(),
  sticker_quota: z
    .number()
    .int()
    .min(0, 'Sticker quota cannot be negative')
    .optional(),
  status: HouseholdStatusSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Household response schema
 */
export const HouseholdSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  address: z.string(),
  lot_number: z.string().nullable(),
  block_number: z.string().nullable(),
  sticker_quota: z.number().int(),
  status: HouseholdStatusSchema,
  metadata: z.record(z.unknown()).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

/**
 * Add household member input schema
 */
export const AddHouseholdMemberSchema = z.object({
  household_id: z.string().uuid('Invalid household ID'),
  tenant_user_id: z.string().uuid('Invalid tenant user ID'),
  has_visiting_rights: z.boolean().default(false),
  has_signatory_rights: z.boolean().default(false),
});

/**
 * Update household member input schema
 */
export const UpdateHouseholdMemberSchema = z.object({
  household_id: z.string().uuid('Invalid household ID'),
  tenant_user_id: z.string().uuid('Invalid tenant user ID'),
  has_visiting_rights: z.boolean().optional(),
  has_signatory_rights: z.boolean().optional(),
});

/**
 * Household member response schema
 */
export const HouseholdMemberSchema = z.object({
  household_id: z.string().uuid(),
  tenant_user_id: z.string().uuid(),
  has_visiting_rights: z.boolean(),
  has_signatory_rights: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

/**
 * Household with members response schema (for detailed views)
 */
export const HouseholdWithMembersSchema = HouseholdSchema.extend({
  members: z.array(
    HouseholdMemberSchema.extend({
      user_profile: z.object({
        id: z.string().uuid(),
        first_name: z.string(),
        last_name: z.string(),
        contact_number: z.string().nullable(),
      }),
      role: z.object({
        id: z.string().uuid(),
        code: z.string(),
        name: z.string(),
      }),
    })
  ),
});

/**
 * Remove household member input schema
 */
export const RemoveHouseholdMemberSchema = z.object({
  household_id: z.string().uuid('Invalid household ID'),
  tenant_user_id: z.string().uuid('Invalid tenant user ID'),
});

/**
 * Household query filters schema
 */
export const HouseholdQueryFiltersSchema = z.object({
  status: HouseholdStatusSchema.optional(),
  lot_number: z.string().optional(),
  block_number: z.string().optional(),
  address_search: z.string().min(2).optional(),
});

/**
 * Type exports
 */
export type HouseholdStatus = z.infer<typeof HouseholdStatusSchema>;
export type CreateHouseholdInput = z.infer<typeof CreateHouseholdSchema>;
export type UpdateHouseholdInput = z.infer<typeof UpdateHouseholdSchema>;
export type Household = z.infer<typeof HouseholdSchema>;
export type AddHouseholdMemberInput = z.infer<typeof AddHouseholdMemberSchema>;
export type UpdateHouseholdMemberInput = z.infer<
  typeof UpdateHouseholdMemberSchema
>;
export type HouseholdMember = z.infer<typeof HouseholdMemberSchema>;
export type HouseholdWithMembers = z.infer<typeof HouseholdWithMembersSchema>;
export type RemoveHouseholdMemberInput = z.infer<
  typeof RemoveHouseholdMemberSchema
>;
export type HouseholdQueryFilters = z.infer<typeof HouseholdQueryFiltersSchema>;
