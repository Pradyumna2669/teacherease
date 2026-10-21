import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail, getAdminStats } from "@/lib/admin";
import AdminFeedbackCard from "@/components/AdminFeedbackCard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const num = (n: number) => n.toLocaleString("en-IN");

function Bars({
  data,
  color = "var(--pen, #4f46e5)",
  fmt,
}: {
  data: { label: string; value: number }[];
  color?: string;
  fmt: (v: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-1 h-28">
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center justify-end group min-w-0">
          <span className="text-[9px] text-graphite mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            {fmt(d.value)}
          </span>
          <div
            className="w-full rounded-t-sm"
            style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 2 : 0, background: color }}
            title={`${d.label}: ${fmt(d.value)}`}
          />
          <span className="text-[8px] text-graphite mt-1 truncate w-full text-center">
            {d.label.slice(5)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");
  if (!isAdminEmail(user.email)) notFound();

  const s = await getAdminStats();

  const tiles = [
    { label: "Revenue", value: inr(s.totals.revenueInr), sub: "from paid credits" },
    { label: "Paying customers", value: num(s.totals.payingCustomers), sub: "have bought credits" },
    { label: "Total users", value: num(s.totals.users), sub: "signups" },
    { label: "Papers created", value: num(s.totals.papers), sub: "saved papers" },
    { label: "Scans", value: num(s.totals.scans), sub: "AI scan actions" },
    { label: "Credits spent", value: num(s.totals.creditsSpent), sub: `of ${num(s.totals.creditsGranted)} granted` },
  ];

  return (
    <div className="lp min-h-dvh bg-paper text-ink">
      <header className="border-b border-rule bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-display text-xl font-semibold tracking-tight">
              Teacher<span className="ink-blank">Ease</span>
            </Link>
            <span className="font-mono text-[10px] uppercase tracking-wider text-pen border border-pen/40 rounded px-1.5 py-0.5">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-graphite">
            <span className="hidden sm:block">{user.email}</span>
            <Link href="/admin/papers" className="hover:text-ink font-medium text-ink">
              Papers
            </Link>
            <Link href="/dashboard" className="hover:text-ink">My Papers</Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Failures — first thing on the page, because a broken paid path costs
            a teacher their trust and us the sale. */}
        {s.recentErrors.length > 0 && (
          <section className="bg-red-50 border border-red-200 rounded-lg p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-lg text-red-900">
                Failures {s.errorsLast24h > 0 && `· ${s.errorsLast24h} in the last 24h`}
              </h2>
              <p className="text-xs text-red-700">
                Scan and AI generation errors. Credits are charged only after a
                success, so these should all read “not charged”.
              </p>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left font-mono text-[11px] uppercase tracking-wide text-red-800">
                    <th className="py-2 pr-4">When</th>
                    <th className="py-2 pr-4">Action</th>
                    <th className="py-2 pr-4">Teacher</th>
                    <th className="py-2 pr-4">What happened</th>
                    <th className="py-2">Charged</th>
                  </tr>
                </thead>
                <tbody>
                  {s.recentErrors.slice(0, 12).map((e: (typeof s.recentErrors)[number], i: number) => (
                    <tr key={i} className="border-t border-red-200/70 align-top">
                      <td className="py-2 pr-4 whitespace-nowrap text-red-900">
                        {new Date(e.created_at).toLocaleString("en-IN")}
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap font-mono text-xs text-red-900">
                        {e.action} · {e.status}
                      </td>
                      <td className="py-2 pr-4 text-red-900 break-all">{e.email}</td>
                      <td className="py-2 pr-4 text-red-900">
                        {e.message}
                        {Object.keys(e.context).length > 0 && (
                          <span className="block font-mono text-[11px] text-red-700 mt-0.5">
                            {Object.entries(e.context)
                              .map(([k, v]) => `${k}=${String(v)}`)
                              .join(" · ")}
                          </span>
                        )}
                      </td>
                      <td className="py-2 whitespace-nowrap">
                        {e.charged ? (
                          <span className="font-semibold text-red-700">yes — refund</span>
                        ) : (
                          <span className="text-red-800/70">no</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Tiles */}
        <section>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {tiles.map((t) => (
              <div key={t.label} className="bg-white border border-rule rounded-lg p-5">
                <p className="font-mono text-xs tracking-[0.1em] uppercase text-graphite">{t.label}</p>
                <p className="mt-2 font-display text-3xl font-semibold text-ink tabular-nums">{t.value}</p>
                <p className="mt-1 text-xs text-graphite">{t.sub}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-rule rounded-lg p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-lg">Funnel events · last 30 days</h2>
            <p className="text-xs text-graphite">Counts, not teacher content.</p>
          </div>
          {s.funnelCounts.length === 0 ? (
            <p className="mt-3 text-sm text-graphite">
              No events yet. Deploy migration 0016 to start collecting them.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {s.funnelCounts.map((item) => (
                <div key={item.event} className="border border-rule rounded-md p-3">
                  <p className="text-[11px] text-graphite break-words">{item.event.replaceAll("_", " ")}</p>
                  <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{num(item.count)}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Revenue */}
        <section className="grid lg:grid-cols-[1fr_1.4fr] gap-4">
          <div className="bg-white border border-rule rounded-lg p-5">
            <h2 className="font-display text-lg">Revenue by source</h2>
            <table className="mt-3 w-full text-sm">
              <tbody>
                {s.revenueByReason.length === 0 && (
                  <tr><td className="py-2 text-graphite">No purchases yet.</td></tr>
                )}
                {s.revenueByReason.map((r) => (
                  <tr key={r.reason} className="border-t border-rule">
                    <td className="py-2 text-ink">{r.reason}</td>
                    <td className="py-2 text-graphite text-right tabular-nums">{r.count} orders</td>
                    <td className="py-2 text-ink text-right font-medium tabular-nums">{inr(r.inr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-white border border-rule rounded-lg p-5">
            <h2 className="font-display text-lg">Revenue · last 30 days</h2>
            <div className="mt-4">
              {s.revenueByDay.length === 0 ? (
                <p className="text-sm text-graphite">No revenue yet.</p>
              ) : (
                <Bars
                  data={s.revenueByDay.map((d) => ({ label: d.day, value: d.inr }))}
                  fmt={inr}
                />
              )}
            </div>
          </div>
        </section>

        {/* Papers over time */}
        <section className="bg-white border border-rule rounded-lg p-5">
          <h2 className="font-display text-lg">Papers created · last 30 days</h2>
          <div className="mt-4">
            {s.papersByDay.length === 0 ? (
              <p className="text-sm text-graphite">No papers yet.</p>
            ) : (
              <Bars
                data={s.papersByDay.map((d) => ({ label: d.day, value: d.count }))}
                color="#111827"
                fmt={num}
              />
            )}
          </div>
        </section>

        {/* Top creators + recent signups */}
        <section className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
          <div className="bg-white border border-rule rounded-lg p-5">
            <h2 className="font-display text-lg">Top creators</h2>
            <p className="text-xs text-graphite mt-0.5">Who&apos;s making the most papers.</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm min-w-[420px]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-graphite border-b border-rule">
                    <th className="py-2 font-medium">Teacher</th>
                    <th className="py-2 font-medium text-right">Papers</th>
                    <th className="py-2 font-medium text-right">Credits spent</th>
                  </tr>
                </thead>
                <tbody>
                  {s.topCreators.length === 0 && (
                    <tr><td className="py-3 text-graphite" colSpan={3}>No papers yet.</td></tr>
                  )}
                  {s.topCreators.map((c, i) => (
                    <tr key={c.email + i} className="border-b border-rule/60">
                      <td className="py-2 text-ink truncate max-w-[240px]">{c.email}</td>
                      <td className="py-2 text-right tabular-nums text-ink">{num(c.papers)}</td>
                      <td className="py-2 text-right tabular-nums text-graphite">{num(c.spent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-rule rounded-lg p-5">
            <h2 className="font-display text-lg">Recent signups</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {s.recentSignups.length === 0 && <li className="text-graphite">No users yet.</li>}
              {s.recentSignups.map((u, i) => (
                <li key={u.email + i} className="flex items-center justify-between gap-3 border-b border-rule/60 pb-2">
                  <span className="text-ink truncate">{u.email}</span>
                  <span className="text-xs text-graphite shrink-0 tabular-nums">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString("en-IN") : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Recent papers — name + how it was made */}
        <section className="bg-white border border-rule rounded-lg p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-lg">Recent papers</h2>
              <p className="text-xs text-graphite mt-0.5">
                Paper names and how each was made — no question content is shown.
              </p>
            </div>
            <div className="text-xs text-graphite flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-pen" /> Scanned
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-graphite/50" /> Typed
              </span>
            </div>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-graphite border-b border-rule">
                  <th className="py-2 font-medium">Paper</th>
                  <th className="py-2 font-medium">Teacher</th>
                  <th className="py-2 font-medium">Method</th>
                  <th className="py-2 font-medium text-right">Created</th>
                </tr>
              </thead>
              <tbody>
                {s.recentPapers.length === 0 && (
                  <tr><td className="py-3 text-graphite" colSpan={4}>No papers yet.</td></tr>
                )}
                {s.recentPapers.map((p, i) => (
                  <tr key={i} className="border-b border-rule/60">
                    <td className="py-2 pr-3 text-ink truncate max-w-[240px]">{p.title}</td>
                    <td className="py-2 pr-3 text-graphite truncate max-w-[200px]">{p.email}</td>
                    <td className="py-2 pr-3">
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
                    <td className="py-2 text-right text-graphite whitespace-nowrap tabular-nums">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString("en-IN") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-graphite">
            Method tracks how the paper was created: Scanned from physical paper, AI generated (via syllabus or textbook photos), or manually Typed.
          </p>
        </section>

        {/* Teacher Feedback — post-generation expectations */}
        <section className="bg-white border border-rule rounded-lg p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-lg">Teacher Feedback & Feature Expectations</h2>
              <p className="text-xs text-graphite mt-0.5">
                Feedback collected automatically after AI generation or Scanner runs.
              </p>
            </div>
            <span className="text-xs font-mono uppercase tracking-wider text-pen border border-pen/30 rounded px-2 py-0.5">
              {s.teacherFeedbacks.length} Submissions
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {s.teacherFeedbacks.length === 0 ? (
              <p className="text-sm text-graphite py-4">No teacher feedbacks submitted yet.</p>
            ) : (
              s.teacherFeedbacks.map((fb) => <AdminFeedbackCard key={fb.id} fb={fb} />)
            )}
          </div>
        </section>

        <p className="text-xs text-graphite">
          Revenue is computed from granted credits in the ledger (credits are only
          granted on a paid Razorpay event). For settlement/payout figures, check
          the Razorpay dashboard.
        </p>
      </main>
    </div>
  );
}
