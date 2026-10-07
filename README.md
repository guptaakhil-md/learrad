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

## Licence

Code is MIT (see `LICENSE`). Imaging data comes from third-party public
collections under their own licences; reference reports and rubrics are not
part of this repository.
