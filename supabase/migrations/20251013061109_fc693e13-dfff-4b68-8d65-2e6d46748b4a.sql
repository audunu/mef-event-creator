-- Phase 1: Comprehensive Security Fix
-- Create role-based access control system and fix all RLS policies

-- 1. Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- 4. Create function to check if user is admin (helper)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

-- 5. Fix admin_settings table policies
-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can manage admin settings" ON public.admin_settings;

-- Add admin-only policies
CREATE POLICY "Only admins can view admin settings"
  ON public.admin_settings
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Only admins can update admin settings"
  ON public.admin_settings
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 6. Fix events table policies
-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can manage events" ON public.events;

-- Add admin-only policies for event management
CREATE POLICY "Admins can insert events"
  ON public.events
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update events"
  ON public.events
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete events"
  ON public.events
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can view all events"
  ON public.events
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Keep public read policy (already exists and is correct)

-- 7. Fix program_items table policies
DROP POLICY IF EXISTS "Authenticated users can manage program items" ON public.program_items;

CREATE POLICY "Admins can insert program items"
  ON public.program_items
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update program items"
  ON public.program_items
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete program items"
  ON public.program_items
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can view all program items"
  ON public.program_items
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- 8. Fix participants table policies
DROP POLICY IF EXISTS "Authenticated users can manage participants" ON public.participants;

CREATE POLICY "Admins can insert participants"
  ON public.participants
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update participants"
  ON public.participants
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete participants"
  ON public.participants
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can view all participants"
  ON public.participants
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- 9. Fix exhibitors table policies
DROP POLICY IF EXISTS "Authenticated users can manage exhibitors" ON public.exhibitors;

CREATE POLICY "Admins can insert exhibitors"
  ON public.exhibitors
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update exhibitors"
  ON public.exhibitors
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete exhibitors"
  ON public.exhibitors
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can view all exhibitors"
  ON public.exhibitors
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- 10. Fix info_sections table policies
DROP POLICY IF EXISTS "Authenticated users can manage info sections" ON public.info_sections;

CREATE POLICY "Admins can insert info sections"
  ON public.info_sections
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update info sections"
  ON public.info_sections
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete info sections"
  ON public.info_sections
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can view all info sections"
  ON public.info_sections
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- 11. Fix maps table policies
DROP POLICY IF EXISTS "Authenticated users can manage maps" ON public.maps;

CREATE POLICY "Admins can insert maps"
  ON public.maps
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update maps"
  ON public.maps
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete maps"
  ON public.maps
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can view all maps"
  ON public.maps
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- 12. Add policy for users to view their own roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 13. Create helper function to promote first user to admin
-- This will be called manually or automatically for the first signup
CREATE OR REPLACE FUNCTION public.ensure_first_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If this is the first user, make them admin
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-promote first user
CREATE TRIGGER on_auth_user_created_ensure_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_first_admin();