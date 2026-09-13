import { useEffect, useRef } from "react";

/** Fires `onVisible` when the returned ref's element scrolls into view —
 * drives "load more" for paginated lists without a manual scroll listener. */
export function useLoadMoreSentinel(onVisible: () => void, enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onVisible();
      },
      { rootMargin: "400px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, onVisible]);

  return ref;
}
