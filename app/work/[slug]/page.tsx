import { notFound } from 'next/navigation';
import { FrzzySite } from '@/components/frzzy/frzzy-site';
import { CASES } from '@/components/frzzy/work-data';
import { getProjectBySlug, listAllProjects } from '@/lib/site-projects';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CaseStudyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [project, allProjects] = await Promise.all([
    getProjectBySlug(slug).catch(() => null),
    listAllProjects().catch(() => []),
  ]);

  if (!project && !CASES[slug]) notFound();
  return <FrzzySite initialView="case" initialSlug={slug} initialProjects={allProjects} />;
}
