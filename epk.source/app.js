/* global React, ReactDOM */
const { useState, useEffect, useRef, useMemo } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#D4FF3A",
  "grain": true,
  "duotone": false,
  "showAnnotations": true
}/*EDITMODE-END*/;

// ─── i18n: language-dependent copy ───────────────────────────────────────────
// Edit translations here. Keys must match between `en` and `de`.
// Override at runtime with ?lang=de or ?lang=en for testing.
const COPY = {
  en: {
    runner:  { kit: "ELECTRONIC PRESS KIT · v.05 / 2026", booking: "BOOKING / LABELS" },
    hero:    { videoTitle: "KöTTBULLAR LIVE",
               style: "Style", fyfa: "For fans of", liveVideo: "Live Video",
               hometown: "Munich, DE",
               shortBio: "Indie / punk / power-pop quartet" },
    roles:   { vocals: "Vocals", guitar: "Guitar", bass: "Bass", drums: "Drums" },
    bio:     { label: "Bio", lineup: "The Lineup", est: "EST. 2021 · ACTIVE",
               line1: "HOOKS", line2: "NOISE", line3: "FEELINGS.",
               paragraph:
                 "KÖTTBULLAR is an indie rock band driven by melodic hooks, raw energy, and " +
                 "emotionally direct songwriting. Their sound moves between punchy guitar-led " +
                 "intensity and more vulnerable, narrative-driven moments, balancing distortion, " +
                 "tension, and melody without losing immediacy. Focused on high-energy live shows, " +
                 "the band builds sets around momentum, contrast, and emotional release. Their " +
                 "songs are short, direct, and catchy." },
    release: { label: "Spotlight Release", line1: "THE FIVE", line2: "Stages Of",
               coverAlt: "The Five Stages Of cover",
               handwriting: "handwriting by Alina ✱",
               tracklist: "Tracklist",
               listen: "▶ LISTEN ON ALL DSPS",
               story:
                 "Breaking up with a friend can cut deeper than expected. For KöTTBULLAR, that " +
                 "rupture became the emotional core of The Five Stages Of — an album born from " +
                 "personal loss, unanswered questions, and the slow process of letting go. Built " +
                 "around the five stages of grief — Denial, Anger, Bargaining, Depression, and " +
                 "Acceptance — each track becomes its own chapter, with a distinct sound, mood, " +
                 "and emotional weight." },
    shows:   { label: "Coming Up", heading: "SHOWS",
               // Build-time injection from Bandsintown (see scripts/bundle_epk.py).
               // The literal between the markers is a fallback for offline builds.
               list: /*EPK_SHOWS_EN_BEGIN*/[
                 { date: "25 Jul 2026", venue: "Kulturspektakel Gauting 2026", city: "Gauting, DE", note: "free entry" },
               ]/*EPK_SHOWS_EN_END*/ },
    contact: { label: "Booking & Contact",
               line1: "BOOK US.", line2: "PROMISE", line3: "IT'S LOUD.",
               booking: "Booking", instagram: "Instagram",
               labelLine: "Label", labelValue: "self-released" },
  },
  de: {
    runner:  { kit: "ELECTRONIC PRESS KIT · v.05 / 2026", booking: "BOOKING / LABELS" },
    hero:    { videoTitle: "KöTTBULLAR LIVE",
               style: "Stil", fyfa: "Für Fans von", liveVideo: "Live-Video",
               hometown: "München, DE",
               shortBio: "Indie / Punk / Power-Pop-Quartett" },
    roles:   { vocals: "Gesang", guitar: "Gitarre", bass: "Bass", drums: "Schlagzeug" },
    bio:     { label: "Bio", lineup: "Die Besetzung", est: "GEGR. 2021 · AKTIV",
               line1: "HOOKS", line2: "NOISE", line3: "FEELINGS.",
               paragraph:
                 "KÖTTBULLAR ist eine Indie-Rock-Band, getrieben von melodischen Hooks, roher " +
                 "Energie und emotional direktem Songwriting. Ihr Sound bewegt sich zwischen " +
                 "druckvoller, gitarrenlastiger Intensität und verletzlicheren, erzählerischen " +
                 "Momenten — er balanciert Verzerrung, Spannung und Melodie, ohne an " +
                 "Unmittelbarkeit zu verlieren. Mit Fokus auf energiegeladene Live-Shows baut " +
                 "die Band ihre Sets um Momentum, Kontrast und emotionale Entladung. Ihre Songs " +
                 "sind kurz, direkt und eingängig." },
    release: { label: "Aktuelle Veröffentlichung", line1: "THE FIVE", line2: "Stages Of",
               coverAlt: "Cover von The Five Stages Of",
               handwriting: "Handschrift von Alina ✱",
               tracklist: "Trackliste",
               listen: "▶ AUF ALLEN DSPS HÖREN",
               story:
                 "Eine Freundschaft zu beenden kann tiefer schneiden als gedacht. Für KöTTBULLAR " +
                 "wurde dieser Bruch zum emotionalen Kern von The Five Stages Of — einem Album, " +
                 "das aus persönlichem Verlust, unbeantworteten Fragen und dem langsamen Loslassen " +
                 "entstand. Aufgebaut um die fünf Phasen der Trauer — Verleugnung, Wut, Verhandeln, " +
                 "Depression und Akzeptanz — wird jeder Track zu einem eigenen Kapitel, mit eigenem " +
                 "Sound, eigener Stimmung und eigenem emotionalen Gewicht." },
    shows:   { label: "Demnächst", heading: "SHOWS",
               list: /*EPK_SHOWS_DE_BEGIN*/[
                 { date: "25. Juli 2026", venue: "Kulturspektakel Gauting 2026", city: "Gauting, DE", note: "Eintritt frei" },
               ]/*EPK_SHOWS_DE_END*/ },
    contact: { label: "Booking & Kontakt",
               line1: "BUCHT UNS.", line2: "VERSPROCHEN", line3: "ES WIRD LAUT.",
               booking: "Booking", instagram: "Instagram",
               labelLine: "Label", labelValue: "Eigenverlag" },
  },
};

