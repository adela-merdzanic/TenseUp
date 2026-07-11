// Header and in-page link wiring shared by every subject-scoped page. It
// carries the active subject through internal links (marked data-nav), hides
// links for features a subject does not have, and shows the subject name.
// Links marked data-switch (e.g. "Subjects") always go to the picker.
import {
  getSubjectId,
  getSubjectConfig,
  subjectHasFeature,
  withSubject,
} from "./subject.js";

// Links that used to point at the old home (index.html) now lead to the
// subject home; everything else just gains ?subject.
function subjectHref(href, id) {
  const target = href === "index.html" ? "home.html" : href;
  return withSubject(target, id);
}

async function setupNav() {
  const config = await getSubjectConfig().catch(() => null);

  // Unknown subject (bad or stale link): send the user back to the picker.
  if (!config) {
    location.replace("index.html");
    return;
  }

  const id = getSubjectId();

  const logo = document.querySelector(".app-logo");
  if (logo) logo.setAttribute("href", withSubject("home.html", id));

  document.querySelectorAll("[data-nav]").forEach((link) => {
    const feature = link.dataset.feature;
    if (feature && !subjectHasFeature(config, feature)) {
      link.remove();
      return;
    }
    const href = link.getAttribute("href");
    if (href) link.setAttribute("href", subjectHref(href, id));
  });

  const label = document.querySelector("[data-subject-name]");
  if (label) label.textContent = config.title;
}

setupNav();
