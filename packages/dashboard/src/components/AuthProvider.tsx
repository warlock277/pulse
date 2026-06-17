import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AuthContext, resolveAuth, DEFAULT_AUTH, type AuthContextValue } from "@/lib/auth";

/** Resolves Cloudflare Access identity + permissions once, then provides auth. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<AuthContextValue>({ ...DEFAULT_AUTH, ready: false });

  useEffect(() => {
    let active = true;
    void resolveAuth().then((auth) => {
      if (active) setValue({ ...auth, ready: true });
    });
    return () => {
      active = false;
    };
  }, []);

  const memo = useMemo(() => value, [value]);
  return <AuthContext.Provider value={memo}>{children}</AuthContext.Provider>;
}
