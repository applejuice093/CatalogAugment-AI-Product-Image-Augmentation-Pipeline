import { useState, useEffect, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Cpu,
} from "lucide-react";

export type AuthMode = "sign-in" | "sign-up";

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  [key: string]: unknown;
};

interface AuthSpaProps {
  initialMode?: AuthMode;
  redirectTarget?: string;
  notice?: string;
  onSuccess?: (target?: string, user?: AuthUser) => void;
  onNavigateHome?: () => void;
}

export function AuthSpa({
  initialMode = "sign-in",
  redirectTarget = "workspace",
  notice,
  onSuccess,
  onNavigateHome,
}: AuthSpaProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const { refetch: refetchSession } = authClient.useSession();

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [pending, setPending] = useState(false);

  // Quick fill demo credentials for reviewers/operators
  const handleQuickDemo = () => {
    setEmail("operator@catalogaugment.ai");
    setPassword("CatalogAugment2026!");
    setName("AI Operations Lead");
    setError("");
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccessMsg("");
    setPending(true);

    try {
      if (mode === "sign-up") {
        if (password.length < 8) {
          setError("Password must be at least 8 characters long.");
          setPending(false);
          return;
        }

        const res = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim() || "Catalog Operator",
        });

        if (res.error) {
          setError(res.error.message ?? "Registration failed. Email may already be in use.");
          setPending(false);
          return;
        }

        setSuccessMsg("Account created successfully! Preparing studio workspace...");

        // Ensure session cache is synced immediately
        try {
          await refetchSession();
        } catch {
          // ignore
        }
        const sessionRes = await authClient.getSession().catch(() => null);
        const resolvedUser =
          (res.data?.user as AuthUser | undefined) ||
          (sessionRes?.data?.user as AuthUser | undefined);

        setTimeout(() => {
          onSuccess?.(redirectTarget, resolvedUser);
        }, 350);
      } else {
        const res = await authClient.signIn.email({
          email: email.trim(),
          password,
        });

        if (res.error) {
          setError(res.error.message ?? "Invalid email or password. Check credentials or create an account.");
          setPending(false);
          return;
        }

        setSuccessMsg("Welcome back! Redirecting to studio workspace...");

        try {
          await refetchSession();
        } catch {
          // ignore
        }
        const sessionRes = await authClient.getSession().catch(() => null);
        const resolvedUser =
          (res.data?.user as AuthUser | undefined) ||
          (sessionRes?.data?.user as AuthUser | undefined);

        setTimeout(() => {
          onSuccess?.(redirectTarget, resolvedUser);
        }, 350);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication service error. Please try again.";
      setError(msg);
    } finally {
      setPending(false);
    }
  }

  const navigateBack = () => {
    if (onNavigateHome) {
      onNavigateHome();
    } else {
      window.location.hash = "#platform";
    }
  };

  return (
    <div className="relative h-screen h-dvh max-h-screen w-full bg-[#0a0c0a] text-foreground flex flex-col justify-between p-4 sm:p-5 lg:px-10 lg:py-6 isolate overflow-hidden font-sans select-none">
      {/* Background Ambient Neon Glows */}
      <div
        className="pointer-events-none absolute -top-40 left-1/4 w-[700px] h-[450px] bg-gradient-to-b from-[#d6e36a]/15 via-[#82c8ff]/05 to-transparent rounded-full blur-3xl -z-10"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 right-10 w-[600px] h-[400px] bg-gradient-to-t from-[#d6e36a]/10 via-transparent to-transparent rounded-full blur-3xl -z-10"
        aria-hidden="true"
      />

      {/* Cyber Grid Pattern */}
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#161916_1px,transparent_1px),linear-gradient(to_bottom,#161916_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35 -z-10"
        aria-hidden="true"
      />

      {/* Top Header Bar */}
      <header className="relative z-20 flex items-center justify-between w-full shrink-0 pb-1">
        <button
          type="button"
          onClick={navigateBack}
          className="group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#121512]/80 px-3.5 py-1.5 text-xs font-mono text-muted-foreground transition-all duration-200 hover:border-white/20 hover:text-foreground hover:bg-[#1a1e1a] backdrop-blur-md cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-1" />
          <span>Back to Platform</span>
        </button>

        <div className="flex items-center gap-2.5 rounded-full border border-white/10 bg-[#121512]/60 px-3.5 py-1 text-xs font-mono text-muted-foreground backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <span className="text-[11px] tracking-wider uppercase text-foreground/90 font-medium">
            AUTH PROTOCOL // SQL VERIFIED
          </span>
        </div>
      </header>

      {/* Main 2-Column Split: Left = Login Box, Right = Big Animated Project Title */}
      <main className="relative z-10 flex-1 flex flex-col md:flex-row items-center justify-between gap-6 lg:gap-10 xl:gap-16 min-h-0 overflow-hidden my-auto py-1">
        {/* Left-most Side: Login / Signup Box (Fits completely in single page, NO SCROLL) */}
        <div className="w-full md:w-[410px] lg:w-[430px] xl:w-[450px] shrink-0 flex flex-col justify-center">
          {/* External Notice Pill if redirected */}
          {notice && (
            <div className="mb-2.5 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs text-primary shadow-[0_0_12px_rgba(214,227,106,0.15)] animate-in fade-in duration-200">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate">{notice}</span>
            </div>
          )}

          {/* Main Glass Card */}
          <div className="relative rounded-2xl border border-white/10 bg-[#121512]/90 p-4 sm:p-5 shadow-[0_20px_70px_rgba(0,0,0,0.85)] backdrop-blur-xl">
            {/* Corner Framing Marks */}
            <div className="pointer-events-none absolute inset-0 p-2.5" aria-hidden="true">
              <div className="absolute top-2.5 left-2.5 h-2 w-2 border-t-2 border-l-2 border-primary/60" />
              <div className="absolute top-2.5 right-2.5 h-2 w-2 border-t-2 border-r-2 border-primary/60" />
              <div className="absolute bottom-2.5 left-2.5 h-2 w-2 border-b-2 border-l-2 border-primary/60" />
              <div className="absolute bottom-2.5 right-2.5 h-2 w-2 border-b-2 border-r-2 border-primary/60" />
            </div>

            {/* Card Header */}
            <div className="flex items-center gap-3 mb-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 shadow-[0_0_15px_rgba(214,227,106,0.2)]">
                <Cpu className="h-4.5 w-4.5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-heading text-base font-bold tracking-tight text-foreground truncate">
                  {mode === "sign-in" ? "Operator Sign In" : "Operator Registration"}
                </h2>
                <p className="text-[11px] text-muted-foreground truncate">
                  {mode === "sign-in"
                    ? "Access Studio Workspace & augmentation pipelines"
                    : "Create an operator account to begin generating datasets"}
                </p>
              </div>
            </div>

            {/* Tab Selector: Sign In vs Create Account */}
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-black/40 p-1 mb-3">
              <button
                type="button"
                onClick={() => {
                  setMode("sign-in");
                  setError("");
                }}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                  mode === "sign-in"
                    ? "bg-primary text-primary-foreground shadow-[0_0_12px_rgba(214,227,106,0.3)] font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("sign-up");
                  setError("");
                }}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                  mode === "sign-up"
                    ? "bg-primary text-primary-foreground shadow-[0_0_12px_rgba(214,227,106,0.3)] font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error and Success Banners */}
            {error && (
              <div
                role="alert"
                className="mb-2.5 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive animate-in fade-in duration-200"
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span className="leading-tight">{error}</span>
              </div>
            )}

            {successMsg && (
              <div
                role="status"
                className="mb-2.5 flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 p-2 text-xs text-primary animate-in fade-in duration-200"
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="font-medium leading-tight">{successMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-2.5">
              {mode === "sign-up" && (
                <div className="space-y-1">
                  <Label htmlFor="auth-name" className="text-[11px] font-mono text-muted-foreground">
                    Operator / Organization Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      id="auth-name"
                      name="name"
                      type="text"
                      placeholder="e.g. Acme Studio"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={mode === "sign-up"}
                      className="h-9 pl-8 rounded-xl border-white/10 bg-black/40 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="auth-email" className="text-[11px] font-mono text-muted-foreground">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    id="auth-email"
                    name="email"
                    type="email"
                    placeholder="operator@catalogaugment.ai"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-9 pl-8 rounded-xl border-white/10 bg-black/40 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auth-password" className="text-[11px] font-mono text-muted-foreground">
                    Password
                  </Label>
                  {mode === "sign-up" && (
                    <span className="text-[10px] font-mono text-muted-foreground">Min. 8 chars</span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    id="auth-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    required
                    className="h-9 pl-8 pr-8 rounded-xl border-white/10 bg-black/40 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Submit CTA */}
              <Button
                type="submit"
                disabled={pending}
                className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-semibold text-xs tracking-wide hover:bg-primary/90 shadow-[0_0_20px_rgba(214,227,106,0.3)] transition-all duration-200 mt-1 cursor-pointer"
              >
                {pending ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                    <span>Authenticating Operator...</span>
                  </span>
                ) : mode === "sign-up" ? (
                  <span className="inline-flex items-center gap-2">
                    <span>Create Account & Launch Studio</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <span>Sign In to Studio Workspace</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                )}
              </Button>
            </form>

            {/* Quick Demo Operator Assist */}
            <div className="mt-3 pt-2.5 border-t border-white/10 text-center">
              <button
                type="button"
                onClick={handleQuickDemo}
                className="inline-flex items-center gap-1.5 text-[11px] text-primary hover:text-primary/80 transition-colors font-mono cursor-pointer"
              >
                <Sparkles className="h-3 w-3" />
                <span>Fill Demo Operator Credentials</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Big Animated Project Title "Catelog \n Augment" with Taglines */}
        <div className="flex-1 hidden md:flex flex-col justify-between h-full pl-6 lg:pl-10 xl:pl-14 min-h-0 border-l border-white/10 relative">
          {/* Top Pill / Badge */}
          <div className="flex items-center gap-2.5 font-mono text-[11px] text-primary/90 tracking-widest uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
            <span>AI Product Image Augmentation Pipeline</span>
          </div>

          {/* Center: Big Animated Project Title "Catelog \n Augment" */}
          <div className="relative my-auto py-2">
            {/* Ambient Backlight Aura */}
            <div
              className="pointer-events-none absolute -inset-10 bg-gradient-to-r from-[#d6e36a]/20 via-[#82c8ff]/10 to-transparent rounded-full blur-3xl opacity-70 animate-pulse -z-10"
              aria-hidden="true"
            />

            <h1 className="font-heading font-black tracking-[-0.04em] uppercase leading-[0.88] select-none text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl 2xl:text-[9.5rem]">
              <span className="block text-white/95 cyber-title-glow drop-shadow-[0_0_35px_rgba(214,227,106,0.3)]">
                Catelog
              </span>
              <span className="block cyber-title-gradient mt-2 drop-shadow-[0_0_45px_rgba(214,227,106,0.45)]">
                Augment
              </span>
            </h1>

            {/* Dynamic Cyber Scan Tracker Line */}
            <div className="relative mt-5 h-1 w-56 sm:w-72 md:w-80 lg:w-96 bg-white/10 rounded-full overflow-hidden">
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-[#d6e36a] to-transparent animate-cyber-scan" />
            </div>
          </div>

          {/* Bottom Taglines Area */}
          <div className="space-y-3 pt-3 border-t border-white/10 max-w-xl">
            <p className="text-sm lg:text-base font-normal text-foreground/85 leading-snug">
              Turn one product photograph into an intelligent, photorealistic dataset with studio isolation, relighting, and contextual lifestyle scenes.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] font-mono text-muted-foreground/80">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#d6e36a]" />
                Alpha Foreground Preservation
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#82c8ff]" />
                WF-01 · WF-02 · WF-03 Diffusion
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Zero-Leakage Partitioning
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Info (Minimal, single line) */}
      <footer className="relative z-10 w-full shrink-0 pt-1 text-[10px] text-muted-foreground/50 font-mono flex items-center justify-between border-t border-white/5">
        <p>CatalogAugment Enterprise AI Pipeline</p>
        <p className="hidden sm:block">Local PostgreSQL & SQLite Auth • Zero Third-Party Tracking</p>
      </footer>
    </div>
  );
}
