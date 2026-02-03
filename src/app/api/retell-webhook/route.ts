import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initializing Supabase with Service Role Key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    console.log("Retell Webhook Payload:", payload);

    // Any Retell payload containing a recording_url will update the DB
    // Check both top-level and nested 'call' object for data
    const recordingUrl = payload.recording_url || payload.call?.recording_url;
    const callId = payload.call_id || payload.call?.call_id;

    if (recordingUrl && callId) {
      const { error } = await supabase
        .from('response') // Updated to match your actual table name
        .update({ audio_recording_url: recordingUrl })
        .eq('call_id', callId);

      if (error) {
        console.error("Supabase Error:", error.message);
        throw error;
      }
      
      return NextResponse.json({ message: 'Success' }, { status: 200 });
    }
    
    return NextResponse.json({ message: 'Recording link not found' }, { status: 200 });
  } catch (err) {
    console.error("Webhook Error:", err);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
