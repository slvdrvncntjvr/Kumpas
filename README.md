# Kumpas — Filipino Sign Language Communicator

> **Built for SparkFest 2026**

Kumpas is an offline-first Filipino Sign Language (FSL) communication
assistant for Deaf Filipinos in public-service and emergency situations.
It does not replace interpreters — it helps when one is unavailable.

---

## Project Brief

Deaf Filipinos often face communication barriers in everyday civic contexts:
barangay halls, clinics, transport, schools, and emergencies. Kumpas bridges
that gap with a mobile-first PWA that works **without internet**, speaks
phrases aloud in Filipino and English, and demonstrates real-time sign
language recognition using a custom-trained Filipino Sign Language model.

The app is designed for two people sharing one screen:

- **Deaf Filipinos** — quickly surface and speak a phrase that communicates
  their need.
- **Hearing staff** — receive a simplified, spoken message they can understand.

Core features work fully offline after first load. No account, no backend,
no internet required for essential communication.

---

## Team

- A Jose, Justin Gabriel
- Baes, Franz Emmanuel
- Delos Santos, Christian Joseph
- Javier, Salvador Vincent 

---

## Google Technologies Used

| Technology | How it's used in Kumpas |
|---|---|
| **Gemini API** | Powers online message simplification in Hearing Person Mode — converts complex staff language into plain, accessible text. Falls back to the offline rule-based simplifier when unavailable. |
| **TensorFlow.js** | Runs the custom-trained FSL Conv1D classifier directly in the browser — no server required, works offline after the model is cached |
| **MediaPipe Tasks Vision (Web)** | Real-time hand landmark extraction from the device camera, feeding the TFjs model with normalized 128-D feature vectors |
| **Firebase** | Planned optional sync of emergency profiles across devices (stub present, offline-first by design) |

---

## Features

- **Phrase library** — 35+ bilingual phrases (EN / Filipino) across Emergency,
  Health, Barangay, Transport, School, and Basic categories
- **Communication card** — full-screen large text + text-to-speech (ElevenLabs
  for natural Filipino; browser speech fallback when offline)
- **Emergency card** — persistent "I AM DEAF" card with name, emergency contact,
  and medical info; one-tap speak
- **Hearing Person Mode** — staff types a message; Gemini (online) or local
  rule-based simplifier makes it accessible; suggested phrase cards
- **Camera recognition demo** — real-time FSL recognition via MediaPipe →
  custom TensorFlow.js model
- **Bilingual UI** — English and Filipino toggle in Settings
- **Dark / light / system themes** — yellow-black bee palette, WCAG AA contrast
- **Offline-first PWA** — installable on Android and iOS, works without internet

---

## ML Model

| Detail | Value |
|---|---|
| Architecture | Conv1D temporal classifier (2× Conv1D + BN + MaxPool + GAP + Dense) |
| Input shape | `[1, 40, 128]` — 40 frames × 128 landmark features |
| Parameters | ~66,790 |
| Feature extraction | MediaPipe Hand Landmarker, wrist-relative + palm-scaled normalization |
| Training pipeline | DVC-versioned: validate → split → extract → train → evaluate |
| Current classes | YES, NO, DEAF, THANK YOU, SLOW, DON'T UNDERSTAND + civic signs |
| Baseline accuracy | 1.0 (macro F1) on held-out set — provisional, small dataset |

---

## Running Locally

npm install
npm run dev      # → http://localhost:3000
npm run build    # static export → out/

The ML training pipeline lives in training/. Python 3.12, TensorFlow 2.21, MediaPipe 0.10.35, DVC.

bash

# First time setup
- python -m venv training/.venv
- .\training\.venv\Scripts\python.exe -m pip install -r training/requirements.txt
- python -m dvc repro


## Stack
- Next.js 15 — App Router, static export PWA
- TypeScript + Tailwind CSS v4
- TensorFlow.js + MediaPipe Tasks Vision Web
- Gemini API — online text simplification
- ElevenLabs — natural Filipino text-to-speech
- @ducanh2912/next-pwa — Workbox service worker, offline caching
- Python training pipeline — TF/Keras, MediaPipe, DVC, scikit-learn

