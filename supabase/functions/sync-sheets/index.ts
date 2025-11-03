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

// Helper function to parse flexible date formats
function parseFlexibleDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  
  const trimmed = String(dateStr).trim();
  if (!trimmed) return null;
  
  console.log(`Parsing date: "${trimmed}"`);
  
  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  
  // Try DD/MM/YYYY or DD.MM.YYYY or DD-MM-YYYY
  const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    console.log(`Converted ${trimmed} to ${isoDate}`);
    return isoDate;
  }
  
  // Try YYYY/MM/DD or YYYY.MM.DD
  const yyyymmddMatch = trimmed.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (yyyymmddMatch) {
    const [, year, month, day] = yyyymmddMatch;
    const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    console.log(`Converted ${trimmed} to ${isoDate}`);
    return isoDate;
  }
  
  // Try parsing as a timestamp/date object
  try {
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const isoDate = parsed.toISOString().split('T')[0];
      console.log(`Parsed ${trimmed} as Date object to ${isoDate}`);
      return isoDate;
    }
  } catch (e) {
    console.warn(`Could not parse date: "${trimmed}"`);
  }
  
  console.warn(`Failed to parse date: "${trimmed}"`);
  return null;
}

// Helper function to parse flexible time formats
function parseFlexibleTime(timeStr: string | null | undefined): string | null {
  if (!timeStr) return null;
  
  const trimmed = String(timeStr).trim();
  if (!trimmed) return null;
  
  console.log(`Parsing time: "${trimmed}"`);
  
  // Try HH:MM format (already valid)
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    const [hours, minutes] = trimmed.split(':');
    const formatted = `${hours.padStart(2, '0')}:${minutes}`;
    console.log(`Time already valid, formatted: ${formatted}`);
    return formatted;
  }
  
  // Try HH.MM format (with dot separator)
  const dotMatch = trimmed.match(/^(\d{1,2})\.(\d{2})$/);
  if (dotMatch) {
    const [, hours, minutes] = dotMatch;
    const formatted = `${hours.padStart(2, '0')}:${minutes}`;
    console.log(`Converted ${trimmed} to ${formatted}`);
    return formatted;
  }
  
  // Try HHMM format (no separator)
  const noSepMatch = trimmed.match(/^(\d{1,2})(\d{2})$/);
  if (noSepMatch) {
    const [, hours, minutes] = noSepMatch;
    const formatted = `${hours.padStart(2, '0')}:${minutes}`;
    console.log(`Converted ${trimmed} to ${formatted}`);
    return formatted;
  }
  
  // Try with seconds HH:MM:SS
  const withSecondsMatch = trimmed.match(/^(\d{1,2}):(\d{2}):\d{2}$/);
  if (withSecondsMatch) {
    const [, hours, minutes] = withSecondsMatch;
    const formatted = `${hours.padStart(2, '0')}:${minutes}`;
    console.log(`Converted ${trimmed} to ${formatted}`);
    return formatted;
  }
  
  console.warn(`Failed to parse time: "${trimmed}"`);
  return null;
}

// Helper to safely get and trim string value
function getTrimmed(value: any): string | null {
  if (value === null || value === undefined || value === '') return null;
  const str = String(value).trim();
  return str === '' ? null : str;
}

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
    console.log('Checking admin role for user:', user.id);
    
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    console.log('Role check result:', { roleData, roleError, userId: user.id });

    if (roleError || !roleData) {
      console.error('Authorization failed:', {
        hasError: !!roleError,
        errorMessage: roleError?.message,
        hasData: !!roleData,
        userId: user.id
      });
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized - admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Admin authorization confirmed for user:', user.id);

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
        .map((row: any, idx: number) => {
          const rowNum = idx + 1;
          console.log(`Processing Program row ${rowNum}:`, row);
          
          // Get raw values with multiple column name fallbacks
          const dayRaw = getTrimmed(row.dag || row.Dag || row.day || row.Day);
          const startRaw = getTrimmed(row.start || row.Start);
          const endRaw = getTrimmed(row.end || row.End);
          const titleRaw = getTrimmed(row.tittel || row.Tittel || row.title || row.Title);
          const descriptionRaw = getTrimmed(row.beskrivelse || row.Beskrivelse || row.description || row.Description);
          const locationRaw = getTrimmed(row.sted || row.Sted || row.location || row.Location);
          
          // Parse and validate
          const day = parseFlexibleDate(dayRaw);
          const start_time = parseFlexibleTime(startRaw);
          const end_time = parseFlexibleTime(endRaw);
          
          // Log validation results
          if (!day) {
            console.warn(`Row ${rowNum}: Failed to parse day "${dayRaw}"`);
          }
          if (!start_time) {
            console.warn(`Row ${rowNum}: Failed to parse start_time "${startRaw}"`);
          }
          if (!titleRaw) {
            console.warn(`Row ${rowNum}: Missing required title`);
          }
          
          return {
            event_id: eventId,
            external_id: `p${rowNum}`,
            day: day,
            start_time: start_time,
            end_time: end_time,
            title: titleRaw || 'Untitled',
            description: descriptionRaw,
            location: locationRaw,
          };
        })
        .filter((item: any) => {
          // Only include items that have minimum required fields
          if (!item.day || !item.start_time || !item.title || item.title === 'Untitled') {
            console.warn(`Skipping invalid program item: ${JSON.stringify(item)}`);
            return false;
          }
          return true;
        });
      
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
        .map((row: any, idx: number) => {
          const rowNum = idx + 1;
          console.log(`Processing Participant row ${rowNum}:`, row);
          
          const nameRaw = getTrimmed(row.navn || row.Navn || row.name || row.Name);
          const companyRaw = getTrimmed(row.bedrift || row.Bedrift || row.company || row.Company);
          
          if (!nameRaw) {
            console.warn(`Row ${rowNum}: Missing required name`);
          }
          
          return {
            event_id: eventId,
            external_id: `d${rowNum}`,
            name: nameRaw || 'Unknown',
            company: companyRaw,
          };
        })
        .filter((item: any) => {
          if (!item.name || item.name === 'Unknown') {
            console.warn(`Skipping invalid participant: ${JSON.stringify(item)}`);
            return false;
          }
          return true;
        });
      
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
        .map((row: any, idx: number) => {
          const rowNum = idx + 1;
          console.log(`Processing Exhibitor row ${rowNum}:`, row);
          
          const companyRaw = getTrimmed(row.bedriftsnavn || row.Bedriftsnavn || row.company || row.Company);
          const standRaw = getTrimmed(row.standnummer || row.Standnummer || row.stand || row.Stand);
          
          if (!companyRaw) {
            console.warn(`Row ${rowNum}: Missing required company_name`);
          }
          
          return {
            event_id: eventId,
            external_id: `u${rowNum}`,
            company_name: companyRaw || 'Unknown Company',
            stand_number: standRaw,
          };
        })
        .filter((item: any) => {
          if (!item.company_name || item.company_name === 'Unknown Company') {
            console.warn(`Skipping invalid exhibitor: ${JSON.stringify(item)}`);
            return false;
          }
          return true;
        });
      
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
