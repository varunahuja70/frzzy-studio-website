import { notFound } from 'next/navigation';
import { FrzzySite } from '@/components/frzzy/frzzy-site';
import { CASES } from '@/components/frzzy/work-data';
import { getProjectBySlug } from '@/lib/site-projects';

export const dynamic = 'force-dynamic';

export default async function CaseStudyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project && !CASES[slug]) notFound();
  return <FrzzySite initialView="case" initialSlug={slug} />;
}
