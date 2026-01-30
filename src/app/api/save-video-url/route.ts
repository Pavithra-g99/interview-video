import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { call_id, videoUrl } = await request.json();
    const supabase = createRouteHandlerClient({ cookies });

    const { data, error } = await supabase
      .from('response')
      .update({ video_url: videoUrl })
      .eq('call_id', call_id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
