import { useEffect } from "react";

/** Land at the top of the screen on mount: the hash router keeps the old scroll position otherwise. */
export function useScrollTop(): void {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
}
