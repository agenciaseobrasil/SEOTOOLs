export const metadata = {
  title: "SEO URL Analyzer",
  description: "Analise uma URL para uma palavra-chave e gere um relatório público.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body style={{fontFamily:'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', margin:0}}>
        <div style={{maxWidth:960, margin:'0 auto', padding:'24px'}}>
          {children}
        </div>
      </body>
    </html>
  );
}
