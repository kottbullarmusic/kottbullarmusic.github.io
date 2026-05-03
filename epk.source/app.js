/* global React, ReactDOM */
const { useState, useEffect, useRef, useMemo } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#D4FF3A",
  "grain": true,
  "duotone": false,
  "showAnnotations": true
}/*EDITMODE-END*/;

// ─── Shared data ─────────────────────────────────────────────────────────────
const BAND = {
  name: "KÖTTBULLAR",
  hometown: "Munich, DE",
  formed: "Est. 2021",
  members: [
    { name: "Alina",    role: "Vocals" },
    { name: "Viktor",   role: "Guitar" },
    { name: "Liliia",   role: "Bass" },
    { name: "Yaroslav", role: "Drums" },
  ],
  shortBio:
    "Indie / punk / power-pop quartet from Munich.",
  longBio:
    "KÖTTBULLAR is a four-piece formed in the back-rooms of Munich's DIY scene — " +
    "a band that treats the gap between distortion and a melody line like a place " +
    "to live. Alina's vocals carry the weight; Viktor, Liliia and Yaroslav build " +
    "the room around her with rock-guitar bones and power-pop joints. Their songs " +
    "are short, direct, and catchy.",
  fyfa: ["Wolf Alice", "Pixies", "The Beths"],
  pressQuotes: [
    { who: "Rockera Magazine",   what: "Rock guitars and heart-warming vocal lines collide in a way that feels both familiar and brand new." },
    { who: "York Calling (UK)",  what: "Catchy as a chorus you can't shake — KÖTTBULLAR write hooks like they mean them." },
    { who: "Indie Chronique (FR)", what: "Une énergie qui transforme un club de Munich en arène intime." },
    { who: "Plastic Mag (UK)",   what: "An indie band that remembers what punk is for." },
  ],
  releases: [
    { title: "The Five Stages Of", date: "28 Nov 2025", kind: "EP", cover: window.__resources.coverEp, url: "https://onerpm.link/225132004305", catNo: "KB-005" },
  ],
  topTracks: [
    { n: "01", title: "Denial",     from: "The Five Stages Of", time: "3:14" },
    { n: "02", title: "Bargaining", from: "The Five Stages Of", time: "2:48" },
    { n: "03", title: "Hello",      from: "Single",             time: "3:02" },
  ],
  upcomingShows: [
    { date: "02 May 2026", venue: "The Underground Rock", city: "München, DE", note: "" },
    { date: "25 Jul 2026", venue: "Kulturspektakel Gauting 2026", city: "Gauting, DE", note: "free entry" },
  ],
  contact: {
    booking: "koettbullar.music@gmail.com",
    label:   "self-released",
    site:    "kottbullarmusic.github.io",
    ig:      "kottbullar.music",
    igUrl:   "https://www.instagram.com/kottbullar.music",
  },
};

