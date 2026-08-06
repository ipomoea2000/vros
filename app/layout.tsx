import "./globals.css";
export const metadata = { title: "VROS 2.1", description: "Villordon Research Operating System" };
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}
