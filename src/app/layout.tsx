import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { RegistrarServiceWorker } from "@/components/registrar-service-worker";
import { lerPreferencias, scriptAntiPiscada } from "@/lib/preferencias-servidor";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Caravana ao Templo",
    template: "%s · Caravana ao Templo",
  },
  description:
    "Organização das caravanas da ala ao templo: inscrições, pendências, fila de espera e embarque.",
  robots: { index: false, follow: false },
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icone.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Não travar o zoom: quem precisa aumentar a letra precisa poder.
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const preferencias = await lerPreferencias();
  const escuroNoServidor = preferencias.tema === "ESCURO";

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased ${
        escuroNoServidor ? "dark" : ""
      }`}
      style={{ fontSize: `${preferencias.escalaFonte}%` }}
      suppressHydrationWarning
    >
      <head>
        <script
          // Resolve "seguir o sistema" antes da primeira pintura.
          dangerouslySetInnerHTML={{ __html: scriptAntiPiscada(preferencias) }}
        />
      </head>
      <body className="bg-background text-foreground flex min-h-full flex-col">
        {children}
        <RegistrarServiceWorker />
        <Toaster
          position="top-center"
          richColors
          theme={
            preferencias.tema === "CLARO"
              ? "light"
              : preferencias.tema === "ESCURO"
                ? "dark"
                : "system"
          }
        />
      </body>
    </html>
  );
}
