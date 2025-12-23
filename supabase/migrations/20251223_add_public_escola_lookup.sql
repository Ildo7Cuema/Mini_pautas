-- Migration: Add public policies for escola lookup and payment flow
-- This allows unauthenticated users to:
-- 1. Lookup schools by code or email
-- 2. View license prices
-- 3. Create payment transactions

-- ============================================
-- 1. Public can lookup schools for payment
-- ============================================
CREATE POLICY "Public can lookup schools for payment"
    ON escolas FOR SELECT
    TO anon
    USING (true);

-- ============================================
-- 2. Public can view license prices
-- ============================================
CREATE POLICY "Public can view license prices"
    ON precos_licenca FOR SELECT
    TO anon
    USING (ativo = true);

-- ============================================
-- 3. Public can create payment transactions
-- ============================================
CREATE POLICY "Public can create payment transactions"
    ON transacoes_pagamento FOR INSERT
    TO anon
    WITH CHECK (true);

-- Note: These policies enable the public payment flow for blocked schools
-- The application limits what data is exposed and validated
