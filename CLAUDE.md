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

## Architecture (MVP, no backend, zero cost)
- Budget: the owner's only cost is a Claude subscription. No domain, no paid hosting,
  no card-on-file services for now.
- Frontend: static site hosted on GitHub Pages (guptaakhil-md.github.io/learrad).
- Viewer: OHIF Viewer v3 in static DICOMweb mode, deployed on GitHub Pages too. Keep the
  viewer swappable; case content must not depend on OHIF.
- Images: separate public GitHub data repos (e.g. learrad-cases-01), each served by its
  own GitHub Pages site as static DICOMweb. Same origin as the app, so no CORS problems.
  Stay under GitHub limits (100 MB per file, ~1 GB per Pages site); start a new data
  repo when one fills up. Cloudflare R2 is the upgrade path later, not now.
- DICOM is never committed to the main code repo (learrad). Only de-identified,
  licence-checked public-collection images may go into the data repos.
- Each case = standard DICOM study + a separate case file (JSON) holding history,
  reference standard, findings, reference report, rubric, teaching points, tags, licence.
- User progress: browser storage only (no accounts yet).

## Repository rules
- Never commit DICOM, NIfTI or any patient data. Keep them in /data (gitignored).
- Code is open source (MIT). Reference reports and rubrics are the core asset and will
  live separately; do not publish them without the owner's approval.
- Owner works on Windows. Explain steps in plain language; ask before installing software.

## Working with the Cowork session (READ THIS EVERY SESSION)
The owner talks mainly to a Claude Cowork session, which plans and reviews. You (Claude
Code) build. You talk to each other through files in `coord/`:
- `coord/PLAN.md` – the full roadmap. Written by Cowork. Follow it; if you disagree,
  say so in FROM_CODE.md instead of silently changing course.
- `coord/TO_CODE.md` – instructions from Cowork to you, numbered MSG-001, MSG-002...
  Work on every message marked `Status: OPEN`, oldest first.
- `coord/FROM_CODE.md` – your replies. Append a new section per message
  (`## RE MSG-00X`), never rewrite old ones. Use the template at the top of that file.
- `coord/PROGRESS.md` – the status board. You keep it current after every work
  session: phase status, what is done, what is blocked, what the owner must do.
When the owner says "check inbox" (or similar), re-read CLAUDE.md and coord/, do the
OPEN messages, update FROM_CODE.md and PROGRESS.md, then mark the message
`Status: DONE` in TO_CODE.md. Do not edit PLAN.md except ticking checkboxes.
Anything needing the owner (installs, accounts, approvals, medical sign-off) goes under
"Questions for owner" in your reply, and you stop at that point rather than guess.

## Later (not now)
AI grading of free-text reports, paid human second read, user accounts, B2B access for
teleradiology companies and hospitals, own custom viewer if needed.
