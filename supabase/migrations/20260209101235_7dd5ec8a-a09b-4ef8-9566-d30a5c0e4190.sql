-- Add location_url column to program_items table
ALTER TABLE public.program_items 
ADD COLUMN location_url text NULL;