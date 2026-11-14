export type NodeRow = {
  id: string;
  parent_id: string | null;
  node_type: string;
  code: string | null;
  title: string;
  position: number;
};

type Board = { name: string };
type Qualification = { name: string; boards: Board | Board[] | null };
export type SubjectInfo = {
  name: string;
  syllabus_code: string;
  qualifications: Qualification | Qualification[] | null;
};

export type VersionSummary = {
  id: string;
  label: string;
  status: string;
  subjects: SubjectInfo | SubjectInfo[] | null;
  count: number;
};

export type VersionDetail = {
  id: string;
  label: string;
  status: string;
  subjects: { name: string; syllabus_code: string } | { name: string; syllabus_code: string }[] | null;
};