// ?lang=de|en overrides browser preference; German for de-*, English otherwise.
const LANG = (() => {
  const url = new URLSearchParams(location.search).get("lang");
  if (url === "de" || url === "en") return url;
  const browser = (navigator.languages && navigator.languages[0]) || navigator.language || "en";
  return browser.toLowerCase().startsWith("de") ? "de" : "en";
})();
const T = COPY[LANG];
document.documentElement.lang = LANG;

// ─── Language-independent shared data ────────────────────────────────────────
const BAND = {
  name: "KÖTTBULLAR",
  members: [
    { name: "Alina",    roleKey: "vocals" },
    { name: "Viktor",   roleKey: "guitar" },
    { name: "Liliia",   roleKey: "bass" },
    { name: "Yaroslav", roleKey: "drums" },
  ],
  fyfa: ["Wolf Alice", "Pixies", "The Beths"],
  liveVideo: { label: "Emergenza Festival", url: "https://www.youtube.com/watch?v=npWC8EbQYCg" },
  releases: [
    { title: "The Five Stages Of", date: "28 Nov 2025", kind: "EP", cover: window.__resources.coverEp, url: "https://onerpm.link/225132004305", catNo: "KB-005" },
  ],
  contact: {
    booking: "koettbullar.music@gmail.com",
    site:    "kottbullarmusic.github.io",
    ig:      "kottbullar.music",
    igUrl:   "https://www.instagram.com/kottbullar.music",
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const Grain = ({ on }) => on ? (
  <svg className="grain" aria-hidden="true">
    <filter id="n">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.45 0"/>
    </filter>
    <rect width="100%" height="100%" filter="url(#n)"/>
  </svg>
) : null;

const Photo = ({ src, alt, duotone, accent, style, className }) => {
  // Duotone uses accent + black; otherwise leave the b&w original alone.
  const filt = duotone
    ? { filter: "grayscale(1) contrast(1.05)" }
    : {};
  return (
    <div className={`photo ${className || ""}`} style={{ position: "relative", overflow: "hidden", ...style }}>
      <img src={src} alt={alt} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", ...filt }}/>
      {duotone && (
        <div style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(180deg, ${accent}, #000)`,
          mixBlendMode: "lighten", opacity: 0.55, pointerEvents: "none",
        }}/>
      )}
      {duotone && (
        <div style={{
          position: "absolute", inset: 0,
          background: accent, mixBlendMode: "multiply", opacity: 0.85, pointerEvents: "none",
        }}/>
      )}
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// VARIATION A — VINYL LINER (indie nostalgic)
// ═════════════════════════════════════════════════════════════════════════════
function VinylVariant({ accent, grain, duotone, showAnnotations }) {
  const css = `
    .v1 {
      --bg: #0a0a09;
      --ink: #e9e7df;
      --mute: #9a978c;
      --line: rgba(233,231,223,.16);
      --accent: ${accent};
      background: var(--bg);
      color: var(--ink);
      font-family: "Space Grotesk", "Helvetica Neue", Helvetica, Arial, sans-serif;
      font-feature-settings: "ss01","ss02";
    }
    .v1 .mono { font-family: "JetBrains Mono", ui-monospace, "SF Mono", monospace; font-size: 11px; letter-spacing: .04em; text-transform: uppercase; color: var(--mute); }
    .v1 .display { font-family: "Anton", "Bebas Neue", "Helvetica Neue", sans-serif; font-weight: 400; letter-spacing: -.005em; line-height: .98; text-transform: uppercase; }
    .v1 .rule { border-top: 1px solid var(--line); }
    .v1 .ruleAcc { border-top: 1px solid var(--accent); }
    .v1 .accent { color: var(--accent); }
    .v1 .chip { display:inline-flex; align-items:center; gap:6px; padding:4px 8px; border:1px solid var(--line); border-radius:999px; font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:var(--mute); font-family:"JetBrains Mono", monospace;}
    .v1 .chip.dot::before{ content:""; width:6px; height:6px; border-radius:50%; background:var(--accent);}
    .v1 a { color: inherit; }
    .v1 .stamp{ display:inline-block; padding:6px 10px; border:1px solid var(--accent); color:var(--accent); font-family:"JetBrains Mono", monospace; font-size:10px; letter-spacing:.16em; text-transform:uppercase; transform: rotate(-2deg);}
    .v1 .annot{ font-family:"Caveat","Comic Sans MS", cursive; color: var(--accent); font-size: 22px; line-height:1; transform: rotate(-3deg); }
    .v1 .scratch { background-image: repeating-linear-gradient(45deg, transparent 0 6px, rgba(255,255,255,.04) 6px 7px); }
    .v1 .matrix { background-image:
      linear-gradient(var(--line) 1px, transparent 1px),
      linear-gradient(90deg, var(--line) 1px, transparent 1px);
      background-size: 24px 24px; background-position: -1px -1px;
    }
    .v1 .fivebar { display:flex; gap:4px; }
    .v1 .fivebar > i { display:block; height:10px; background:var(--accent); border-radius:1px; }
    .grain{position:fixed; inset:0; pointer-events:none; z-index:9999; mix-blend-mode:overlay; opacity:.55}
    @keyframes ticker { from{transform:translateX(0)} to{transform:translateX(-50%)} }

    /* Named-area grids — keep desktop layout while letting mobile reorder. */
    .v1 .bio-grid {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      grid-template-areas: "text headline" "lineup headline";
      gap: 56px;
    }
    .v1 .bio-text     { grid-area: text; }
    .v1 .bio-headline { grid-area: headline; }
    .v1 .bio-lineup   { grid-area: lineup; }

    .v1 .release-grid {
      display: grid;
      grid-template-columns: 1fr 1.4fr;
      grid-template-areas: "cover headline" "cover meta";
      gap: 56px;
      align-items: start;
    }
    .v1 .release-headline { grid-area: headline; }
    .v1 .release-cover    { grid-area: cover; }
    .v1 .release-meta     { grid-area: meta; }

    .v1 .shows-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      grid-template-areas: "list headline";
      gap: 56px;
      align-items: start;
    }
    .v1 .shows-list     { grid-area: list; }
    .v1 .shows-headline { grid-area: headline; }

    /* Mobile: collapse two-column grids, scale display type, tighten padding. */
    @media (max-width: 760px) {
      .v1 .pad      { padding-left: 16px !important; padding-right: 16px !important; }
      .v1 .pad-y    { padding-top: 36px !important; padding-bottom: 36px !important; }
      .v1 .runner   { flex-direction: column; align-items: flex-start; gap: 6px; }
      .v1 .grid-2   { grid-template-columns: 1fr !important; gap: 28px !important; }
      .v1 .grid-end { align-items: start !important; }
      .v1 .members  { grid-template-columns: repeat(2, 1fr) !important; }
      .v1 .show-row { grid-template-columns: auto 1fr !important; row-gap: 4px !important; column-gap: 12px !important; }
      .v1 .show-row .show-note { grid-column: 1 / -1; justify-self: start; }
      .v1 .right-md { text-align: left !important; }
      .v1 .display-lg { font-size: 48px !important; line-height: 0.95 !important; }
      .v1 .display-xl { font-size: 56px !important; line-height: 0.9 !important; }
      .v1 .display-xxl { font-size: 64px !important; line-height: 0.9 !important; }
      .v1 .bio-drop  { font-size: 48px !important; }
      .v1 .stages-h  { font-size: 56px !important; }
      .v1 .ep-cover { max-width: 320px; }

      .v1 .bio-grid {
        grid-template-columns: 1fr;
        grid-template-areas: "headline" "text" "lineup";
        gap: 28px;
      }
      .v1 .release-grid {
        grid-template-columns: 1fr;
        grid-template-areas: "headline" "cover" "meta";
        gap: 24px;
      }
      .v1 .shows-grid {
        grid-template-columns: 1fr;
        grid-template-areas: "headline" "list";
        gap: 24px;
      }
    }
  `;

  return (
    <div className="v1" style={{ position: "relative" }}>
      <style>{css}</style>
      <Grain on={grain} />

      {/* Top runner */}
      <div style={{ borderBottom: "1px solid var(--line)" }}>
        <div className="pad runner" style={{ maxWidth: 1280, margin: "0 auto", padding: "14px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="mono">{BAND.name} · {T.runner.kit}</div>
          <div className="mono" style={{ display: "flex", gap: 18 }}>
            <span>{T.hero.hometown}</span>
            <span className="accent">●</span>
            <span>{T.runner.booking}</span>
          </div>
        </div>
      </div>

      {/* HERO */}
      <section style={{ borderBottom: "1px solid var(--line)" }}>
        <div className="pad pad-y grid-2" style={{ maxWidth: 1280, margin: "0 auto", padding: "44px 32px 56px", display: "grid", gridTemplateColumns: "1.36fr 1fr", gap: 48, alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <div style={{ position: "relative", aspectRatio: "560 / 315", border: "1px solid var(--line)", overflow: "hidden", background: "#000" }}>
              <iframe
                src="https://www.youtube-nocookie.com/embed/T_eKWe5TkXg?controls=0&rel=0&modestbranding=1"
                title={T.hero.videoTitle}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 24, rowGap: 10 }}>
              <div className="mono">{T.hero.style}</div><div>{T.hero.shortBio}</div>
              <div className="mono">{T.hero.fyfa}</div><div>{BAND.fyfa.join(" · ")}</div>
              <div className="mono">{T.hero.liveVideo}</div>
              <div>
                <a href={BAND.liveVideo.url} target="_blank" rel="noopener" style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>
                  {BAND.liveVideo.label}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BIO */}
      <section style={{ borderBottom: "1px solid var(--line)" }} className="matrix">
        <div className="pad pad-y bio-grid" style={{ maxWidth: 1280, margin: "0 auto", padding: "64px 32px" }}>
          <div className="bio-text" style={{ fontSize: 18, lineHeight: 1.6 }}>
            <p style={{ margin: 0 }}>
              <span className="display bio-drop" style={{ fontSize: 64, float: "left", lineHeight: .8, marginRight: 10, marginTop: 8, color: "var(--accent)" }}>K</span>
              {T.bio.paragraph}
            </p>
          </div>
          <div className="bio-headline">
            <div className="mono" style={{ marginBottom: 18 }}>{T.bio.label}</div>
            <div className="display display-xl" style={{ fontSize: 80, lineHeight: .85, color: "var(--ink)" }}>
              {T.bio.line1}<br/>{T.bio.line2}<br/><span className="accent">{T.bio.line3}</span>
            </div>
            <div className="mono" style={{ marginTop: 18 }}>{T.bio.est}</div>
          </div>
          <div className="bio-lineup">
            <div className="rule" style={{ margin: "0 0 16px" }}/>
            <div className="mono" style={{ marginBottom: 10 }}>{T.bio.lineup}</div>
            <div className="members" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
              {BAND.members.map(m => (
                <div key={m.name} style={{ borderTop: "1px solid var(--accent)", paddingTop: 10 }}>
                  <div style={{ fontSize: 22, letterSpacing: -.01 }}>{m.name}</div>
                  <div className="mono">{T.roles[m.roleKey]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* RELEASE SPOTLIGHT */}
      <section style={{ borderBottom: "1px solid var(--line)" }}>
        <div className="pad pad-y" style={{ maxWidth: 1280, margin: "0 auto", padding: "64px 32px" }}>
          <div className="mono" style={{ marginBottom: 28 }}>{T.release.label}</div>
          <div className="release-grid">
            <h2 className="release-headline display stages-h" style={{ fontSize: "clamp(56px, 6vw, 92px)", margin: 0 }}>
              {T.release.line1}<br/>
              <span className="accent" style={{ fontStyle: "italic", fontFamily: "'Caveat', cursive", fontWeight: 700, letterSpacing: 0, textTransform: "none" }}>{T.release.line2}</span>
            </h2>
            <div className="release-cover ep-cover">
              <div style={{ position: "relative" }}>
                <Photo src={window.__resources.coverEp} alt={T.release.coverAlt}
                  style={{ aspectRatio: "1/1", border: "1px solid var(--line)" }}/>
                {showAnnotations && (
                  <div className="annot" style={{ position: "absolute", bottom: -22, left: 8 }}>
                    {T.release.handwriting}
                  </div>
                )}
              </div>
            </div>

            <div className="release-meta">
              <p style={{ fontSize: 18, lineHeight: 1.55, color: "var(--ink)", marginTop: 24, maxWidth: 620 }}>{T.release.story}</p>

              <div className="rule" style={{ margin: "28px 0 16px" }}/>
              <div className="mono" style={{ marginBottom: 8 }}>{T.release.tracklist}</div>
              <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {["Denial","Anger","Bargaining","Depression","Acceptance"].map((track, i) => (
                  <li key={track} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                    <span className="mono" style={{ color: "var(--accent)" }}>{String(i+1).padStart(2,"0")}</span>
                    <span style={{ fontSize: 17 }}>{track}</span>
                    <span className="mono">{["3:14","2:48","3:21","4:02","3:38"][i]}</span>
                  </li>
                ))}
              </ol>

              <div style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a href={BAND.releases[0].url} className="chip dot" style={{ borderColor: "var(--accent)", color: "var(--ink)", padding: "10px 16px", fontSize: 12 }}>
                  {T.release.listen}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SHOWS */}
      <section style={{ borderBottom: "1px solid var(--line)" }}>
        <div className="pad pad-y" style={{ maxWidth: 1280, margin: "0 auto", padding: "64px 32px" }}>
          <div className="mono" style={{ marginBottom: 18 }}>{T.shows.label}</div>
          <div className="shows-grid">
            <div className="shows-headline display display-xl right-md" style={{ fontSize: 80, lineHeight: .9, textAlign: "right" }}>
              {T.shows.heading}
            </div>
            <ul className="shows-list" style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {T.shows.list.map((s, i) => (
                <li key={i} className="show-row" style={{ display: "grid", gridTemplateColumns: "140px 1fr auto", gap: 18, padding: "20px 0", borderTop: i === 0 ? "1px solid var(--accent)" : "1px solid var(--line)" }}>
                  <span className="mono">{s.date}</span>
                  <div>
                    <div style={{ fontSize: 22, lineHeight: 1.1 }}>{s.venue}</div>
                    <div className="mono" style={{ marginTop: 4 }}>{s.city}</div>
                  </div>
                  {s.note && <span className="chip show-note" style={{ alignSelf: "center", textTransform: "uppercase" }}>{s.note}</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section>
        <div className="pad pad-y" style={{ maxWidth: 1280, margin: "0 auto", padding: "72px 32px" }}>
          <div className="mono" style={{ marginBottom: 18 }}>{T.contact.label}</div>
          <div className="grid-2 grid-end" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 48, alignItems: "end" }}>
            <h2 className="display display-xxl" style={{ fontSize: "clamp(64px, 8vw, 132px)", margin: 0, lineHeight: .88 }}>
              {T.contact.line1}<br/>
              <span className="accent">{T.contact.line2}</span><br/>
              {T.contact.line3}
            </h2>
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "12px 18px" }}>
                <div className="mono">{T.contact.booking}</div><a href={`mailto:${BAND.contact.booking}`}>{BAND.contact.booking}</a>
                <div className="mono">{T.contact.instagram}</div><a href={BAND.contact.igUrl} target="_blank" rel="noopener">{BAND.contact.ig}</a>
                <div className="mono">{T.contact.labelLine}</div><span>{T.contact.labelValue}</span>
              </div>
              <div className="rule ruleAcc" style={{ marginTop: 28 }}/>
              <div className="mono" style={{ marginTop: 12 }}>
                <span>© 2026 {BAND.name}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// APP — variation switcher + tweaks
// ═════════════════════════════════════════════════════════════════════════════
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  return (
    <>
      <VinylVariant accent={t.accent} grain={t.grain} duotone={t.duotone} showAnnotations={t.showAnnotations}/>

      <TweaksPanel>

        <TweakSection label="Color" />
        <TweakColor label="Accent (Giftgrün)" value={t.accent}
          onChange={v => setTweak("accent", v)} />
        <TweakRadio label="Preset" value={t.accent}
          options={[
            { value: "#D4FF3A", label: "Giftgrün" },
            { value: "#7CFC00", label: "Lawn"     },
            { value: "#FF4D14", label: "Hot"      },
            { value: "#E9E7DF", label: "Bone"     },
          ]}
          onChange={v => setTweak("accent", v)} />

        <TweakSection label="Treatment" />
        <TweakToggle label="Film grain"      value={t.grain}    onChange={v => setTweak("grain", v)} />
        <TweakToggle label="Duotone photos"  value={t.duotone}  onChange={v => setTweak("duotone", v)} />
        <TweakToggle label="Hand annotations" value={t.showAnnotations} onChange={v => setTweak("showAnnotations", v)} />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
