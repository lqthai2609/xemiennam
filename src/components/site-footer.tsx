import type { ReactNode } from "react";
import Link from "next/link";
import { Phone } from "lucide-react";

export type FooterLinkGroup = {
  title: string;
  links: { label: string; href: string }[];
};

export type SocialLink = { label: string; href: string };

interface SiteFooterProps {
  tagline: ReactNode;
  phone: string;
  phoneHref?: string;
  linkGroups: FooterLinkGroup[];
  socialLinks: SocialLink[];
  copyright: string;
  madeFor: string;
  brandMark?: string;
  brandName?: string;
}

function isRenderableFooterHref(href: string): boolean {
  const normalizedHref = href.trim();
  return normalizedHref.length > 0 && normalizedHref !== "#";
}

function sanitizeFooterLinkGroups(linkGroups: FooterLinkGroup[]): FooterLinkGroup[] {
  return linkGroups
    .map((group) => ({
      ...group,
      links: group.links.filter((link) => isRenderableFooterHref(link.href)),
    }))
    .filter((group) => group.links.length > 0);
}

export function SiteFooter({
  tagline,
  phone,
  phoneHref,
  linkGroups,
  socialLinks,
  copyright,
  madeFor,
  brandMark = "G",
  brandName = "ALO ĐẶT XE",
}: SiteFooterProps) {
  const resolvedPhoneHref = phoneHref || `tel:${phone.replace(/\s/g, "")}`;
  const safeLinkGroups = sanitizeFooterLinkGroups(linkGroups);
  const safeSocialLinks = socialLinks.filter((social) => isRenderableFooterHref(social.href));

  return (
    <footer className="site-footer">
      <div className="footer-main">
        <Link href="/" className="brand" aria-label={`${brandName} trang chủ`}>
          <span className="brand-mark">{brandMark}</span>
          <span>{brandName}</span>
        </Link>
        <p>{tagline}</p>
        <a className="phone-link" href={resolvedPhoneHref}>
          <Phone size={17} /> {phone}
        </a>
      </div>
      <div className="footer-links">
        {safeLinkGroups.map((group) => (
          <div key={group.title}>
            <span>{group.title}</span>
            {group.links.map((link) => (
              <Link key={link.label} href={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        ))}
        {safeSocialLinks.length > 0 ? (
          <div>
            <span>THEO DÕI CHÚNG TÔI</span>
            {safeSocialLinks.map((social) => (
              <a key={social.label} href={social.href}>
                {social.label}
              </a>
            ))}
          </div>
        ) : null}
      </div>
      <div className="footer-bottom">
        <span>{copyright}</span>
        <span>{madeFor}</span>
      </div>
    </footer>
  );
}

export const defaultSocialLinks: SocialLink[] = [];
