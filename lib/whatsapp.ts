// WhatsApp Cloud API Client helper for sending text, uploading/sending media, and fetching received media.

const GRAPH_API_BASE = "https://graph.facebook.com/v20.0";

export function getWhatsAppConfig() {
  const token = process.env.WHATSAPP_TOKEN || process.env.WSP_TOKEN;
  const phoneNumberId =
    process.env.WHATSAPP_PHONE_NUMBER_ID ||
    process.env.WSP_PHONE_NUMBER_ID ||
    process.env.PHN_ID ||
    process.env.phn_id;

  if (!token || !phoneNumberId) {
    throw new Error(
      "WhatsApp credentials missing. Please set WHATSAPP_TOKEN (or WSP_TOKEN) and WHATSAPP_PHONE_NUMBER_ID (or PHN_ID / WSP_PHONE_NUMBER_ID) in .env.local"
    );
  }

  return { token, phoneNumberId };
}

/**
 * Send a simple text message to a WhatsApp user.
 */
export async function sendWhatsAppMessage(to: string, text: string): Promise<boolean> {
  const { token, phoneNumberId } = getWhatsAppConfig();

  const res = await fetch(`${GRAPH_API_BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body: text },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("sendWhatsAppMessage failed:", err);
    return false;
  }
  return true;
}

/**
 * Download media (audio or image) given a WhatsApp Media ID.
 */
export async function downloadWhatsAppMedia(mediaId: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const { token } = getWhatsAppConfig();

  // Step 1: Retrieve media download URL
  const metaRes = await fetch(`${GRAPH_API_BASE}/${mediaId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!metaRes.ok) {
    const err = await metaRes.text();
    throw new Error(`Failed to get media url for ${mediaId}: ${err}`);
  }

  const metaData = await metaRes.json();
  const downloadUrl = metaData.url;
  const mimeType = metaData.mime_type || "application/octet-stream";

  // Step 2: Download the binary file using the Bearer token
  const fileRes = await fetch(downloadUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!fileRes.ok) {
    throw new Error(`Failed to download media file from ${downloadUrl}`);
  }

  const arrayBuffer = await fileRes.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType,
  };
}

/**
 * Upload a generated PDF buffer to WhatsApp Media endpoint and send it directly as a document attachment.
 */
export async function sendWhatsAppDocument(
  to: string,
  pdfBuffer: Buffer,
  filename: string,
  caption?: string
): Promise<boolean> {
  const { token, phoneNumberId } = getWhatsAppConfig();

  // Step 1: Upload media buffer as multipart form-data
  const formData = new FormData();
  const uint8 = new Uint8Array(pdfBuffer);
  const blob = new Blob([uint8], { type: "application/pdf" });
  formData.append("file", blob, filename);
  formData.append("messaging_product", "whatsapp");
  formData.append("type", "application/pdf");

  const uploadRes = await fetch(`${GRAPH_API_BASE}/${phoneNumberId}/media`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    console.error("sendWhatsAppDocument media upload failed:", err);
    return false;
  }

  const uploadData = await uploadRes.json();
  const mediaId = uploadData.id;

  // Step 2: Send document message using mediaId
  const msgRes = await fetch(`${GRAPH_API_BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "document",
      document: {
        id: mediaId,
        caption: caption || filename,
        filename,
      },
    }),
  });

  if (!msgRes.ok) {
    const err = await msgRes.text();
    console.error("sendWhatsAppDocument message send failed:", err);
    return false;
  }

  return true;
}
