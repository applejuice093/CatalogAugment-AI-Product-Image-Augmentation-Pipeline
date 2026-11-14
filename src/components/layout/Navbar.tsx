import { useState } from "react";
import { Menu } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { navLinks } from "@/data/content";
import { useAuthUi } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type NavbarProps = {
  compact: boolean;
  active: string;
};

export function Navbar({ compact, active }: NavbarProps) {
  const { data } = authClient.useSession();
  const { openSignIn, openSignUp } = useAuthUi();
  const [open, setOpen] = useState(false);
  const user = data?.user;

  const links = (
    <ul className="flex flex-col gap-1 md:flex-row md:items-center md:gap-6">
      {navLinks.map((link) => (
        <li key={link.id}>
          <a
            href={link.href}
            aria-current={active === link.id ? "true" : undefined}
            onClick={() => setOpen(false)}
            className={`block py-2 text-sm tracking-wide transition-colors duration-200 ${
              active === link.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );

  const actions = user ? (
    <div className="flex items-center gap-3">
      <span className="max-w-40 truncate text-sm text-muted-foreground">{user.email}</span>
      <Button
        variant="outline"
        className="h-11"
        onClick={() => {
          void authClient.signOut();
        }}
      >
        Sign out
      </Button>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <Button variant="ghost" className="h-11" onClick={openSignIn}>
        Sign In
      </Button>
      <Button className="h-11" onClick={openSignUp}>
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
        <div className="hidden md:block">{actions}</div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={<Button variant="outline" size="icon" className="h-11 w-11 md:hidden" />}
          >
            <Menu />
            <span className="sr-only">Open menu</span>
          </SheetTrigger>
          <SheetContent side="right" className="w-full bg-background">
            <SheetHeader>
              <SheetTitle className="font-heading font-semibold tracking-[-0.03em]">CatalogAugment</SheetTitle>
            </SheetHeader>
            <nav aria-label="Mobile" className="px-4">
              {links}
            </nav>
            <div className="px-4">{actions}</div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
