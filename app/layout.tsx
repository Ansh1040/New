import type { Metadata } from "next";
import "./globals.css";
import { TrackerTheme } from "@/components/theme-control";
import { TaskNotifications } from "@/components/task-notifications";

export const metadata: Metadata = {
  title: "CS GATE Study Tracker",
  description: "Track your PW CS GATE subjects, study sessions, revisions, and tests.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased"><TrackerTheme><TaskNotifications>{children}</TaskNotifications></TrackerTheme></body>
    </html>
  );
}
