// Which subjects the skill graph can actually generate for.
//
// The graph covers Classes 3-5 maths and nothing else yet. That is a deliberate
// MVP scope, but it has to be visible to the teacher rather than assumed: a
// teacher setting up a class for Marathi should be told plainly, not shown a
// list of maths topics and left to work it out.
//
// A subject moves to ready:true the day its skills land in the graph. Nothing
// else in the UI needs to change.

export interface SubjectDef {
  id: string;
  label: string;
  /** Whether the skill graph can build a paper for it today. */
  ready: boolean;
}

export const SUBJECTS: SubjectDef[] = [
  { id: "maths", label: "Maths", ready: true },
  { id: "evs", label: "EVS / Environmental Studies", ready: false },
  { id: "english", label: "English", ready: false },
  { id: "marathi", label: "Marathi", ready: false },
  { id: "hindi", label: "Hindi", ready: false },
  { id: "science", label: "Science", ready: false },
  { id: "social", label: "Social Studies", ready: false },
];

export const SUBJECT_BY_ID = new Map(SUBJECTS.map((s) => [s.id, s]));

export const isGeneratable = (subjectId: string): boolean =>
  SUBJECT_BY_ID.get(subjectId)?.ready ?? false;

export const subjectLabel = (subjectId: string): string =>
  SUBJECT_BY_ID.get(subjectId)?.label ?? subjectId;
