// Shared helpers for the static pages. No build step.

// Where the OHIF viewer lives. On localhost the viewer runs on its own port
// (see README); online it is deployed next to the site under viewer/.
var VIEWER_BASE =
  location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/'
    : new URL('viewer/', location.href).href;

function fetchJson(url) {
  return fetch(url).then(function (response) {
    if (!response.ok) {
      throw new Error('Could not load ' + url + ' (' + response.status + ')');
    }
    return response.json();
  });
}

// Public case metadata: cases/<id>.json. Never contains the diagnosis.
function loadCase(id) {
  if (!/^[a-z0-9-]+$/.test(id || '')) {
    return Promise.reject(new Error('Case not found. Go back to the worklist.'));
  }
  return fetchJson('cases/' + id + '.json');
}

function loadCases() {
  return fetchJson('cases/index.json').then(function (index) {
    return Promise.all(index.cases.map(loadCase));
  });
}

// The reference report lives in its own file so it can move behind login later.
// Only the reveal page may call this.
function loadReference(caseItem) {
  return fetchJson('cases/' + caseItem.referenceFile);
}

// The viewer is swappable: only this function knows OHIF's URL format.
function viewerUrl(caseItem) {
  return (
    VIEWER_BASE + 'viewer/dicomjson?url=' + encodeURIComponent(caseItem.viewer.studyIndexUrl)
  );
}

function caseLine(caseItem) {
  return (
    caseItem.id.toUpperCase() +
    ' · ' + caseItem.age + ' / ' + caseItem.sex +
    ' · ' + caseItem.study +
    ' · ' + caseItem.history
  );
}

function renderFooter() {
  var footer = document.createElement('footer');
  footer.innerHTML =
    '<p><strong>Not for clinical use.</strong> For education only. Clinical histories are ' +
    'written for teaching and are not the patients\' actual records.</p>' +
    '<p>Imaging data: Juvekar P, Dorent R, Kögl F, et al. (2023). The Brain Resection ' +
    'Multimodal Imaging Database (ReMIND) (Version 1) [dataset]. The Cancer Imaging Archive. ' +
    '<a href="https://doi.org/10.7937/3RAG-D070">doi:10.7937/3RAG-D070</a>. Licensed under ' +
    '<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Images modified: ' +
    'de-identified and defaced by the original authors, then further de-identified and ' +
    're-indexed for this site; pixel data unchanged. Use is subject to the ' +
    '<a href="https://www.cancerimagingarchive.net/data-usage-policies-and-restrictions/">TCIA ' +
    'Data Usage Policy</a>. Full credits: ' +
    '<a href="https://github.com/guptaakhil-md/learrad-cases-01#readme">learrad-cases-01</a>.</p>';
  document.body.appendChild(footer);
}

document.addEventListener('DOMContentLoaded', renderFooter);
