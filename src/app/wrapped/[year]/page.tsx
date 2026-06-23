import { WrappedPage } from "@/components/pages";

export default async function Page({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  return <WrappedPage year={Number(year)} />;
}
