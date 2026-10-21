import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { listAllPapers, recentAudit } from "@/lib/admin-papers";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Admin · Papers",
  robots: { index: false, follow: false },
};

export default async function AdminPapersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/papers");
  if (!isAdminEmail(user.email)) notFound();

  const [papers, audit] = await Promise.all([listAllPapers(150), recentAudit(12)]);

  return (
    <div className="min-h-dvh bg-paper">
      <header className="bg-white border-b border-rule sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="font-display text-xl font-semibold text-ink">
              Admin
            </Link>
            <span className="text-graphite">/</span>
            <span className="text-graphite">Papers</span>
          </div>
          <Link href="/dashboard" className="text-sm text-graphite hover:text-ink">
            My Papers
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <section className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h1 className="font-display text-lg text-amber-900">
            Teachers&rsquo; papers
          </h1>
          <p className="mt-1 text-sm text-amber-800 leading-relaxed">
            Opening a paper shows another teacher&rsquo;s work, including any
            photographs they scanned. Every open is recorded below with your
            email. Use it to reproduce a rendering or scan bug — not to browse.
          </p>
        </section>

        <section className="bg-white border border-rule rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-rule flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-lg">Recent papers</h2>
            <p className="text-xs text-graphite">
              {papers.length} newest · scanned papers are the ones worth checking
              for extraction quality
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left font-mono text-[11px] uppercase tracking-wide text-graphite border-b border-rule">
                  <th className="py-2 px-5">Paper</th>
                  <th className="py-2 pr-4">Teacher</th>
                  <th className="py-2 pr-4">Method</th>
                  <th className="py-2 pr-4">Questions</th>
                  <th className="py-2 pr-4">Types</th>
                  <th className="py-2 pr-4">Lang</th>
                  <th className="py-2 pr-5">Created</th>
                </tr>
              </thead>
              <tbody>
                {papers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 px-5 text-center text-graphite">
                      No papers yet.
                    </td>
                  </tr>
                )}
                {papers.map((p) => (
                  <tr key={p.id} className="border-b border-rule/70 align-top">
                    <td className="py-2.5 px-5">
                      <Link
                        href={`/admin/papers/${p.id}`}
                        className="font-medium text-ink hover:text-pen hover:underline"
                      >
                        {p.title}
                      </Link>
                      <span className="block text-xs text-graphite">
                        {[p.subject, p.class_name].filter(Boolean).join(" · ")}
                        {p.hasImages && (
                          <span className="ml-2 text-pen font-medium">has images</span>
                        )}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-graphite break-all">{p.email}</td>
                    <td className="py-2.5 pr-4 whitespace-nowrap">
                      {p.method === "scanned" && (
                        <span className="inline-block text-xs font-medium rounded-full border px-2 py-0.5 bg-rose-50 text-rose-700 border-rose-200">
                          Scanned
                        </span>
                      )}
                      {p.method === "ai_generated" && (
                        <span className="inline-block text-xs font-medium rounded-full border px-2 py-0.5 bg-pen/10 text-pen border-pen/30">
                          AI · Syllabus
                        </span>
                      )}
                      {p.method === "ai_textbook" && (
                        <span className="inline-block text-xs font-medium rounded-full border px-2 py-0.5 bg-sky-50 text-sky-700 border-sky-200">
                          AI · Textbook
                        </span>
                      )}
                      {p.method === "typed" && (
                        <span className="inline-block text-xs font-medium rounded-full border px-2 py-0.5 bg-rule text-graphite border-rule">
                          Typed
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums">{p.questionCount}</td>
                    <td className="py-2.5 pr-4 text-xs text-graphite">
                      {p.types.join(", ") || "—"}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-graphite">{p.language}</td>
                    <td className="py-2.5 pr-5 text-xs text-graphite whitespace-nowrap">
                      {new Date(p.created_at).toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white border border-rule rounded-lg p-5">
          <h2 className="font-display text-lg">Access log</h2>
          <p className="mt-1 text-xs text-graphite">
            Who opened whose paper, and when. Kept so the question can be
            answered if a teacher ever asks.
          </p>
          <div className="mt-3 space-y-1">
            {audit.length === 0 && (
              <p className="text-sm text-graphite">No papers opened yet.</p>
            )}
            {audit.map((a, i) => (
              <div
                key={i}
                className="flex flex-wrap items-baseline gap-x-3 text-xs text-graphite border-b border-rule/60 py-1.5"
              >
                <span className="font-mono text-ink">{a.admin_email}</span>
                <span>{a.action.replace("_", " ")}</span>
                {a.paper_id && (
                  <Link
                    href={`/admin/papers/${a.paper_id}`}
                    className="font-mono text-[11px] hover:underline"
                  >
                    {a.paper_id.slice(0, 8)}…
                  </Link>
                )}
                <span className="ml-auto">
                  {new Date(a.created_at).toLocaleString("en-IN")}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
