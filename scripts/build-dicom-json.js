/*
 * Builds the OHIF "DICOM JSON" index for one study folder of plain .dcm files.
 * Adapted from OHIF's .scripts/dicom-json-generator.js (MIT).
 *
 * Usage:
 *   node scripts/build-dicom-json.js <studyFolder> <urlPrefix> <outputJSON> [caseId]
 *
 * - studyFolder: folder holding the study, one sub-folder per series
 * - urlPrefix:   public URL of that folder, ending in "/"
 * - outputJSON:  where to write the index
 * - caseId:      optional. Shown in the viewer instead of the collection's patient ID,
 *                so the case cannot be looked up from the viewer header.
 */
const dcmjs = require('dcmjs');
const path = require('path');
const fs = require('fs');

// dcmjs prints "Invalid vr type ox" once per file while parsing; silence it.
function readDicom(arrayBuffer) {
  const saved = { log: console.log, warn: console.warn, error: console.error };
  console.log = console.warn = console.error = () => {};
  try {
    return dcmjs.data.DicomMessage.readFile(arrayBuffer);
  } finally {
    Object.assign(console, saved);
  }
}

const [studyDirectory, urlPrefix, outputPath, caseId] = process.argv.slice(2);

if (!studyDirectory || !urlPrefix || !outputPath) {
  console.error(
    'Usage: node scripts/build-dicom-json.js <studyFolder> <urlPrefix> <outputJSON> [caseId]'
  );
  process.exit(1);
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

const studies = new Map();
const files = listDicomFiles(studyDirectory);
let totalBytes = 0;

for (const file of files) {
  const buffer = fs.readFileSync(file);
  totalBytes += buffer.length;
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const dicomDict = readDicom(arrayBuffer);
  const instance = dcmjs.data.DicomMetaDictionary.naturalizeDataset(dicomDict.dict);

  if (!studies.has(instance.StudyInstanceUID)) {
    studies.set(instance.StudyInstanceUID, {
      StudyInstanceUID: instance.StudyInstanceUID,
      StudyDescription: instance.StudyDescription,
      StudyDate: instance.StudyDate,
      StudyTime: instance.StudyTime,
      PatientName: caseId || instance.PatientName,
      PatientID: caseId || instance.PatientID || 'unknown',
      AccessionNumber: caseId || instance.AccessionNumber,
      PatientAge: instance.PatientAge,
      PatientSex: instance.PatientSex,
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

  const relativePath = path.relative(studyDirectory, file).replace(/\\/g, '/');
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

fs.writeFileSync(outputPath, JSON.stringify(model));

for (const study of model.studies) {
  console.log(`Study ${study.StudyInstanceUID}: ${study.NumInstances} images`);
  for (const s of study.series) {
    console.log(`  ${s.SeriesNumber}  ${s.SeriesDescription}  ${s.instances.length} images`);
  }
}
console.log(`DICOM total: ${(totalBytes / 1048576).toFixed(1)} MB in ${files.length} files`);
console.log(`Index: ${(fs.statSync(outputPath).size / 1024).toFixed(0)} KB -> ${outputPath}`);
