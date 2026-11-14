export type NodeTag = { code: string | null; title: string };
export type TagRel = { syllabus_nodes: NodeTag | NodeTag[] | null };

export type RecordingRow = {
  id: string;
  title: string;
  description: string | null;
  duration_seconds: number | null;
  status: string;
  created_at: string;
  recording_nodes: TagRel[] | null;
};

export type RecordingDetail = RecordingRow & {
  class_id: string;
  classes: { name: string; term: string | null; organisations: unknown } | { name: string; term: string | null; organisations: unknown }[] | null;
};

export type ChapterRow = { start_seconds: number; title: string };

export type RecentRecording = {
  id: string;
  title: string;
  class_id: string;
  classes: { name: string } | { name: string }[] | null;
};
