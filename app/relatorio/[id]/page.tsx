'use client';
import { useEffect, useState } from 'react';

function DL({label, value}: {label: string, value: any}){
  return <div><b>{label}:</b> {value}</div>;
}

export default function ReportPage({ params }: { params: { id: string } }){
  const { id } = params;
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState('');

  useEffect(()=>{
    (async ()=>{
      try{
        const res = await fetch(`/api/relatorio/${id}`);
        const json = await res.json();
        if(!res.ok) throw new Error(json?.error || 'Falha ao carregar');
        setData(json);
      }catch(e: any){ setErr(String(e.message || e)); }
    })();
  },[id]);

  if(err) return <div className="card"><b>Erro:</b> {err}</div>;
  if(!data) return <div className="card">Carregando…</div>;

  const r = data.report;
  const links = data.links || [];

  function downloadCSV(){
    const headers = Object.keys(r.csvResumo[0] || {});
    const lines = [headers.join(',')];
    for(const row of r.csvResumo){
      lines.push(headers.map((h: string) => {
        const v = row[h] ?? ''; const s = String(v).replace(/"/g,'""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
      }).join(','));
    }
    const blob = new Blob([lines.join('\n')], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'seo_resumo.csv';
    a.click();

    if (links.length){
      const h2 = Object.keys(links[0]);
      const L = [h2.join(',')];
      for(const row of links){
        L.push(h2.map((h: string) => {
          const v = row[h] ?? ''; const s = String(v).replace(/"/g,'""');
          return /[",\n]/.test(s) ? `"${s}"` : s;
        }).join(','));
      }
      const blob2 = new Blob([L.join('\n')], {type:'text/csv'});
      const a2 = document.createElement('a');
      a2.href = URL.createObjectURL(blob2);
      a2.download = 'seo_links.csv';
      a2.click();
    }
  }

  return (
    <div>
      <div style={{display:'flex', alignItems:'center', gap:12}}>
        <div className="badge">Relatório público</div>
        <h1 style={{margin:0, fontSize:26}}>Score: {r.score}/100</h1>
      </div>
      <p style={{marginTop:8, color:'#444'}}><b>URL:</b> <a href={r.url} target="_blank">{r.url}</a> • <b>KW:</b> {r.keyword}</p>

      <div className="grid" style={{marginTop:12}}>
        <div className="kpi"><DL label="Título tem KW" value={String(r.titleHasKW)} /><DL label="H1 tem KW" value={String(r.h1HasKW)} /><DL label="URL tem KW" value={String(r.urlHasKW)} /></div>
        <div className="kpi"><DL label="Palavras na página" value={r.wordCount} /><DL label="Densidade (%)" value={r.keywordDensity} /><DL label="Imagens sem alt" value={r.imagesMissingAlt} /></div>
        <div className="kpi"><DL label="Links internos" value={r.linksInternos} /><DL label="Externos" value={r.linksExternos} /><DL label="Quebrados" value={r.linksQuebrados} /></div>
        <div className="kpi"><DL label="Canonical" value={r.canonical ? 'ok' : '—'} /><DL label="Open Graph" value={String(r.openGraphPresent)} /><DL label="Schema.org" value={String(r.schemaOrgPresent)} /></div>
      </div>

      <div className="card" style={{marginTop:16}}>
        <h3 style={{marginTop:0}}>Checklist priorizado</h3>
        <ul>
          {r.recommendations.map((it: string, i: number)=> <li key={i}>{it}</li>)}
        </ul>
      </div>

      <div className="card" style={{marginTop:16}}>
        <h3 style={{marginTop:0}}>Links (amostra)</h3>
        <div style={{overflowX:'auto'}}>
          <table>
            <thead><tr><th>Anchor</th><th>Destino</th><th>Nofollow</th><th>Status</th><th>Quebrado</th></tr></thead>
            <tbody>
              {links.slice(0,150).map((l: any, i: number)=>(
                <tr key={i}>
                  <td>{l.anchor_text}</td>
                  <td><a href={l.destino_href} target="_blank">{l.destino_href}</a></td>
                  <td>{String(l.nofollow)}</td>
                  <td>{l.status_http}</td>
                  <td>{String(l.quebrado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{display:'flex', gap:8, marginTop:16}}>
        <button onClick={downloadCSV}>Baixar CSVs</button>
        <button onClick={()=>navigator.clipboard.writeText(`<iframe src='${typeof window !== 'undefined' ? window.location.origin : ''}/relatorio/${id}' width='100%' height='800' style='border:0'></iframe>`) }>Copiar embed</button>
      </div>

      <div className="card" style={{marginTop:16}}>
        <b>Badge:</b>
        <pre>{`<a href="${typeof window !== 'undefined' ? window.location.href : ''}" rel="nofollow">Auditado por Agência SEO Brasil – Score ${r.score}/100</a>`}</pre>
      </div>
    </div>
  );
}
