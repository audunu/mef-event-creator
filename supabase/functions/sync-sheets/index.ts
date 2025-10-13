import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Papa from 'https://esm.sh/papaparse@5.4.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Max file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Max rows per sheet
const MAX_ROWS = 10000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Extract and verify JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Create supabase client with user's token for auth check
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // 2. Verify user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Check if user has admin role
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      console.error('Authorization error:', roleError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized - admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Parse and validate request body
    const { sheetsUrl, eventId } = await req.json();
    
    // Validate eventId format
    if (!eventId || !UUID_REGEX.test(eventId)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid event ID format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate sheetsUrl format
    if (!sheetsUrl || typeof sheetsUrl !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid sheets URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // 5. Validate Google Sheets URL format
    const sheetsUrlPattern = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
    const sheetIdMatch = sheetsUrl.match(sheetsUrlPattern);
    
    if (!sheetIdMatch) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid Google Sheets URL format. Must be a valid Google Sheets URL.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const sheetId = sheetIdMatch[1];
    console.log('Syncing sheets for event:', eventId, 'by user:', user.id);

    // 6. Verify event exists and user has access
    const { data: eventData, error: eventError } = await supabaseClient
      .from('events')
      .select('id')
      .eq('id', eventId)
      .maybeSingle();

    if (eventError || !eventData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Event not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role key for bulk operations (bypasses RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const results: any = {
      program: { count: 0, errors: [] },
      participants: { count: 0, errors: [] },
      exhibitors: { count: 0, errors: [] },
    };

    // Sync Program
    try {
      const programUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Program`;
      const programRes = await fetch(programUrl, { 
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });
      
      if (!programRes.ok) {
        throw new Error(`Failed to fetch Program sheet: ${programRes.statusText}`);
      }

      const contentLength = programRes.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
        throw new Error('Program sheet exceeds maximum file size (10MB)');
      }

      const programCsv = await programRes.text();
      
      if (programCsv.length > MAX_FILE_SIZE) {
        throw new Error('Program sheet exceeds maximum file size (10MB)');
      }
      
      const programData: any = Papa.parse(programCsv, { 
        header: true, 
        skipEmptyLines: 'greedy' as any,
        dynamicTyping: false // Safer - keep as strings initially
      });
      
      if (programData.data.length > MAX_ROWS) {
        throw new Error(`Program sheet exceeds maximum row count (${MAX_ROWS})`);
      }
      
      await supabase.from('program_items').delete().eq('event_id', eventId);
      
      const programItems = programData.data
        .filter((row: any) => row && Object.keys(row).length > 0)
        .slice(0, MAX_ROWS)
        .map((row: any, idx: number) => ({
        event_id: eventId,
        external_id: `p${idx + 1}`,
        day: row.dag || row.Dag || row.day || row.Day,
        start_time: row.start || row.Start,
        end_time: row.end || row.End || null,
        title: row.tittel || row.Tittel || row.title || row.Title,
        description: row.beskrivelse || row.Beskrivelse || row.description || row.Description || null,
        location: row.sted || row.Sted || row.location || row.Location || null,
      }));
      
      const { error } = await supabase.from('program_items').insert(programItems);
      if (error) throw error;
      results.program.count = programItems.length;
    } catch (e: any) {
      results.program.errors.push(e.message);
    }

    // Sync Participants
    try {
      const participantsUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Deltakere`;
      const participantsRes = await fetch(participantsUrl, {
        signal: AbortSignal.timeout(30000)
      });
      
      if (!participantsRes.ok) {
        throw new Error(`Failed to fetch Deltakere sheet: ${participantsRes.statusText}`);
      }

      const contentLength = participantsRes.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
        throw new Error('Deltakere sheet exceeds maximum file size (10MB)');
      }

      const participantsCsv = await participantsRes.text();
      
      if (participantsCsv.length > MAX_FILE_SIZE) {
        throw new Error('Deltakere sheet exceeds maximum file size (10MB)');
      }
      
      const participantsData: any = Papa.parse(participantsCsv, { 
        header: true, 
        skipEmptyLines: 'greedy' as any,
        dynamicTyping: false
      });
      
      if (participantsData.data.length > MAX_ROWS) {
        throw new Error(`Deltakere sheet exceeds maximum row count (${MAX_ROWS})`);
      }
      
      await supabase.from('participants').delete().eq('event_id', eventId);
      
      const participants = participantsData.data
        .filter((row: any) => row && Object.keys(row).length > 0)
        .slice(0, MAX_ROWS)
        .map((row: any, idx: number) => ({
        event_id: eventId,
        external_id: `d${idx + 1}`,
        name: row.navn || row.Navn || row.name || row.Name,
        company: row.bedrift || row.Bedrift || row.company || row.Company || null,
      }));
      
      const { error } = await supabase.from('participants').insert(participants);
      if (error) throw error;
      results.participants.count = participants.length;
    } catch (e: any) {
      results.participants.errors.push(e.message);
    }

    // Sync Exhibitors
    try {
      const exhibitorsUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Utstillere`;
      const exhibitorsRes = await fetch(exhibitorsUrl, {
        signal: AbortSignal.timeout(30000)
      });
      
      if (!exhibitorsRes.ok) {
        throw new Error(`Failed to fetch Utstillere sheet: ${exhibitorsRes.statusText}`);
      }

      const contentLength = exhibitorsRes.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
        throw new Error('Utstillere sheet exceeds maximum file size (10MB)');
      }

      const exhibitorsCsv = await exhibitorsRes.text();
      
      if (exhibitorsCsv.length > MAX_FILE_SIZE) {
        throw new Error('Utstillere sheet exceeds maximum file size (10MB)');
      }
      
      const exhibitorsData: any = Papa.parse(exhibitorsCsv, { 
        header: true, 
        skipEmptyLines: 'greedy' as any,
        dynamicTyping: false
      });
      
      if (exhibitorsData.data.length > MAX_ROWS) {
        throw new Error(`Utstillere sheet exceeds maximum row count (${MAX_ROWS})`);
      }
      
      await supabase.from('exhibitors').delete().eq('event_id', eventId);
      
      const exhibitors = exhibitorsData.data
        .filter((row: any) => row && Object.keys(row).length > 0)
        .slice(0, MAX_ROWS)
        .map((row: any, idx: number) => ({
        event_id: eventId,
        external_id: `u${idx + 1}`,
        company_name: row.bedriftsnavn || row.Bedriftsnavn || row.company || row.Company,
        stand_number: row.standnummer || row.Standnummer || row.stand || row.Stand || null,
      }));
      
      const { error } = await supabase.from('exhibitors').insert(exhibitors);
      if (error) throw error;
      results.exhibitors.count = exhibitors.length;
    } catch (e: any) {
      results.exhibitors.errors.push(e.message);
    }

    return new Response(
      JSON.stringify({ success: true, results, timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
