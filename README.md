# Radiology Reporting Simulator (working name: Learrad)

A web platform where radiologists practise reporting on real, full-stack CT/MRI
cases with proven final diagnoses: read the study, write a report, then compare
it with a reference report and rubric.

Built for qualified radiologists who want more independent reporting practice.
It is not an exam-prep product.

## Status

Early skeleton. Placeholder pages only.

## Layout

- `docs/` – the static site (served by GitHub Pages)
- `data/` – local imaging data, gitignored. DICOM/NIfTI are never committed.
- `CLAUDE.md` – project brief and rules

## Run locally

```bash
npx serve docs
```

## Run the OHIF viewer locally

One-time download of the prebuilt OHIF Viewer v3 into `tools/ohif` (gitignored):

```powershell
.\scripts\setup-ohif.ps1
```

Then start it and open a public sample study:

```bash
npx serve tools/ohif/package/dist -l 3000
```

http://localhost:3000/viewer?StudyInstanceUIDs=2.16.840.1.114362.1.11972228.22789312658.616067305.306.2

For now the viewer reads OHIF's public static DICOMweb demo server.

## Licence

Code is MIT (see `LICENSE`). Imaging data comes from third-party public
collections under their own licences; reference reports and rubrics are not
part of this repository.
