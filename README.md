# PAJSK SKSA — Supabase Edition

PAJSK menggunakan **project Supabase yang sama** dengan Portal Koku dan BMI/SEGAK: `Perjumpaan Kokurikulum SKSA` (`sxmchnwzcbsanecxnqdt`).

## Skop murid

- **Arus perdana PAJSK: Tahun 4, 5 dan 6 sahaja.** Tahun 1-3 tidak dipaparkan dalam webapp.
- **PPKI menggunakan aliran berasingan.** Webapp menyenaraikan semua murid PPKI aktif dan membenarkan pemilihan murid seperti aliran Sijil Berhenti/Tamat Sekolah. Borang PPKI tidak dicampur dengan struktur Tahun 4-6 kerana struktur SPPB/iDME PPKI berbeza.

## Integrasi Portal Koku

Portal Koku kekal master untuk `students`, `classes`, `student_enrolments`, `academic_sessions`, `student_unit_memberships`, `unit_committee_members` dan `units`.

Webapp PAJSK pra-isi perkara yang memang wujud dalam Portal Koku:
- unit Kelab & Persatuan,
- unit Badan Beruniform,
- unit Sukan & Permainan,
- jawatan jawatankuasa murid yang boleh dipadankan.

Nilai yang dihantar ke SPPB/iDME disimpan menggunakan **label tepat iDME**. Contohnya `AGAMA ISLAM` dalam Portal Koku dipadankan kepada `PERSATUAN AGAMA ISLAM (SR)`. Jawatan seperti `NAIB PENGERUSI 1/2/3` dipadankan kepada `NAIB PENGERUSI`, dan `AJK 1..n` kepada `AHLI JAWATANKUASA`.

Jika Portal Koku mempunyai unit/jawatan yang belum dapat dipastikan padanannya (contohnya unit yang tidak kelihatan dalam screenshot iDME), webapp tidak meneka. Ia ditanda **perlu semak** dan guru memilih label iDME sebenar daripada dropdown.

## Pengasingan data

PAJSK menulis hanya ke objek `pajsk_*`. `public.pajsk_records` lama milik Portal Koku tidak diubah.

Objek utama:
- `pajsk_student_records`
- `pajsk_settings`
- `pajsk_audit_log`
- `pajsk_reference_options`
- `pajsk_unit_idme_map`
- `pajsk_ppki_selections`

## Backend live

Edge Function production:
- `pajsk-api` — webapp
- `pajsk-extension-api` — Chrome Extension

Frontend default menunjuk ke `https://sxmchnwzcbsanecxnqdt.supabase.co/functions/v1/pajsk-api`.

Password PAJSK adalah **berasingan daripada BMI/SEGAK**. Repo tidak menyimpan plaintext password; hanya SHA-256 dalam `pajsk_settings`.

## GitHub / deploy frontend

```bash
npm install
npm run build
```

Frontend tidak menggunakan Supabase service-role key atau anon key. Semua akses database melalui Edge Function.

## Supabase source

- `supabase/migrations/001_pajsk_schema.sql`
- `supabase/migrations/002_pajsk_mainstream_ppki.sql`
- `supabase/migrations/003_pajsk_idme_reference.sql`
- `supabase/functions/pajsk-api/`
- `supabase/functions/pajsk-extension-api/`


## v1.2.0
- Jawatan kosong dari Portal Koku dipraisi sebagai **AHLI AKTIF**.
- Komitmen ditukar kepada senarai checkbox iDME (maksimum 4).
- Khidmat Sumbangan ditukar kepada pilihan tunggal iDME.
- Ekstra Kurikulum Perkhidmatan, Anugerah Khas dan Khidmat Masyarakat menggunakan pilihan berstruktur, bukan input teks bebas.
- Khidmat Masyarakat menggunakan 7 kategori PAJSK dan jumlah maksimum 5 aktiviti.
