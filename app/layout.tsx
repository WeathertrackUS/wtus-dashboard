import type { Metadata } from "next";
import { Providers } from "./providers";
import "../src/styles.css";

export const metadata: Metadata = {
  title: "WTUS Dashboard",
  description: "WTUS internal team dashboard",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
