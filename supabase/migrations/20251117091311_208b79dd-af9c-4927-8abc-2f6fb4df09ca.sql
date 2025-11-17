-- Add DELETE policy for super admins on admin_profiles
CREATE POLICY "Super admins can delete admin profiles"
  ON public.admin_profiles
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin());