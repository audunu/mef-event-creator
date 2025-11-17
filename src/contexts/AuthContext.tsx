import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isRegionalAdmin: boolean;
  userRole: 'super_admin' | 'regional_admin' | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshAdminStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isRegionalAdmin, setIsRegionalAdmin] = useState(false);
  const [userRole, setUserRole] = useState<'super_admin' | 'regional_admin' | null>(null);

  // Check if user has admin role
  const checkAdminRole = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .in('role', ['super_admin', 'regional_admin'])
      .maybeSingle();
    
    if (!error && data) {
      const role = data.role as 'super_admin' | 'regional_admin';
      setUserRole(role);
      setIsSuperAdmin(role === 'super_admin');
      setIsRegionalAdmin(role === 'regional_admin');
      setIsAdmin(true);
    } else {
      setUserRole(null);
      setIsSuperAdmin(false);
      setIsRegionalAdmin(false);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminRole(session.user.id);
      } else {
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setIsRegionalAdmin(false);
        setUserRole(null);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Use setTimeout to defer the Supabase call and prevent deadlock
        setTimeout(() => {
          checkAdminRole(session.user.id);
        }, 0);
      } else {
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setIsRegionalAdmin(false);
        setUserRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshAdminStatus = async () => {
    if (user) {
      await checkAdminRole(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isAdmin, 
      isSuperAdmin, 
      isRegionalAdmin, 
      userRole,
      signIn, 
      signOut, 
      refreshAdminStatus 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
