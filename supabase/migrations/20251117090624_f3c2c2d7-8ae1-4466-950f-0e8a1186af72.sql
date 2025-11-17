-- Drop existing policies on admin_profiles
DROP POLICY IF EXISTS "Super admins can view all admin profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Regional admins can view their own profile" ON public.admin_profiles;
DROP POLICY IF EXISTS "Super admins can insert admin profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Super admins can update admin profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.admin_profiles;

-- Create correct RLS policies for admin_profiles
-- Super admins can view all profiles
CREATE POLICY "Super admins can view all admin profiles"
  ON public.admin_profiles
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

-- Regional admins can view their own profile
CREATE POLICY "Regional admins can view their own profile"
  ON public.admin_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Super admins can insert new admin profiles
CREATE POLICY "Super admins can insert admin profiles"
  ON public.admin_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

-- Super admins can update any admin profile
CREATE POLICY "Super admins can update admin profiles"
  ON public.admin_profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.admin_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);