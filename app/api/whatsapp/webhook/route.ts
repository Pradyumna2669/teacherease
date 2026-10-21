import { NextRequest, NextResponse } from "next/server";
import {
  sendWhatsAppMessage,
  downloadWhatsAppMedia,
  sendWhatsAppDocument,
} from "@/lib/whatsapp";
import { transcribeAudioWithGroq } from "@/lib/whisper";
import { extractPaper, type ScanImage } from "@/lib/scan-providers";
import { generatePaperPdfBuffer } from "@/lib/pdf-generator";
import { createAdminClient } from "@/lib/supabase/admin";
import { type ScannedPaper, scannedToQuestions } from "@/lib/scan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120; // Allow enough time for OCR and PDF generation

const SCAN_MODEL = process.env.SCAN_MODEL || "claude-sonnet-4-6";

/**
 * GET: Webhook verification challenge from Meta
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken =
    process.env.WHATSAPP_VERIFY_TOKEN || "papergen_secret_token_123";

  if (mode === "subscribe" && token === expectedToken) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification token mismatch" }, { status: 403 });
}

/**
 * Helper: Find or create user account for this phone number
 */
async function getOrCreateUserForPhone(phoneNumber: string): Promise<string | null> {
  try {
    const supabaseAdmin = createAdminClient();
    const fakeEmail = `wa_${phoneNumber}@papergen.app`;

    // 1. Try finding existing user by email
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (!listError && usersData?.users) {
      const existing = usersData.users.find(
        (u) => u.email === fakeEmail || u.phone === phoneNumber
      );
      if (existing) return existing.id;
    }

    // 2. Create new user with a random password
    const randomPassword = `Pg#${Math.random().toString(36).substring(2)}${Date.now()}`;
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: fakeEmail,
      password: randomPassword,
      email_confirm: true,
      user_metadata: {
        source: "whatsapp",
        phone: phoneNumber,
      },
    });

    if (createError || !newUser?.user) {
      console.error("Failed to auto-create user for WhatsApp phone:", createError);
      return null;
    }

    return newUser.user.id;
  } catch (err) {
    console.error("Error in getOrCreateUserForPhone:", err);
    return null;
  }
}

