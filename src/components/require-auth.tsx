import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { useAuth, useRoles } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** UI gate only — real protection is enforced by RLS and server functions. */
export function RequireAuth({ children, need }: { children: ReactNode; need?: "staff" | "admin" }) {
  const { session, loading } = useAuth();
  const roles = useRoles();
  if (loading || (session && need && roles.loading))
    return <div className="mx-auto max-w-5xl px-4 py-10"><Skeleton className="h-64 rounded-xl" /></div>;
  if (!session)
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-20 text-center">
        <Lock className="h-10 w-10 text-gold" />
        <p>يجب تسجيل الدخول لعرض هذه الصفحة.</p>
        <Button asChild><Link to="/auth" search={{ mode: "signin", redirect: typeof window !== "undefined" ? window.location.pathname : undefined }}>تسجيل الدخول</Link></Button>
      </div>
    );
  if ((need === "staff" && !roles.isStaff) || (need === "admin" && !roles.isAdmin))
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <Lock className="mx-auto h-10 w-10 text-gold" />
        <p className="mt-4">ليست لديك صلاحية لعرض هذه الصفحة.</p>
      </div>
    );
  return <>{children}</>;
}

export function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <PwInner {...props} />;
}

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
function PwInner({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} className={cn("pl-10", className)} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
