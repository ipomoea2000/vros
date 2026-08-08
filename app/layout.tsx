import "./globals.css";
export const metadata = { title: "AROS 1.5", description: "Agentic Research Operating System" };
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}
