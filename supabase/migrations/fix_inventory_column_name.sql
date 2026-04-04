-- Fix: Rename quantity back to current_stock
-- The previous migration incorrectly renamed current_stock to quantity
-- This migration rolls that back to maintain compatibility with existing code

ALTER TABLE inventory RENAME COLUMN quantity TO current_stock;
