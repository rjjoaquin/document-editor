import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Papertrail — Document workspace",
  description: "Write, organize, and share your documents.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
