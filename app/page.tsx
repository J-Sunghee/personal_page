"use client";

import { useEffect, useMemo, useState } from "react";

type RecordRow = Record<string, string>;
type ResearchSection = { id: string; title: string; english: string; rows: RecordRow[] };
type ResearchData = { updatedAt: string; sections: ResearchSection[] };

const SPREADSHEET_ID = "16cKthM0zEP9aB20zW4lsaChjOZOxguEtb0JV3dzY3CU";
const SHEETS: Array<[string, string, string, number]> = [
  ["international", "국제학술지", "International Journal Articles", 1727872382],
  ["korean", "국내학술지", "Korean Journal Articles", 465731558],
  ["conference", "학술대회발표", "Conference Proceedings", 66624966],
  ["books", "저서·보고서", "Books & Reports", 1291132349],
  ["projects", "연구프로젝트", "Research Projects & Grants", 1063969295],
  ["awards", "수상", "Awards & Honors", 1919228762],
  ["service", "외부활동·보직", "Service & Activities", 1485924285],
  ["talks", "초청강연", "Invited Talks", 1182172629],
];

const fallbackData: ResearchData = {
  updatedAt: "2026-07-11T00:00:00.000Z",
  sections: [
    { id: "international", title: "국제학술지", english: "International Journal Articles", rows: [
      { 연도: "2026", 제목: "Investigating How Learners' Attitudes Shape AI-Supported Argumentative Writing Processes and Outcomes", 저자: "Jin, S. & Tai, A.", 학술지: "Journal of Computer Assisted Learning", "색인·지표": "SSCI · Q1 · IF 4.6" },
      { 연도: "2026", 제목: "Feedback Source and Target Matter: Students' Social-psychological Perceptions in Online Asynchronous Discussions", 저자: "Jin, S., Hoffman, D., Paek, S., Kim, T.", 학술지: "Educational Technology Research and Development", "색인·지표": "SSCI · Q1 · IF 4.2" },
      { 연도: "2026", 제목: "Questioning the Potential Role of AI as Collaborator", 저자: "Jung, Y. & Jin, S.*", 학술지: "Interactive Learning Environments", "색인·지표": "SSCI · Q1 · IF 5.3" },
    ] },
    { id: "korean", title: "국내학술지", english: "Korean Journal Articles", rows: [
      { 연도: "2026", 제목: "AI 디지털 교육자료 교사 대시보드 학습데이터 분석", 저자: "유미나, 진성희*, 김민지, 여승현", 학술지: "교육공학연구" },
      { 연도: "2026", 제목: "국가주도 디지털교육정책 맥락에서 초등학교에서의 AI 디지털 교육자료 수용과 활용 양상 탐색", 저자: "김수연, 정연지, 진성희*", 학술지: "교육정보미디어연구" },
      { 연도: "2026", 제목: "학교 수준 AI·디지털 교육자료 학습분석 지표 개발 및 내용타당도 검증", 저자: "김수연, 진성희*", 학술지: "교육정보미디어연구" },
    ] },
    { id: "conference", title: "학술대회발표", english: "Conference Proceedings", rows: [] },
    { id: "books", title: "저서·보고서", english: "Books & Reports", rows: [] },
    { id: "projects", title: "연구프로젝트", english: "Research Projects & Grants", rows: [] },
    { id: "awards", title: "수상", english: "Awards & Honors", rows: [] },
    { id: "service", title: "외부활동·보직", english: "Service & Activities", rows: [] },
    { id: "talks", title: "초청강연", english: "Invited Talks", rows: [] },
  ],
};

function primaryTitle(row: RecordRow) {
  return row.제목 || row.주제 || row.발표제목 || row.과제명 || row.수상명 || row["직위/역할"] || "연구 실적";
}

function secondaryText(row: RecordRow) {
  return [row.저자, row.학술지, row["학술대회·개최지·일자"], row["출판사/발행처"], row.지원기관, row.수여기관, row.기관]
    .filter(Boolean).join(" · ");
}

