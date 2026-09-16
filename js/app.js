/* ---------------------------------------------------------------
   MTH Notes — application.
   Hash-routed static site: every page is rendered from courses.json
   and the per-folder index.json files. Nothing here needs editing
   when notes are added.
   --------------------------------------------------------------- */

(function () {
  'use strict';

  var app = document.getElementById('app');
  var site = null;          // contents of data/courses.json
  var indexCache = {};      // indexCache[courseId][sectionId] = items[]
  var allLoaded = false;    // true once every index.json has been fetched
  var searchRecords = null;

  /* ---------------------------------------------------------- utils */

  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function courseById(id) {
    if (!site) return null;
    for (var i = 0; i < site.courses.length; i++) {
      if (site.courses[i].id === id) return site.courses[i];
    }
    return null;
  }

  function sectionById(id) {
    for (var i = 0; i < site.sections.length; i++) {
      if (site.sections[i].id === id) return site.sections[i];
    }
    return null;
  }

  function getJSON(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (res) {
      if (!res.ok) throw new Error(url + ' → ' + res.status);
      return res.json();
    });
  }

  /** Missing or malformed index.json is treated as "no notes yet". */
  function loadIndex(courseId, sectionId) {
    indexCache[courseId] = indexCache[courseId] || {};
    if (indexCache[courseId][sectionId]) {
      return Promise.resolve(indexCache[courseId][sectionId]);
    }
    return getJSON('courses/' + courseId + '/' + sectionId + '/index.json')
      .then(function (data) {
        var items = Array.isArray(data) ? data : (data.items || []);
        indexCache[courseId][sectionId] = items;
        return items;
      })
      .catch(function () {
        indexCache[courseId][sectionId] = [];
        return [];
      });
  }

  function loadAllIndexes() {
    if (allLoaded) return Promise.resolve(indexCache);
    var jobs = [];
    site.courses.forEach(function (c) {
      site.sections.forEach(function (s) { jobs.push(loadIndex(c.id, s.id)); });
    });
    return Promise.all(jobs).then(function () {
      allLoaded = true;
      return indexCache;
    });
  }

  function countFor(courseId) {
    var c = indexCache[courseId] || {};
    var total = 0;
    site.sections.forEach(function (s) { total += (c[s.id] || []).length; });
    return total;
  }

  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

  /* ------------------------------------------------------ chrome */

  function crumbs(parts) {
    var items = parts.map(function (p, i) {
      var last = i === parts.length - 1;
      return '<li>' + (last
        ? '<span aria-current="page">' + esc(p.label) + '</span>'
        : '<a href="' + esc(p.href) + '">' + esc(p.label) + '</a>') + '</li>';
    }).join('');
    return '<nav class="breadcrumbs" aria-label="Breadcrumb"><ol>' + items + '</ol></nav>';
  }

  function setActiveNav(key) {
    document.querySelectorAll('.site-nav a[data-nav]').forEach(function (a) {
      if (a.getAttribute('data-nav') === key) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  function render(html, title, navKey) {
    app.innerHTML = html;
    document.title = title ? title + ' — MTH Notes' : 'MTH Notes';
    setActiveNav(navKey);
    closeMenu();
    document.getElementById('main').focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  /* -------------------------------------------------------- views */

  function courseCard(course) {
    var n = countFor(course.id);
    var meta = allLoaded
      ? (n ? plural(n, 'note') + ' available' : 'No notes yet')
      : 'Lectures · Questions';
    return '<li class="course-card" style="--card-accent:' + esc(course.accent) + '">' +
      '<span class="code">' + esc(course.code) + '</span>' +
      '<h3 class="name">' + esc(course.name) + '</h3>' +
      '<p class="desc">' + esc(course.description) + '</p>' +
      '<p class="meta">' + esc(meta) + '</p>' +
      '<a class="open" href="#/course/' + esc(course.id) + '">' +
        'Open course<span class="sr-only"> ' + esc(course.code) + ' ' + esc(course.name) + '</span></a>' +
      '</li>';
  }

  function viewHome() {
    var s = site.site;
    var html =
      '<section class="hero">' +
        '<h1>' + esc(s.title) + '</h1>' +
        '<p class="lede">' + esc(s.tagline) + '</p>' +
        '<p class="year">' + esc(s.year) + '</p>' +
        '<a class="button" href="#/courses">Browse courses</a>' +
      '</section>' +
      '<section aria-labelledby="all-courses">' +
        '<div class="section-head">' +
          '<h2 id="all-courses">All courses</h2>' +
          '<span class="count">' + site.courses.length + ' courses</span>' +
        '</div>' +
        '<ul class="course-grid">' + site.courses.map(courseCard).join('') + '</ul>' +
      '</section>';
    render(html, null, 'home');
    refreshCounts();
  }

  function viewCourses() {
    var html = crumbs([{ label: 'Home', href: '#/' }, { label: 'Courses' }]) +
      '<div class="section-head"><h1>Courses</h1>' +
      '<span class="count">' + site.courses.length + ' courses</span></div>' +
      '<ul class="course-grid">' + site.courses.map(courseCard).join('') + '</ul>';
    render(html, 'Courses', 'courses');
    refreshCounts();
  }

  /** Counts need every index.json; fill them in once they arrive. */
  function refreshCounts() {
    loadAllIndexes().then(function () {
      document.querySelectorAll('.course-grid .course-card').forEach(function (card) {
        var link = card.querySelector('.open');
        var id = link.getAttribute('href').split('/').pop();
        var n = countFor(id);
        card.querySelector('.meta').textContent =
          n ? plural(n, 'note') + ' available' : 'No notes yet';
      });
      document.querySelectorAll('[data-section-count]').forEach(function (el) {
        var ref = el.getAttribute('data-section-count').split('/');
        var n = ((indexCache[ref[0]] || {})[ref[1]] || []).length;
        el.textContent = n ? plural(n, 'note') : 'No notes yet';
      });
    });
  }

  function viewCourse(courseId) {
    var course = courseById(courseId);
    if (!course) return viewNotFound();

    var cards = site.sections.map(function (sec) {
      return '<article class="section-card">' +
        '<span class="icon" aria-hidden="true">' + esc(sec.icon) + '</span>' +
        '<h2>' + esc(sec.name) + '</h2>' +
        '<p>' + esc(sec.blurb) + '</p>' +
        '<p class="count" data-section-count="' + esc(course.id) + '/' + esc(sec.id) + '">…</p>' +
        '<a class="open" href="#/course/' + esc(course.id) + '/' + esc(sec.id) + '">' +
          'Open ' + esc(sec.name.toLowerCase()) +
          '<span class="sr-only"> for ' + esc(course.code) + '</span></a>' +
        '</article>';
    }).join('');

    var html =
      crumbs([{ label: 'Home', href: '#/' },
              { label: 'Courses', href: '#/courses' },
              { label: course.code }]) +
      '<a class="back-link" href="#/courses">← Back to courses</a>' +
      '<header class="course-head" style="--card-accent:' + esc(course.accent) + '">' +
        '<p class="code">' + esc(course.code) + '</p>' +
        '<h1>' + esc(course.name) + '</h1>' +
        '<p class="desc">' + esc(course.description) + '</p>' +
      '</header>' +
      '<div class="section-cards">' + cards + '</div>';

    render(html, course.code + ' ' + course.name, 'courses');
    refreshCounts();
  }

  function viewSection(courseId, sectionId) {
    var course = courseById(courseId);
    var section = sectionId ? sectionById(sectionId) : null;
    if (!course || !section) return viewNotFound();

    loadIndex(course.id, section.id).then(function (items) {
      var body;
      if (!items.length) {
        body = '<div class="empty">' +
          '<h2>No notes yet</h2>' +
          '<p>Notes for this section will be added soon.</p>' +
          '</div>';
      } else {
        body = '<ul class="note-list">' + items.map(function (item, i) {
          var file = item.file ? '<span class="file">' + esc(item.file) + '</span>' : '';
          return '<li class="note-item">' +
            '<span class="num" aria-hidden="true">' + (i + 1 < 10 ? '0' : '') + (i + 1) + '</span>' +
            '<span class="body"><p class="title">' + esc(item.title) + '</p>' + file + '</span>' +
            '<a class="open" href="#/note/' + esc(course.id) + '/' + esc(section.id) + '/' + i + '">' +
              'Open<span class="sr-only"> ' + esc(item.title) + '</span></a>' +
            '</li>';
        }).join('') + '</ul>';
      }

      var html =
        crumbs([{ label: 'Home', href: '#/' },
                { label: 'Courses', href: '#/courses' },
                { label: course.code, href: '#/course/' + course.id },
                { label: section.name }]) +
        '<a class="back-link" href="#/course/' + esc(course.id) + '">← Back to course</a>' +
        '<div class="section-head">' +
          '<h1>' + esc(section.name) + '</h1>' +
          '<span class="count">' + esc(course.code) + ' · ' + esc(course.name) + '</span>' +
        '</div>' + body;

      render(html, section.name + ' — ' + course.code, 'courses');
    });
  }

  function viewNote(courseId, sectionId, indexStr) {
    var course = courseById(courseId);
    var section = sectionId ? sectionById(sectionId) : null;
    var i = parseInt(indexStr, 10);
    if (!course || !section || isNaN(i)) return viewNotFound();

    loadIndex(course.id, section.id).then(function (items) {
      var item = items[i];
      if (!item) return viewNotFound();

      var base = 'courses/' + course.id + '/' + section.id + '/';
      var url = item.url ? item.url : base + encodeURIComponent(item.file || '');
      var isPDF = /\.pdf($|\?)/i.test(url);
      var wide = window.matchMedia('(min-width: 720px)').matches;

      var preview;
      if (item.url) {
        preview = '<div class="pdf-fallback">' +
          '<p>This note lives on another site.</p>' +
          '<a class="button" href="' + esc(url) + '" target="_blank" rel="noopener">Open link</a></div>';
      } else if (isPDF && wide) {
        preview = '<div id="pdf-wrap">' +
          '<iframe class="pdf-frame" id="pdf-frame" src="' + esc(url) + '#view=FitH" ' +
          'title="' + esc(item.title) + '"></iframe></div>' +
          '<p class="pdf-note">If the preview stays blank, your browser is blocking inline PDFs — ' +
          'use “Open in new tab” instead.</p>';
      } else if (isPDF) {
        preview = '<div class="pdf-fallback">' +
          '<p>Inline previews are unreliable on small screens. Open or download the file to read it.</p>' +
          '<a class="button" href="' + esc(url) + '" target="_blank" rel="noopener">Open PDF</a></div>';
      } else {
        preview = '<div class="pdf-fallback">' +
          '<p>This file opens outside the viewer.</p>' +
          '<a class="button" href="' + esc(url) + '" target="_blank" rel="noopener">Open file</a></div>';
      }

      var actions = '<div class="viewer-actions">' +
        '<a class="button secondary" href="' + esc(url) + '" target="_blank" rel="noopener">Open in new tab</a>' +
        (item.url ? '' : '<a class="button secondary" href="' + esc(url) + '" download>Download</a>') +
        (isPDF && wide ? '<button type="button" class="button secondary" id="fullscreen-btn">Full screen</button>' : '') +
        '<a class="button secondary" href="#/course/' + esc(course.id) + '/' + esc(section.id) + '">' +
          '← Back to ' + esc(section.name.toLowerCase()) + '</a>' +
        '</div>';

      var prev = items[i - 1], next = items[i + 1];
      var navHTML = '<div class="note-nav">' +
        (prev ? '<a href="#/note/' + esc(course.id) + '/' + esc(section.id) + '/' + (i - 1) + '">← ' + esc(prev.title) + '</a>' : '<span></span>') +
        (next ? '<a href="#/note/' + esc(course.id) + '/' + esc(section.id) + '/' + (i + 1) + '">' + esc(next.title) + ' →</a>' : '<span></span>') +
        '</div>';

      var html =
        crumbs([{ label: 'Home', href: '#/' },
                { label: course.code, href: '#/course/' + course.id },
                { label: section.name, href: '#/course/' + course.id + '/' + section.id },
                { label: item.title }]) +
        '<div class="viewer-head">' +
          '<h1>' + esc(item.title) + '</h1>' +
          '<span class="where">' + esc(course.code) + ' · ' + esc(section.name) + '</span>' +
        '</div>' + actions + preview + navHTML;

      render(html, item.title, 'courses');

      var fs = document.getElementById('fullscreen-btn');
      if (fs) {
        fs.addEventListener('click', function () {
          var el = document.getElementById('pdf-wrap');
          if (el && el.requestFullscreen) el.requestFullscreen();
          else window.open(url, '_blank', 'noopener');
        });
      }
    });
  }

  function viewSearch(rawQuery) {
    var q = rawQuery ? decodeURIComponent(rawQuery) : '';
    var html =
      crumbs([{ label: 'Home', href: '#/' }, { label: 'Search' }]) +
      '<h1>Search</h1>' +
      '<form class="search-form" id="search-form" role="search">' +
        '<label class="sr-only" for="q">Search notes</label>' +
        '<input type="search" id="q" name="q" value="' + esc(q) + '" ' +
          'placeholder="Try “Cauchy”, “compactness”, “MTH 304”…" autocomplete="off">' +
        '<button class="button" type="submit">Search</button>' +
      '</form>' +
      '<p class="search-hint">Searches course codes, course names, note titles and tags across the whole library.</p>' +
      '<div id="results"><p class="search-status">Preparing the index…</p></div>';

    render(html, q ? 'Search: ' + q : 'Search', 'search');

    var input = document.getElementById('q');
    var results = document.getElementById('results');

    document.getElementById('search-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = input.value.trim();
      location.hash = v ? '#/search/' + encodeURIComponent(v) : '#/search';
    });

    loadAllIndexes().then(function () {
      if (!searchRecords) {
        searchRecords = window.MTHSearch.build(site.courses, site.sections, indexCache);
      }
      if (!q) {
        results.innerHTML = '<p class="search-status">' +
          searchRecords.length + ' entries indexed. Type something to begin.</p>';
        input.focus();
        return;
      }
      var found = window.MTHSearch.run(searchRecords, q);
      if (!found.length) {
        results.innerHTML = '<div class="empty"><h2>No matches</h2>' +
          '<p>Nothing matches “' + esc(q) + '”. Try a shorter word or a course code.</p></div>';
        return;
      }
      results.innerHTML = '<p class="search-status">' + plural(found.length, 'result') +
        ' for “' + esc(q) + '”</p><ul class="result-list">' +
        found.map(function (r) {
          var tags = (r.tags && r.tags.length)
            ? '<p class="tags">' + esc(r.tags.slice(0, 5).join(' · ')) + '</p>' : '';
          return '<li class="result-item"><a href="' + esc(r.href) + '">' +
            '<span class="where">' + esc(r.where) + '</span>' +
            '<p class="title">' + esc(r.title) + '</p>' + tags + '</a></li>';
        }).join('') + '</ul>';
    });
  }

  function viewAbout() {
    var html =
      crumbs([{ label: 'Home', href: '#/' }, { label: 'About' }]) +
      '<div class="prose">' +
      '<h1>About this library</h1>' +
      '<p>MTH Notes collects lecture notes and question sets for eleven 3rd year ' +
      'Mathematics courses. It is a static site: the GitHub repository is the ' +
      'content management system, and GitHub Pages serves it.</p>' +

      '<h2>How notes are organised</h2>' +
      '<p>Every course folder holds two sections, <code>lectures</code> and ' +
      '<code>questions</code>. Each section has an <code>index.json</code> listing ' +
      'what to show and which file to open.</p>' +
      '<pre><code>courses/mth301/lectures/lecture-01.pdf\ncourses/mth301/lectures/index.json</code></pre>' +

      '<h2>Adding a note</h2>' +
      '<ol>' +
      '<li>Upload the PDF to the right folder.</li>' +
      '<li>Add one entry to that folder\u2019s <code>index.json</code>.</li>' +
      '<li>Commit and push. The site updates itself.</li>' +
      '</ol>' +
      '<pre><code>{\n  "title": "Lecture 06 \u2014 Baire Category Theorem",\n  "file": "lecture-06.pdf",\n  "tags": ["baire", "category", "complete"]\n}</code></pre>' +
      '<p>Tags are optional and feed the search page. Nothing in ' +
      '<code>js/</code> needs to change.</p>' +

      '<h2>Adding a course</h2>' +
      '<p>Add an entry to <code>data/courses.json</code> and create the matching ' +
      '<code>courses/&lt;id&gt;/lectures</code> and <code>courses/&lt;id&gt;/questions</code> folders.</p>' +
      '</div>';
    render(html, 'About', 'about');
  }

  function viewNotFound() {
    render(crumbs([{ label: 'Home', href: '#/' }, { label: 'Not found' }]) +
      '<div class="empty"><h2>Page not found</h2>' +
      '<p>That address does not match anything in the library.</p>' +
      '<p style="margin-top:1rem"><a class="button" href="#/courses">Browse courses</a></p></div>',
      'Not found', null);
  }

  /* ------------------------------------------------------- routing */

  function route() {
    var raw = location.hash.replace(/^#\/?/, '');
    var parts = raw.split('/').filter(function (p) { return p !== ''; });

    if (!parts.length) return viewHome();

    switch (parts[0]) {
      case 'courses': return viewCourses();
      case 'about':   return viewAbout();
      case 'search':  return viewSearch(parts[1]);
      case 'course':
        if (parts.length === 2) return viewCourse(parts[1]);
        if (parts.length >= 3) return viewSection(parts[1], parts[2]);
        return viewNotFound();
      case 'note':
        if (parts.length >= 4) return viewNote(parts[1], parts[2], parts[3]);
        return viewNotFound();
      default: return viewNotFound();
    }
  }

  /* -------------------------------------------------- header logic */

  var navToggle = document.getElementById('nav-toggle');
  var nav = document.getElementById('site-nav');

  function closeMenu() {
    nav.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  }

  navToggle.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  function applyTheme(value) {
    document.documentElement.setAttribute('data-theme', value);
    localStorage.setItem('mthnotes-theme', value);
    document.querySelectorAll('[data-theme-value]').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-theme-value') === value ? 'true' : 'false');
    });
  }

  document.querySelectorAll('[data-theme-value]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyTheme(btn.getAttribute('data-theme-value'));
    });
  });

  applyTheme(localStorage.getItem('mthnotes-theme') || 'system');

  /* ---------------------------------------------------------- boot */

  window.addEventListener('hashchange', route);

  getJSON('data/courses.json').then(function (data) {
    site = data;
    document.title = data.site.title + ' — ' + data.site.subtitle;
    route();
  }).catch(function (err) {
    app.innerHTML = '<div class="empty"><h2>Could not load the course list</h2>' +
      '<p>data/courses.json did not load. If you are opening index.html straight ' +
      'from disk, run a local server instead — browsers block file:// requests.</p></div>';
    console.error(err);
  });
})();
