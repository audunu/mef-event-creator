import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Papa from 'https://esm.sh/papaparse@5.4.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sheetsUrl, eventId } = await req.json();
    console.log('Syncing sheets for event:', eventId);

    // Extract sheet ID from URL
    const sheetIdMatch = sheetsUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetIdMatch) {
      throw new Error('Invalid Google Sheets URL');
    }
    const sheetId = sheetIdMatch[1];

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
      const programRes = await fetch(programUrl);
      const programCsv = await programRes.text();
      
      const programData: any = Papa.parse(programCsv, { header: true, skipEmptyLines: 'greedy' as any, dynamicTyping: true });
      
      await supabase.from('program_items').delete().eq('event_id', eventId);
      
      const programItems = programData.data.map((row: any, idx: number) => ({
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
      const participantsRes = await fetch(participantsUrl);
      const participantsCsv = await participantsRes.text();
      
      const participantsData: any = Papa.parse(participantsCsv, { header: true, skipEmptyLines: 'greedy' as any, dynamicTyping: true });
      
      await supabase.from('participants').delete().eq('event_id', eventId);
      
      const participants = participantsData.data.map((row: any, idx: number) => ({
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
      const exhibitorsRes = await fetch(exhibitorsUrl);
      const exhibitorsCsv = await exhibitorsRes.text();
      
      const exhibitorsData: any = Papa.parse(exhibitorsCsv, { header: true, skipEmptyLines: 'greedy' as any, dynamicTyping: true });
      
      await supabase.from('exhibitors').delete().eq('event_id', eventId);
      
      const exhibitors = exhibitorsData.data.map((row: any, idx: number) => ({
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
