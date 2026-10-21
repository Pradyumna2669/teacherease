# TeacherEase — Smart Question Paper Generator for Schools & Colleges

PaperGen is a web app for creating print-ready school exam papers. Teachers can build a paper from scratch, scan a handwritten paper and turn it into editable questions, use question-bank content, save papers to their account, and export them as PDFs.

## Features

- Visual paper builder with live A4 preview
- Handwritten-paper scanning and question extraction
- AI-assisted question and answer generation
- Question bank and curriculum content
- Multiple question types and Indian-language support
- Saved papers and account dashboard
- Credits, subscriptions, and Razorpay payments
- Responsive web app with Android Trusted Web Activity support
- Admin views for papers and audit information

## Tech stack

- Next.js 14 with the App Router
- React 18 and TypeScript
- Tailwind CSS
- Supabase Auth and Postgres
- Anthropic, Amazon Bedrock, or Gemini for AI providers
- Razorpay for payments and subscriptions
- Vercel for web deployment

## Requirements

- Node.js 20 or newer
- npm
- A Supabase project
- Credentials for at least one configured AI provider

## Local setup

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Create a local environment file:

   ```powershell
   Copy-Item .env.example .env.local
   ```

   If `.env.example` is not available in your checkout, create `.env.local` manually using the variable list below.

3. Add the required Supabase and AI credentials.

4. Apply the SQL migrations in `supabase/migrations` to your Supabase project.

5. Start the development server:

   ```powershell
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Never commit `.env` or `.env.local`. Keep service-role keys, payment secrets, and AI credentials private.

### Required

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase browser key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase admin operations |
| `NEXT_PUBLIC_SITE_URL` | Canonical application URL, for example `http://localhost:3000` locally |
| `ANTHROPIC_API_KEY` | Anthropic API access when using the Anthropic provider |

### AI provider configuration

Set `SCAN_PROVIDER` to `anthropic`, `bedrock`, or `gemini` as appropriate. The selected provider needs its corresponding credentials.

| Variable | Purpose |
| --- | --- |
| `SCAN_PROVIDER` | Primary AI provider for scanning and generation |
| `SCAN_MODEL` | Model used by scan and question-generation routes |
| `AWS_BEARER_TOKEN_BEDROCK` | Amazon Bedrock bearer token |
| `AWS_REGION` | AWS region; defaults to `ap-south-1` |
| `BEDROCK_MODEL` | Bedrock model identifier |
| `GEMINI_API_KEY` | Google Gemini API access |
| `GEMINI_MODEL` | Gemini model identifier |
| `SCAN_MAX_PAGES_PER_CALL` | Optional page limit for scan requests |

### Payments and application administration

| Variable | Purpose |
| --- | --- |
| `RAZORPAY_KEY_ID` | Razorpay public/server key ID |
| `RAZORPAY_KEY_SECRET` | Razorpay server secret |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook verification secret |
| `CRON_SECRET` | Protects the scheduled reconciliation endpoint |
| `ADMIN_EMAILS` | Comma-separated admin email addresses |
| `COMP_EMAILS` | Comma-separated complimentary-credit email addresses |
| `CREDITS_FAIL_OPEN` | Optional credit-service fallback behavior |
| `ANDROID_PACKAGE_NAME` | Android application package name |
| `ANDROID_CERT_FINGERPRINTS` | Comma-separated Android signing fingerprints |

## Commands

```powershell
npm run dev                 # Start the development server
npm run build               # Create a production build
npm run start               # Serve the production build
npm run verify:curriculum   # Verify curriculum data
```

The scripts in `scripts/` are used for bank imports, prompt generation, authentication checks, and provider testing. Review each script before running it because several require production-like credentials or write data.

## Project structure

```text
app/                 Next.js routes, pages, API endpoints, and global styles
components/          Reusable UI components
lib/                 Auth, Supabase, papers, credits, AI, payments, and domain logic
prompts/              AI prompt templates and curriculum prompts
public/               Static assets
scripts/              Data import, seed, and integration utilities
supabase/migrations/  Database schema migrations
android/              Android Trusted Web Activity project
promo/                Promotional video project
```

## Database

Supabase is used for authentication, user data, papers, credits, subscriptions, and related application records. Apply migrations in order from `supabase/migrations` before using authenticated features. The application uses the public Supabase client in browser code and the service-role client only on trusted server paths.

## Deployment

The web app is configured for Vercel. Connect the GitHub repository to the intended Vercel account or team, add the environment variables in the Vercel project settings, and deploy the main branch.

`vercel.json` configures a daily Razorpay reconciliation cron job at `/api/razorpay/reconcile`. Vercel cron deployments must include `CRON_SECRET` and the payment credentials required by that route.

For private GitHub repositories on Vercel Hobby, the committing GitHub user must have access to the Vercel project. If multiple Vercel accounts are connected to the same GitHub account, make sure the project is owned by the intended account/team before pushing deployments.

## Android app

The `android/` directory contains the Trusted Web Activity wrapper. Its own build and signing instructions are documented in [android/README.md](android/README.md). The web deployment must be live and configured with the correct package name and certificate fingerprints for Digital Asset Links to work.

## Security notes

- Do not commit `.env`, `.env.local`, Supabase service-role keys, payment secrets, or AI credentials.
- Keep the Supabase service-role client on the server only.
- Validate webhook signatures before processing payment events.
- Review database Row Level Security policies whenever schema changes are added.
- Treat scripts that seed or import data as privileged operations.

## License

No open-source license is currently declared for this repository.