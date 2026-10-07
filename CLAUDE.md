# Project: Radiology Reporting Simulator (working name)

## What we are building
A web platform where radiologists practise reporting on real, full-stack CT/MRI cases
with proven final diagnoses, write their own report, then compare it with a reference
report and rubric.

## Who it is for
Radiologists who have already passed their exams (MD/DNB or equivalent) but have had
limited independent reporting experience and lack confidence. NOT an exam-prep product.
No MCQs, no single-image spotters, no theory courses.

## Core experience
1. Worklist: cases shown like a real RIS (age/sex, modality, terse clinical history).
   Never show diagnosis, tags or difficulty before the case is read.
2. Reading screen: OHIF viewer with the full stack + report panel + confidence rating
   + "would you call the clinician?" toggle.
3. Reveal: user's report beside the reference report, rubric checklist (self-assessed
   for now), annotated key findings, lesion overlays, proof of diagnosis, short teaching points.
4. Dashboard: performance by system/modality, error types (perception / interpretation /
   communication), confidence calibration. Stored in the browser for now.

## Content rules
- Every case needs a proven reference standard (histopathology, surgery, lab, follow-up
  imaging, clinical outcome, or expert consensus) and the case must record which one.
- Each case records what imaging alone can decide. If imaging is non-specific, the
  expected answer is a sensible differential + correct next step, not the pathology result.
- Include normals, subtle findings, mimics, variants and incidentals, not only dramatic cases.
- Every reference report and rubric is reviewed and signed off by a radiologist.

## Data sources (MVP)
- TCIA collections (start with neuro-oncology / glioma, DICOM, pathology-proven).
- OpenNeuro epilepsy/FCD datasets later (NIfTI, needs conversion to DICOM).
- Check and record the licence and required citation of EVERY collection used.
  Only use collections that allow commercial use (e.g. CC BY 4.0).

## Architecture (MVP, no backend)
- Frontend: static site hosted on GitHub Pages.
- Viewer: OHIF Viewer v3 in static DICOMweb mode. Keep the viewer swappable; case
  content must not depend on OHIF.
- Images: Cloudflare R2 (zero egress fees). Never store DICOM in the git repo.
- Each case = standard DICOM study + a separate case file (JSON) holding history,
  reference standard, findings, reference report, rubric, teaching points, tags, licence.
- User progress: browser storage only (no accounts yet).

## Repository rules
- Never commit DICOM, NIfTI or any patient data. Keep them in /data (gitignored).
- Code is open source (MIT). Reference reports and rubrics are the core asset and will
  live separately; do not publish them without the owner's approval.
- Owner works on Windows. Explain steps in plain language; ask before installing software.

## Later (not now)
AI grading of free-text reports, paid human second read, user accounts, B2B access for
teleradiology companies and hospitals, own custom viewer if needed.
