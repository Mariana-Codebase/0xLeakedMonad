"use client";

import { type ReactNode } from "react";
import { useLaunchAppContext } from "./LaunchAppProvider";

type LaunchAppButtonProps = {
  className?: string;
  children: ReactNode;
  onBeforeNavigate?: () => void;
};

export function LaunchAppButton({ className, children, onBeforeNavigate }: LaunchAppButtonProps) {
  const { launch, isBusy } = useLaunchAppContext();

  return (
    <button
      type="button"
      className={className}
      onClick={() => launch(onBeforeNavigate)}
      disabled={isBusy}
    >
      {children}
    </button>
  );
}
