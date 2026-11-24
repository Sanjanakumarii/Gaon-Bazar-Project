import "./globals.css";
export const metadata = {
  title: "Gaon Bazaar — Apne gaon ki dukaan, ab ghar tak",
  description:
    "Apne aas-paas ki dukaan se samaan mangwayein. Local dukandaar, seedhi delivery.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hi">
      <body>{children}</body>
    </html>
  );
}
