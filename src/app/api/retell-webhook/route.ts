import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    
    // Check for the call_ended event from Retell
    if (payload.event === 'call_ended') {
      const callId = payload.call_id;
      const recordingUrl = payload.recording_url; 

      // Update the response row with the high-quality audio link
      const { error } = await supabase
        .from('interview_responses')
        .update({ audio_recording_url: recordingUrl })
        .eq('call_id', callId);

      if (error) throw error;
      return NextResponse.json({ message: 'Success' }, { status: 200 });
    }
    return NextResponse.json({ message: 'Ignored' }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
