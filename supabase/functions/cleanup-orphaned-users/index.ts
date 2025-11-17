import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Create client with user's auth token to verify they're a super admin
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Verify the user is a super admin
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Not authenticated')
    }

    const { data: isSuperAdmin, error: roleError } = await userClient
      .rpc('is_super_admin')
    
    if (roleError || !isSuperAdmin) {
      throw new Error('Not authorized - super admin access required')
    }

    // Create client with service role key for admin operations
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Find orphaned users (in auth but not in admin_profiles)
    const { data: allAuthUsers, error: authUsersError } = await adminClient.auth.admin.listUsers()
    
    if (authUsersError) throw authUsersError

    const { data: profiles, error: profilesError } = await adminClient
      .from('admin_profiles')
      .select('id')

    if (profilesError) throw profilesError

    const profileIds = new Set(profiles.map(p => p.id))
    const orphanedUsers = allAuthUsers.users.filter(u => !profileIds.has(u.id))

    // Delete orphaned users
    const deletedUsers = []
    for (const orphan of orphanedUsers) {
      const { error } = await adminClient.auth.admin.deleteUser(orphan.id)
      if (!error) {
        deletedUsers.push({
          id: orphan.id,
          email: orphan.email,
          created_at: orphan.created_at
        })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted_count: deletedUsers.length,
        deleted_users: deletedUsers
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error cleaning up orphaned users:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
