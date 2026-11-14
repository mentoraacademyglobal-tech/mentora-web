import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { PageHeader, Surface, BlankState } from "@/components/ui/StudentUI";

export const metadata: Metadata = { title: "AI Study Assistant" };

export default async function AssistantPage() {
  await requireUser();
  return <div className="space-y-6">
    <PageHeader eyebrow="LEARNING / FUTURE TOOLS" title="AI Study Assistant" subtitle="An optional future assistant for learning from your own published academy materials." />
    <Surface title="Study assistant is not connected" description="No third-party AI provider or course-indexing pipeline has been configured.">
      <BlankState icon="bot" title="AI conversations are not available yet" description="Mentora will only enable study chat once there is an authenticated backend, appropriate course access controls, and accurate citations. No simulated chat answers are shown." action={{href:"/materials",label:"Browse real materials"}} />
    </Surface>
  </div>;
}
