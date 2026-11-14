import { lazy, Suspense, useEffect, useState } from "react";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { AuthSpa, type AuthMode, type AuthUser } from "@/components/auth/AuthSpa";
import { authClient } from "@/lib/auth-client";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { About } from "@/components/sections/About";
import { FinalCta } from "@/components/sections/FinalCta";
import { Hero } from "@/components/sections/Hero";
import { Problem } from "@/components/sections/Problem";
import { Research } from "@/components/sections/Research";
import { Showcase } from "@/components/sections/Showcase";
import { Technology } from "@/components/sections/Technology";
import { Workflow } from "@/components/sections/Workflow";
import { Scene } from "@/components/scenes/Scene";
import { SparkField } from "@/components/effects/SparkField";
import { WebGLErrorBoundary } from "@/components/effects/WebGLErrorBoundary";
import { AppWorkspace } from "@/components/workspace/AppWorkspace";
import { scrollState, startScrollLoop, subscribeScroll, type SceneId, type Tier } from "@/lib/scroll";

const SceneCanvas = lazy(() =>
  import("@/three/SceneCanvas").then((module) => ({ default: module.SceneCanvas })),
);

type Snap = {
  scene: SceneId;
  navId: string;
  compact: boolean;
  tier: Tier;
  webgl: boolean;
};

function readSnap(): Snap {
  return {
    scene: scrollState.scene,
    navId: scrollState.navId,
    compact: scrollState.compact,
    tier: scrollState.tier,
    webgl: scrollState.webgl,
  };
}

interface RouteState {
  isWorkspace: boolean;
  isScene: boolean;
  isAuth: boolean;
  authMode: AuthMode;
  redirectTarget: string;
}