const EP_STORY =
  "Breaking up with a friend can cut deeper than expected. For KöTTBULLAR, that " +
  "rupture became the emotional core of The Five Stages Of — an album born from " +
  "personal loss, unanswered questions, and the slow process of letting go. Built " +
  "around the five stages of grief — Denial, Anger, Bargaining, Depression, and " +
  "Acceptance — each track becomes its own chapter, with a distinct sound, mood, " +
  "and emotional weight.";

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
  `;

  const headline = "Big hooks,\nwarm vocals,\ninstant atmosphere.";

  return (
    <div className="v1" style={{ position: "relative" }}>
      <style>{css}</style>
      <Grain on={grain} />

      {/* Top runner */}
      <div style={{ borderBottom: "1px solid var(--line)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "14px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="mono">KÖTTBULLAR · ELECTRONIC PRESS KIT · v.05 / 2026</div>
          <div className="mono" style={{ display: "flex", gap: 18 }}>
            <span>{BAND.hometown}</span>
            <span className="accent">●</span>
            <span>BOOKING / LABELS</span>
          </div>
        </div>
      </div>

      {/* HERO */}
      <section style={{ borderBottom: "1px solid var(--line)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "44px 32px 56px", display: "grid", gridTemplateColumns: "1.36fr 1fr", gap: 48, alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <div style={{ position: "relative", aspectRatio: "560 / 315", border: "1px solid var(--line)", overflow: "hidden", background: "#000" }}>
              <iframe
                src="https://www.youtube-nocookie.com/embed/T_eKWe5TkXg?controls=0&rel=0&modestbranding=1"
                title="KöTTBULLAR LIVE"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 28, flexWrap: "wrap" }}>
              <span className="chip dot">EPK · 2026</span>
              <span className="chip">Indie / Punk / Power-pop</span>
              <span className="chip">Self-released</span>
            </div>
            <div className="rule" style={{ margin: "0 0 18px" }}/>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 24, rowGap: 10 }}>
              <div className="mono">Style</div><div>{BAND.shortBio}</div>
              <div className="mono">For fans of</div><div>{BAND.fyfa.join(" · ")}</div>
            </div>
          </div>
        </div>
      </section>

      {/* BIO */}
      <section style={{ borderBottom: "1px solid var(--line)" }} className="matrix">
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "64px 32px", display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 56 }}>
          <div style={{ fontSize: 18, lineHeight: 1.6 }}>
            <p style={{ margin: 0 }}>
              <span className="display" style={{ fontSize: 64, float: "left", lineHeight: .8, marginRight: 10, marginTop: 8, color: "var(--accent)" }}>K</span>
              {BAND.longBio}
            </p>
            <div className="rule" style={{ margin: "28px 0 16px" }}/>
            <div className="mono" style={{ marginBottom: 10 }}>The Lineup</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
              {BAND.members.map(m => (
                <div key={m.name} style={{ borderTop: "1px solid var(--accent)", paddingTop: 10 }}>
                  <div style={{ fontSize: 22, letterSpacing: -.01 }}>{m.name}</div>
                  <div className="mono">{m.role}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="mono" style={{ marginBottom: 18 }}>Bio</div>
            <div className="display" style={{ fontSize: 80, lineHeight: .85, color: "var(--ink)" }}>
              FOUR<br/>FROM<br/><span className="accent">MÜNCHEN.</span>
            </div>
            <div className="mono" style={{ marginTop: 18 }}>EST. 2021 · ACTIVE</div>
          </div>
        </div>
      </section>

      {/* RELEASE SPOTLIGHT */}
      <section style={{ borderBottom: "1px solid var(--line)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "64px 32px" }}>
          <div className="mono" style={{ marginBottom: 28 }}>Spotlight Release</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 56, alignItems: "start" }}>
            <div>
              <div style={{ position: "relative" }}>
                <Photo src={window.__resources.coverEp} alt="The Five Stages Of cover"
                  style={{ aspectRatio: "1/1", border: "1px solid var(--line)" }}/>
                {showAnnotations && (
                  <div className="annot" style={{ position: "absolute", bottom: -22, left: 8 }}>
                    handwriting by Alina ✱
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="display" style={{ fontSize: "clamp(56px, 6vw, 92px)", margin: 0 }}>
                THE FIVE<br/>
                <span className="accent" style={{ fontStyle: "italic", fontFamily: "'Caveat', cursive", fontWeight: 700, letterSpacing: 0, textTransform: "none" }}>Stages Of</span>
              </h2>
              <p style={{ fontSize: 18, lineHeight: 1.55, color: "var(--ink)", marginTop: 24, maxWidth: 620 }}>{EP_STORY}</p>

              <div className="rule" style={{ margin: "28px 0 16px" }}/>
              <div className="mono" style={{ marginBottom: 8 }}>Tracklist</div>
              <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {["Denial","Anger","Bargaining","Depression","Acceptance"].map((t, i) => (
                  <li key={t} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                    <span className="mono" style={{ color: "var(--accent)" }}>{String(i+1).padStart(2,"0")}</span>
                    <span style={{ fontSize: 17 }}>{t}</span>
                    <span className="mono">{["3:14","2:48","3:21","4:02","3:38"][i]}</span>
                  </li>
                ))}
              </ol>

              <div style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a href={BAND.releases[0].url} className="chip dot" style={{ borderColor: "var(--accent)", color: "var(--ink)", padding: "10px 16px", fontSize: 12 }}>
                  ▶ LISTEN ON ALL DSPS
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SHOWS */}
      <section style={{ borderBottom: "1px solid var(--line)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "64px 32px" }}>
          <div className="mono" style={{ marginBottom: 18 }}>Coming Up</div>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 56, alignItems: "start" }}>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {BAND.upcomingShows.map((s, i) => (
                <li key={i} style={{ display: "grid", gridTemplateColumns: "140px 1fr auto", gap: 18, padding: "20px 0", borderTop: i === 0 ? "1px solid var(--accent)" : "1px solid var(--line)" }}>
                  <span className="mono">{s.date}</span>
                  <div>
                    <div style={{ fontSize: 22, lineHeight: 1.1 }}>{s.venue}</div>
                    <div className="mono" style={{ marginTop: 4 }}>{s.city}</div>
                  </div>
                  {s.note && <span className="chip" style={{ alignSelf: "center", textTransform: "uppercase" }}>{s.note}</span>}
                </li>
              ))}
            </ul>
            <div className="display" style={{ fontSize: 80, lineHeight: .9, textAlign: "right" }}>
              SUMMER<br/><span className="accent">'26</span><br/>SHOWS
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "72px 32px" }}>
          <div className="mono" style={{ marginBottom: 18 }}>Booking & Contact</div>
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 48, alignItems: "end" }}>
            <h2 className="display" style={{ fontSize: "clamp(64px, 8vw, 132px)", margin: 0, lineHeight: .88 }}>
              BOOK US.<br/>
              <span className="accent">PROMISE</span><br/>
              IT'S LOUD.
            </h2>
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "12px 18px" }}>
                <div className="mono">Booking</div><a href={`mailto:${BAND.contact.booking}`}>{BAND.contact.booking}</a>
                <div className="mono">Instagram</div><a href={BAND.contact.igUrl} target="_blank" rel="noopener">{BAND.contact.ig}</a>
                <div className="mono">Label</div><span>{BAND.contact.label}</span>
              </div>
              <div className="rule ruleAcc" style={{ marginTop: 28 }}/>
              <div className="mono" style={{ marginTop: 12 }}>
                <span>© 2026 KÖTTBULLAR</span>
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
