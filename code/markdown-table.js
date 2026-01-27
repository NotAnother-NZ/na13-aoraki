(function () {
  if (window.__rtMarkdownTableReplaceFix) return;
  window.__rtMarkdownTableReplaceFix = true;

  function textFrom(el) {
    return (el.textContent || "").replace(/\u00A0/g, " ").trim();
  }

  function normalizeInline(md) {
    let s = md
      .replace(/\r?\n/g, " ")
      .replace(/\s{2,}/g, "  ")
      .trim();
    s = s.replace(/\*\*/g, "");
    s = s.replace(/\|\|\s*/g, "\n| ");
    s = s.replace(/---/g, "\n---\n");
    s = s.replace(/\s+\n/g, "\n");
    return s.trim();
  }

  function splitSections(md) {
    const first = md.indexOf("\n---\n");
    const last = md.lastIndexOf("\n---\n");
    if (first === -1) return { head: md.trim(), table: "", foot: "" };
    const head = md.slice(0, first).trim();
    if (last === first)
      return { head, table: md.slice(first + 5).trim(), foot: "" };
    const table = md.slice(first + 5, last).trim();
    const foot = md.slice(last + 5).trim();
    return { head, table, foot };
  }

  function formatHeadingDynamic(head) {
    const cleaned = head
      .replace(/\s{2,}/g, "<br>")
      .replace(/\s*\n\s*/g, "<br>")
      .trim();
    return cleaned;
  }

  function cleanRow(row) {
    return row.trim().replace(/^\|/, "").replace(/\|$/, "");
  }

  function isAlignmentCell(c) {
    return /^:?-{2,}:?$/.test(c.trim());
  }

  function isEmptyRow(cells) {
    return !cells.length || cells.every((c) => !c || /^\s*$/.test(c));
  }

  function parseTable(md) {
    const lines = md
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((l) => l.startsWith("|"));
    const rows = lines.map((l) =>
      cleanRow(l)
        .split("|")
        .map((c) => c.trim())
    );
    if (!rows.length) return null;
    const filtered = rows.filter((r) => {
      if (!r.length) return false;
      const allAlign = r.length > 0 && r.every(isAlignmentCell);
      return !allAlign;
    });
    if (!filtered.length) return null;
    const header = filtered[0];
    const body = filtered.slice(1);
    return { header, body };
  }

  function isSubLabel(s) {
    return /^[-–—]\s*/.test(s || "");
  }

  function normalizeLabel(s, isSub) {
    const t = (s || "").replace(/^[-–—]\s*/, "").trim();
    return isSub ? "- " + t : t;
  }

  function groupBodyRows(body) {
    const groups = [];
    let current = null;
    for (const row of body) {
      if (isEmptyRow(row)) {
        if (current) {
          groups.push(current);
          current = null;
        }
        continue;
      }
      const label = (row[0] || "").trim();
      const serves = row.slice(1).map((v) => (v || "").trim());
      if (!current) {
        current = { labels: [], serves: [] };
        for (let i = 0; i < serves.length; i++) current.serves.push([]);
      }
      const sub = isSubLabel(label) || (current.labels.length > 0 && !label);
      const labelText = label ? normalizeLabel(label, sub) : "";
      if (labelText) current.labels.push(labelText);
      for (let i = 0; i < current.serves.length; i++) {
        const v = serves[i] || "";
        if (labelText) current.serves[i].push(v);
        else {
          if (!current.serves[i].length) current.serves[i].push(v);
          else current.serves[i][current.serves[i].length - 1] = v;
        }
      }
    }
    if (current) groups.push(current);
    return groups;
  }

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function joinLines(lines) {
    return (lines && lines.length ? lines : [""]).map(esc).join("<br>");
  }

  function buildHTML(markdown) {
    const normalized = normalizeInline(markdown);
    const { head, table, foot } = splitSections(normalized);
    const headingHTML = formatHeadingDynamic(head);
    const parsed = parseTable(table);
    if (!parsed) return "";
    const header = parsed.header;
    const body = parsed.body;
    const labelHeader = header[0] || "";
    const serveHeaders = header.slice(1);
    const serveCount = Math.max(1, serveHeaders.length);
    const groups = groupBodyRows(body);
    const theadCells = [
      '<th class="label title9-2">' + esc(labelHeader) + "</th>",
      ...serveHeaders.map(
        (h) => '<th class="serve title9-1">' + esc(h) + "</th>"
      ),
    ].join("");
    const tbodyRows = groups
      .map((g) => {
        const labelCell =
          '<td class="label title9-1">' + joinLines(g.labels) + "</td>";
        const serveCells = g.serves
          .map(
            (col) => '<td class="serve title9-1">' + joinLines(col) + "</td>"
          )
          .join("");
        return "<tr>" + labelCell + serveCells + "</tr>";
      })
      .join("");
    const noteHTML = foot
      ? '<p class="title9-1" data-text-trim data-opacity-60>' +
        esc(foot.replace(/\s+/g, " ").trim()) +
        "</p>"
      : "";
    const figure =
      '<figure class="markdown-table" data-text-trim>\
    <div class="table-heading" data-text-trim>\
      <p class="title9-2" data-text-trim>' +
      headingHTML +
      '</p>\
    </div>\
    <hr class="table-divider" data-text-trim>\
    <table style="--label-col-width: 40%; --serve-col-count: ' +
      serveCount +
      ';">\
      <thead><tr>' +
      theadCells +
      "</tr></thead>\
      <tbody>" +
      tbodyRows +
      '</tbody>\
    </table>\
    <hr class="table-divider" data-text-trim>\
    ' +
      noteHTML +
      "\
  </figure>\
  <style>\
  .markdown-table table{width:100%;table-layout:fixed;border-collapse:separate;border-spacing:0}\
  .markdown-table thead th,.markdown-table tbody td{padding:.875rem 0;vertical-align:top}\
  .markdown-table thead th.label,.markdown-table thead th.serve{padding-top:0}\
  .markdown-table thead th{border-bottom:.0625rem solid rgba(0,0,0,.12);text-align:left}\
  .markdown-table th.label,.markdown-table td.label{width:var(--label-col-width,40%);text-align:left}\
  .markdown-table th.serve,.markdown-table td.serve{width:calc((100% - var(--label-col-width,40%))/var(--serve-col-count,2));text-align:right;white-space:nowrap}\
  .table-divider{border:none;border-top:.0625rem solid rgba(0,0,0,.12);margin:0 0 1rem 0}\
  @media (max-width:40rem){.markdown-table table{--label-col-width:45%}}\
  </style>";
    return figure;
  }

  function replaceAtPosition(el, html) {
    el.insertAdjacentHTML("beforebegin", html);
    el.remove();
  }

  function run() {
    const nodes = document.querySelectorAll("[data-markdown-table]");
    if (!nodes.length) return;
    nodes.forEach((el) => {
      const md = textFrom(el);
      const html = buildHTML(md);
      if (html) replaceAtPosition(el, html);
    });
  }

  if (document.readyState === "complete") run();
  else window.addEventListener("load", run, { once: true });
})();
