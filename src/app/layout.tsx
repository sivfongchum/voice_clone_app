import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Khmer Voice Cloning Studio | Powered by VoxCPM 2 & Cloud GPU',
  description: 'High-fidelity zero-shot Khmer voice cloning web app running on low-spec hardware powered by VoxCPM 2 and Google Colab Free T4 GPU backend.',
  keywords: ['Khmer TTS', 'Voice Cloning', 'VoxCPM 2', 'Khmer AI', 'FastAPI', 'Next.js', 'Diffusion TTS'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="km" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Outfit:wght@300;400;500;600;700;800&family=Battambang:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#070b14] text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.15),rgba(255,255,255,0))] pointer-events-none -z-10" />
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.08),transparent_50%)] pointer-events-none -z-10" />
        {children}
      </body>
    </html>
  );
}
