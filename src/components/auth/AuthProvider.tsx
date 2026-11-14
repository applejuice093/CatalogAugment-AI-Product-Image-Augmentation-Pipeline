import { createContext, useContext, useState, type FormEvent, type ReactNode } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "sign-in" | "sign-up";

type AuthUi = {
  openSignIn: () => void;
  openSignUp: () => void;
};

const AuthUiContext = createContext<AuthUi | null>(null);

export function useAuthUi() {
  const value = useContext(AuthUiContext);
  if (!value) throw new Error("useAuthUi must be used inside AuthProvider");
  return value;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mode) return;
    setError("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "Member");
    const result =
      mode === "sign-up"
        ? await authClient.signUp.email({ email, password, name })
        : await authClient.signIn.email({ email, password });
    setPending(false);
    if (result.error) {
      setError(result.error.message ?? "That did not work.");
      return;
    }
    setMode(null);
  }

  return (
    <AuthUiContext.Provider
      value={{
        openSignIn: () => {
          setError("");
          setMode("sign-in");
        },
        openSignUp: () => {
          setError("");
          setMode("sign-up");
        },
      }}
    >
      {children}
      <Dialog
        open={mode !== null}
        onOpenChange={(open) => {
          if (!open) setMode(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{mode === "sign-up" ? "Create an account" : "Sign in"}</DialogTitle>
            <DialogDescription>
              Email and password, stored in the local SQL database. No social login is configured.
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-3" onSubmit={onSubmit}>
            {mode === "sign-up" ? (
              <div className="grid gap-1.5">
                <Label htmlFor="auth-name">Name</Label>
                <Input id="auth-name" name="name" autoComplete="name" required className="h-11" />
              </div>
            ) : null}
            <div className="grid gap-1.5">
              <Label htmlFor="auth-email">Email</Label>
              <Input
                id="auth-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="h-11"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="auth-password">Password</Label>
              <Input
                id="auth-password"
                name="password"
                type="password"
                autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                minLength={8}
                required
                className="h-11"
              />
            </div>
            {error ? (
              <p role="alert" className="text-sm text-primary">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={pending} className="h-11 cursor-pointer">
              {pending ? "Working…" : mode === "sign-up" ? "Get Started" : "Sign In"}
            </Button>
            <button
              type="button"
              className="text-left text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline cursor-pointer"
              onClick={() => {
                setError("");
                setMode(mode === "sign-up" ? "sign-in" : "sign-up");
              }}
            >
              {mode === "sign-up" ? "Already have an account? Sign in" : "New here? Create an account"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </AuthUiContext.Provider>
  );
}
