import { User } from "lucide-react";
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
    <div className="flex items-center gap-2.5">
      <a
        href="#products"
        className="relative flex items-center justify-center size-8 rounded-full bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20 hover:bg-white/10 transition-colors cursor-pointer"
        title={user.email ? `Open Workspace (${user.email})` : "Open Workspace"}
        aria-label="Open Workspace"
      >
        <User className="size-3.5 text-zinc-300" />
        <span className="absolute 0 top-0.5 right-0.5 size-2 rounded-full bg-emerald-400 ring-2 ring-[#101210]" />
      </a>
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
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2.5 text-xs font-medium cursor-pointer"
        onClick={() => openSignIn("workspace")}
      >
        Sign In
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-8 px-3 text-xs font-medium cursor-pointer"
        onClick={() => openSignUp("workspace")}
      >
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
      <div className={`mx-auto flex w-full max-w-[1760px] items-center justify-between px-6 sm:px-10 lg:px-16 xl:px-24 ${compact ? "h-14" : "h-16"}`}>
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
