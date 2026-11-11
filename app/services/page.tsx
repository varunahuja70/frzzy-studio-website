import { FrzzySite } from '@/components/frzzy/frzzy-site';
import { listAllProjects } from '@/lib/site-projects';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ServicesPage() {
  const projects = await listAllProjects().catch(() => []);
  return <FrzzySite initialView="services" initialProjects={projects} />;
}
