/*
 * Prepares one study for publishing in a data repo:
 *   1. writes a de-identified, re-indexed copy of every DICOM file
 *   2. writes the OHIF "DICOM JSON" index (study.json) for that copy
 *
 * Usage:
 *   node scripts/build-case.js <sourceStudyFolder> <outputCaseFolder> <urlPrefix> <caseId>
 *
 * - sourceStudyFolder: the study as downloaded (any folder layout, *.dcm files)
 * - outputCaseFolder:  e.g. data/learrad-cases-01/c0001 (emptied first)
 * - urlPrefix:         public URL of outputCaseFolder, ending in "/"
 * - caseId:            public case id, e.g. c0001
 *
 * What changes in the published copy (pixel data is never touched):
 * - PatientName / PatientID / AccessionNumber / StudyID -> caseId or blank
 * - every UID issued by the source archive -> a new UID (same mapping everywhere, so
 *   series and references still fit together)
 * - every date -> PUBLISHED_DATE
 * - private tags and clinical-trial tags removed
 * The original IDs and the UID mapping are saved under data/private/ (gitignored).
 *
 * The index part is adapted from OHIF's .scripts/dicom-json-generator.js (MIT).
 */
const dcmjs = require('dcmjs');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const [sourceDir, outputDir, urlPrefix, caseId] = process.argv.slice(2);

if (!sourceDir || !outputDir || !urlPrefix || !caseId) {
  console.error(
    'Usage: node scripts/build-case.js <sourceStudyFolder> <outputCaseFolder> <urlPrefix> <caseId>'
  );
  process.exit(1);
}

const PUBLISHED_DATE = '20250101';
const SOURCE_UID_ROOT = '1.3.6.1.4.1.14519.'; // UIDs issued by TCIA
const DEID_NOTE = 'Learrad: IDs, UIDs and dates replaced';
const PRIVATE_DIR = path.join(__dirname, '..', 'data', 'private');

const { DicomMessage, DicomMetaDictionary } = dcmjs.data;

// dcmjs prints "Invalid vr type ox" once per file while parsing; silence it.
function quietly(fn) {
  const saved = { log: console.log, warn: console.warn, error: console.error };
  console.log = console.warn = console.error = () => {};
  try {
    return fn();
  } finally {
    Object.assign(console, saved);
  }
}

function toArrayBuffer(buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

function listDicomFiles(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(listDicomFiles(full));
    } else if (entry.name.toLowerCase().endsWith('.dcm')) {
      results.push(full);
    }
  }
  return results;
}

// ---- de-identification ----------------------------------------------------------

function loadSalt() {
  const saltFile = path.join(PRIVATE_DIR, 'uid-salt.txt');
  if (!fs.existsSync(saltFile)) {
    fs.mkdirSync(PRIVATE_DIR, { recursive: true });
    fs.writeFileSync(saltFile, crypto.randomBytes(32).toString('hex'));
  }
  return fs.readFileSync(saltFile, 'utf8').trim();
}

const salt = loadSalt();
const uidMap = {};

function remapUid(uid) {
  if (!uidMap[uid]) {
    const hash = crypto.createHash('sha256').update(salt + uid).digest('hex');
    uidMap[uid] = '2.25.' + BigInt('0x' + hash.slice(0, 32)).toString();
  }
  return uidMap[uid];
}

const TAG = {
  PixelData: '7FE00010',
  PatientName: '00100010',
  PatientID: '00100020',
  AccessionNumber: '00080050',
  StudyID: '00200010',
  DeidentificationMethod: '00120063',
};
// Group 0012 holds clinical-trial tags; these three describe the de-identification.
const KEEP_IN_GROUP_0012 = ['00120062', '00120063', '00120064'];

