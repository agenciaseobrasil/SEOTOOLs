import { NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const REPORT_DIR = '/tmp/reports';

async function ensureDir() {
  try { await fs.mkdir(REPORT_DIR, { recursive: true }); } catch {}
}

function cleanText(el) {
  return el.textContent?.replace(/\s+/g,' ').trim() || '';
}

function countWords(text) {
  if (!text) return 0;
  const m = text.toLowerCase().match(/\p{L}+/gu);
  return m ? m.length : 0;
}

function occurrences(text, term) {
  if (!text || !term) return 0;
  const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`, 'gi');
  return (text.match(re) || []).length;
}

function score(report){
  // pesos simples total ~100
  let s = 0;
  const inRange = (v, a, b) => v>=a && v<=b;
  if (report.titleHasKW) s+=12;
  if (report.h1HasKW) s+=10;
  if (report.urlHasKW) s+=6;
  if (report.metaDescriptionHasKW) s+=6;
  if (inRange(report.titleLength,45,65)) s+=8;
  if (inRange(report.metaDescriptionLength,120,170)) s+=6;
  if (report.wordCount>=500) s+=8;
  if (report.keywordDensity>=0.5 && report.keywordDensity<=2.5) s+=6;
  if (report.imagesMissingAlt===0) s+=6;
  if ((report.h2Count+report.h3Count)>0) s+=6;
  if (report.canonical) s+=6;
  if (!/(noindex|nofollow)/i.test(report.robotsMeta||'')) s+=4;
  if (report.schemaOrgPresent) s+=4;
  if (report.openGraphPresent) s+=4;
  if (report.linksInternos>=10) s+=6;
  if (report.linksExternos>=1) s+=4;
  const nofollowRate = report.linksExternos ? (report.linksNofollow/Math.max(1,report.linksExternos))*100 : 0;
  if (nofollowRate>=20 && nofollowRate<=90) s+=4;
  return Math.max(0, Math.min(100, Math.round(s)));
}

async function headOrGet(url, timeoutMs=8000){
  const controller = new AbortController();
  const to = setTimeout(()=>controller.abort(), timeoutMs);
  try {
    let res = await fetch(url, { method:'HEAD', redirect:'follow', signal: controller.signal });
    if (!res.ok || res.status>=400) {
      res = await fetch(url, { method:'GET', redirect:'follow', signal: controller.signal });
    }
    clearTimeout(to);
    return { status: res.status, ok: res.ok };
  } catch (e) {
    clearTimeout(to);
    return { status: 0, ok: false };
  }
}

export async function POST(req){
  try {
    const { url, keyword } = await req.json();
    if(!url || !keyword) return NextResponse.json({ ok:false, error:'Faltam parâmetros' }, { status:400 });

    const res = await fetch(url, { redirect:'follow' });
    const html = await res.text();
    const { window } = new JSDOM(html, { url });
    const { document } = window;

    const title = document.title || '';
    const metaDescEl = document.querySelector('meta[name="description"]');
    const metaDescription = metaDescEl ? (metaDescEl.getAttribute('content')||'') : '';
    const canonicalEl = document.querySelector('link[rel="canonical"]');
    const canonical = canonicalEl ? (canonicalEl.getAttribute('href')||'') : '';
    const robotsEl = document.querySelector('meta[name="robots"]');
    const robotsMeta = robotsEl ? (robotsEl.getAttribute('content')||'') : '';

    const h1Els = Array.from(document.querySelectorAll('h1'));
    const h2Els = Array.from(document.querySelectorAll('h2'));
    const h3Els = Array.from(document.querySelectorAll('h3'));
    const h1Text = h1Els.map(h=>cleanText(h)).join(' | ');
    const bodyText = document.body ? document.body.textContent||'' : '';
    const words = countWords(bodyText);
    const kwOcc = occurrences(bodyText, keyword);
    const density = words ? (kwOcc/words)*100 : 0;

    const imgNoAlt = document.querySelectorAll('img:not([alt]), img[alt=""]').length;

    const aEls = Array.from(document.querySelectorAll('a[href]'));
    const base = new URL(url);
    const links = aEls.map(a=>{
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return null;
      let abs;
      try { abs = new URL(href, base).href; } catch { return null; }
      const rel = (a.getAttribute('rel')||'').toLowerCase();
      return {
        anchor_text: (a.textContent||'').trim().slice(0,200),
        destino_href: abs,
        nofollow: rel.includes('nofollow'),
        ugc: rel.includes('ugc'),
        sponsored: rel.includes('sponsored'),
      };
    }).filter(Boolean);

    const host = new URL(url).hostname.replace(/^www\./,'');
    const uniqueHrefs = Array.from(new Set(links.map(l=>l.destino_href))).slice(0, 200);
    const statuses = new Map();
    for (const h of uniqueHrefs) {
      const r = await headOrGet(h);
      statuses.set(h, r);
    }

    const linksEnriquecidos = links.map(l => {
      const st = statuses.get(l.destino_href) || { status: '', ok: true };
      const destHost = new URL(l.destino_href).hostname.replace(/^www\./,'');
      const interno_externo = destHost === host ? 'interno' : 'externo';
      return { ...l, interno_externo, status_http: st.status || '', quebrado: st.ok ? false : true };
    });

    const report = {
      collectedAt: new Date().toISOString(),
      url,
      keyword,
      title,
      titleLength: title.length,
      titleHasKW: new RegExp(`\\b${keyword}\\b`, 'i').test(title),
      metaDescription,
      metaDescriptionLength: metaDescription.length,
      metaDescriptionHasKW: new RegExp(`\\b${keyword}\\b`, 'i').test(metaDescription),
      urlHasKW: new RegExp(`\\b${keyword}\\b`, 'i').test(url),
      h1Text,
      h1Count: h1Els.length,
      h1HasKW: new RegExp(`\\b${keyword}\\b`, 'i').test(h1Text),
      h2Count: h2Els.length,
      h3Count: h3Els.length,
      wordCount: words,
      keywordDensity: Number(density.toFixed(2)),
      imagesMissingAlt: imgNoAlt,
      canonical,
      robotsMeta,
      schemaOrgPresent: !!document.querySelector('[type="application/ld+json"]'),
      openGraphPresent: !!document.querySelector('meta[property^="og:"]'),
      twitterCardsPresent: !!document.querySelector('meta[name^="twitter:"]'),
    };

    // métricas agregadas de links
    const linksInternos = linksEnriquecidos.filter(l=>l.interno_externo==='interno').length;
    const linksExternos = linksEnriquecidos.filter(l=>l.interno_externo==='externo').length;
    const linksNofollow = linksEnriquecidos.filter(l=>l.nofollow).length;
    const linksQuebrados = linksEnriquecidos.filter(l=>l.quebrado).length;

    const finalReport = {
      ...report,
      linksInternos, linksExternos, linksNofollow, linksQuebrados
    };
    const scoreVal = score(finalReport);

    // recomendações simples
    const rec = [];
    if (!report.titleHasKW) rec.push('Inclua a palavra-chave no título (45–65 caracteres).');
    if (!report.h1HasKW) rec.push('Inclua a palavra-chave no H1.');
    if (!report.metaDescriptionHasKW) rec.push('Inclua a palavra-chave na meta description (120–170 caracteres).');
    if (report.wordCount < 800) rec.push('Amplie o conteúdo para pelo menos 800–1200 palavras.');
    if (report.keywordDensity < 0.5 || report.keywordDensity > 2.5) rec.push('Ajuste a densidade da palavra‑chave para ~0,5%–2,5%.');
    if (report.imagesMissingAlt > 0) rec.push('Adicione atributos ALT descritivos às imagens.');
    if (!report.canonical) rec.push('Defina uma tag canonical.');
    if (!report.openGraphPresent) rec.push('Implemente meta tags Open Graph.');
    if (linksQuebrados > 0) rec.push('Corrija links quebrados e revise redirecionamentos.');

    const resumoRow = [{
      data_analise: finalReport.collectedAt,
      url: finalReport.url,
      palavra_chave: finalReport.keyword,
      score_geral: scoreVal,
      titulo: finalReport.title,
      titulo_tem_palavra_chave: finalReport.titleHasKW,
      comprimento_titulo: finalReport.titleLength,
      meta_description: finalReport.metaDescription,
      meta_description_tem_palavra_chave: finalReport.metaDescriptionHasKW,
      comprimento_meta_description: finalReport.metaDescriptionLength,
      url_tem_palavra_chave: finalReport.urlHasKW,
      h1_texto: finalReport.h1Text,
      h1_qtd: finalReport.h1Count,
      h1_tem_palavra_chave: finalReport.h1HasKW,
      h2_qtd: finalReport.h2Count,
      h3_qtd: finalReport.h3Count,
      palavras_na_pagina: finalReport.wordCount,
      densidade_palavra_chave_percent: finalReport.keywordDensity,
      imagens_sem_alt: finalReport.imagesMissingAlt,
      canonical: finalReport.canonical,
      robots_meta: finalReport.robotsMeta,
      robots_txt_encontrado: '',
      sitemap_xml_encontrado: '',
      schema_org_presente: finalReport.schemaOrgPresent,
      open_graph_presente: finalReport.openGraphPresent,
      twitter_cards_presente: finalReport.twitterCardsPresent,
      links_internos: linksInternos,
      links_externos: linksExternos,
      links_nofollow: linksNofollow,
      links_quebrados: linksQuebrados,
      recomendacoes_top3: rec.slice(0,3).join(' | ')
    }];

    const payload = {
      report: {
        ...finalReport,
        score: scoreVal,
        recommendations: rec,
        csvResumo: resumoRow
      },
      links: linksEnriquecidos
    };

    await ensureDir();
    const id = randomUUID();
    const file = path.join(REPORT_DIR, `${id}.json`);
    await fs.writeFile(file, JSON.stringify(payload), 'utf-8');

    return NextResponse.json({ ok: true, reportId: id });
  } catch (e) {
    return NextResponse.json({ ok:false, error: String(e) }, { status: 500 });
  }
}
