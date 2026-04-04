-- Migration: Add Degradation Tracking Columns to Inventory Table
-- Purpose: Add missing columns needed for ingredient freshness tracking
-- Run this in Supabase SQL Editor to update your existing database

-- Add missing columns to inventory table
ALTER TABLE inventory
ADD COLUMN IF NOT EXISTS lot_number TEXT,
ADD COLUMN IF NOT EXISTS expiration_date DATE,
ADD COLUMN IF NOT EXISTS manufacturer TEXT,
ADD COLUMN IF NOT EXISTS degradation_tracked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS received_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS storage_condition TEXT DEFAULT 'cool_dry',
ADD COLUMN IF NOT EXISTS last_degradation_calc DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS hsi_initial DECIMAL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS hsi_current DECIMAL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS hsi_loss_rate DECIMAL DEFAULT 0.15,
ADD COLUMN IF NOT EXISTS grain_moisture_initial DECIMAL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS grain_moisture_current DECIMAL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ppg_initial DECIMAL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ppg_current DECIMAL DEFAULT NULL;

-- Create degradation_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS degradation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID REFERENCES inventory(id) ON DELETE CASCADE NOT NULL,
  brewery_id UUID REFERENCES breweries(id) ON DELETE CASCADE NOT NULL,
  hsi_before DECIMAL,
  hsi_after DECIMAL,
  grain_moisture_before DECIMAL,
  grain_moisture_after DECIMAL,
  ppg_before DECIMAL,
  ppg_after DECIMAL,
  change_reason TEXT DEFAULT 'auto_calc',
  storage_condition_at_time TEXT,
  days_elapsed INTEGER DEFAULT 0,
  logged_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_degradation_logs_inventory 
ON degradation_logs(inventory_id);

CREATE INDEX IF NOT EXISTS idx_degradation_logs_brewery 
ON degradation_logs(brewery_id);
