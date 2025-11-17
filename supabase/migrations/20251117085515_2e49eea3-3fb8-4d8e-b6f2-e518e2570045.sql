-- Add created_by field to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);

-- Update existing admin roles to super_admin
UPDATE public.user_roles 
SET role = 'super_admin' 
WHERE role = 'admin';

-- Set created_by for existing events to the first super_admin user
UPDATE public.events 
SET created_by = (
  SELECT user_id 
  FROM public.user_roles 
  WHERE role = 'super_admin' 
  LIMIT 1
)
WHERE created_by IS NULL;

-- Drop old policies
DROP POLICY IF EXISTS "Admins can insert events" ON public.events;
DROP POLICY IF EXISTS "Admins can update events" ON public.events;
DROP POLICY IF EXISTS "Admins can delete events" ON public.events;
DROP POLICY IF EXISTS "Admins can view all events" ON public.events;

-- Create new policies with ownership checks
CREATE POLICY "Super admins can insert events" 
ON public.events FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Regional admins can insert events" 
ON public.events FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'regional_admin'));

CREATE POLICY "Super admins can update all events" 
ON public.events FOR UPDATE 
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Regional admins can update their own events" 
ON public.events FOR UPDATE 
USING (
  public.has_role(auth.uid(), 'regional_admin') 
  AND created_by = auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(), 'regional_admin') 
  AND created_by = auth.uid()
);

CREATE POLICY "Super admins can delete all events" 
ON public.events FOR DELETE 
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Regional admins can delete their own events" 
ON public.events FOR DELETE 
USING (
  public.has_role(auth.uid(), 'regional_admin') 
  AND created_by = auth.uid()
);

CREATE POLICY "Super admins can view all events" 
ON public.events FOR SELECT 
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Regional admins can view all events" 
ON public.events FOR SELECT 
USING (public.has_role(auth.uid(), 'regional_admin'));

-- Create helper function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'super_admin');
$$;

-- Create RLS policies for user_roles table to allow super admins to manage users
DROP POLICY IF EXISTS "Super admins can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can insert user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can update user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can delete user roles" ON public.user_roles;

CREATE POLICY "Super admins can view all user roles" 
ON public.user_roles FOR SELECT 
USING (public.is_super_admin());

CREATE POLICY "Super admins can insert user roles" 
ON public.user_roles FOR INSERT 
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can update user roles" 
ON public.user_roles FOR UPDATE 
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can delete user roles" 
ON public.user_roles FOR DELETE 
USING (public.is_super_admin());

-- Create a profiles table to store admin user information
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin_profiles
CREATE POLICY "Super admins can view all admin profiles" 
ON public.admin_profiles FOR SELECT 
USING (public.is_super_admin());

CREATE POLICY "Regional admins can view their own profile" 
ON public.admin_profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Super admins can insert admin profiles" 
ON public.admin_profiles FOR INSERT 
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can update admin profiles" 
ON public.admin_profiles FOR UPDATE 
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "Users can update their own profile" 
ON public.admin_profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Create trigger for updated_at
CREATE TRIGGER update_admin_profiles_updated_at
BEFORE UPDATE ON public.admin_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create profile for existing super admin
INSERT INTO public.admin_profiles (id, full_name, email)
SELECT 
  ur.user_id,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  au.email
FROM public.user_roles ur
JOIN auth.users au ON au.id = ur.user_id
WHERE ur.role = 'super_admin'
ON CONFLICT (id) DO NOTHING;