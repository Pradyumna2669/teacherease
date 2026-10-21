// The teacher community. Feature requests, new question types and syllabus
// gaps come from here rather than from guesswork, so the invite is surfaced
// once after signup and then stays reachable from the header and Account page.

export const COMMUNITY_URL = "https://chat.whatsapp.com/DNn2sacQhs1Jthv8fJgdPx";

export const COMMUNITY_NAME = "PaperGen Teachers";

// Stored on the Supabase auth user's metadata (auth.users.raw_user_meta_data),
// so the prompt follows the teacher across devices without needing a profiles
// table or a migration.
export const COMMUNITY_SEEN_KEY = "community_prompt_seen";
