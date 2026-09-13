"use client";

import { useProfile } from "@ghella/shared";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { StackLoader } from "../../../components/StackLoader";

// Defense in depth: the sidebar hides Admin links for non-max-tier users,
// but this guard blocks the route directly too (e.g. a bookmarked URL).
export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { profile, isMaxTier, isLoading } = useProfile();

  useEffect(() => {
    if (!isLoading && (!profile || !isMaxTier)) {
      router.replace("/browse");
    }
  }, [isLoading, profile, isMaxTier, router]);

  if (isLoading || !profile || !isMaxTier) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <StackLoader />
      </div>
    );
  }

  return <>{children}</>;
}
