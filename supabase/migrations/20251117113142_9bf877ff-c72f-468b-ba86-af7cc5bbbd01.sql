-- Update is_admin() function to check for super_admin and regional_admin roles
-- This fixes the issue where RLS policies were blocking all saves
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin', 'regional_admin')
  );
$$;

-- Update RLS policies for info_sections to work with event ownership
DROP POLICY IF EXISTS "Admins can insert info sections" ON info_sections;
DROP POLICY IF EXISTS "Admins can update info sections" ON info_sections;
DROP POLICY IF EXISTS "Admins can delete info sections" ON info_sections;

-- Super admins can manage all info sections
CREATE POLICY "Super admins can insert info sections"
ON info_sections
FOR INSERT
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can update info sections"
ON info_sections
FOR UPDATE
USING (public.is_super_admin());

CREATE POLICY "Super admins can delete info sections"
ON info_sections
FOR DELETE
USING (public.is_super_admin());

-- Regional admins can manage info sections for their own events
CREATE POLICY "Regional admins can insert info sections for own events"
ON info_sections
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'regional_admin') AND
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = info_sections.event_id
    AND events.created_by = auth.uid()
  )
);

CREATE POLICY "Regional admins can update info sections for own events"
ON info_sections
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'regional_admin') AND
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = info_sections.event_id
    AND events.created_by = auth.uid()
  )
);

CREATE POLICY "Regional admins can delete info sections for own events"
ON info_sections
FOR DELETE
USING (
  public.has_role(auth.uid(), 'regional_admin') AND
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = info_sections.event_id
    AND events.created_by = auth.uid()
  )
);

-- Update other tables to use the fixed is_admin() function
-- These will now work for super_admin and regional_admin

-- Update exhibitors policies
DROP POLICY IF EXISTS "Admins can insert exhibitors" ON exhibitors;
DROP POLICY IF EXISTS "Admins can update exhibitors" ON exhibitors;
DROP POLICY IF EXISTS "Admins can delete exhibitors" ON exhibitors;

CREATE POLICY "Admins can insert exhibitors"
ON exhibitors
FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update exhibitors"
ON exhibitors
FOR UPDATE
USING (public.is_admin());

CREATE POLICY "Admins can delete exhibitors"
ON exhibitors
FOR DELETE
USING (public.is_admin());

-- Update program_items policies
DROP POLICY IF EXISTS "Admins can insert program items" ON program_items;
DROP POLICY IF EXISTS "Admins can update program items" ON program_items;
DROP POLICY IF EXISTS "Admins can delete program items" ON program_items;

CREATE POLICY "Admins can insert program items"
ON program_items
FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update program items"
ON program_items
FOR UPDATE
USING (public.is_admin());

CREATE POLICY "Admins can delete program items"
ON program_items
FOR DELETE
USING (public.is_admin());

-- Update maps policies
DROP POLICY IF EXISTS "Admins can insert maps" ON maps;
DROP POLICY IF EXISTS "Admins can update maps" ON maps;
DROP POLICY IF EXISTS "Admins can delete maps" ON maps;

CREATE POLICY "Admins can insert maps"
ON maps
FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update maps"
ON maps
FOR UPDATE
USING (public.is_admin());

CREATE POLICY "Admins can delete maps"
ON maps
FOR DELETE
USING (public.is_admin());

-- Update participants policies
DROP POLICY IF EXISTS "Admins can insert participants" ON participants;
DROP POLICY IF EXISTS "Admins can update participants" ON participants;
DROP POLICY IF EXISTS "Admins can delete participants" ON participants;

CREATE POLICY "Admins can insert participants"
ON participants
FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update participants"
ON participants
FOR UPDATE
USING (public.is_admin());

CREATE POLICY "Admins can delete participants"
ON participants
FOR DELETE
USING (public.is_admin());