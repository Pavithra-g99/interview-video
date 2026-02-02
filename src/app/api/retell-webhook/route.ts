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

    // Capture the recording_url regardless of event type
    if (payload.recording_url && payload.call_id) {
      const { error } = await supabase
        .from('interview_responses')
        .update({ audio_recording_url: payload.recording_url })
        .eq('call_id', payload.call_id);

      if (error) throw error;
      return NextResponse.json({ message: 'Success' }, { status: 200 });
    }
    return NextResponse.json({ message: 'Recording link not found' }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
