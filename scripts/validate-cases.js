/*
 * Checks every case listed in docs/cases/index.json: the public case file and its
 * separate reference file. Exits with code 1 if anything is wrong.
 *
 * Usage:  node scripts/validate-cases.js
 *
 * If a local copy of the data repo exists under data/<repo>/<caseId>/study.json, the
 * study index is checked too (it must be de-identified and point at the case's folder).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const casesDir = path.join(root, 'docs', 'cases');

const MODALITIES = ['MR', 'CT'];
const SYSTEMS = ['neuro', 'head-neck', 'spine', 'chest', 'abdomen', 'msk'];
const SEXES = ['M', 'F'];
const STANDARDS = [
  'histopathology', 'surgery', 'laboratory', 'follow-up-imaging', 'clinical-outcome',
  'expert-consensus',
];
const DIFFICULTIES = ['easy', 'moderate', 'hard'];
// Anything that gives the answer away belongs in the reference file only.
const FORBIDDEN_PUBLIC_KEYS = [
  'diagnosis', 'tags', 'difficulty', 'rubric', 'referenceReport', 'proofOfDiagnosis',
  'teachingPoints', 'referenceStandard', 'whatImagingCanDecide',
];

const errors = [];
const warnings = [];

function readJson(file, label) {
  if (!fs.existsSync(file)) {
    errors.push(`${label}: file is missing (${path.relative(root, file)})`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    errors.push(`${label}: not valid JSON (${error.message})`);
    return null;
  }
}

function isText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isTextOrNull(value) {
  return value === null || isText(value);
}

function isTextList(value) {
  return Array.isArray(value) && value.every(isText);
}

function checkPublic(id, c) {
  const at = `${id}.json`;
  const need = (ok, message) => ok || errors.push(`${at}: ${message}`);

  need(c.schema === 1, 'schema must be 1');
  need(c.id === id, `id must be "${id}"`);
  need(Number.isInteger(c.age) && c.age >= 0 && c.age <= 120, 'age must be a whole number');
  need(SEXES.includes(c.sex), `sex must be one of ${SEXES.join(', ')}`);
  need(MODALITIES.includes(c.modality), `modality must be one of ${MODALITIES.join(', ')}`);
  need(SYSTEMS.includes(c.system), `system must be one of ${SYSTEMS.join(', ')}`);
  need(isText(c.study), 'study is required');
  need(isText(c.history), 'history is required');
  need(isText(c.historyNote), 'historyNote is required (histories are written for teaching)');
  need(c.referenceFile === `${id}.reference.json`, `referenceFile must be "${id}.reference.json"`);

  const viewer = c.viewer || {};
  need(viewer.type === 'dicomjson', 'viewer.type must be "dicomjson"');
  need(
    isText(viewer.studyIndexUrl) &&
      viewer.studyIndexUrl.startsWith('https://') &&
      viewer.studyIndexUrl.endsWith(`/${id}/study.json`),
    `viewer.studyIndexUrl must be an https URL ending in /${id}/study.json`
  );

  const source = c.source || {};
  ['collection', 'licence', 'licenceUrl', 'citation', 'modifications'].forEach(key =>
    need(isText(source[key]), `source.${key} is required`)
  );

  FORBIDDEN_PUBLIC_KEYS.forEach(key =>
    need(!(key in c), `"${key}" must not be in the public case file (reference file only)`)
  );
}

function checkReference(id, ref) {
  const at = `${id}.reference.json`;
  const need = (ok, message) => ok || errors.push(`${at}: ${message}`);

  need(ref.schema === 1, 'schema must be 1');
  need(ref.caseId === id, `caseId must be "${id}"`);
  need(['draft', 'final'].includes(ref.status), 'status must be "draft" or "final"');

  const standard = ref.referenceStandard || {};
  need(STANDARDS.includes(standard.type), `referenceStandard.type must be one of ${STANDARDS.join(', ')}`);
  need(isText(standard.summary), 'referenceStandard.summary is required');
  need(isTextList(ref.proofOfDiagnosis) && ref.proofOfDiagnosis.length > 0, 'proofOfDiagnosis needs at least one line');
  need(isTextOrNull(ref.whatImagingCanDecide), 'whatImagingCanDecide must be text or null');

  const report = ref.referenceReport || {};
  need(isText(report.technique), 'referenceReport.technique is required');
  ['findings', 'impression', 'recommendation'].forEach(key =>
    need(isTextOrNull(report[key]), `referenceReport.${key} must be text or null`)
  );

  need(isTextList(ref.teachingPoints), 'teachingPoints must be a list of text');
  need(isTextList(ref.tags), 'tags must be a list of text');
  need(ref.difficulty === null || DIFFICULTIES.includes(ref.difficulty), `difficulty must be null or one of ${DIFFICULTIES.join(', ')}`);
  need(
    Array.isArray(ref.rubric) && ref.rubric.every(item => item && isText(item.id) && isText(item.text)),
    'rubric must be a list of { id, text } items'
  );

  if (ref.status === 'final') {
    const signOff = ref.signOff || {};
    need(isText(signOff.name) && /^\d{4}-\d{2}-\d{2}$/.test(signOff.date || ''), 'a final reference needs signOff { name, date YYYY-MM-DD }');
    need(isText(report.findings) && isText(report.impression), 'a final reference needs findings and impression');
    need(isText(ref.whatImagingCanDecide), 'a final reference needs whatImagingCanDecide');
  } else {
    need(ref.signOff === null, 'a draft reference must have signOff: null');
    warnings.push(`${id}: reference report is still a draft`);
  }
}

function checkLocalStudyIndex(id, c) {
  const dataDir = path.join(root, 'data');
  if (!fs.existsSync(dataDir)) {
    return;
  }
  const repos = fs.readdirSync(dataDir).filter(name => name.startsWith('learrad-cases-'));
  const indexFile = repos
    .map(repo => path.join(dataDir, repo, id, 'study.json'))
    .find(file => fs.existsSync(file));
  if (!indexFile) {
    warnings.push(`${id}: no local study index found under data/learrad-cases-*/${id}/`);
    return;
  }
  const at = path.relative(root, indexFile);
  const index = readJson(indexFile, at);
  if (!index) {
    return;
  }
  const need = (ok, message) => ok || errors.push(`${at}: ${message}`);
  const prefix = 'dicomweb:' + c.viewer.studyIndexUrl.replace(/study\.json$/, '');

  need(Array.isArray(index.studies) && index.studies.length === 1, 'must contain exactly one study');
  (index.studies || []).forEach(study => {
    need(study.PatientID === id && study.PatientName === id, `PatientID and PatientName must be "${id}"`);
    need(String(study.StudyInstanceUID).startsWith('2.25.'), 'StudyInstanceUID must be a re-indexed 2.25. UID');
    need(Array.isArray(study.series) && study.series.length > 0, 'study has no series');
    (study.series || []).forEach(series => {
      need(series.instances.length > 0, `series ${series.SeriesNumber} has no images`);
      need(
        series.instances.every(instance => instance.url.startsWith(prefix)),
        `series ${series.SeriesNumber}: image URLs must start with ${prefix}`
      );
      series.instances.forEach(instance => {
        const file = path.join(path.dirname(indexFile), instance.url.slice(prefix.length));
        if (!fs.existsSync(file)) {
          errors.push(`${at}: missing image file ${instance.url.slice(prefix.length)}`);
        }
      });
    });
  });
}

const index = readJson(path.join(casesDir, 'index.json'), 'index.json');
const ids = index && Array.isArray(index.cases) ? index.cases : [];
if (index && index.schema !== 1) {
  errors.push('index.json: schema must be 1');
}
if (new Set(ids).size !== ids.length) {
  errors.push('index.json: duplicate case ids');
}

for (const id of ids) {
  if (!/^[a-z0-9-]+$/.test(id)) {
    errors.push(`index.json: bad case id "${id}"`);
    continue;
  }
  const publicCase = readJson(path.join(casesDir, `${id}.json`), `${id}.json`);
  const reference = readJson(path.join(casesDir, `${id}.reference.json`), `${id}.reference.json`);
  if (publicCase) {
    checkPublic(id, publicCase);
    if (publicCase.viewer && isText(publicCase.viewer.studyIndexUrl)) {
      checkLocalStudyIndex(id, publicCase);
    }
  }
  if (reference) {
    checkReference(id, reference);
  }
}

// Case files on disk that the worklist would never show.
fs.readdirSync(casesDir)
  .filter(name => /^[a-z0-9-]+\.json$/.test(name) && name !== 'index.json')
  .map(name => name.replace(/\.json$/, ''))
  .filter(id => !ids.includes(id))
  .forEach(id => warnings.push(`${id}.json exists but is not listed in index.json`));

warnings.forEach(message => console.log(`warning: ${message}`));
errors.forEach(message => console.log(`ERROR: ${message}`));
console.log(`${ids.length} case(s) checked: ${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length ? 1 : 0);
