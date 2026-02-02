import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize client only if keys exist to prevent build errors
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function POST(req: Request) {
  if (!supabase) {
    console.error("Supabase client not initialized - missing environment variables");
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const payload = await req.json();
    
    if (payload.event === 'call_ended') {
      const callId = payload.call_id;
      const recordingUrl = payload.recording_url; 

      const { error } = await supabase
        .from('interview_responses')
        .update({ audio_recording_url: recordingUrl })
        .eq('call_id', callId);

      if (error) throw error;
      return NextResponse.json({ message: 'Success' }, { status: 200 });
    }
    return NextResponse.json({ message: 'Event ignored' }, { status: 200 });
  } catch (err) {
    console.error('Webhook processing failed:', err);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
