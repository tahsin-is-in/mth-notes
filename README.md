# MTH Notes

A static notes library for 3rd year university Mathematics — plain HTML, CSS and
JavaScript. No framework, no build step, no backend. The repository is the CMS.

```
index.html            app shell
css/style.css         all styling (light / dark / system)
js/app.js             router + page rendering
js/search.js          client-side search
data/courses.json     the course list — edit to add a course
courses/<id>/lectures/index.json   note list for that folder
courses/<id>/questions/index.json
assets/               icons and images
.nojekyll             tells GitHub Pages to serve files as-is
```

## Deploy to GitHub Pages

1. Create a repository and push these files to the `main` branch.
2. Repository → **Settings** → **Pages**.
3. Source: **Deploy from a branch**. Branch: `main`, folder: `/ (root)`. Save.
4. Wait about a minute, then open `https://<username>.github.io/<repo>/`.

All paths are relative, so the site works at a repo subpath as well as at a
custom domain. Keep the `.nojekyll` file — without it GitHub ignores any folder
whose name starts with an underscore.

## Add a lecture note

1. Put the file in the folder, e.g. `courses/mth301/lectures/lecture-06.pdf`.
2. Add one entry to `courses/mth301/lectures/index.json`:

```json
{
  "title": "Lecture 06 — Baire Category Theorem",
  "file": "lecture-06.pdf",
  "tags": ["baire", "category", "complete metric space"]
}
```

3. Commit and push. The page updates on the next load.

Order in the file is the order on the page. `tags` is optional and only feeds
the search page. Question sets work identically under `questions/`.

You can do all of this from the GitHub web interface: **Add file → Upload files**
for the PDF, then click `index.json` and use the pencil icon to edit it.

### Link to something hosted elsewhere

Use `url` instead of `file`:

```json
{ "title": "Recorded lecture — Residue theorem", "url": "https://example.com/video" }
```

## Add a course

1. Add an entry to the `courses` array in `data/courses.json`:

```json
{
  "id": "mth311",
  "code": "MTH 311",
  "name": "Measure Theory",
  "description": "Sigma-algebras, measurable functions and the Lebesgue integral.",
  "accent": "#4A6B8A",
  "tags": ["measure", "lebesgue", "sigma algebra"]
}
```

2. Create `courses/mth311/lectures/` and `courses/mth311/questions/`, each with
   an `index.json` containing `[]` to start.

Adding a second year later means adding its courses the same way; the folder
name is whatever you put in `id`.

## Sample content

Every course ships with placeholder PDFs so the site is browsable immediately.
Replace them with real notes, keeping the same file names, or delete them and
list your own. `courses/lab/questions/index.json` is deliberately empty so you
can see the empty state.

## Working on it locally

Browsers block `fetch` from `file://`, so open it through a local server:

```
python3 -m http.server 8000
```

then visit `http://localhost:8000`.

## Notes on the JSON files

A missing or malformed `index.json` is treated as "no notes yet" rather than
breaking the page — but a trailing comma is still the most common mistake. Paste
the file into any JSON validator if a section looks empty when it shouldn't.
