-- Add category column to program_items table
ALTER TABLE public.program_items
ADD COLUMN category TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN public.program_items.category IS 'Comma-separated list of categories (e.g., "Fagprogram, Transport")';