function parseCurrentRoute(): RouteState {
  if (typeof window === "undefined") {
    return {
      isWorkspace: false,
      isScene: false,
      isAuth: false,
      authMode: "sign-in",
      redirectTarget: "workspace",
    };
  }

  const hash = window.location.hash || "";
  const search = window.location.search || "";

  // Strip leading '#' and split into path + sub-query (e.g. #login?redirect=workspace)
  const hashClean = hash.replace(/^#\/?/, "");
  const [hashPath, hashSubQuery] = hashClean.split("?");

  const searchParams = new URLSearchParams(search);
  if (hashSubQuery) {
    const hashParams = new URLSearchParams(hashSubQuery);
    hashParams.forEach((val, key) => searchParams.set(key, val));
  }

  const isWorkspace = hashPath === "workspace" || (!hashPath && searchParams.has("workspace"));
  const isScene = hashPath === "scene" || (!hashPath && searchParams.has("scene"));
  const isAuth =
    !isWorkspace &&
    !isScene &&
    (hashPath === "login" ||
      hashPath === "signup" ||
      hashPath === "auth" ||
      searchParams.has("login") ||
      searchParams.has("signup") ||
      searchParams.has("auth"));

  const authMode: AuthMode =
    hashPath === "signup" || searchParams.has("signup") ? "sign-up" : "sign-in";

  const redirectTarget = searchParams.get("redirect") || "workspace";

  return {
    isWorkspace,
    isScene,
    isAuth,
    authMode,
    redirectTarget,
  };
}

function Page() {
  const [snap, setSnap] = useState<Snap>(readSnap);
  const [node, setNode] = useState("react");
  const [route, setRoute] = useState<RouteState>(parseCurrentRoute);

  const { data: session, isPending: sessionLoading, refetch: refetchSession } = authClient.useSession();
  const [localUser, setLocalUser] = useState<AuthUser | null>(null);
  const user = (session?.user as AuthUser | undefined) || localUser;

  // Keep localUser in sync with session
  useEffect(() => {
    if (session?.user) {
      setLocalUser(session.user as AuthUser);
    }
  }, [session?.user]);

  // Initial check: if not in store, verify directly against backend session cookie
  useEffect(() => {
    if (!user && !sessionLoading) {
      let active = true;
      authClient
        .getSession()
        .then((res) => {
          if (!active) return;
          if (res?.data?.user) {
            setLocalUser(res.data.user as AuthUser);
            void refetchSession();
          }
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }
  }, [user, sessionLoading, refetchSession]);

  useEffect(() => subscribeScroll(() => setSnap(readSnap())), []);
  useEffect(() => startScrollLoop(), []);

  useEffect(() => {
    const updateRoute = () => {
      setRoute(parseCurrentRoute());
    };
    window.addEventListener("popstate", updateRoute);
    window.addEventListener("hashchange", updateRoute);
    return () => {
      window.removeEventListener("popstate", updateRoute);
      window.removeEventListener("hashchange", updateRoute);
    };
  }, []);

  // Auth Guard 1: If user navigates to workspace without authentication, verify session before redirecting
  useEffect(() => {
    if (sessionLoading) return;
    if (route.isWorkspace && !user) {
      let active = true;
      authClient
        .getSession()
        .then((res) => {
          if (!active) return;
          if (res?.data?.user) {
            setLocalUser(res.data.user as AuthUser);
            void refetchSession();
          } else {
            const targetHash = "#login?redirect=workspace";
            if (window.location.hash !== targetHash) {
              window.location.hash = targetHash;
              window.dispatchEvent(new HashChangeEvent("hashchange"));
            }
          }
        })
        .catch(() => {
          if (!active) return;
          const targetHash = "#login?redirect=workspace";
          if (window.location.hash !== targetHash) {
            window.location.hash = targetHash;
            window.dispatchEvent(new HashChangeEvent("hashchange"));
          }
        });
      return () => {
        active = false;
      };
    }
  }, [route.isWorkspace, user, sessionLoading, refetchSession]);

  // Auth Guard 2: If user is already authenticated and visits login/signup, redirect to workspace or target
  useEffect(() => {
    if (sessionLoading) return;
    if (route.isAuth && user) {
      const dest = route.redirectTarget || "workspace";
      const targetHash = `#${dest}`;
      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      }
    }
  }, [route.isAuth, route.redirectTarget, user, sessionLoading]);

  // Loading state while verifying workspace access
  if (route.isWorkspace && sessionLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#07080c] text-foreground font-sans">
        <div className="relative flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <p className="text-xs font-mono text-muted-foreground tracking-wider uppercase">
            Verifying Operator Credentials...
          </p>
        </div>
      </div>
    );
  }

  const handleAuthSuccess = (target?: string, authenticatedUser?: AuthUser) => {
    if (authenticatedUser) {
      setLocalUser(authenticatedUser);
    }
    void refetchSession();
    const dest = target || "workspace";
    window.location.hash = `#${dest}`;
    setRoute(parseCurrentRoute());
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };

  const handleSignOut = () => {
    setLocalUser(null);
    void refetchSession();
    window.location.hash = "#platform";
    setRoute(parseCurrentRoute());
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };

  // Workspace View (Protected)
  if (route.isWorkspace && user) {
    return (
      <AppWorkspace
        user={user}
        onSignOut={handleSignOut}
        onExitWorkspace={() => {
          window.location.hash = "#platform";
          window.dispatchEvent(new HashChangeEvent("hashchange"));
        }}
      />
    );
  }

  // If user unauthenticated on workspace route before redirect fires, render AuthSpa with notice
  if (route.isWorkspace && !user && !sessionLoading) {
    return (
      <AuthSpa
        initialMode="sign-in"
        redirectTarget="workspace"
        notice="Authentication required. Please sign in or create an operator account to access the Studio Workspace."
        onSuccess={handleAuthSuccess}
        onNavigateHome={() => {
          window.location.hash = "#platform";
          window.dispatchEvent(new HashChangeEvent("hashchange"));
        }}
      />
    );
  }

  // Standalone Login / Registration SPA
  if (route.isAuth) {
    return (
      <AuthSpa
        initialMode={route.authMode}
        redirectTarget={route.redirectTarget}
        notice={
          route.redirectTarget === "workspace"
            ? "Authentication required. Please sign in or create an operator account to access the Studio Workspace."
            : undefined
        }
        onSuccess={handleAuthSuccess}
        onNavigateHome={() => {
          window.location.hash = "#platform";
          window.dispatchEvent(new HashChangeEvent("hashchange"));
        }}
      />
    );
  }

  // Standalone 3D Scene View
  if (route.isScene) {
    return (
      <div className="relative min-h-screen w-full bg-[#07080c] flex flex-col justify-start">
        <Scene />
      </div>
    );
  }

  // Default: Public Landing Page
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      {snap.webgl ? (
        <WebGLErrorBoundary>
          <Suspense fallback={null}>
            <SceneCanvas scene={snap.scene} activeNode={node} />
          </Suspense>
        </WebGLErrorBoundary>
      ) : null}
      <SparkField />
      <Navbar compact={snap.compact} active={snap.navId} />
      <main id="main">
        <Hero />
        <Problem />
        <Workflow />
        <Showcase />
        <Research />
        <Technology active={node} onSelect={setNode} />
        <About />
        <FinalCta />
      </main>
      <Footer />
      <p className="sr-only">Layout tier {snap.tier}</p>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Page />
    </AuthProvider>
  );
}
