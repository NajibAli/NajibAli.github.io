# Najib Ali, portfolio

The portfolio of Najib Ali, a software development student who builds websites and games.
It is a static site: plain HTML, modern CSS and vanilla JavaScript (ES modules), with no build step.

**Live:** https://najibali.github.io

The signature of the site is a hand-written WebGL fragment shader that draws an iridescent
liquid-glass shape. It floats behind the page, reacts to the cursor and travels to a new
position in every section.

## Run it locally

The site uses ES modules, so open it through a local server instead of double-clicking the files:

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000. VS Code's Live Server works too.

## Structure

```
index.html            home page
404.html              not-found page (root-absolute paths, because GitHub Pages serves it at any URL)
projects/             the four playable projects
projecten/            redirect pages for the old project URLs
assets/               fonts, icon sprite, project screenshots, portrait, social image
css/base.css          tokens, fonts, reset, type, shared components, cursor, grain, view transitions
css/home.css          home page and 404
css/project.css       shared shell of the project pages
css/projects/         one stylesheet per project
js/scene.js           the WebGL shape: shader, uniforms, choreography, fallback
js/motion.js          reduced-motion check, smooth scrolling, helpers
js/theme.js           theme toggle with the circular View Transition reveal
js/cursor.js          custom cursor
js/magnetic.js        magnetic hover
js/reveal.js          split-letter headings, fade-ups, skeleton to image hand-off
js/transitions.js     page transitions (view-transition morph, curtain fallback)
js/sfx.js             synthesized sounds and the shared mute setting
js/data.js            typed project and skill data
js/home.js            home page entry point; components live in js/home/
js/projects/          one module per project
```

Every JavaScript file starts with `// @ts-check` and is typed with JSDoc.
`jsconfig.json` turns on `checkJs` and `strict`, so VS Code reports type errors without a build step.
Each component is a small module that exports an `init…()` function, which returns a function
that tears the component down again.

## Libraries and fonts

- [Lenis](https://github.com/darkroomengineering/lenis) 1.3.4 for smooth scrolling and
  [GSAP](https://gsap.com) 3.13.0 with ScrollTrigger for the scroll choreography. Both are loaded as
  ES modules from jsDelivr at pinned versions. Without them the page still works, just without the scroll effects.
- [Mona Sans](https://github.com/github/mona-sans) by GitHub, self-hosted in `assets/fonts/` and licensed under the
  SIL Open Font License 1.1 (see `assets/fonts/OFL.txt`).
- Icons are inline SVG in `assets/icons.svg`; several shapes follow the MIT-licensed Feather icon set.
- Sounds are synthesized with the Web Audio API, so there are no audio files.

## Add your portrait

The hero shows a small portrait card that loads `assets/portrait.jpg`. The file in the repo is a
stand-in with the initials "NA". To use a real photo, replace `assets/portrait.jpg` with your own
picture (a 4:5 crop of about 368×460 pixels works well). Nothing else needs to change.

## Credits

Designed and built by Najib Ali.
