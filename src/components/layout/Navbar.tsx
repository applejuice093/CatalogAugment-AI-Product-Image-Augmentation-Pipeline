import { authClient } from "@/lib/auth-client";
import { navLinks } from "@/data/content";
import { useAuthUi } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";

type NavbarProps = {
  compact: boolean;
  active: string;
};

export function Navbar({ compact, active }: NavbarProps) {
  const { data } = authClient.useSession();
  const { openSignIn, openSignUp } = useAuthUi();
  const user = data?.user;

  const links = (
    <ul className="flex items-center gap-6">
      {navLinks.map((link) => (
        <li key={link.id}>
          <a
            href={link.href}
            aria-current={active === link.id ? "true" : undefined}
            className={`block py-2 text-sm tracking-wide transition-colors duration-200 ${
              active === link.id ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );

  const actions = user ? (
    <div className="flex items-center gap-2">
      <a
        href="#workspace"
        className="inline-flex items-center justify-center h-8 px-3 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_10px_rgba(214,227,106,0.2)] transition-colors cursor-pointer"
      >
        Studio Workspace
      </a>
      <span className="max-w-40 truncate text-xs text-muted-foreground hidden lg:inline">{user.email}</span>
      <Button
        variant="outline"
        size="sm"
        className="h-8 px-2.5 text-xs font-medium cursor-pointer"
        onClick={() => {
          void authClient.signOut();
        }}
      >
        Sign out
      </Button>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <a
        href="#workspace"
        className="inline-flex items-center justify-center h-8 px-3 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_10px_rgba(214,227,106,0.2)] transition-colors cursor-pointer"
      >
        Launch Studio
      </a>
      <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs font-medium cursor-pointer" onClick={openSignIn}>
        Sign In
      </Button>
      <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-medium cursor-pointer hidden sm:inline-flex" onClick={openSignUp}>
        Get Started
      </Button>
    </div>
  );

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-200 ${
        compact
          ? "border-border bg-[#101210]"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className={`mx-auto flex max-w-6xl items-center justify-between px-5 ${compact ? "h-14" : "h-16"}`}>
        <a href="#platform" className="font-heading text-base font-semibold tracking-[-0.03em]">
          CatalogAugment
        </a>
        <nav className="hidden md:block" aria-label="Primary">
          {links}
        </nav>
        <div className="flex items-center">{actions}</div>
      </div>
    </header>
  );
}
