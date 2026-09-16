/* ---------------------------------------------------------------
   MTH Notes — client-side search.
   Builds a flat record list from courses.json + every index.json,
   then matches query tokens against it. No backend, no library.
   --------------------------------------------------------------- */

window.MTHSearch = (function () {

  function norm(s) {
    return String(s || '').toLowerCase().replace(/[\u2014\u2013]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function tokenize(q) {
    return norm(q).split(' ').filter(Boolean);
  }

  /**
   * records: one per course and one per note.
   * `haystack` fields are weighted so a title hit beats a tag hit.
   */
  function build(courses, sections, indexes) {
    var records = [];

    courses.forEach(function (course) {
      records.push({
        kind: 'course',
        course: course,
        title: course.code + ' — ' + course.name,
        where: 'Course',
        href: '#/course/' + course.id,
        tags: course.tags || [],
        strong: norm(course.code + ' ' + course.name),
        weak: norm((course.description || '') + ' ' + (course.tags || []).join(' '))
      });

      sections.forEach(function (section) {
        var items = (indexes[course.id] && indexes[course.id][section.id]) || [];
        items.forEach(function (item, i) {
          records.push({
            kind: 'note',
            course: course,
            section: section,
            title: item.title,
            where: course.code + ' · ' + section.name,
            href: '#/note/' + course.id + '/' + section.id + '/' + i,
            tags: item.tags || [],
            strong: norm(item.title),
            weak: norm(course.code + ' ' + course.name + ' ' +
                       (item.tags || []).join(' ') + ' ' +
                       (item.keywords || []).join(' ') + ' ' +
                       (item.file || ''))
          });
        });
      });
    });

    return records;
  }

  /** Every token must appear somewhere; score rewards title matches. */
  function run(records, query) {
    var tokens = tokenize(query);
    if (!tokens.length) return [];

    var hits = [];
    records.forEach(function (r) {
      var score = 0;
      var ok = tokens.every(function (t) {
        var inStrong = r.strong.indexOf(t) !== -1;
        var inWeak = r.weak.indexOf(t) !== -1;
        if (inStrong) score += r.strong.indexOf(t) === 0 ? 12 : 8;
        if (inWeak) score += 3;
        return inStrong || inWeak;
      });
      if (ok) {
        if (r.kind === 'course') score += 2;
        hits.push({ record: r, score: score });
      }
    });

    hits.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.record.title.localeCompare(b.record.title);
    });

    return hits.map(function (h) { return h.record; });
  }

  return { build: build, run: run };
})();