/**
 * POST: Handles incoming WhatsApp notifications
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    // Meta sends status updates (sent, delivered, read) without a message object
    if (!message) {
      return NextResponse.json({ status: "ignored_non_message" });
    }

    const from = message.from; // Phone number e.g. "919876543210"
    const messageType = message.type;

    // -------------------------------------------------------------
    // 1. AUDIO / VOICE NOTE
    // -------------------------------------------------------------
    if (messageType === "audio" || messageType === "voice") {
      const audioId = message.audio?.id || message.voice?.id;
      if (!audioId) {
        await sendWhatsAppMessage(from, "Could not load your voice note. Please try again.");
        return NextResponse.json({ status: "ok" });
      }

      await sendWhatsAppMessage(from, "Transcribing your voice instruction...");

      const { buffer, mimeType } = await downloadWhatsAppMedia(audioId);
      const transcribedText = await transcribeAudioWithGroq(buffer, mimeType);

      await sendWhatsAppMessage(
        from,
        `I heard:\n"${transcribedText}"\n\nNow, send me the photo(s) of your handwritten paper and I'll generate the question paper for you!`
      );

      return NextResponse.json({ status: "ok" });
    }

    // -------------------------------------------------------------
    // 2. IMAGE (Handwritten Paper Photo)
    // -------------------------------------------------------------
    if (messageType === "image") {
      const imageId = message.image?.id;
      const caption = message.image?.caption;

      if (!imageId) {
        await sendWhatsAppMessage(from, "Could not load your image. Please try again.");
        return NextResponse.json({ status: "ok" });
      }

      await sendWhatsAppMessage(
        from,
        "Reading your handwritten paper with AI. This may take 20-30 seconds..."
      );

      // Download image from WhatsApp
      const { buffer, mimeType } = await downloadWhatsAppMedia(imageId);
      const base64Data = buffer.toString("base64");

      const scanImages: ScanImage[] = [
        {
          mediaType: mimeType || "image/jpeg",
          data: base64Data,
        },
      ];

      // Extract paper using existing scan provider (Gemini or Claude)
      const extractResult = await extractPaper(scanImages, SCAN_MODEL);

      if (extractResult.error || !extractResult.raw) {
        await sendWhatsAppMessage(
          from,
          `Sorry, could not read the handwriting clearly: ${extractResult.error || "Please try with a clearer photo."}`
        );
        return NextResponse.json({ status: "ok" });
      }

      let parsedPaper: ScannedPaper;
      try {
        parsedPaper = JSON.parse(extractResult.raw);
      } catch (e) {
        await sendWhatsAppMessage(
          from,
          "Had trouble formatting the questions. Please try with another clear photo."
        );
        return NextResponse.json({ status: "ok" });
      }

      const rawQuestions = parsedPaper.questions || [];
      if (rawQuestions.length === 0) {
        await sendWhatsAppMessage(
          from,
          "No questions could be found on the uploaded image. Please ensure the handwriting is legible."
        );
        return NextResponse.json({ status: "ok" });
      }

      // Convert scanned questions to full builder Question objects
      const questions = scannedToQuestions(rawQuestions);

      // Find or create user account in Supabase
      const userId = await getOrCreateUserForPhone(from);

      const paperTitle =
        parsedPaper.settings?.assessmentTitle || caption || "Generated Question Paper";
      const subject = parsedPaper.settings?.subject || "General";
      const className = parsedPaper.settings?.className || "";
      const schoolName = parsedPaper.settings?.schoolName || "Examination Paper";

      // Save paper to Supabase
      let paperId = "";
      if (userId) {
        const supabaseAdmin = createAdminClient();
        const { data: insertedPaper } = await supabaseAdmin
          .from("papers")
          .insert({
            user_id: userId,
            title: paperTitle,
            subject,
            class_name: className,
            settings: {
              schoolName,
              assessmentTitle: paperTitle,
              timeAllowed: "1 hr",
              totalMarks: questions.reduce((sum, q) => sum + (q.marks || 1), 0),
              instructions: parsedPaper.settings?.instructions || [
                "All questions are compulsory.",
                "Marks are indicated against each question.",
              ],
            },
            questions,
          })
          .select("id")
          .single();

        if (insertedPaper) {
          paperId = insertedPaper.id;
        }
      }

      // Generate PDF
      const pdfBuffer = await generatePaperPdfBuffer({
        title: paperTitle,
        instituteName: schoolName,
        className,
        subject,
        timeAllowed: "1 hr",
        maxMarks: questions.reduce((sum, q) => sum + (q.marks || 1), 0),
        generalInstructions: parsedPaper.settings?.instructions || [
          "All questions are compulsory.",
          "Write neatly and clearly.",
        ],
        questions,
      });

      // Send PDF back to WhatsApp
      const filename = `${paperTitle.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
      const docCaption = `Here is your generated question paper (${questions.length} questions)!`;

      await sendWhatsAppDocument(from, pdfBuffer, filename, docCaption);

      // Send follow-up with web link
      const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://papergen.app";
      const editMsg = paperId
        ? `You can also view, edit or print Set A/B papers on PaperGen:\n${siteUrl}/papers/${paperId}`
        : `Generated via PaperGen: ${siteUrl}`;

      await sendWhatsAppMessage(from, editMsg);

      return NextResponse.json({ status: "ok" });
    }

    // -------------------------------------------------------------
    // 3. TEXT / GREETING
    // -------------------------------------------------------------
    if (messageType === "text") {
      const text = message.text?.body?.toLowerCase().trim() || "";

      if (text.includes("hi") || text.includes("hello") || text.includes("help") || text === "start") {
        await sendWhatsAppMessage(
          from,
          `Welcome to PaperGen AI! \n\nHere is how to create a paper for free:\n1️⃣ Send a photo of your handwritten questions.\n2️⃣ (Optional) Send a voice note with instructions (e.g. "Make a 20 mark physics test").\n\nI will instantly format them, create your paper, and send you the completed PDF!`
        );
      } else {
        await sendWhatsAppMessage(
          from,
          `Got your message: "${message.text?.body}"\n\nPlease send a photo of your handwritten paper or a voice note to generate a test paper PDF!`
        );
      }

      return NextResponse.json({ status: "ok" });
    }

    return NextResponse.json({ status: "ok" });
  } catch (err: any) {
    console.error("WhatsApp webhook error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
