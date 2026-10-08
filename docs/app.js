// Shared helpers for the static pages. No build step.

// Where the OHIF viewer lives. On localhost the viewer runs on its own port
// (see README); online it is deployed next to the site under viewer/.
var VIEWER_BASE =
  location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/'
    : new URL('viewer/', location.href).href;

function loadCases() {
  return fetch('cases/index.json').then(function (response) {
    if (!response.ok) {
      throw new Error('Could not load the case list (' + response.status + ')');
    }
    return response.json().then(function (data) {
      return data.cases;
    });
  });
}

function findCase(cases, id) {
  for (var i = 0; i < cases.length; i++) {
    if (cases[i].id === id) {
      return cases[i];
    }
  }
  return null;
}

// The viewer is swappable: only this function knows OHIF's URL format.
function viewerUrl(caseItem) {
  return VIEWER_BASE + 'viewer/dicomjson?url=' + encodeURIComponent(caseItem.studyIndexUrl);
}

function renderFooter() {
  var footer = document.createElement('footer');
  footer.innerHTML =
    '<p><strong>Not for clinical use.</strong> For education only. Images are ' +
    'de-identified and defaced by the original authors and were converted for web viewing.</p>' +
    '<p>Imaging data: Juvekar P, Dorent R, Kögl F, et al. (2023). The Brain Resection ' +
    'Multimodal Imaging Database (ReMIND) (Version 1) [dataset]. The Cancer Imaging Archive. ' +
    '<a href="https://doi.org/10.7937/3RAG-D070">doi:10.7937/3RAG-D070</a>. Licensed under ' +
    '<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Use is subject to the ' +
    '<a href="https://www.cancerimagingarchive.net/data-usage-policies-and-restrictions/">TCIA ' +
    'Data Usage Policy</a>. Full credits: ' +
    '<a href="https://github.com/guptaakhil-md/learrad-cases-01#readme">learrad-cases-01</a>.</p>';
  document.body.appendChild(footer);
}

document.addEventListener('DOMContentLoaded', renderFooter);
