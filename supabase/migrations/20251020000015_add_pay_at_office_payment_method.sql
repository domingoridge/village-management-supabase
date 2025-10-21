-- ============================================================================
-- ADD PAY_AT_OFFICE TO PAYMENT_METHOD ENUM
-- ============================================================================
-- This migration adds 'pay_at_office' as a new value to the payment_method enum
-- ============================================================================

-- ============================================================================
-- MIGRATION DEPENDENCIES
-- ============================================================================
-- This migration depends on:
-- - payment_method enum (created in 20251013000022_create_permit_payments.sql)
-- ============================================================================

-- Add 'pay_at_office' to the payment_method enum
ALTER TYPE payment_method ADD VALUE 'pay_at_office';

-- Add helpful comment
COMMENT ON TYPE payment_method IS 'Payment methods: cash, bank_transfer, gcash, paymaya, card, pay_at_office';
