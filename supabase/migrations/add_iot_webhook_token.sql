-- Supabase Migration: Add IoT Webhook Token
-- This migration adds a random UUID token to each brewery to authenticate IoT webhooks
-- like automated gravity/pH sensors (e.g. Tilt Hydrometer).

ALTER TABLE public.breweries 
ADD COLUMN IF NOT EXISTS iot_webhook_token UUID DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS idx_breweries_webhook ON public.breweries(iot_webhook_token);
