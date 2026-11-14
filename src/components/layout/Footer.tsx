import { navLinks, technologies } from "@/data/content";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-border bg-background">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-3">
        <div>
          <p className="font-heading text-lg font-semibold tracking-[-0.03em]">CatalogAugment</p>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
            An image pipeline for retail search. One product photograph becomes a varied set, then a consistency check. This build runs the site, accounts, and file storage.
          </p>
        </div>
        <div>
          <p className="text-sm text-foreground">Navigate</p>
          <ul className="mt-4 grid gap-2">
            {navLinks.map((link) => (
              <li key={link.id}>
                <a className="text-sm hover:text-primary" href={link.href}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm text-foreground">Technology</p>
          <ul className="mt-4 grid gap-2">
            {technologies.map((item) => (
              <li key={item.id}>
                <a className="text-sm hover:text-primary" href={item.href} target="_blank" rel="noreferrer">
                  {item.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <Separator />
      <p className="mx-auto max-w-6xl px-5 py-6 text-xs text-muted-foreground">
        Accounts use Better Auth. Files stay on this machine. No social profiles are linked from this page.
      </p>
    </footer>
  );
}
