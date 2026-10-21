# TeacherEase — Supabase auth email templates

Branded HTML for the transactional emails Supabase sends. These are **not**
applied by code — paste each into the Supabase dashboard.

## Where to paste

Supabase Dashboard → **Authentication → Email Templates**. Pick the template on
the left, switch the body to the HTML view, and paste the matching file:

| File | Supabase template | Suggested subject |
|------|-------------------|-------------------|
| `confirm-signup.html` | **Confirm signup** | Confirm your TeacherEase email |
| `reset-password.html` | **Reset password** (Recovery) | Reset your TeacherEase password |
| `magic-link.html` | **Magic Link** | Your TeacherEase sign-in link |
| `change-email.html` | **Change Email Address** | Confirm your new email |
| `invite.html` | **Invite user** | You're invited to TeacherEase |

All templates use only the `{{ .ConfirmationURL }}` variable, so they work
regardless of your confirm/OTP settings.

## Required URL config (makes the reset + confirm links work)

Supabase Dashboard → **Authentication → URL Configuration**:

- **Site URL**: your production domain, e.g. `https://<your-domain>`
  (must match `NEXT_PUBLIC_SITE_URL`).
- **Redirect URLs** — add these so the links are allowed to return to the app:
  - `https://<your-domain>/auth/reset`
  - `https://<your-domain>/**` (wildcard, covers local + preview if you add them)

The **Forgot password** flow (login page → email → `/auth/reset`) depends on
`/auth/reset` being an allowed redirect URL. Without it, Supabase rejects the
link.

## Notes

- Colours are inline (email clients strip `<style>`); the accent is `#4f46e5`.
- If you use a custom SMTP sender (Auth → SMTP Settings), set a friendly
  from-name like "TeacherEase".
- The **admin dashboard** (`/admin`) is separate: set the `ADMIN_EMAILS`
  environment variable (comma-separated) to the owner email(s) that may view it.

## Custom SMTP (Resend) — required for production

Supabase's built-in email (`noreply@mail.app.supabase.io`) is rate-limited to a
few messages/hour and spam-prone. Send through Resend from
`care@mail.papergen.online` instead. The Resend key lives in **Supabase's SMTP
settings**, NOT the app `.env` — Supabase sends these emails, not the app.

**1. Resend — add the sending domain.** Resend → Domains → add
`mail.papergen.online`. Resend shows 3 DNS records (an `MX` + SPF `TXT` on
`send.mail…`, and a DKIM `TXT` on `resend._domainkey.mail…`).

**2. DNS — add those records in Vercel** (papergen.online is on Vercel DNS:
`ns1/ns2.vercel-dns.com`). Vercel → Domains → papergen.online → DNS. Enter the
**name portion relative to the apex** (e.g. `send.mail`,
`resend._domainkey.mail`), values exactly as Resend shows. Wait for Resend to
mark the domain **Verified**.

**3. Resend — create an API key** (Sending access). Copy `re_…`.

**4. Supabase → Authentication → SMTP Settings** → Enable custom SMTP:
- Host: `smtp.resend.com`
- Port: `465` (SSL) — or `587` (STARTTLS)
- Username: `resend`
- Password: the Resend API key (`re_…`)
- Sender email: `care@mail.papergen.online`
- Sender name: `TeacherEase`

**5. Supabase → Authentication → Rate Limits** → raise the email rate limit
(built-in caps at ~2–4/hr; with Resend you can lift it to e.g. 30–100/hr).

Verify: trigger a password reset and confirm the email now arrives **from**
`care@mail.papergen.online` (the auth logs' `mail.send` event shows the new
`mail_from`).
