"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: false, staleTime: 15_000, retry: 1 },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      {/* Toaster mounts before {children} so its store subscription exists
          for toasts fired during children's mount effects */}
      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          style: {
            background: "rgba(11,14,12,0.92)",
            border: "1px solid rgba(45,240,156,0.22)",
            color: "#ecefe9",
            backdropFilter: "blur(12px)",
            fontFamily: "var(--font-inter)",
          },
        }}
      />
      {children}
    </QueryClientProvider>
  );
}
