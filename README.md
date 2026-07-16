# Recall

Randomized exam practice for FIT courses, built with plain HTML/CSS/JS (no build step, no dependencies). Currently covers two subjects: **English II** (grammar practice, essay flashcards and theory) and **Operativni sistemi** (theory questions from the lectures and labs).

**Live demo:** <https://recall-fit.netlify.app/>

## Features

- Multi-subject: the start screen (`index.html`) lists the subjects, each with its own dashboard, data folder and feature set. Subjects are declared in `src/data/subjects.json` - adding one requires no code changes.
- Per-subject dashboard (`dashboard.html`): overall progress, session setup and topic selection, with a short description and progress counter per topic.
- Questions from the selected topics are merged and shuffled into one pool, like the real exam. Answer options are shuffled too, even in the "in order" mode.
- Choose between a full session (every remaining question) or a short session of 20 questions - settings persist per subject in `localStorage`.
- Single-answer (radio) and multiple-answer (checkbox) questions. After each answer: a short explanation, an optional "Show more" with details (typically why each wrong option is wrong), the source material and further-reading pointers.
- End-of-session review: every mistake is listed with the correct answer and the relevant explanation.
- Offline support: a service worker (`src/sw.js`) precaches the whole site on the first visit - pages, styles, scripts, quiz data and narration audio - so studying keeps working without a connection. Content updates show up one reload later.
- Correctly answered questions are excluded from future sessions (tracked in `localStorage`), and you can navigate back to review already-answered questions in the current session.
- Light/dark theme with a toggle, following the system preference by default.
- English II extras:
  - A hand-written grammar cheat sheet (`rules.html`) covering the areas the exercises test: tenses, future forms, conditionals, participle clauses, both/either/neither, passive, modals, prepositions, collocations, question formation, the e-/cyber- prefixes, and an irregular-verbs table.
  - Essay-prep flashcards (`essay.html`) for the descriptive exam questions: active-recall cards with self-grading, compact "exam answer" bullets, mnemonics, topology diagrams, and Leitner-style repetition. Two study modes: recall (answer out loud) or write (type your answer before revealing).
  - Essay theory page (`theory.html`) that renders the same content as one readable article, generated from `essay-cards.json` so it never drifts from the cards.
  - Audio narration on the theory page: pre-made MP3s in `src/assets/voice/`, one per card (`<card-id>.mp3`), played like a playlist with pause, previous/next, and a speed chip (0.75x-2x). The page detects which files exist, so partial coverage works.

## Running locally

Opening `index.html` directly (`file://`) will NOT work - `fetch()` of local JSON is blocked under the file protocol. The site lives in `src/`, so serve that folder, for example:

```
npx serve src
```

or, if you have Python installed:

```
cd src
python -m http.server
```

or use the VS Code "Live Server" extension on `src/index.html`. Then open the printed local URL in your browser.

## Checks

CI runs these two commands on every push and PR - run them locally before committing:

```
npx prettier@3.9.4 --check "src/**/*.{html,css,js,json}" "scripts/**/*.js" ".github/workflows/**/*.{yml,yaml}" "*.md"
node scripts/validate-data.js
```

## Project structure

