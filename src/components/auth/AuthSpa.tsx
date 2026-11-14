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
  AlertCircle,
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
  onSuccess?: (target?: string, user?: AuthUser) => void;
  onNavigateHome?: () => void;
}

export function AuthSpa({
  initialMode = "sign-in",
  redirectTarget = "workspace",
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
          className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#121512]/80 px-4 py-1.5 text-xs font-mono text-muted-foreground transition-all duration-200 hover:border-white/25 hover:text-foreground hover:bg-[#1a1e1a] backdrop-blur-md cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-1" />
          <span>Back to Platform</span>
        </button>
      </header>

      {/* Main 2-Column Split: Left = Big Animated Project Title, Right = Login Box */}
      <main className="relative z-10 flex-1 flex flex-col md:flex-row items-center justify-between gap-6 lg:gap-10 xl:gap-16 min-h-0 my-auto py-2">
        {/* Left Side: Big Animated Project Title "Catelog \n Augment" with Taglines */}
        <div className="flex-1 hidden md:flex flex-col justify-between h-full pl-2 lg:pl-6 pr-6 lg:pr-10 xl:pr-14 min-h-0 border-r border-white/10 relative">
          <div />

          {/* Center: Big Animated Project Title "Catelog \n Augment" */}
          <div className="relative my-auto py-2">
            {/* Ambient Backlight Aura with Smooth Radial Fade */}
            <div
              className="pointer-events-none absolute -inset-16 bg-[radial-gradient(ellipse_at_center,rgba(214,227,106,0.18)_0%,rgba(214,227,106,0.06)_45%,rgba(130,200,255,0.02)_65%,transparent_80%)] rounded-full blur-3xl opacity-75 animate-pulse -z-10"
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
          <div className="pt-3 border-t border-white/10 max-w-xl pb-2">
            <p className="text-sm lg:text-base font-normal text-foreground/85 leading-snug">
              Turn one product photograph into an intelligent, photorealistic dataset with studio isolation, relighting, and contextual lifestyle scenes.
            </p>
          </div>
        </div>

        {/* Right Side: Login / Signup Box (Fits completely in single page, NO SCROLL) */}
        <div className="w-full md:w-[410px] lg:w-[430px] xl:w-[450px] shrink-0 flex flex-col justify-center">
          {/* Main Glass Card with Soft Rounded Edges */}
          <div className="relative rounded-[28px] border border-white/10 bg-[#121512]/90 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.85),0_0_35px_rgba(214,227,106,0.05)] backdrop-blur-2xl ring-1 ring-white/5">
            {/* Card Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 shadow-[0_0_15px_rgba(214,227,106,0.2)]">
                <Cpu className="h-5 w-5 text-primary" />
              </div>
              <h2 className="font-heading text-lg font-bold tracking-tight text-foreground">
                {mode === "sign-in" ? "Operator Sign In" : "Create Operator Account"}
              </h2>
            </div>

            {/* Tab Selector: Sign In vs Create Account (Soft Pill Shape) */}
            <div className="grid grid-cols-2 gap-1 rounded-full border border-white/10 bg-black/50 p-1 mb-4">
              <button
                type="button"
                onClick={() => {
                  setMode("sign-in");
                  setError("");
                }}
                className={`py-2 text-xs font-semibold rounded-full transition-all duration-200 cursor-pointer ${
                  mode === "sign-in"
                    ? "bg-primary text-primary-foreground shadow-[0_0_14px_rgba(214,227,106,0.35)] font-bold"
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
                className={`py-2 text-xs font-semibold rounded-full transition-all duration-200 cursor-pointer ${
                  mode === "sign-up"
                    ? "bg-primary text-primary-foreground shadow-[0_0_14px_rgba(214,227,106,0.35)] font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error and Success Banners (Soft Edges) */}
            {error && (
              <div
                role="alert"
                className="mb-3 flex items-start gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive animate-in fade-in duration-200"
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span className="leading-tight">{error}</span>
              </div>
            )}

            {successMsg && (
              <div
                role="status"
                className="mb-3 flex items-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 p-2.5 text-xs text-primary animate-in fade-in duration-200"
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="font-medium leading-tight">{successMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === "sign-up" && (
                <div className="space-y-1">
                  <Label htmlFor="auth-name" className="text-[11px] font-mono text-muted-foreground ml-1">
                    Operator / Organization Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      id="auth-name"
                      name="name"
                      type="text"
                      placeholder="e.g. Acme Studio"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={mode === "sign-up"}
                      className="h-10 pl-9 rounded-2xl border-white/10 bg-black/40 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="auth-email" className="text-[11px] font-mono text-muted-foreground ml-1">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    id="auth-email"
                    name="email"
                    type="email"
                    placeholder="operator@catalogaugment.ai"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-10 pl-9 rounded-2xl border-white/10 bg-black/40 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between px-1">
                  <Label htmlFor="auth-password" className="text-[11px] font-mono text-muted-foreground">
                    Password
                  </Label>
                  {mode === "sign-up" && (
                    <span className="text-[10px] font-mono text-muted-foreground">Min. 8 chars</span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
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
                    className="h-10 pl-9 pr-9 rounded-2xl border-white/10 bg-black/40 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Submit CTA (Soft Pill Button) */}
              <Button
                type="submit"
                disabled={pending}
                className="w-full h-10.5 rounded-full bg-primary text-primary-foreground font-semibold text-xs tracking-wide hover:bg-primary/90 shadow-[0_0_22px_rgba(214,227,106,0.32)] transition-all duration-200 mt-2 cursor-pointer"
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
          </div>
        </div>
      </main>
    </div>
  );
}
