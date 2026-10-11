import { Suspense } from "react";
import { AuthPage } from "@/components/site/auth-shell";

export const metadata = {
  title: "Create account · Recovery OS",
  description: "Switch on the statutory recovery engine for your MSME.",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AuthPage mode="signup" />
    </Suspense>
  );
}
