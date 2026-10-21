import { createAdminClient } from "../lib/supabase/admin";
import * as fs from "fs";

async function main() {
  const admin = createAdminClient();
  const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const users = usersData?.users || [];

  const { data: papers } = await admin
    .from("papers")
    .select("user_id, title, subject, class_name, method, created_at")
    .order("created_at", { ascending: false });

  const papersByUser: Record<string, { count: number; subjects: string[]; lastPaperDate: string }> = {};
  for (const p of papers || []) {
    if (!papersByUser[p.user_id]) {
      papersByUser[p.user_id] = { count: 0, subjects: [], lastPaperDate: p.created_at };
    }
    papersByUser[p.user_id].count++;
    if (p.subject && !papersByUser[p.user_id].subjects.includes(p.subject)) {
      papersByUser[p.user_id].subjects.push(p.subject);
    }
  }

  const teacherList = users
    .map(u => {
      const stats = papersByUser[u.id] || { count: 0, subjects: [], lastPaperDate: "N/A" };
      return {
        email: u.email || "",
        papersCreated: stats.count,
        subjects: stats.subjects.join(", ") || "General",
        signupDate: (u.created_at || "").slice(0, 10),
        lastActiveDate: stats.lastPaperDate.slice(0, 10),
      };
    })
    .filter(t => t.email && t.email.includes("@"))
    .sort((a, b) => b.papersCreated - a.papersCreated);

  // Write CSV
  const csvRows = ["Email,PapersCreated,Subjects,SignupDate,LastActive"];
  for (const t of teacherList) {
    csvRows.push(`"${t.email}",${t.papersCreated},"${t.subjects}",${t.signupDate},${t.lastActiveDate}`);
  }
  fs.writeFileSync("teachers_export.csv", csvRows.join("\n"));
  console.log(`Exported ${teacherList.length} teachers to teachers_export.csv`);
}

main().catch(console.error);
