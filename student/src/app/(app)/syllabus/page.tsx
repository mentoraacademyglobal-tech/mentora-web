import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getMyClassIds } from "@/features/classes";
import { one } from "@/lib/relations";
import { PageHeader, Metric, Surface, BlankState } from "@/components/ui/StudentUI";
import Icon from "@/components/layout/Icon";

export const metadata: Metadata = { title: "My Syllabus" };

type EnrolledClass = { id: string; name: string; syllabus_version_id: string; subjects: {name: string; syllabus_code: string} | {name: string; syllabus_code: string}[] | null };
type SyllabusNode = { id: string; version_id: string; parent_id: string | null; node_type: string; code: string | null; title: string; position: number };
type Version = { id: string; label: string; status: string };

function syllabusTree(nodes: SyllabusNode[]) {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const children = new Map<string, SyllabusNode[]>();
  for (const node of nodes) {
    const parent = node.parent_id && byId.has(node.parent_id) ? node.parent_id : "root";
    const list = children.get(parent) ?? [];
    list.push(node);
    children.set(parent, list);
  }
  for (const list of children.values()) list.sort((a, b) => a.position - b.position || a.title.localeCompare(b.title));
  const result: { node: SyllabusNode; depth: number }[] = [];
  const visited = new Set<string>();
  function visit(parent: string, depth: number) {
    for (const node of children.get(parent) ?? []) {
      if (visited.has(node.id)) continue;
      visited.add(node.id);
      result.push({ node, depth });
      visit(node.id, Math.min(depth + 1, 5));
    }
  }
  visit("root", 0);
  // Keep corrupted or orphaned items visible without looping infinitely.
  for (const node of nodes) if (!visited.has(node.id)) { visited.add(node.id); result.push({ node, depth: 0 }); }
  return result;
}

export default async function SyllabusPage({ searchParams }: {searchParams: Promise<{class?: string}>}) {
  const { class: requestedClass } = await searchParams;
  const {supabase,user} = await requireUser();
  const ids = [...(await getMyClassIds(supabase, user.id)).enrolled];
  const classesResult = ids.length
    ? await supabase.from("classes").select("id,name,syllabus_version_id,subjects(name,syllabus_code)").in("id", ids).order("name")
    : { data: [] as EnrolledClass[], error: null };
  const classes = (classesResult.data ?? []) as EnrolledClass[];
  const versionIds = [...new Set(classes.map(item => item.syllabus_version_id))];
  const versionsResult = versionIds.length
    ? await supabase.from("syllabus_versions").select("id,label,status").in("id",versionIds).eq("status","published")
    : { data: [] as Version[], error: null };
  const versions = (versionsResult.data ?? []) as Version[];
  const versionSet = new Set(versions.map(version => version.id));
  const available = classes.filter(item => versionSet.has(item.syllabus_version_id));
  const selected = available.find(item => item.id === requestedClass) ?? available[0];
  const version = versions.find(v => v.id === selected?.syllabus_version_id);
  const nodesResult = selected
    ? await supabase.from("syllabus_nodes").select("id,version_id,parent_id,node_type,code,title,position").eq("version_id", selected.syllabus_version_id).order("position").limit(1500)
    : { data: [] as SyllabusNode[], error: null };
  const nodes = (nodesResult.data ?? []) as SyllabusNode[];
  const units = nodes.filter(node => node.node_type === "unit").length;
  const topics = nodes.filter(node => node.node_type === "topic").length;
  return <div className="space-y-6">
    <PageHeader eyebrow="LEARNING / COURSE OUTLINE" title="My Syllabus" subtitle="Official published learning objectives and topic outlines for your enrolled Mentora classes." action={{href:"/classes",label:"My classes"}} />
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Metric label="My enrolled classes" value={classes.length} icon="book" detail="Current active enrollment" />
      <Metric label="Published syllabuses" value={available.length} icon="file" detail="Available course outlines" />
      <Metric label="Units in view" value={units} icon="school" detail="Selected syllabus" />
      <Metric label="Topics in view" value={topics} icon="check" detail="Selected syllabus" />
    </div>
    {available.length > 0 && <Surface title="Choose a class" description="View its published specification">
      <div className="flex flex-wrap gap-2">{available.map(cls => <Link key={cls.id} href={`/syllabus?class=${cls.id}`} aria-current={selected?.id===cls.id?"page":undefined} className={`rounded-full px-3.5 py-2 text-xs font-bold ${selected?.id===cls.id?"bg-deep text-mint":"bg-mist text-slate-text hover:text-ink"}`}>{cls.name}</Link>)}</div>
    </Surface>}
    <Surface title={selected ? `${one(selected.subjects)?.name ?? selected.name} — Course outline` : "Your syllabus"} description={version ? `${version.label} · ${one(selected?.subjects)?.syllabus_code ?? "Published specification"}` : "Outlines are assigned and published by your academy."}>
      {classesResult.error || versionsResult.error || nodesResult.error
        ? <BlankState icon="file" title="Unable to load syllabus" description="Please try again. Your academy's curriculum data may not be available." />
        : !selected
          ? <BlankState icon="book" title="No published syllabus yet" description="Syllabuses will appear after your academy enrolls you in a class and publishes its course outline." />
          : nodes.length === 0
            ? <BlankState icon="file" title="No topics published" description="The specification exists, but its topic outline has not been added." />
            : <ol className="space-y-2">{syllabusTree(nodes).map(({node,depth}) => <li key={node.id} style={{marginLeft:`${Math.min(depth,4)*12}px`}} className={`rounded-xl border border-line px-4 py-3 ${depth===0 ? "bg-page" : "bg-white/50"}`}>
                <div className="flex items-start gap-3"><span className={`mt-0.5 rounded-lg p-2 ${depth===0 ? "bg-mint/15 text-[#088f70]" : "bg-mist text-slate-text"}`}><Icon name={node.node_type==="unit"?"book":"check"} className="h-4 w-4" /></span><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-text">{node.node_type}{node.code?` · ${node.code}`:""}</p><p className="mt-0.5 text-[13px] font-bold text-ink">{node.title}</p></div></div>
              </li>)}</ol>}
    </Surface>
    <p className="text-xs leading-5 text-slate-text">This is your academy&apos;s published syllabus, not an estimated progress report. Lesson completion will appear only when supported by actual tracking data.</p>
  </div>;
}
