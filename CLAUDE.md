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
- TCIA: start with ReMIND (CC BY 4.0, DICOM, surgery + histopathology proven). Most
  other TCIA brain MRI collections are now controlled-access: do not use them.
- OpenNeuro epilepsy/FCD datasets later (NIfTI, needs conversion to DICOM).
- Check and record the licence and required citation of EVERY collection used.
  Only use collections that allow commercial use (e.g. CC BY 4.0).

## Architecture (MVP, no backend, zero cost)
- Budget: the owner's only cost is a Claude subscription. No domain, no paid hosting.
- Repo `learrad` is public. Frontend: static site on GitHub Pages
  (guptaakhil-md.github.io/learrad).
- Viewer: OHIF Viewer v3, built from source in GitHub Actions with base path
  /learrad/viewer/ (+ 404.html fallback). Keep the viewer swappable; case content must
  not depend on OHIF.
- Images: plain .dcm files + one OHIF "DICOM JSON" index per study, in separate public
  GitHub data repos (learrad-cases-01, -02 ...), each with its own Pages site. Stay under
  ~1 GB per repo and 100 MB per file. Cloudflare R2 is the later upgrade path.
- Studies are shown COMPLETE (every series of the study as published). For ReMIND,
  the complete pre-op MRI study; intra-op MRI and ultrasound are not shown for now.
- DICOM is never committed to the code repo (learrad). Only de-identified,
  licence-checked public-collection images go into the data repos.
- Each case = DICOM study + public case metadata JSON + a SEPARATE reference report file
  (so it can move behind login in Phase 3).
- Phase 1–2: no login; reference reports are visible on the site (owner approved).
  Progress in browser storage, behind one async storage module.
- Phase 3 (later): Firebase Spark plan (free): Authentication + Firestore for progress
  synced across devices and reference reports locked until the user submits a report.
- Site shows CC BY credits, a note that images are de-identified/defaced and converted,
  and "not for clinical use".

## Repository rules
- Never commit DICOM, NIfTI or any patient data to the code repo. Local copies in /data
  (gitignored).
- Never commit `coord/` (private Cowork <-> Claude Code messages). Never force-add it.
- Code is open source (MIT). Owner approved publishing reference reports for the 10–15
  pilot cases. Rubrics and anything beyond that still need his approval.
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
AI grading / detailed report comparison, paid human second read, B2B access for
teleradiology companies and hospitals, own custom viewer if needed.
