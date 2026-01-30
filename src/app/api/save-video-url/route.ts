import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { call_id, videoUrl } = await request.json();
    
    // Explicitly await cookies for Next.js 15+ compatibility
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { error } = await supabase
      .from('response')
      .update({ video_url: videoUrl })
      .eq('call_id', call_id);

    if (error) throw error;
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("API Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
