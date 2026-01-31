import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { call_id, videoUrl } = await req.json();
  const supabase = createRouteHandlerClient({ cookies });

  const { error } = await supabase
    .from("response")
    .update({ video_url: videoUrl })
    .eq("call_id", call_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
