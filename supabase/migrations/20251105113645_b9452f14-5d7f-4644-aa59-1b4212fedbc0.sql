-- Add optional end_date column to events table
ALTER TABLE public.events
ADD COLUMN end_date DATE;