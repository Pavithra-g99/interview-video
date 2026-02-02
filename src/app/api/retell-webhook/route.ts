import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // From image_031957.png

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    console.log("Retell Webhook Payload:", payload);

    // Any Retell event containing a recording_url will update the DB
    if (payload.recording_url && payload.call_id) {
      const { error } = await supabase
        .from('interview_responses')
        .update({ audio_recording_url: payload.recording_url })
        .eq('call_id', payload.call_id);

      if (error) throw error;
      return NextResponse.json({ message: 'Success' }, { status: 200 });
    }
    return NextResponse.json({ message: 'No recording in payload' }, { status: 200 });
  } catch (err) {
    console.error('Webhook Error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
