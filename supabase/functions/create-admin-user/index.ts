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

    // Get request body
    const { email, password, full_name, role } = await req.json()

    if (!email || !password || !full_name || !role) {
      throw new Error('Missing required fields')
    }

    // Create client with service role key for admin operations
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Create the auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name
      }
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('User creation failed')

    // Insert admin profile
    const { error: profileError } = await adminClient
      .from('admin_profiles')
      .insert({
        id: authData.user.id,
        full_name,
        email
      })

    if (profileError) {
      // Rollback: delete the auth user
      await adminClient.auth.admin.deleteUser(authData.user.id)
      throw profileError
    }

    // Insert role
    const { error: roleInsertError } = await adminClient
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role
      })

    if (roleInsertError) {
      // Rollback: delete the auth user and profile
      await adminClient.auth.admin.deleteUser(authData.user.id)
      await adminClient.from('admin_profiles').delete().eq('id', authData.user.id)
      throw roleInsertError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: authData.user.id,
          email,
          full_name,
          role
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error creating admin user:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
