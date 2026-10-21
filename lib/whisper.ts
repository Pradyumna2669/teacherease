// Groq Whisper API for transcribing voice notes into text (100% Free tier on Groq Cloud).
export async function transcribeAudioWithGroq(
  audioBuffer: Buffer,
  mimeType: string = "audio/ogg"
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured in .env.local");
  }

  // Derive file extension from mime type
  const ext = mimeType.includes("ogg")
    ? "ogg"
    : mimeType.includes("mp4") || mimeType.includes("m4a")
    ? "m4a"
    : mimeType.includes("mp3")
    ? "mp3"
    : mimeType.includes("wav")
    ? "wav"
    : "ogg";

  const filename = `voice-note.${ext}`;

  const formData = new FormData();
  const uint8 = new Uint8Array(audioBuffer);
  const blob = new Blob([uint8], { type: mimeType });
  formData.append("file", blob, filename);
  formData.append("model", "whisper-large-v3");
  formData.append(
    "prompt",
    "Transcribing teacher instructions for creating an exam question paper (Indian curriculum, CBSE, ICSE, State Board, Hindi, English, Hinglish)."
  );

  const res = await fetch(
    "https://api.groq.com/openai/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Groq Whisper failed (${res.status}): ${errorText}`);
  }

  const json = await res.json();
  return (json.text || "").trim();
}
