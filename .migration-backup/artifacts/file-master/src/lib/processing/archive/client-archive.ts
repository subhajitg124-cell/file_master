import { zipSync, strToU8 } from 'fflate';

export async function runClientSideHtmlToZip(files: File[]): Promise<Blob> {
  const entries: Record<string, Uint8Array> = {};

  for (const file of files) {
    const buf = await file.arrayBuffer();
    entries[file.name] = new Uint8Array(buf);
  }

  if (Object.keys(entries).length === 0) {
    throw new Error('No files provided.');
  }

  const zipped = zipSync(entries, { level: 6 });
  return new Blob([zipped], { type: 'application/zip' });
}

export async function runClientSideInlineHtml(htmlFile: File, assetFiles: File[]): Promise<Blob> {
  let html = await htmlFile.text();

  for (const asset of assetFiles) {
    const name = asset.name;
    const buf = await asset.arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    const mime = asset.type || guessMime(name);

    if (mime.startsWith('text/css')) {
      html = html.replace(
        new RegExp(`(href=["'])([^"']*[\\/])?${escapeRe(name)}(["'])`, 'g'),
        (_, pre, _dir, suf) => `${pre}data:text/css;base64,${b64}${suf}`
      );
    } else if (mime.startsWith('text/javascript') || mime.startsWith('application/javascript')) {
      html = html.replace(
        new RegExp(`(src=["'])([^"']*[\\/])?${escapeRe(name)}(["'])`, 'g'),
        (_, pre, _dir, suf) => `${pre}data:text/javascript;base64,${b64}${suf}`
      );
    } else if (mime.startsWith('image/')) {
      html = html.replace(
        new RegExp(`(src=["'])([^"']*[\\/])?${escapeRe(name)}(["'])`, 'g'),
        (_, pre, _dir, suf) => `${pre}data:${mime};base64,${b64}${suf}`
      );
    }
  }

  const entries: Record<string, Uint8Array> = {
    [htmlFile.name]: strToU8(html),
  };

  const zipped = zipSync(entries, { level: 6 });
  return new Blob([zipped], { type: 'application/zip' });
}

function guessMime(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    css: 'text/css', js: 'text/javascript', mjs: 'text/javascript',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp',
    ico: 'image/x-icon', woff: 'font/woff', woff2: 'font/woff2',
  };
  return map[ext] || 'application/octet-stream';
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
