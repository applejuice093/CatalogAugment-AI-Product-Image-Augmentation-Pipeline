import { createContext, useContext, type ReactNode } from "react";

type AuthUi = {
  openSignIn: (redirect?: string) => void;
  openSignUp: (redirect?: string) => void;
};

const AuthUiContext = createContext<AuthUi | null>(null);

export function useAuthUi() {
  const value = useContext(AuthUiContext);
  if (!value) throw new Error("useAuthUi must be used inside AuthProvider");
  return value;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigateToAuth = (hash: string, redirect?: unknown) => {
    const redirectStr = typeof redirect === "string" ? redirect : undefined;
    const target = redirectStr ? `${hash}?redirect=${encodeURIComponent(redirectStr)}` : hash;
    window.location.hash = target;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };

  return (
    <AuthUiContext.Provider
      value={{
        openSignIn: (redirect?: unknown) => navigateToAuth("#login", redirect),
        openSignUp: (redirect?: unknown) => navigateToAuth("#signup", redirect),
      }}
    >
      {children}
    </AuthUiContext.Provider>
  );
}
