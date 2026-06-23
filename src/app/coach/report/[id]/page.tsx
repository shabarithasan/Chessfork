import { CoachReportPage } from "@/components/pages";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CoachReportPage reportId={id} />;
}
