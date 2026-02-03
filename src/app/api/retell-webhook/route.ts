import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// This MUST use the SERVICE_ROLE_KEY to fix the NULL issue
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    
    // We update based on call_id provided by Retell
    if (payload.call_id && payload.recording_url) {
      const { error } = await supabase
        .from('response') // Ensure this matches your table name 'response'
        .update({ audio_recording_url: payload.recording_url })
        .eq('call_id', payload.call_id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true }, { status: 200 });
    }
    return NextResponse.json({ message: "No recording yet" }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
