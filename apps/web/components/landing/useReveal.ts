"use client";

import { useEffect } from "react";

export function useReveal(selector = ".cw-reveal", threshold = 0.15) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const nodes = document.querySelectorAll<HTMLElement>(selector);
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold, rootMargin: "0px 0px -80px 0px" }
    );

    nodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, [selector, threshold]);
}
