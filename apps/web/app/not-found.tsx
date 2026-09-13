import { PackageSearch } from "lucide-react";
import Link from "next/link";
import { Button } from "../components/Button";
import { Logomark } from "../components/Logomark";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-14 text-center">
      <Logomark size={40} />
      <div className="mt-8 flex h-16 w-16 items-center justify-center rounded-full bg-surface-alt">
        <PackageSearch size={28} className="text-text-faint" strokeWidth={1.75} />
      </div>
      <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight text-text">
        Nothing on this shelf
      </h1>
      <p className="mt-2 max-w-sm text-[15px] text-text-muted">
        That page doesn&apos;t exist, or it moved. Let&apos;s get you back to the materials list.
      </p>
      <Link href="/browse">
        <Button className="mt-8">Back to Browse</Button>
      </Link>
    </main>
  );
}