```
src/                    Everything the browser loads (Netlify publishes this folder)
  index.html            Start screen: subject picker with per-subject stats
  dashboard.html        Per-subject dashboard (progress, session setup, topic selection)
  quiz.html             Quiz screen (question, feedback, summary + mistake review)
  rules.html            Grammar cheat sheet (English II)
  essay.html            Flashcards for the essay questions (English II)
  theory.html           Essay theory as one readable page (English II)
  contribute.html       How to use, fork and contribute to the project
  sw.js                 Service worker: precaches the site for offline use
  assets/
    css/
      variables.css     Design tokens (colors, spacing, radius) + dark theme overrides
      base.css          Reset, layout, header, footer
      components.css    Shared components (buttons, progress bar)
      home.css          Subject picker + dashboard styles (setup card, topic list)
      quiz.css          Quiz-screen styles (options, feedback states, review)
      rules.css         Rules + contribute page styles
      essay.css         Flashcards page styles (chips, card, diagrams, grading)
      theory.css        Theory page styles (per-question blocks within a topic)
    js/
      main-picker.js    Entry point for the subject picker
      main-dashboard.js Entry point for the dashboard
      main-quiz.js      Entry point for the quiz screen (wires everything together)
      main-static.js    Entry point for the rules/contribute pages (theme only)
      main-essay.js     Entry point for the flashcards page (deck, grading, diagrams)
      main-theory.js    Entry point for the theory page (renders cards as an article)
      subject.js        Resolves the active subject (?subject=...) and its config
      nav.js            Header links: carries ?subject through, hides missing features
      sw-register.js    Registers the service worker
      audio-player.js   Plays the narration MP3s as a playlist (theory page)
      essay-diagrams.js Shared topology SVGs used by the flashcards and theory page
      essay-store.js    localStorage persistence of flashcard Leitner boxes
      data-loader.js    Fetches subjects, manifests and topic JSON files
      quiz-engine.js    Pure logic: pool building, topic filtering, answer checking
      quiz-state.js     Session state (current question, score, answer history)
      quiz-render.js    All DOM updates for the quiz screen
      progress-store.js localStorage persistence of solved question ids
      settings-store.js localStorage persistence of session settings (length, topics)
      theme.js          Light/dark theme init and toggle
      utils.js          Small helpers (shuffle, escapeHtml, ...)
    images/             Favicons and the social preview image
    voice/              Narration MP3s for the theory page, one per card (<card-id>.mp3)
  data/
    subjects.json       List of subjects (title, data folder, features)
    english/
      manifest.json     List of English topics the app loads
      topics/*.json     One file per topic (see schema below)
      essay-cards.json  Essay-prep flashcards (categories + cards)
    operativni-sistemi/
      manifest.json     List of OS topics the app loads
      topics/*.json     One file per topic
scripts/
  validate-data.js      Data sanity checks (run by CI)
netlify.toml            Tells Netlify to publish the src/ folder
```

## Adding a new topic

1. Author a new JSON file in `src/data/<subject>/topics/`:
   - top level: `topicId`, `title`, optional `description` (shown on the dashboard), optional `sourcePdf`
   - `exercises[]`, each with `exerciseNumber`, `sourceTaskName`, optional `sourcePdf` (overrides the topic-level one) and `questions[]`
   - each question has `id`, `promptParts` (`before`/`blank`/`after`), `type` (`"single"` or `"multiple"`), `options`, `correctAnswers` (always an array) and `context` (the explanation; older English topics use `grammarRule`), plus optional `details[]` ("Show more" bullets), `note`, `readMore[]`, `taskSetup` (intro text and/or table for numeric tasks) and `uncertain` (flags a disputed answer)
2. Add an entry for it in that subject's `manifest.json`.
3. Run `node scripts/validate-data.js`.

No code changes needed - the app merges every topic listed in the manifest into one shuffled question pool.

## Adding a new subject

1. Create `src/data/<dir>/` with a `manifest.json` and a `topics/` folder (plus `essay-cards.json` if the subject uses the essay feature).
2. Add an entry to `src/data/subjects.json`: `id`, `dir`, `title`, `subtitle`, `quizLabel` and the list of `features` (`quiz`, `essay`, `rules`, `theory`).

The picker, dashboard, navigation and the service worker all read this configuration, so nothing else changes.

## Contributing

See `src/contribute.html` (or the "Contribute" page on the live site) for the full guide. In short:

- Open pull requests against `develop` - day-to-day work is collected there, and CI (Prettier check + data validation) runs on every PR and push.
- `main` mirrors the deployed site: Netlify builds only on pushes to `main`, so `develop` is merged into `main` in planned batches, one deploy per release.
- Dependabot dependency updates also target `develop` and ride along with the next release.
- Releases and the changelog are managed by Release Please, so commit messages follow Conventional Commits (`feat:`, `fix:`, `chore:`, ...).

## Progress

Correctly answered questions are excluded from future sessions (tracked in `localStorage`, per subject and per browser). Use "Reset progress" on the dashboard to clear this and practice the full pool again.
