import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceDetail } from "@/components/service-detail";
import { fetchServices, fetchServiceBySlug } from "@/lib/api/services";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const services = await fetchServices();
  return services.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = await fetchServiceBySlug(slug);
  return service
    ? { title: `${service.name} | Xe Miền Nam`, description: service.shortDescription }
    : { title: "Không tìm thấy dịch vụ | Xe Miền Nam" };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const service = await fetchServiceBySlug(slug);
  if (!service) notFound();
  return <ServiceDetail service={service} />;
}
