import { FrzzySite } from '@/components/frzzy/frzzy-site';
import { listAllProjects } from '@/lib/site-projects';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AboutPage() {
  const projects = await listAllProjects().catch(() => []);
  return <FrzzySite initialView="about" initialProjects={projects} />;
}
