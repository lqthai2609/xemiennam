import Link from "next/link";
import { ChevronRight } from "lucide-react";
import "./public-breadcrumbs.css";

export function PublicBreadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return <nav className="public-breadcrumbs" aria-label="Đường dẫn"><ol>
    {items.map((item, index) => <li key={item.label}>{index > 0 && <ChevronRight size={14} aria-hidden="true" />}
      {item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}</li>)}
  </ol></nav>;
}
