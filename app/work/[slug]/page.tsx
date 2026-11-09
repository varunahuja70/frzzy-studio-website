import { notFound } from 'next/navigation';
import { FrzzySite } from '@/components/frzzy/frzzy-site';
import { CASES } from '@/components/frzzy/work-data';

export default async function CaseStudyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!CASES[slug]) notFound();
  return <FrzzySite initialView="case" initialSlug={slug} />;
}
