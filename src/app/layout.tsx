import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ShellProvider } from '@/context/ShellContext';
import { AgendaProvider } from '@/context/AgendaContext';
import { EducationPanelProvider } from '@/context/EducationPanelContext';
import { ShellLayout } from '@/components/shell/ShellLayout';

export const metadata: Metadata = {
  title: 'Medusa Shell · Arquitetura Definitiva V2',
  description: 'Shell frontend funcional e visualmente fiel do Medusa Life OS com Dynamic Island, 3 Modos e 3 Temas.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  viewportFit: 'cover',
  themeColor: '#71DBD2',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="light" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Epilogue:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased selection:bg-medusa-primary selection:text-[#1C2420]">
        <ShellProvider>
          <AgendaProvider>
            <EducationPanelProvider>
              <ShellLayout>{children}</ShellLayout>
            </EducationPanelProvider>
          </AgendaProvider>
        </ShellProvider>
      </body>
    </html>
  );
}
