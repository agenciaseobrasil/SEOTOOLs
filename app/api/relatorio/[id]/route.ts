import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const REPORT_DIR = '/tmp/reports';

export async function GET(_req, { params }){
  try {
    const { id } = params;
    const file = path.join(REPORT_DIR, `${id}.json`);
    const buf = await fs.readFile(file, 'utf-8');
    const json = JSON.parse(buf);
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json({ error: 'Relatório não encontrado ou expirado.' }, { status: 404 });
  }
}
