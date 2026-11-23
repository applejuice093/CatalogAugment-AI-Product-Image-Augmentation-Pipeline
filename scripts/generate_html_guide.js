import fs from 'node:fs';
import path from 'node:path';

function mdToHtml(md) {
  const lines = md.split(/\r?\n/);
  let html = [];
  let inCode = false;
  let codeBuffer = [];
  let inTable = false;
  let tableHeaderParsed = false;
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Code block
    if (line.trim().startsWith('```')) {
      if (inCode) {
        html.push(`<pre class="code-block"><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`);
        codeBuffer = [];
        inCode = false;
      } else {
        if (inList) { html.push('</ul>'); inList = false; }
        if (inTable) { html.push('</tbody></table></div>'); inTable = false; }
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuffer.push(line);
      continue;
    }

    // Horizontal rule
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(line.trim())) {
      if (inList) { html.push('</ul>'); inList = false; }
      if (inTable) { html.push('</tbody></table></div>'); inTable = false; }
      html.push('<hr class="divider" />');
      continue;
    }

    // Table row
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      // Check if separator
      if (cells.every(c => /^:?-+:?$/.test(c))) {
        tableHeaderParsed = true;
        continue;
      }
      if (!inTable) {
        if (inList) { html.push('</ul>'); inList = false; }
        inTable = true;
        tableHeaderParsed = false;
        html.push('<div class="table-container"><table class="guide-table"><thead><tr>');
        cells.forEach(c => html.push(`<th>${formatInline(c)}</th>`));
        html.push('</tr></thead><tbody>');
      } else {
        html.push('<tr>');
        cells.forEach(c => html.push(`<td>${formatInline(c)}</td>`));
        html.push('</tr>');
      }
      continue;
    } else if (inTable) {
      html.push('</tbody></table></div>');
      inTable = false;
    }

    // Headers
    if (line.startsWith('# ')) {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push(`<h1 class="h1-title">${formatInline(line.substring(2))}</h1>`);
      continue;
    }
    if (line.startsWith('## ')) {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push(`<h2 class="h2-heading">${formatInline(line.substring(3))}</h2>`);
      continue;
    }
    if (line.startsWith('### ')) {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push(`<h3 class="h3-heading">${formatInline(line.substring(4))}</h3>`);
      continue;
    }
    if (line.startsWith('#### ')) {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push(`<h4 class="h4-heading">${formatInline(line.substring(5))}</h4>`);
      continue;
    }

    // Unordered List
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      if (!inList) {
        html.push('<ul class="list">');
        inList = true;
      }
      html.push(`<li>${formatInline(line.trim().substring(2))}</li>`);
      continue;
    } else if (inList && line.trim() === '') {
      html.push('</ul>');
      inList = false;
      continue;
    }

    // Images
    const imgMatch = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      if (inList) { html.push('</ul>'); inList = false; }
      const alt = imgMatch[1];
      const src = imgMatch[2];
      const absSrc = path.resolve(src).replace(/\\/g, '/');
      html.push(`
        <div class="figure-container">
          <img src="file:///${absSrc}" alt="${escapeHtml(alt)}" class="figure-img" />
          <div class="figure-caption">Figure: ${escapeHtml(alt)}</div>
        </div>
      `);
      continue;
    }

    // Paragraph
    if (line.trim().length > 0) {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push(`<p class="paragraph">${formatInline(line)}</p>`);
    }
  }

  if (inList) html.push('</ul>');
  if (inTable) html.push('</tbody></table></div>');

  return html.join('\n');
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatInline(text) {
  return text
    // bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // italic
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // inline code
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    // inline math
    .replace(/\$([^$]+)\$/g, '<span class="math font-mono">$1</span>');
}

const mdPath = path.resolve('USER_GUIDE.md');
const mdContent = fs.readFileSync(mdPath, 'utf8');
const bodyHtml = mdToHtml(mdContent);

const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CatalogAugment AI — Enterprise User & Operator Guide</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 15mm 15mm 15mm;
      @bottom-right {
        content: counter(page);
      }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1a1e26;
      background: #ffffff;
      line-height: 1.6;
      font-size: 11pt;
      margin: 0;
      padding: 0;
    }
    .h1-title {
      font-size: 22pt;
      color: #0b1320;
      border-bottom: 2px solid #d6e36a;
      padding-bottom: 6px;
      margin-top: 0;
      margin-bottom: 12px;
      page-break-after: avoid;
    }
    .h2-heading {
      font-size: 15pt;
      color: #0f172a;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-top: 24px;
      margin-bottom: 10px;
      page-break-after: avoid;
    }
    .h3-heading {
      font-size: 12pt;
      color: #1e293b;
      margin-top: 16px;
      margin-bottom: 8px;
      page-break-after: avoid;
    }
    .h4-heading {
      font-size: 11pt;
      color: #334155;
      margin-top: 12px;
      margin-bottom: 6px;
      page-break-after: avoid;
    }
    .paragraph {
      margin-top: 0;
      margin-bottom: 10px;
      text-align: justify;
    }
    .divider {
      border: 0;
      height: 1px;
      background: #e2e8f0;
      margin: 20px 0;
    }
    .list {
      margin-top: 0;
      margin-bottom: 12px;
      padding-left: 24px;
    }
    .list li {
      margin-bottom: 4px;
    }
    .inline-code {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
      font-size: 9.5pt;
      background: #f1f5f9;
      color: #0f172a;
      padding: 2px 5px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }
    .code-block {
      background: #0f172a;
      color: #e2e8f0;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 8.5pt;
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
      margin-bottom: 14px;
      page-break-inside: avoid;
      line-height: 1.4;
    }
    .table-container {
      margin-bottom: 14px;
      overflow-x: auto;
      page-break-inside: avoid;
    }
    .guide-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
      border: 1px solid #cbd5e1;
    }
    .guide-table th {
      background: #f8fafc;
      color: #0f172a;
      font-weight: 700;
      text-align: left;
      padding: 7px 10px;
      border: 1px solid #cbd5e1;
    }
    .guide-table td {
      padding: 6px 10px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
    }
    .guide-table tr:nth-child(even) {
      background: #f8fafc;
    }
    .figure-container {
      margin: 16px 0;
      text-align: center;
      page-break-inside: avoid;
    }
    .figure-img {
      max-width: 96%;
      max-height: 420px;
      object-fit: contain;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
    .figure-caption {
      font-size: 8.5pt;
      color: #64748b;
      margin-top: 5px;
      font-style: italic;
    }
    .math {
      font-style: italic;
      color: #0369a1;
    }
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;

const outPath = path.resolve('docs/user_guide_printable.html');
fs.writeFileSync(outPath, fullHtml, 'utf8');
console.log('Saved printable HTML to:', outPath);
