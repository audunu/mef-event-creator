import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Trash2, UserPlus, ArrowLeft } from 'lucide-react';
import { MEFLogo } from '@/components/MEFLogo';

interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  role: 'super_admin' | 'regional_admin';
  created_at: string;
}

export default function UserManagement() {
  const navigate = useNavigate();
  const { user, isSuperAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'regional_admin' as 'super_admin' | 'regional_admin'
  });

  useEffect(() => {
    if (!authLoading && (!user || !isSuperAdmin)) {
      navigate('/admin/login');
    }
  }, [user, isSuperAdmin, authLoading, navigate]);

  useEffect(() => {
    if (user && isSuperAdmin) {
      fetchUsers();
    }
  }, [user, isSuperAdmin]);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('admin_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['super_admin', 'regional_admin']);

      if (rolesError) throw rolesError;

      const usersWithRoles = profiles?.map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        return {
          ...profile,
          role: userRole?.role as 'super_admin' | 'regional_admin' || 'regional_admin'
        };
      }) || [];

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke hente brukere',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            full_name: newUser.full_name
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Bruker ble ikke opprettet');

      // Add admin profile
      const { error: profileError } = await supabase
        .from('admin_profiles')
        .insert({
          id: authData.user.id,
          full_name: newUser.full_name,
          email: newUser.email
        });

      if (profileError) throw profileError;

      // Add role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: newUser.role
        });

      if (roleError) throw roleError;

      toast({
        title: 'Bruker opprettet',
        description: `${newUser.full_name} ble lagt til som ${newUser.role === 'super_admin' ? 'Superadmin' : 'Regional admin'}`
      });

      setNewUser({ email: '', password: '', full_name: '', role: 'regional_admin' });
      setShowAddForm(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast({
        title: 'Feil',
        description: error.message || 'Kunne ikke legge til bruker',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Er du sikker på at du vil slette ${userName}?`)) return;

    try {
      // Delete from user_roles first
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (roleError) throw roleError;

      // Delete from admin_profiles
      const { error: profileError } = await supabase
        .from('admin_profiles')
        .delete()
        .eq('id', userId);

      if (profileError) throw profileError;

      toast({
        title: 'Bruker slettet',
        description: `${userName} ble fjernet`
      });

      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Feil',
        description: error.message || 'Kunne ikke slette bruker',
        variant: 'destructive'
      });
    }
  };

  const handleChangeRole = async (userId: string, userName: string, newRole: 'super_admin' | 'regional_admin') => {
    if (!confirm(`Endre rolle for ${userName} til ${newRole === 'super_admin' ? 'Superadmin' : 'Regional admin'}?`)) return;

    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Rolle endret',
        description: `${userName} er nå ${newRole === 'super_admin' ? 'Superadmin' : 'Regional admin'}`
      });

      fetchUsers();
    } catch (error: any) {
      console.error('Error changing role:', error);
      toast({
        title: 'Feil',
        description: error.message || 'Kunne ikke endre rolle',
        variant: 'destructive'
      });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <MEFLogo />
            <h1 className="text-3xl font-bold">Brukeradministrasjon</h1>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tilbake til Dashboard
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Administrative brukere</CardTitle>
              <Button onClick={() => setShowAddForm(!showAddForm)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Legg til bruker
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showAddForm && (
              <form onSubmit={handleAddUser} className="mb-6 p-4 border rounded-lg bg-muted/50">
                <h3 className="font-semibold mb-4">Ny bruker</h3>
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="full_name">Fullt navn</Label>
                    <Input
                      id="full_name"
                      value={newUser.full_name}
                      onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">E-post</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Passord</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      required
                      minLength={6}
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Rolle</Label>
                    <Select
                      value={newUser.role}
                      onValueChange={(value: 'super_admin' | 'regional_admin') => 
                        setNewUser({ ...newUser, role: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="regional_admin">Regional admin</SelectItem>
                        <SelectItem value="super_admin">Superadmin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit">Opprett bruker</Button>
                    <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                      Avbryt
                    </Button>
                  </div>
                </div>
              </form>
            )}

            <div className="space-y-4">
              {users.map((adminUser) => (
                <div key={adminUser.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold">{adminUser.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{adminUser.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {adminUser.role === 'super_admin' ? 'Superadmin' : 'Regional admin'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Select
                      value={adminUser.role}
                      onValueChange={(value: 'super_admin' | 'regional_admin') => 
                        handleChangeRole(adminUser.id, adminUser.full_name, value)
                      }
                      disabled={adminUser.id === user.id}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="regional_admin">Regional admin</SelectItem>
                        <SelectItem value="super_admin">Superadmin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDeleteUser(adminUser.id, adminUser.full_name)}
                      disabled={adminUser.id === user.id}
                      title={adminUser.id === user.id ? 'Du kan ikke slette deg selv' : 'Slett bruker'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
