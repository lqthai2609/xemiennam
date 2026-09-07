import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceDetail } from "@/components/service-detail";
import { fetchServices, fetchServiceBySlug } from "@/lib/api/services";
import { JsonLd } from "@/components/json-ld";
import { buildServiceSchema } from "@/lib/schema";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const services = await fetchServices();
  return services.map(({ slug }) => ({ slug }));
}

/** Ngày 23 — ưu tiên rankMathTitle/rankMathDescription trước khi tự soạn (mục 5, kiến trúc kỹ thuật). */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = await fetchServiceBySlug(slug);
  return service
    ? {
        title: service.rankMathTitle || `${service.name} | Xe Miền Nam`,
        description: service.rankMathDescription || service.shortDescription,
      }
    : { title: "Không tìm thấy dịch vụ | Xe Miền Nam" };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const service = await fetchServiceBySlug(slug);
  if (!service) notFound();
  const serviceSchema = buildServiceSchema({
    name: service.name,
    description: service.shortDescription,
    url: `/dich-vu/${service.slug}`,
  });
  return (
    <>
      <JsonLd data={serviceSchema} />
      <ServiceDetail service={service} />
    </>
  );
}
