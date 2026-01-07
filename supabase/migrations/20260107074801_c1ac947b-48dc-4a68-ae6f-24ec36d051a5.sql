-- Create event_sponsors table
CREATE TABLE public.event_sponsors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  website_url TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_sponsors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_sponsors
-- Public can view sponsors for published events
CREATE POLICY "Anyone can view sponsors for published events"
ON public.event_sponsors
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.events
  WHERE events.id = event_sponsors.event_id AND events.published = true
));

-- Admins can view all sponsors
CREATE POLICY "Admins can view all sponsors"
ON public.event_sponsors
FOR SELECT
USING (is_admin());

-- Admins can insert sponsors
CREATE POLICY "Admins can insert sponsors"
ON public.event_sponsors
FOR INSERT
WITH CHECK (is_admin());

-- Admins can update sponsors
CREATE POLICY "Admins can update sponsors"
ON public.event_sponsors
FOR UPDATE
USING (is_admin());

-- Admins can delete sponsors
CREATE POLICY "Admins can delete sponsors"
ON public.event_sponsors
FOR DELETE
USING (is_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_event_sponsors_updated_at
BEFORE UPDATE ON public.event_sponsors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add new columns to events table
ALTER TABLE public.events
ADD COLUMN sponsors_module_enabled BOOLEAN DEFAULT false,
ADD COLUMN sponsors_module_title TEXT DEFAULT 'Leverandører';

-- Create storage bucket for sponsor logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('sponsor-logos', 'sponsor-logos', true);

-- Storage policies for sponsor-logos bucket
CREATE POLICY "Sponsor logos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'sponsor-logos');

CREATE POLICY "Admins can upload sponsor logos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'sponsor-logos' AND is_admin());

CREATE POLICY "Admins can update sponsor logos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'sponsor-logos' AND is_admin());

CREATE POLICY "Admins can delete sponsor logos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'sponsor-logos' AND is_admin());