function deidentifyDataset(dataset) {
  for (const tag of Object.keys(dataset)) {
    const element = dataset[tag];
    const group = parseInt(tag.slice(0, 4), 16);

    if (group % 2 === 1 || (group === 0x0012 && !KEEP_IN_GROUP_0012.includes(tag))) {
      delete dataset[tag];
      continue;
    }
    if (tag === TAG.PixelData || !Array.isArray(element.Value)) {
      continue;
    }
    if (element.vr === 'SQ') {
      element.Value.forEach(item => item && deidentifyDataset(item));
    } else if (element.vr === 'UI') {
      element.Value = element.Value.map(v =>
        typeof v === 'string' && v.startsWith(SOURCE_UID_ROOT) ? remapUid(v) : v
      );
    } else if (element.vr === 'DA') {
      element.Value = element.Value.map(v => (v ? PUBLISHED_DATE : v));
    } else if (element.vr === 'DT') {
      element.Value = element.Value.map(v => (v ? PUBLISHED_DATE + '000000' : v));
    }
  }
}

function deidentify(dicomDict) {
  deidentifyDataset(dicomDict.meta);
  deidentifyDataset(dicomDict.dict);

  const ds = dicomDict.dict;
  ds[TAG.PatientName] = { vr: 'PN', Value: [{ Alphabetic: caseId }] };
  ds[TAG.PatientID] = { vr: 'LO', Value: [caseId] };
  ds[TAG.AccessionNumber] = { vr: 'SH', Value: [caseId] };
  ds[TAG.StudyID] = { vr: 'SH', Value: [''] };

  const method = ds[TAG.DeidentificationMethod];
  const methods = method && Array.isArray(method.Value) ? method.Value.filter(Boolean) : [];
  if (!methods.includes(DEID_NOTE)) {
    methods.push(DEID_NOTE);
  }
  ds[TAG.DeidentificationMethod] = { vr: 'LO', Value: methods };
}

function pixelHash(dicomDict) {
  const element = dicomDict.dict[TAG.PixelData];
  const hash = crypto.createHash('sha256');
  (element ? element.Value : []).forEach(part => hash.update(Buffer.from(part)));
  return hash.digest('hex');
}

// ---- DICOM JSON index ------------------------------------------------------------

function instanceMetadata(instance) {
  const metadata = {
    Columns: instance.Columns,
    Rows: instance.Rows,
    InstanceNumber: instance.InstanceNumber,
    SOPClassUID: instance.SOPClassUID,
    AcquisitionNumber: instance.AcquisitionNumber,
    PhotometricInterpretation: instance.PhotometricInterpretation,
    BitsAllocated: instance.BitsAllocated,
    BitsStored: instance.BitsStored,
    PixelRepresentation: instance.PixelRepresentation,
    SamplesPerPixel: instance.SamplesPerPixel,
    PixelSpacing: instance.PixelSpacing,
    HighBit: instance.HighBit,
    ImageOrientationPatient: instance.ImageOrientationPatient,
    ImagePositionPatient: instance.ImagePositionPatient,
    FrameOfReferenceUID: instance.FrameOfReferenceUID,
    ImageType: instance.ImageType,
    Modality: instance.Modality,
    SOPInstanceUID: instance.SOPInstanceUID,
    SeriesInstanceUID: instance.SeriesInstanceUID,
    StudyInstanceUID: instance.StudyInstanceUID,
    WindowCenter: instance.WindowCenter,
    WindowWidth: instance.WindowWidth,
    RescaleIntercept: instance.RescaleIntercept,
    RescaleSlope: instance.RescaleSlope,
    SliceThickness: instance.SliceThickness,
    SpacingBetweenSlices: instance.SpacingBetweenSlices,
  };
  for (const key of ['SeriesDate', 'AcquisitionDate', 'AcquisitionTime', 'NumberOfFrames']) {
    if (instance[key] !== undefined) {
      metadata[key] = instance[key];
    }
  }
  return metadata;
}

// ---- main --------------------------------------------------------------------------

const files = listDicomFiles(sourceDir);
if (files.length === 0) {
  console.error(`No .dcm files found in ${sourceDir}`);
  process.exit(1);
}

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

const studies = new Map();
const source = { patientIds: new Set(), studyUids: new Set() };
const usedPaths = new Set();
let totalBytes = 0;

