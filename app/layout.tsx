import type { Metadata } from "next";
import "../src/styles.css";

export const metadata: Metadata = {
  title: "WTUS Dashboard",
  description: "WTUS internal team dashboard",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
