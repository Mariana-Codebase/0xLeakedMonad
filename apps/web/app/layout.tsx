import "./globals.css";
import type { ReactNode } from "react";
import { Providers } from "../lib/providers";

export const metadata = {
  title: "0xLeaked",
  description: "Plataforma de seguridad digital Web3 en Monad"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="m-0 overflow-x-hidden p-0">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
