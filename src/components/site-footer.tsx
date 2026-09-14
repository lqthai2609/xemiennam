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

export function SiteFooter({
  tagline,
  phone,
  phoneHref,
  linkGroups,
  socialLinks,
  copyright,
  madeFor,
  brandMark = "G",
  brandName = "GOCARVN",
}: SiteFooterProps) {
  const resolvedPhoneHref = phoneHref || `tel:${phone.replace(/\s/g, "")}`;

  return (
    <footer className="site-footer">
      <div className="footer-main">
        <Link href="/" className="brand" aria-label="Gocar VN trang chủ">
          <span className="brand-mark">{brandMark}</span>
          <span>{brandName}</span>
        </Link>
        <p>{tagline}</p>
        <a className="phone-link" href={resolvedPhoneHref}>
          <Phone size={17} /> {phone}
        </a>
      </div>
      <div className="footer-links">
        {linkGroups.map((group) => (
          <div key={group.title}>
            <span>{group.title}</span>
            {group.links.map((link) => (
              <Link key={link.label} href={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        ))}
        <div>
          <span>THEO DÕI CHÚNG TÔI</span>
          {socialLinks.map((social) => (
            <a key={social.label} href={social.href}>
              {social.label}
            </a>
          ))}
        </div>
      </div>
      <div className="footer-bottom">
        <span>{copyright}</span>
        <span>{madeFor}</span>
      </div>
    </footer>
  );
}

export const defaultSocialLinks: SocialLink[] = [
  { label: "Instagram", href: "#" },
  { label: "Facebook", href: "#" },
];
