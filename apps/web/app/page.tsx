"use client";

import { useSession } from "@ghella/shared";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { StackLoader } from "../components/StackLoader";

export default function Home() {
  const router = useRouter();
  const { session, isLoading } = useSession();

  useEffect(() => {
    if (isLoading) return;
    router.replace(session ? "/browse" : "/login");
  }, [isLoading, session, router]);

  return (
    <main className="flex flex-1 items-center justify-center bg-background">
      <StackLoader />
    </main>
  );
}