function paperLink(row: RecordRow, kind: "international" | "korean") {
  const raw = kind === "international"
    ? row["DOI/URL"] || row.DOI || row.doi
    : row["원문보기"] || row["원문 보기"] || row["원문URL"] || row.URL || row["DOI/URL"];
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return kind === "international" ? `https://doi.org/${raw.replace(/^doi:\s*/i, "")}` : raw;
}

type GvizResponse = {
  status: string;
  table?: {
    cols: Array<{ label?: string }>;
    rows: Array<{ c: Array<{ v?: string | number | null; f?: string | null } | null> }>;
  };
};

function fetchSheet([id, title, english, gid]: [string, string, string, number]): Promise<ResearchSection> {
  return new Promise((resolve, reject) => {
    const callback = `__jinSheet${gid}_${Date.now()}`;
    const host = window as unknown as Record<string, unknown>;
    const script = document.createElement("script");
    const cleanup = () => { delete host[callback]; script.remove(); };
    host[callback] = (payload: GvizResponse) => {
      if (payload.status !== "ok" || !payload.table) { cleanup(); reject(new Error(title)); return; }
      const headers = payload.table.cols.map((column, index) => id !== "talks" && index === 0 ? "No" : column.label || (id === "talks" && index === 0 ? "주제" : `column${index + 1}`));
      const rows = payload.table.rows.map((item) => Object.fromEntries(headers.map((header, index) => {
        const cell = item.c[index];
        return [header, String(cell?.f ?? cell?.v ?? "")];
      }))).filter((row) => id === "talks" ? Boolean(row.주제 || row.제목) : Boolean(row.No));
      cleanup(); resolve({ id, title, english, rows });
    };
    script.onerror = () => { cleanup(); reject(new Error(title)); };
    script.src = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?gid=${gid}&tqx=${encodeURIComponent(`out:json;responseHandler:${callback}`)}`;
    document.body.appendChild(script);
  });
}

export default function Home() {
  const currentYear = String(new Date().getFullYear());
  const [data, setData] = useState<ResearchData>(fallbackData);
  const [active, setActive] = useState("international");
  const [query, setQuery] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [talkQuery, setTalkQuery] = useState("");
  const [talkYear, setTalkYear] = useState(currentYear);
  const [talkLimit, setTalkLimit] = useState(12);
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "success" | "error">("idle");

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      try {
        const response = await fetch("./data/research.json");
        if (response.ok) {
          const next: ResearchData = await response.json();
          if (!cancelled && next?.sections?.length) setData(next);
        }
      } catch { /* 정적 백업 데이터 유지 */ }

      if (cancelled) return;
      setSyncState("syncing");
      try {
        const sections = await Promise.all(SHEETS.map(fetchSheet));
        if (!cancelled) {
          setData({ updatedAt: new Date().toISOString(), sections });
          setSyncState("success");
        }
      } catch {
        if (!cancelled) setSyncState("error");
      }
    };
    void loadData();
    return () => { cancelled = true; };
  }, []);

  const refreshFromGoogle = async () => {
    setSyncState("syncing");
    try {
      const sections = await Promise.all(SHEETS.map(fetchSheet));
      setData({ updatedAt: new Date().toISOString(), sections });
      setSyncState("success");
    } catch {
      setSyncState("error");
    }
  };

  const section = (id: string) => data.sections.find((item) => item.id === id);
  const activeSection = section(active) || data.sections[0];
  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ko");
    return normalized ? activeSection.rows.filter((row) => Object.values(row).join(" ").toLocaleLowerCase("ko").includes(normalized)) : activeSection.rows;
  }, [activeSection, query]);
  const internationalCurrent = (section("international")?.rows || []).filter((row) => row.연도 === currentYear);
  const koreanCurrent = (section("korean")?.rows || []).filter((row) => row.연도 === currentYear);
  const archiveSections = data.sections.filter((item) => item.id !== "talks");
  const total = archiveSections.reduce((sum, item) => sum + item.rows.length, 0);
  const count = (id: string) => section(id)?.rows.length || 0;
  const talkRows = section("talks")?.rows || [];
  const talkYears = Array.from(new Set(talkRows.map((row) => row.연도 || row.년도 || String(row.일자 || row.날짜 || "").slice(0, 4)).filter(Boolean))).sort((a, b) => b.localeCompare(a));
  const filteredTalks = talkRows.filter((row) => {
    const matchesYear = talkYear === "전체" || (row.연도 || row.년도 || String(row.일자 || row.날짜 || "").slice(0, 4)) === talkYear;
    const matchesQuery = !talkQuery.trim() || Object.values(row).join(" ").toLocaleLowerCase("ko").includes(talkQuery.trim().toLocaleLowerCase("ko"));
    return matchesYear && matchesQuery;
  });

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="홈으로 이동">진성희<span>(Jin, Sung-Hee) / EdTech</span></a>
        <nav aria-label="주요 메뉴"><a href="#bio">Bio</a><a href="#research">Research</a><a href="#archive">Archive</a><a href="#talks">Talks</a><a href="#contact">Contact</a></nav>
        <span className="header-role">Professor · Researcher</span>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Educator &amp; Researcher · Educational Technology</p>
          <h1>교육을 설계하고,<br />배움을<br /><em>연구합니다.</em></h1>
          <p className="hero-lead">교육공학 교수자이자 연구자로서 AI와 데이터를 활용한 교수학습의 가능성을 탐구합니다. 연구에서 발견한 지식을 수업과 교육 현장에 연결하며, 더 나은 배움의 경험을 설계합니다.</p>
          <div className="hero-actions"><a className="primary-button" href="#research">Explore research</a><a className="text-link" href="#bio">Read biography ↘</a></div>
        </div>
        <div className="portrait-wrap">
          <div className="portrait-note"><span>01</span> 진성희 · JIN, SUNG-HEE, Ph.D.</div>
          <img src="./profile.png" alt="진성희 교수 프로필 사진" />
          <div className="portrait-caption"><strong>AI for Education</strong><span>Learning Analytics · Instructional Design</span></div>
        </div>
      </section>

      <div className="ticker" aria-label="연구 키워드"><span>AI IN EDUCATION</span><i>·</i><span>LEARNING ANALYTICS</span><i>·</i><span>HUMAN–AI COLLABORATION</span><i>·</i><span>INSTRUCTIONAL DESIGN</span></div>

      <section className="about section" id="bio">
        <div className="bio-side"><div className="section-label"><span>02</span> Biography</div><p>Professor of Educational Technology<br />Hanbat National University<br />2025 — Present</p></div>
        <div className="about-copy"><h2>교실에서 시작해,<br />교육의 미래를 연구합니다.</h2><div className="bio-text"><p>진성희는 한밭대학교 교수이자 교육공학 연구자입니다. 초등교육, 컴퓨터교육, 교육공학으로 이어지는 학문적 배경을 바탕으로 기술과 데이터가 교수자와 학습자의 경험을 어떻게 확장할 수 있는지 탐구합니다.</p><p>AI in Education, Learning Analytics, Instructional Design을 중심으로 연구에서 발견한 근거를 대학과 학교 현장의 수업설계, 교육자료 개발, 평가와 피드백에 연결합니다.</p><p className="bio-english">Sung-Hee Jin is a professor and researcher in Educational Technology at Hanbat National University. Her work connects AI, learning analytics, and instructional design with evidence-based educational practice.</p></div><div className="bio-credentials"><article><span>Education</span><h3>Ph.D. in Education</h3><p>Educational Technology<br />Seoul National University</p></article><article><span>Academic Foundation</span><h3>M.A. · B.S.</h3><p>Computer Education, Seoul National University of Education<br />Elementary Education, Gyeongin National University of Education</p></article><article><span>Visiting Scholar</span><h3>Global Academic Experience</h3><p>Learning Design &amp; Technology, University of Hawaiʻi at Mānoa<br />Instructional Systems Technology, Indiana University</p></article></div><div className="bio-keywords"><span>AI in Education</span><span>Learning Analytics</span><span>Instructional Design</span></div></div>
      </section>

      <section className="career-bar" aria-label="주요 경력 지표">
        <div><strong>{count("international") + count("korean")}</strong><span>Journal articles</span></div><div><strong>{count("conference")}</strong><span>Conference presentations</span></div><div><strong>{count("projects")}</strong><span>Research projects</span></div><div><strong>{count("awards")}</strong><span>Awards & honors</span></div><p>Professor · Researcher · Educator<br /><b>AI in Education & Learning Analytics</b></p>
      </section>

      <section className="research section" id="research">
        <div className="section-heading"><div className="section-label"><span>03</span> Latest Research</div><h2>Now / {currentYear}</h2><p>{currentYear}년 국제·국내 학술지 실적을 모두 확인할 수 있습니다.</p></div>
        <div className="research-lane"><div className="lane-title"><span>International</span><h3>국제학술지</h3><b>{internationalCurrent.length}</b></div><div className="research-grid">{internationalCurrent.map((row, index) => { const link = paperLink(row, "international"); return <article className={index === 0 ? "research-card featured" : "research-card"} key={`${primaryTitle(row)}-${index}`}><div className="card-top"><span>International Journal</span><span>{row.연도}</span></div><h3>{primaryTitle(row)}</h3><p>{secondaryText(row)}</p><div className="paper-actions">{row["색인·지표"] && <span className="metric">{row["색인·지표"]}</span>}{link && <a className="paper-button" href={link} target="_blank" rel="noreferrer" aria-label={`${primaryTitle(row)} 논문 보기`}>논문 보기 ↗</a>}</div></article>; })}</div></div>
        <div className="research-lane domestic"><div className="lane-title"><span>Korean</span><h3>국내학술지</h3><b>{koreanCurrent.length}</b></div><div className="research-grid korean-grid">{koreanCurrent.map((row, index) => { const link = paperLink(row, "korean"); return <article className="research-card" key={`${primaryTitle(row)}-${index}`}><div className="card-top"><span>Korean Journal</span><span>{row.연도}</span></div><h3>{primaryTitle(row)}</h3><p>{secondaryText(row)}</p><div className="paper-actions">{link && <a className="paper-button" href={link} target="_blank" rel="noreferrer" aria-label={`${primaryTitle(row)} 논문 보기`}>논문 보기 ↗</a>}</div></article>; })}</div></div>
      </section>

      <section className="focus section">
        <div className="section-label"><span>04</span> Research Focus</div>
        <div className="focus-list">
          <article><span>01</span><h3>AI for Education</h3><p>Personalized learning, augmented teachers, AI services, human factors</p></article>
          <article><span>02</span><h3>Learning Analytics</h3><p>Online dashboards, learning data, adaptive feedback, data-driven decision-making</p></article>
          <article><span>03</span><h3>EdTech for Education</h3><p>Multidisciplinary education, K-12 education, higher education</p></article>
          <article><span>04</span><h3>Service Learning</h3><p>Instructional models, program design, community-connected learning</p></article>
          <article><span>05</span><h3>Creative Problem Solving</h3><p>Design Thinking, TRIZ, Engineering Design Process</p></article>
        </div>
      </section>

      <section className="archive section" id="archive">
        <div className="archive-intro"><div><div className="section-label"><span>05</span> Research Archive</div><h2>{total}<small> records</small></h2></div><div className="archive-note"><p>논문, 학술발표, 저서, 연구과제, 수상과 활동을 Google Sheet와 연결해 관리합니다. 분류를 선택하면 해당 목록이 아래에 펼쳐집니다.</p><button className="sync-button" onClick={refreshFromGoogle} disabled={syncState === "syncing"}>{syncState === "syncing" ? "Updating…" : syncState === "success" ? "Updated from Google Sheet ✓" : syncState === "error" ? "다시 업데이트" : "Google Sheet에서 업데이트"}</button></div></div>
        <div className="archive-browser"><div className="category-tabs" role="tablist" aria-label="연구 실적 분류">{archiveSections.map((item) => <button key={item.id} role="tab" aria-selected={archiveOpen && item.id === active} aria-expanded={archiveOpen && item.id === active} aria-controls="archive-records" onClick={() => { setActive(item.id); setQuery(""); setArchiveOpen(true); }}><span>{item.title}</span><b>{item.rows.length}</b><i>목록 보기 ↓</i></button>)}</div>{archiveOpen && <div className="records-panel" id="archive-records" role="tabpanel"><div className="records-head"><div><span>{activeSection.english}</span><h3>{activeSection.title}</h3></div><label><span className="sr-only">연구 실적 검색</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="키워드 검색" /></label></div><div className="records-list">{filteredRows.slice(0, 20).map((row, index) => <article key={`${primaryTitle(row)}-${index}`}><span className="record-year">{row.연도 || row.연월 || row.기간 || "—"}</span><div><h4>{primaryTitle(row)}</h4><p>{secondaryText(row)}</p></div><span className="record-no">{String(index + 1).padStart(2, "0")}</span></article>)}{!filteredRows.length && <p className="empty">검색 결과가 없습니다.</p>}</div></div>}</div>
      </section>

      <section className="talks section" id="talks">
        <div className="talks-heading">
          <div><div className="section-label"><span>06</span> Invited Talks</div><h2>초청강연 /<br /><em>{currentYear}</em></h2></div>
          <div className="talks-summary"><span>Selected themes · multiple institutions</span><p>하나의 강연 주제가 여러 대학과 기관에서 진행될 수 있어 횟수 대신 주제와 초청기관을 기록합니다.</p></div>
        </div>
        <div className="talks-tools">
          <div className="year-filters" aria-label="초청강연 연도 필터"><button className={talkYear === "전체" ? "active" : ""} onClick={() => { setTalkYear("전체"); setTalkLimit(12); }}>전체</button>{talkYears.map((year) => <button className={talkYear === year ? "active" : ""} key={year} onClick={() => { setTalkYear(year); setTalkLimit(12); }}>{year}</button>)}</div>
          <label><span className="sr-only">초청강연 검색</span><input value={talkQuery} onChange={(event) => { setTalkQuery(event.target.value); setTalkLimit(12); }} placeholder="주제 또는 기관 검색" /></label>
          <button className="talk-sync" onClick={refreshFromGoogle} disabled={syncState === "syncing"}>{syncState === "syncing" ? "업데이트 중…" : "목록 업데이트"}</button>
        </div>
        <div className="talk-list">
          {filteredTalks.slice(0, talkLimit).map((row, index) => <article key={`${primaryTitle(row)}-${index}`}>
            <div className="talk-date"><strong>{row.연도 || row.년도 || String(row.일자 || row.날짜 || "").slice(0, 4) || "—"}</strong><span>{row.일자 || row.날짜 || ""}</span></div>
            <div className="talk-content"><span>{row.유형 || row.구분 || "Invited Talk"}</span><h3>{primaryTitle(row)}</h3><p>{row.초청기관 || row.기관 || row.주관기관 || row.주최기관 || row.주최 || ""}</p></div>
          </article>)}
          {!talkRows.length && <div className="talk-empty"><strong>Invited Talks 기록을 기다리고 있습니다.</strong><p>Google Sheet의 ‘Invited Talks’ 탭에 강연을 입력하면 이곳에 자동으로 표시됩니다.</p></div>}
          {!!talkRows.length && !filteredTalks.length && <div className="talk-empty"><strong>검색 결과가 없습니다.</strong><p>다른 연도나 검색어를 선택해 주세요.</p></div>}
        </div>
        {filteredTalks.length > talkLimit && <button className="talk-more" onClick={() => setTalkLimit((current) => current + 12)}>강연 {Math.min(12, filteredTalks.length - talkLimit)}건 더 보기</button>}
      </section>

      <section className="collaborate section" id="contact"><div className="academic-label">Academic Collaboration</div><h2>교육의 변화를 함께 탐구하는<br /><em>학술적 대화</em>를 기다립니다.</h2><p>AI in Education · Learning Analytics · Instructional Design</p><div className="contact-links"><a href="mailto:shjin@hanbat.ac.kr">shjin@hanbat.ac.kr ↗</a><a href="https://scholar.google.com/citations?user=yp7yax8AAAAJ&hl=en" target="_blank" rel="noreferrer">Google Scholar ↗</a><a href="https://www.researchgate.net/profile/Sung-Hee-Jin-2?ev=hdr_xprf" target="_blank" rel="noreferrer">ResearchGate ↗</a></div></section>

      <footer><span>© 2026 Sung-Hee Jin</span><span>Educational Technology · Hanbat National University</span><a href="#top">Back to top ↑</a></footer>
    </main>
  );
}
