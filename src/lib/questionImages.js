import { supabase } from '../supabaseClient';

export const BUCKET = 'question-images';
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_BYTES = 5 * 1024 * 1024;

// The object is named after the question, so a question row is enough to find
// its image. The extension is kept because it varies per upload.
export function objectPath(questionId, file) {
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  return `${questionId}.${ext}`;
}

export function validateImage(file) {
  if (!ALLOWED.includes(file.type)) return 'Use a PNG, JPG, WEBP or GIF image.';
  if (file.size > MAX_BYTES) return 'Image must be 5 MB or smaller.';
  return null;
}

// Upload and record the path on the question in one step. upsert:true so
// replacing an image reuses the same object name.
export async function attachImage(questionId, file) {
  const problem = validateImage(file);
  if (problem) throw new Error(problem);

  const path = objectPath(questionId, file);
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (upErr) throw upErr;

  const { error } = await supabase
    .from('questions')
    .update({ image_url: path })
    .eq('id', questionId);
  if (error) throw error;
  return path;
}

export async function removeImage(questionId, path) {
  if (path) await supabase.storage.from(BUCKET).remove([path]);
  const { error } = await supabase
    .from('questions')
    .update({ image_url: null })
    .eq('id', questionId);
  if (error) throw error;
}

// Batch-sign a set of object paths. Private bucket, so every read needs one.
export async function signedUrls(paths, expiresIn = 3600) {
  const list = [...new Set(paths.filter(Boolean))];
  if (list.length === 0) return {};
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(list, expiresIn);
  if (error) throw error;
  return Object.fromEntries(
    (data || []).filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl])
  );
}

// Signed URLs expire and are cross-origin. Inlining as a data URL makes the
// image survive in the Word file and lets html2canvas paint it without a
// CORS round-trip at capture time.
export async function toDataUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load image (${res.status})`);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(new Error('Could not read image data.'));
    fr.readAsDataURL(blob);
  });
}
