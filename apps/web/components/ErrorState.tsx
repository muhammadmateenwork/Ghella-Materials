import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-20 text-center">
      <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-sm bg-danger-soft">
        <AlertTriangle size={26} className="text-danger" strokeWidth={1.75} />
      </div>
      <p className="text-[15px] font-semibold text-text">Couldn&apos;t load this</p>
      {message ? <p className="max-w-sm text-sm text-text-muted">{message}</p> : null}
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-3">
          Try again
        </Button>
      ) : null}
    </div>
  );
}
