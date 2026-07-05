# TenseUp

Randomized English grammar practice, built with plain HTML/CSS/JS (no build step, no dependencies).

**Live demo:** <https://tense-up.netlify.app/>

## Features

- Questions from all topics are merged and shuffled into one pool, like the real exam.
- Choose between a full session (every remaining question) or a short session of 20 questions, and pick which topics to practice — settings persist in `localStorage`.
- Single-answer (radio) and multiple-answer (checkbox) questions, with the grammar rule shown after each answer.
- End-of-session review: every mistake is listed with the correct answer and the relevant rule.
- A hand-written grammar cheat sheet (`rules.html`) covering the areas the exercises test: tenses, future forms, conditionals, participle clauses, both/either/neither, passive, modals, prepositions, collocations, question formation, the e-/cyber- prefixes, and an irregular-verbs table (all verbs used in the exercises + other common ones).
- Essay-prep flashcards (`essay.html`) for the descriptive exam questions (operating systems, networks, WWW): active-recall cards with self-grading, compact "exam answer" bullets, mnemonics, topology diagrams, and Leitner-style repetition (cards you don't know come back first; three "Knew it" answers master a card). The topic area is chosen on the start screen, like the grammar topics. Two study modes: recall (answer out loud) or write (type your answer before revealing).
- Essay theory page (`theory.html`) that renders the same content as one readable article, grouped by topic, so you can learn the material before drilling it as flashcards. It is generated from `essay-cards.json`, so it never drifts from the cards.
- Correctly answered questions are excluded from future sessions (tracked in `localStorage`), with per-topic progress shown on the start screen.
- You can navigate back to review already-answered questions in the current session.
- Light/dark theme with a toggle, following the system preference by default.
- Topics are plain JSON files — adding one requires no code changes.

## Running locally

Opening `index.html` directly (`file://`) will NOT work — `fetch()` of local JSON is blocked under the file protocol. The site lives in `src/`, so serve that folder, for example:

```
npx serve src
```

or, if you have Python installed:

```
cd src
python -m http.server
```

or use the VS Code "Live Server" extension on `src/index.html`. Then open the printed local URL in your browser.

## Project structure

```
src/                    Everything the browser loads (Netlify publishes this folder)
  index.html            Start screen (stats, session setup, topic selection)
  quiz.html             Quiz screen (question, feedback, summary + mistake review)
  rules.html            Grammar cheat sheet for the exam topics
  essay.html            Flashcards for the essay questions (self-graded, Leitner repetition)
  theory.html           Essay theory as one readable page (generated from essay-cards.json)
  contribute.html       How to use, fork and contribute to the project
  assets/
    css/
      variables.css     Design tokens (colors, spacing, radius) + dark theme overrides
      base.css          Reset, layout, header, footer
      components.css    Shared components (buttons, progress bar)
      home.css          Start-screen styles (setup card, topic list)
      quiz.css          Quiz-screen styles (options, feedback states, review)
      rules.css         Rules + contribute page styles
      essay.css         Flashcards page styles (chips, card, diagrams, grading)
      theory.css        Theory page styles (per-question blocks within a topic)
    js/
      main-home.js      Entry point for the start screen
      main-quiz.js      Entry point for the quiz screen (wires everything together)
      main-static.js    Entry point for the rules/contribute pages (theme only)
      main-essay.js     Entry point for the flashcards page (deck, grading, diagrams)
      main-theory.js    Entry point for the theory page (renders cards as an article)
      essay-diagrams.js Shared topology SVGs used by the flashcards and theory page
      essay-store.js    localStorage persistence of flashcard Leitner boxes
      data-loader.js    Fetches the manifest and topic JSON files
      quiz-engine.js    Pure logic: pool building, topic filtering, answer checking
      quiz-state.js     Session state (current question, score, answer history)
      quiz-render.js    All DOM updates for the quiz screen
      progress-store.js localStorage persistence of solved question ids
      settings-store.js localStorage persistence of session settings (length, topics)
      theme.js          Light/dark theme init and toggle
      utils.js          Small helpers (shuffle, escapeHtml, ...)
    images/             Favicons and the social preview image
  data/
    manifest.json       List of topics the app loads
    topics/*.json       One file per topic (see schema below)
    essay-cards.json    Essay-prep flashcards (categories + cards)
netlify.toml            Tells Netlify to publish the src/ folder
```

## Adding a new topic

1. Author a new JSON file in `src/data/topics/` following the schema used by `src/data/topics/sample.json`:
   - `topicId`, `title`, `sourcePdf`
   - `exercises[]`, each with `exerciseNumber`, `sourceTaskName`, `questions[]`
   - each question has `id`, `promptParts` (`before`/`blank`/`after`), `type` (`"single"` or `"multiple"`), `options`, `correctAnswers` (always an array), `grammarRule`
2. Add an entry for it in `src/data/manifest.json`.
3. No code changes needed — the app merges every topic listed in the manifest into one shuffled question pool.

## Contributing

See `src/contribute.html` (or the "Contribute" page on the live site) for the full guide. In short:

- Open pull requests against `develop` - day-to-day work is collected there, and CI (Prettier check + data validation) runs on every PR and push.
- `main` mirrors the deployed site: Netlify builds only on pushes to `main`, so `develop` is merged into `main` in planned batches, one deploy per release.
- Dependabot dependency updates also target `develop` and ride along with the next release.
- Releases and the changelog are managed by Release Please, so commit messages follow Conventional Commits (`feat:`, `fix:`, `chore:`, ...).

## Progress

Correctly answered questions are excluded from future sessions (tracked in `localStorage`, per browser). Use "Reset progress" on the start screen to clear this and practice the full pool again.
