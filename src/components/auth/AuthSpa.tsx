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

interface AuthSpaProps {
  initialMode?: AuthMode;
  redirectTarget?: string;
  notice?: string;
  onSuccess?: (target?: string) => void;
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
        setTimeout(() => {
          onSuccess?.(redirectTarget);
        }, 600);
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
        setTimeout(() => {
          onSuccess?.(redirectTarget);
        }, 500);
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
    <div className="relative min-h-screen w-full bg-[#0a0c0a] text-foreground flex flex-col justify-between p-4 sm:p-6 lg:p-10 isolate overflow-x-hidden font-sans">
      {/* Background Ambient Neon Glows */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-[#d6e36a]/15 via-[#82c8ff]/05 to-transparent rounded-full blur-3xl -z-10"
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
      <header className="relative z-20 flex items-center justify-between max-w-6xl w-full mx-auto pb-4">
        <button
          type="button"
          onClick={navigateBack}
          className="group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#121512]/80 px-3.5 py-2 text-xs font-mono text-muted-foreground transition-all duration-200 hover:border-white/20 hover:text-foreground hover:bg-[#1a1e1a] backdrop-blur-md cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-1" />
          <span>Back to Platform</span>
        </button>

        <div className="hidden sm:flex items-center gap-2.5 rounded-full border border-white/10 bg-[#121512]/60 px-3.5 py-1 text-xs font-mono text-muted-foreground backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <span className="text-[11px] tracking-wider uppercase text-foreground/90 font-medium">
            AUTH PROTOCOL // SQL VERIFIED
          </span>
        </div>
      </header>

      {/* Center Auth Card Container */}
      <main className="relative z-10 flex flex-1 items-center justify-center my-6">
        <div className="w-full max-w-md">
          {/* External Notice Pill if redirected from protected route */}
          {notice && (
            <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-xs text-primary shadow-[0_0_15px_rgba(214,227,106,0.15)] animate-in fade-in slide-in-from-top-2 duration-300">
              <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
              <span>{notice}</span>
            </div>
          )}

          {/* Main Glass Card */}
          <div className="relative rounded-2xl border border-white/10 bg-[#121512]/85 p-6 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.85)] backdrop-blur-xl">
            {/* Corner Framing Marks */}
            <div className="pointer-events-none absolute inset-0 p-3" aria-hidden="true">
              <div className="absolute top-3 left-3 h-2.5 w-2.5 border-t-2 border-l-2 border-primary/60" />
              <div className="absolute top-3 right-3 h-2.5 w-2.5 border-t-2 border-r-2 border-primary/60" />
              <div className="absolute bottom-3 left-3 h-2.5 w-2.5 border-b-2 border-l-2 border-primary/60" />
              <div className="absolute bottom-3 right-3 h-2.5 w-2.5 border-b-2 border-r-2 border-primary/60" />
            </div>

            {/* Brand Header */}
            <div className="text-center mb-6">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 shadow-[0_0_20px_rgba(214,227,106,0.2)]">
                <Cpu className="h-6 w-6 text-primary" />
              </div>
              <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                CatalogAugment
              </h1>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {mode === "sign-in"
                  ? "Sign in to access your Studio Workspace and AI augmentation pipelines"
                  : "Create an operator account to begin generating augmented catalog datasets"}
              </p>
            </div>

            {/* Tab Selector: Sign In vs Create Account */}
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-black/40 p-1 mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode("sign-in");
                  setError("");
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
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
                className={`py-2 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
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
                className="mb-4 flex items-start gap-2.5 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in duration-200"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {successMsg && (
              <div
                role="status"
                className="mb-4 flex items-center gap-2.5 rounded-xl border border-primary/40 bg-primary/10 p-3 text-xs text-primary animate-in fade-in duration-200"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                <span className="font-medium">{successMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "sign-up" && (
                <div className="space-y-1.5">
                  <Label htmlFor="auth-name" className="text-xs font-mono text-muted-foreground">
                    Operator / Organization Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="auth-name"
                      name="name"
                      type="text"
                      placeholder="e.g. Acme Studio"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={mode === "sign-up"}
                      className="h-10 pl-9 rounded-xl border-white/10 bg-black/40 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="auth-email" className="text-xs font-mono text-muted-foreground">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="auth-email"
                    name="email"
                    type="email"
                    placeholder="operator@catalogaugment.ai"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-10 pl-9 rounded-xl border-white/10 bg-black/40 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auth-password" className="text-xs font-mono text-muted-foreground">
                    Password
                  </Label>
                  {mode === "sign-up" && (
                    <span className="text-[10px] font-mono text-muted-foreground">Min. 8 characters</span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
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
                    className="h-10 pl-9 pr-9 rounded-xl border-white/10 bg-black/40 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit CTA */}
              <Button
                type="submit"
                disabled={pending}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-xs tracking-wide hover:bg-primary/90 shadow-[0_0_20px_rgba(214,227,106,0.3)] transition-all duration-200 mt-2 cursor-pointer"
              >
                {pending ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                    <span>Authenticating Operator...</span>
                  </span>
                ) : mode === "sign-up" ? (
                  <span className="inline-flex items-center gap-2">
                    <span>Create Account & Launch Studio</span>
                    <ArrowRight className="h-4 w-4" />
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <span>Sign In to Studio Workspace</span>
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>

            {/* Quick Demo Operator Assist */}
            <div className="mt-5 pt-4 border-t border-white/10 text-center">
              <button
                type="button"
                onClick={handleQuickDemo}
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-mono cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Fill Demo Operator Credentials</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="relative z-10 max-w-6xl w-full mx-auto pt-4 text-center text-xs text-muted-foreground/60 font-mono">
        <p>CatalogAugment AI Pipeline • Enterprise Isolation • Local PostgreSQL Auth • Zero Third-Party Tracking</p>
      </footer>
    </div>
  );
}
