export const metadata = {
  title: "SEO URL Analyzer",
  description: "Analise uma URL para uma palavra-chave e gere um relatório público.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{fontFamily:'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', margin:0}}>
        <div style={{maxWidth:960, margin:'0 auto', padding:'24px'}}>
          {children}
        </div>
      </body>
    </html>
  );
}
