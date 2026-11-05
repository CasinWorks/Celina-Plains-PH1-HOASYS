import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Role, Session } from "../domain/types";
import { getServices } from "../services/createServices";
import type { RegisterHomeownerInput } from "../services/interfaces";

type AuthState = {
  session: Session | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  apply: (input: RegisterHomeownerInput) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  acceptPrivacy: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const services = getServices();

  const refresh = useCallback(async () => {
    const s = await services.auth.getSession();
    setSession(s);
  }, [services.auth]);

  useEffect(() => {
    void (async () => {
      try {
        await refresh();
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      loading,
      async login(username, password) {
        const s = await services.auth.login(username, password);
        setSession(s);
      },
      async apply(input) {
        await services.auth.applyForHomeowner(input);
      },
      async logout() {
        await services.auth.logout();
        setSession(null);
      },
      refresh,
      async acceptPrivacy() {
        if (!session) return;
        const s = await services.auth.acceptPrivacyConsent(session.userId);
        setSession(s);
      },
      hasRole(...roles) {
        return services.auth.hasRole(session, roles);
      },
    }),
    [session, loading, refresh, services.auth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
