import type { ReactNode } from "react";

type Props = {
  icon: ReactNode;
  title: string;
  description: string;
  status?: "soon" | "planned";
};

export function ModulePlaceholder({ icon, title, description, status = "soon" }: Props) {
  return (
    <div className="cw-slide-up flex min-h-[45vh] flex-col items-center justify-center gap-4 rounded-2xl border border-white/5 bg-white/[0.02] px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-[#a8c7ff]">
        {icon}
      </div>
      <div className="cw-display text-xl text-white">{title}</div>
      <p className="max-w-md text-sm text-[#94a3b8]">{description}</p>
      <span className="cw-badge border border-[#3a6fff]/30 bg-[#3a6fff]/10 text-[#a8c7ff]">
        {status === "planned" ? "Planificado" : "Próximamente"}
      </span>
    </div>
  );
}
