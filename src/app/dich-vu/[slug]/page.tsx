import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceDetail } from "@/components/service-detail";
import { fetchServices, fetchServiceBySlug } from "@/lib/api/services";
import { JsonLd } from "@/components/json-ld";
import { buildBreadcrumbListSchema, buildServiceSchema } from "@/lib/schema";
import { buildPageMetadata } from "@/lib/metadata";
import { SITE_NAME } from "@/lib/site-config";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const services = await fetchServices();
  return services.map(({ slug }) => ({ slug }));
}

/** Ngày 23 — ưu tiên Rank Math trước fallback metadata của thương hiệu công khai. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = await fetchServiceBySlug(slug);
  return service
    ? buildPageMetadata({
        title: service.rankMathTitle || `${service.name} | ${SITE_NAME}`,
        description: service.rankMathDescription || service.shortDescription,
        path: `/dich-vu/${service.slug}`,
      })
    : buildPageMetadata({
        title: "Không tìm thấy dịch vụ",
        description: "Dịch vụ này không tồn tại hoặc hiện không khả dụng.",
        noIndex: true,
      });
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const service = await fetchServiceBySlug(slug);
  if (!service) notFound();
  const canonicalPath = `/dich-vu/${service.slug}`;
  const serviceSchema = buildServiceSchema({
    name: service.name,
    description: service.shortDescription,
    url: canonicalPath,
  });
  const breadcrumbSchema = buildBreadcrumbListSchema([
    { name: "Trang chủ", url: "/" },
    { name: "Dịch vụ", url: "/dich-vu" },
    { name: service.name, url: canonicalPath },
  ]);
  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={serviceSchema} />
      <ServiceDetail service={service} />
    </>
  );
}
