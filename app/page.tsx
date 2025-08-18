'use client';
import { useState } from 'react';

export default function Page() {
  const [url, setUrl] = useState('');
  const [kw, setKw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!url || !kw) { setError('Informe a URL e a palavra‑chave.'); return; }
    try {
      setLoading(true);
      const res = await fetch('/api/analisar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, keyword: kw })
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Falha na análise');
      window.location.href = `/relatorio/${data.reportId}`;
    } catch (err: any) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 style={{fontSize:28, marginBottom:8}}>SEO URL Analyzer</h1>
      <p style={{color:'#444', marginTop:0}}>Gere um relatório público indexável com Score e checklist on‑page. </p>
      <form onSubmit={handleAnalyze} className="card" style={{marginTop:16}}>
        <label>URL</label>
        <input type="url" placeholder="https://exemplo.com/pagina" value={url} onChange={(e)=>setUrl(e.target.value)} />
        <label style={{marginTop:12}}>Palavra‑chave</label>
        <input type="text" placeholder="ex.: comprar tênis nike" value={kw} onChange={(e)=>setKw(e.target.value)} />
        <div style={{display:'flex', gap:8, marginTop:16}}>
          <button type="submit" disabled={loading}>{loading ? 'Analisando…' : 'Analisar'}</button>
          {error && <div style={{color:'#b00020', padding:'10px'}}>{error}</div>}
        </div>
      </form>
      <div style={{marginTop:24}} className="grid">
        <div className="kpi"><span className="badge">Como funciona?</span><p>Buscamos o HTML, analisamos elementos on‑page, checamos status de links e calculamos um Score 0–100.</p></div>
        <div className="kpi"><span className="badge">Link building</span><p>O relatório é público e oferece um <b>badge embutível</b> com link para esta página. Compartilhe!</p></div>
      </div>
    </div>
  );
}