for (const file of files) {
  const dicomDict = quietly(() => DicomMessage.readFile(toArrayBuffer(fs.readFileSync(file))));
  const original = quietly(() => DicomMetaDictionary.naturalizeDataset(dicomDict.dict));
  source.patientIds.add(original.PatientID);
  source.studyUids.add(original.StudyInstanceUID);
  const pixelsBefore = pixelHash(dicomDict);

  deidentify(dicomDict);
  const instance = quietly(() => DicomMetaDictionary.naturalizeDataset(dicomDict.dict));

  const seriesFolder = 's' + String(instance.SeriesNumber).padStart(2, '0');
  let relativePath = `${seriesFolder}/${String(instance.InstanceNumber).padStart(4, '0')}.dcm`;
  for (let n = 2; usedPaths.has(relativePath); n++) {
    relativePath = relativePath.replace(/(-\d+)?\.dcm$/, `-${n}.dcm`);
  }
  usedPaths.add(relativePath);

  const outFile = path.join(outputDir, relativePath);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const written = Buffer.from(quietly(() => dicomDict.write()));
  fs.writeFileSync(outFile, written);
  totalBytes += written.length;

  const check = quietly(() => DicomMessage.readFile(toArrayBuffer(written)));
  if (pixelHash(check) !== pixelsBefore) {
    console.error(`Pixel data changed while writing ${file}. Stopping.`);
    process.exit(1);
  }

  if (!studies.has(instance.StudyInstanceUID)) {
    studies.set(instance.StudyInstanceUID, {
      StudyInstanceUID: instance.StudyInstanceUID,
      StudyDescription: instance.StudyDescription,
      StudyDate: instance.StudyDate,
      StudyTime: instance.StudyTime,
      PatientName: caseId,
      PatientID: caseId,
      AccessionNumber: caseId,
      series: new Map(),
    });
  }
  const study = studies.get(instance.StudyInstanceUID);

  if (!study.series.has(instance.SeriesInstanceUID)) {
    study.series.set(instance.SeriesInstanceUID, {
      SeriesInstanceUID: instance.SeriesInstanceUID,
      SeriesDescription: instance.SeriesDescription,
      SeriesNumber: instance.SeriesNumber,
      SeriesTime: instance.SeriesTime,
      Modality: instance.Modality,
      SliceThickness: instance.SliceThickness,
      instances: [],
    });
  }
  study.series.get(instance.SeriesInstanceUID).instances.push({
    metadata: instanceMetadata(instance),
    url: `dicomweb:${urlPrefix}${relativePath}`,
  });
}

const model = {
  studies: [...studies.values()].map(study => {
    const series = [...study.series.values()].sort((a, b) => a.SeriesNumber - b.SeriesNumber);
    series.forEach(s =>
      s.instances.sort((a, b) => a.metadata.InstanceNumber - b.metadata.InstanceNumber)
    );
    return {
      ...study,
      series,
      NumInstances: series.reduce((n, s) => n + s.instances.length, 0),
      Modalities: [...new Set(series.map(s => s.Modality))].join('/'),
    };
  }),
};

const indexPath = path.join(outputDir, 'study.json');
fs.writeFileSync(indexPath, JSON.stringify(model));

fs.mkdirSync(PRIVATE_DIR, { recursive: true });
fs.writeFileSync(
  path.join(PRIVATE_DIR, `${caseId}.mapping.json`),
  JSON.stringify(
    {
      caseId,
      sourceFolder: path.resolve(sourceDir),
      sourcePatientIds: [...source.patientIds],
      sourceStudyUids: [...source.studyUids],
      uidMap,
    },
    null,
    2
  )
);

for (const study of model.studies) {
  console.log(`Study ${study.StudyInstanceUID}: ${study.NumInstances} images`);
  for (const s of study.series) {
    console.log(`  ${s.SeriesNumber}  ${s.SeriesDescription}  ${s.instances.length} images`);
  }
}
console.log(`Published copy: ${(totalBytes / 1048576).toFixed(1)} MB in ${files.length} files`);
console.log(`Pixel data verified unchanged in all ${files.length} files`);
console.log(`Index: ${(fs.statSync(indexPath).size / 1024).toFixed(0)} KB -> ${indexPath}`);
console.log(`Private mapping: data/private/${caseId}.mapping.json`);
