# Radiology Reporting Simulator (working name: Learrad)

A web platform where radiologists practise reporting on real, full-stack CT/MRI
cases with proven final diagnoses: read the study, write a report, then compare
it with a reference report.

Built for qualified radiologists who want more independent reporting practice.
It is not an exam-prep product. **Not for clinical use.**

## Status

Phase 1: one real case end to end. Worklist, reading screen (report saved in the
browser) and reveal page work for one case; its reference report is still a draft.

## Layout

- `docs/` – the static site (worklist, reading screen, reveal) and `cases/index.json`
- `viewer/` – our OHIF configuration
- `scripts/` – `setup-ohif.ps1` (local viewer), `download-remind.ps1` (fetch one pre-op study from TCIA),
  `build-case.js` (de-identify a study and build its index), `validate-cases.js`
  (check all case files; `npm run validate`)
- `.github/workflows/deploy.yml` – builds OHIF and publishes site + viewer to GitHub Pages
- `data/` – local imaging data, gitignored. DICOM/NIfTI are never committed here.
- `CLAUDE.md` – project brief and rules

Images live in separate public data repos (first one:
[learrad-cases-01](https://github.com/guptaakhil-md/learrad-cases-01)) as plain
`.dcm` files plus one OHIF "DICOM JSON" index per study.

## Run locally

One-time setup (downloads the prebuilt OHIF Viewer v3 into `tools/ohif`, gitignored):

```powershell
npm install
.\scripts\setup-ohif.ps1
```

Then, in two terminals:

```bash
npm run viewer
```

```bash
npm run site
```

Open http://localhost:3001. Note: GitHub Pages rejects cross-origin preflight
requests, so a local viewer cannot load images from the live data repos. To view
a case locally, serve a local copy of the data repo with CORS
(`npx serve data/learrad-cases-01 -l 3003 --cors`) and build its index with a
`http://localhost:3003/...` prefix.

## Add a study

```bash
node scripts/build-case.js <downloadedStudyFolder> data/learrad-cases-01/<caseId> <publicUrlOfThatFolder/> <caseId>
```

## Licence and data credits

Code is MIT (see `LICENSE`).

Imaging data is not part of this repository. Cases currently come from the ReMIND
collection on The Cancer Imaging Archive, licensed CC BY 4.0: Juvekar P, Dorent R,
Kögl F, et al. (2023). The Brain Resection Multimodal Imaging Database (ReMIND)
(Version 1) [dataset]. The Cancer Imaging Archive.
https://doi.org/10.7937/3RAG-D070. Use is subject to the
[TCIA Data Usage Policy](https://www.cancerimagingarchive.net/data-usage-policies-and-restrictions/).
