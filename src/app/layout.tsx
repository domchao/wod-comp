import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { ThemeToggle } from "./_components/ThemeToggle";
import { PushNotificationPrompt } from "./_components/PushNotificationPrompt";
import { InstallPrompt } from "./_components/InstallPrompt";
import { createClient } from "@/lib/supabase/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WOD Comp",
  description: "Weekly workout competition tracker",
  icons: {
    icon: [
      { url: "/icons/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/favicon.ico", sizes: "any" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "WOD Comp",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var s=localStorage.getItem('theme');var p=window.matchMedia('(prefers-color-scheme: dark)').matches;if(s==='dark'||(s!=='light'&&p)){document.documentElement.classList.add('dark');}else{document.documentElement.classList.add('light');}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col pb-16">
        {children}
        <ThemeToggle />
        {user && <PushNotificationPrompt />}
        {user && <InstallPrompt />}
      </body>
    </html>
  );
}
