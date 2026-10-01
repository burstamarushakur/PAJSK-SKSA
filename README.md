# PAJSK SKSA — Supabase Edition

PAJSK menggunakan **project Supabase yang sama** dengan Portal Koku dan BMI/SEGAK: `Perjumpaan Kokurikulum SKSA` (`sxmchnwzcbsanecxnqdt`).

## Pengasingan data

Portal Koku kekal sebagai master melalui `students`, `classes`, `student_enrolments`, `academic_sessions`, `student_unit_memberships` dan `units`. PAJSK **hanya membaca** objek master itu melalui Edge Function server-side.

PAJSK menulis hanya ke objek baru:
- `pajsk_student_records`
- `pajsk_settings`
- `pajsk_audit_log`
- `pajsk_reference_options`

`public.pajsk_records` lama milik Portal Koku **tidak diubah**. Tiada foreign key baru ke table Portal Koku.

## Backend live

Edge Function berikut telah dideploy dalam project yang sama:
- `pajsk-api` — API webapp
- `pajsk-extension-api` — lookup read-only untuk Chrome Extension

Frontend default terus menunjuk ke `https://sxmchnwzcbsanecxnqdt.supabase.co/functions/v1/pajsk-api`.

Password webapp menggunakan password sistem BMI/SEGAK yang sama, tetapi hanya hash disimpan dalam `pajsk_settings`. Plaintext password tidak berada dalam repo.

## Struktur data PAJSK

Empat modul per murid/sesi:
1. Kelab & Persatuan
2. Badan Beruniform
3. Sukan & Permainan
4. Ekstra Kurikulum

Tiga modul utama menyimpan Ditaksir, Aktiviti Kokurikulum, Jawatan, Pelibatan maksimum 3, Tahap Pencapaian, Komitmen maksimum 4, Khidmat Sumbangan dan Kehadiran 0–12. Ekstra menyimpan Perkhidmatan, Anugerah Khas, Khidmat Masyarakat maksimum 5 dan NILAM.

Aktiviti Kelab/Beruniform/Sukan akan dipraisi daripada `student_unit_memberships` Portal Koku apabila rekod PAJSK murid masih kosong.

## GitHub / deploy frontend

```bash
npm install
npm run build
```

Repo frontend tidak memerlukan service-role key atau Supabase anon key. Semua akses database melalui Edge Function.

## Supabase source

- `supabase/migrations/001_pajsk_schema.sql`
- `supabase/functions/pajsk-api/`
- `supabase/functions/pajsk-extension-api/`

Migration source disimpan untuk pemasangan semula; production project telah mempunyai objek ini.
