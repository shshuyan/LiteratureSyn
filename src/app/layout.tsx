import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GlobalHeader } from "@/components/GlobalHeader";
import { ThemeProvider } from "@/components/ThemeProvider";
import { GlobalStateProvider } from "@/components/GlobalStateProvider";
import { ModalManager } from "@/components/ui/modal-manager";
import { SlideOverManager } from "@/components/SlideOver";
import { PerformanceMonitor } from "@/components/PerformanceMonitor";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Literature Synthesizer",
  description: "AI-powered literature analysis and synthesis tool for researchers and academics",
  keywords: ["literature", "research", "AI", "synthesis", "analysis", "academic"],
  authors: [{ name: "Literature Synthesizer Team" }],
  creator: "Literature Synthesizer",
  publisher: "Literature Synthesizer",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Literature Synthesizer"
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" }
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ]
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f1e5" },
    { media: "(prefers-color-scheme: dark)", color: "#203655" }
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
      </head>
      <body
        className={`
          ${geistSans.variable} ${geistMono.variable} 
          antialiased font-sans 
          bg-background text-foreground 
          scrollbar-styled
          transition-colors duration-300 ease-out
          selection:bg-peach selection:text-navy
        `}
        suppressHydrationWarning
      >
        <ThemeProvider defaultTheme="light" storageKey="literature-synthesizer-theme">
          <GlobalStateProvider>
            <div className="app-layout min-h-screen flex flex-col">
              <GlobalHeader />
              <main className="main-content flex-1 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-accent/5 pointer-events-none" />
                <div className="relative z-10 h-full">
                  {children}
                </div>
              </main>
              
              {/* Modal and Slide-over Managers */}
              <ModalManager />
              <SlideOverManager />
              
              {/* Performance Monitoring */}
              <PerformanceMonitor />
            </div>
          </GlobalStateProvider>
        </ThemeProvider>
        
        {/* Theme transition optimization script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Prevent flash of unstyled content
              (function() {
                const theme = localStorage.getItem('literature-synthesizer-theme') || 
                             (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                document.documentElement.classList.add(theme);
                document.documentElement.style.colorScheme = theme;
              })();
            `
          }}
        />
      </body>
    </html>
  );
}
