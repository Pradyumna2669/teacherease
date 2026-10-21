import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { getPaperForAdmin } from "@/lib/admin-papers";
import AdminPaperView from "@/components/AdminPaperView";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Admin · Paper",
  robots: { index: false, follow: false },
};

export default async function AdminPaperPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/admin/papers/${params.id}`);
  if (!isAdminEmail(user.email)) notFound();

  // Writes the audit row as a side effect — see lib/admin-papers.ts.
  const paper = await getPaperForAdmin(params.id, user.email ?? "unknown");
  if (!paper) notFound();

  return (
    <div className="min-h-dvh bg-paper">
      <header className="bg-white border-b border-rule sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/admin/papers" className="text-sm text-graphite hover:text-ink shrink-0">
              ← Papers
            </Link>
            <span className="font-display text-lg text-ink truncate">
              {paper.title}
            </span>
          </div>
          <span className="text-xs text-graphite shrink-0 hidden sm:block">
            {paper.email}
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <p className="mb-4 text-xs text-graphite">
          Read-only. This view is recorded in the access log against your email.
        </p>
        <AdminPaperView settings={paper.settings} questions={paper.questions} />
      </main>
    </div>
  );
}
