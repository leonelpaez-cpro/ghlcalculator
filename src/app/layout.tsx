
import "./globals.css";

export const metadata = {
  title: "The Hublab — Plans",
  description: "Builder y admin de planes/servicios",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}
