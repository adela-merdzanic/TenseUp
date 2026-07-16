// Small inline SVG diagrams for topology cards, colored via CSS classes.
// Shared by the flashcards (main-essay.js) and the theory page (main-theory.js).
export const DIAGRAMS = {
  bus: `
    <svg viewBox="0 0 320 110" role="img" aria-label="Bus topology diagram">
      <line class="diag-bus" x1="15" y1="82" x2="305" y2="82" />
      <line class="diag-line" x1="60" y1="46" x2="60" y2="82" />
      <line class="diag-line" x1="130" y1="46" x2="130" y2="82" />
      <line class="diag-line" x1="200" y1="46" x2="200" y2="82" />
      <line class="diag-line" x1="270" y1="46" x2="270" y2="82" />
      <rect class="diag-node" x="44" y="20" width="32" height="26" rx="5" />
      <rect class="diag-node" x="114" y="20" width="32" height="26" rx="5" />
      <rect class="diag-node" x="184" y="20" width="32" height="26" rx="5" />
      <rect class="diag-node" x="254" y="20" width="32" height="26" rx="5" />
    </svg>`,
  star: `
    <svg viewBox="0 0 320 160" role="img" aria-label="Star topology diagram">
      <line class="diag-line" x1="160" y1="80" x2="65" y2="35" />
      <line class="diag-line" x1="160" y1="80" x2="255" y2="35" />
      <line class="diag-line" x1="160" y1="80" x2="65" y2="125" />
      <line class="diag-line" x1="160" y1="80" x2="255" y2="125" />
      <line class="diag-line" x1="160" y1="80" x2="160" y2="22" />
      <line class="diag-line" x1="160" y1="80" x2="160" y2="138" />
      <circle class="diag-hub" cx="160" cy="80" r="15" />
      <rect class="diag-node" x="49" y="22" width="32" height="26" rx="5" />
      <rect class="diag-node" x="239" y="22" width="32" height="26" rx="5" />
      <rect class="diag-node" x="49" y="112" width="32" height="26" rx="5" />
      <rect class="diag-node" x="239" y="112" width="32" height="26" rx="5" />
      <rect class="diag-node" x="144" y="6" width="32" height="26" rx="5" />
      <rect class="diag-node" x="144" y="128" width="32" height="26" rx="5" />
    </svg>`,
  ring: `
    <svg viewBox="0 0 320 190" role="img" aria-label="Ring topology diagram">
      <line class="diag-line" x1="160" y1="28" x2="270" y2="75" />
      <line class="diag-line" x1="270" y1="75" x2="230" y2="160" />
      <line class="diag-line" x1="230" y1="160" x2="90" y2="160" />
      <line class="diag-line" x1="90" y1="160" x2="50" y2="75" />
      <line class="diag-line" x1="50" y1="75" x2="160" y2="28" />
      <rect class="diag-node" x="144" y="15" width="32" height="26" rx="5" />
      <rect class="diag-node" x="254" y="62" width="32" height="26" rx="5" />
      <rect class="diag-node" x="214" y="147" width="32" height="26" rx="5" />
      <rect class="diag-node" x="74" y="147" width="32" height="26" rx="5" />
      <rect class="diag-node" x="34" y="62" width="32" height="26" rx="5" />
    </svg>`,
  mesh: `
    <svg viewBox="0 0 320 190" role="img" aria-label="Mesh topology diagram">
      <line class="diag-line" x1="160" y1="30" x2="70" y2="80" />
      <line class="diag-line" x1="160" y1="30" x2="250" y2="80" />
      <line class="diag-line" x1="160" y1="30" x2="105" y2="155" />
      <line class="diag-line" x1="160" y1="30" x2="215" y2="155" />
      <line class="diag-line" x1="70" y1="80" x2="250" y2="80" />
      <line class="diag-line" x1="70" y1="80" x2="105" y2="155" />
      <line class="diag-line" x1="70" y1="80" x2="215" y2="155" />
      <line class="diag-line" x1="250" y1="80" x2="105" y2="155" />
      <line class="diag-line" x1="250" y1="80" x2="215" y2="155" />
      <line class="diag-line" x1="105" y1="155" x2="215" y2="155" />
      <rect class="diag-node" x="144" y="17" width="32" height="26" rx="5" />
      <rect class="diag-node" x="54" y="67" width="32" height="26" rx="5" />
      <rect class="diag-node" x="234" y="67" width="32" height="26" rx="5" />
      <rect class="diag-node" x="89" y="142" width="32" height="26" rx="5" />
      <rect class="diag-node" x="199" y="142" width="32" height="26" rx="5" />
    </svg>`,
};
