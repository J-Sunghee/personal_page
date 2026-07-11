import { mkdir, writeFile } from "node:fs/promises";

const spreadsheetId = "16cKthM0zEP9aB20zW4lsaChjOZOxguEtb0JV3dzY3CU";
const sheets = [
  ["international", "국제학술지", "International Journal Articles", 1727872382],
  ["korean", "국내학술지", "Korean Journal Articles", 465731558],
  ["conference", "학술대회발표", "Conference Proceedings", 66624966],
  ["books", "저서·보고서", "Books & Reports", 1291132349],
  ["projects", "연구프로젝트", "Research Projects & Grants", 1063969295],
  ["awards", "수상", "Awards & Honors", 1919228762],
  ["service", "외부활동·보직", "Service & Activities", 1485924285],
  ["talks", "초청강연", "Invited Talks", 1182172629],
];

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted && char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); if (row.some(Boolean)) rows.push(row); row = []; cell = "";
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

async function loadSheet([id, title, english, gid]) {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${title}: ${response.status}`);
  const rows = parseCsv(await response.text());
  const headerIndex = id === "talks" ? 0 : rows.findIndex((row) => row[0] === "No" || row[0]?.endsWith(" No"));
  if (headerIndex < 0) throw new Error(`${title}: header not found`);
  const headers = rows[headerIndex].map((header, index) => id !== "talks" && index === 0 ? "No" : header);
  const records = rows.slice(headerIndex + 1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || ""]))).filter((row) => id === "talks" ? Boolean(row.주제 || row.제목) : Boolean(row.No));
  return { id, title, english, rows: records };
}

const sections = await Promise.all(sheets.map(loadSheet));
await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
await writeFile(new URL("../public/data/research.json", import.meta.url), JSON.stringify({ updatedAt: new Date().toISOString(), sections }, null, 2));
console.log(`Synced ${sections.reduce((sum, section) => sum + section.rows.length, 0)} records.`);
