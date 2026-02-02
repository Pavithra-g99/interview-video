import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function ResponsePage({ params }: { params: { id: string } }) {
  const { data: response } = await supabase.from('interview_responses').select('*').eq('id', params.id).single();

  if (!response) return <p>Loading...</p>;

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">Interview Result</h1>
      <div className="border rounded overflow-hidden bg-black">
         {/* Video from Supabase */}
        <video src={response.video_url} controls className="w-full" />
      </div>
      <div className="p-4 bg-blue-50 rounded border border-blue-200">
        <p className="text-sm font-bold mb-2">AI Conversation Audio (Retell)</p>
        {/* Audio from Retell link */}
        {response.audio_recording_url ? (
          <audio src={response.audio_recording_url} controls className="w-full" />
        ) : (
          <p className="text-xs text-blue-500 italic">Processing audio... refresh in 1 minute.</p>
        )}
      </div>
    </div>
  );
}
