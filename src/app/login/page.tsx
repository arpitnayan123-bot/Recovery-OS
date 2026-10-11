import { Suspense } from "react";
import { AuthPage } from "@/components/site/auth-shell";

export const metadata = {
  title: "Sign in · Recovery OS",
  description: "Sign in to your Recovery OS workspace.",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AuthPage mode="login" />
    </Suspense>
  );
}
