// Client-side Office / markup processing

// ── Markdown → HTML ────────────────────────────────────────────────────────
export async function convertMdToHtml(file: File): Promise<Blob> {
  const { marked } = await import('marked');
  const text = await file.text();
  const body = await marked.parse(text);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Document</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.7;color:#222}
  h1,h2,h3,h4{margin-top:1.5em;border-bottom:1px solid #e5e7eb;padding-bottom:.3em}
  code{background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:.9em}
  pre code{display:block;padding:1em;overflow-x:auto}
  blockquote{margin:0;padding-left:1em;border-left:4px solid #d1d5db;color:#555}
  table{border-collapse:collapse;width:100%}
  th,td{border:1px solid #e5e7eb;padding:8px 12px;text-align:left}
  th{background:#f9fafb}
  img{max-width:100%}
  a{color:#6366f1}
</style>
</head>
<body>
${body}
</body>
</html>`;
  return new Blob([html], { type: 'text/html' });
}

// ── HTML → Markdown ────────────────────────────────────────────────────────
export async function convertHtmlToMd(file: File): Promise<Blob> {
  const TurndownService = (await import('turndown')).default;
  const html = await file.text();
  const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced' });
  const md = td.turndown(html);
  return new Blob([md], { type: 'text/markdown' });
}

// ── XLSX → CSV ─────────────────────────────────────────────────────────────
export async function convertXlsxToCsv(file: File): Promise<Blob> {
  const xlsx = await import('xlsx');
  const wb = xlsx.read(await file.arrayBuffer(), { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const csv = xlsx.utils.sheet_to_csv(ws);
  return new Blob([csv], { type: 'text/csv' });
}

// ── CSV → XLSX ─────────────────────────────────────────────────────────────
export async function convertCsvToXlsx(file: File): Promise<Blob> {
  const xlsx = await import('xlsx');
  const text = await file.text();
  const wb = xlsx.read(text, { type: 'string' });
  const buf = xlsx.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// ── DOCX cleanup ───────────────────────────────────────────────────────────
export async function cleanDocx(file: File): Promise<Blob> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const docFile = zip.file('word/document.xml');
  if (!docFile) throw new Error('Invalid DOCX file — missing word/document.xml.');
  let xml = await docFile.async('string');

  // Collapse runs of 3+ consecutive empty paragraphs down to 2
  const emptyParaPattern = /(<w:p(?:\s[^>]*)?>(?:<w:pPr>(?![\s\S]*?<w:numPr>)[\s\S]*?<\/w:pPr>)?\s*<\/w:p>\s*){3,}/g;
  xml = xml.replace(emptyParaPattern, (match) => {
    const single = match.match(/<w:p(?:\s[^>]*)?>(?:<w:pPr>[\s\S]*?<\/w:pPr>)?\s*<\/w:p>/)?.[0] ?? '';
    return single + single;
  });

  zip.file('word/document.xml', xml);
  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}
