# PAJSK SKSA — Supabase Edition

## Kemas kini v1.3.1 — pencapaian tertinggi dan NILAM pilihan sahaja

- Tahap Pencapaian Tertinggi (Peringkat dan Kedudukan) untuk Kelab & Persatuan, Badan Beruniform dan Sukan & Permainan tidak wajib diisi.
- Program NILAM dalam Ekstra Kurikulum juga tidak wajib dipilih. Nilai kosong tidak menghasilkan amaran; jika diisi, nilainya masih disemak antara 1–5 bintang.
- Kiraan amaran pada kad murid, tab, ringkasan borang dan peringatan “Pengisian lengkap” menggunakan peraturan baharu ini secara seragam.
- Pilihan/data sedia ada dikekalkan. Medan lain masih menggunakan semakan asal.
- Perubahan webapp sahaja. Tiada perubahan pada API, Supabase atau extension Chrome. Tidak perlu migration SQL atau deploy semula Edge Function.
- Grid murid, popup, logo loading dan animasi simpan v1.3.0 dikekalkan.

Upload kandungan folder projek ini ke root repo frontend sedia ada, termasuk `public/`, kemudian deploy semula frontend. Versi ini menggantikan ZIP v1.3.0.

Pengesahan: `npm run lint`, `npm test` (10 ujian) dan `npm run build` lulus. Ujian Chromium dengan API tiruan juga lulus: ketiga-tiga tab pencapaian pilihan, NILAM boleh dikosongkan dan disimpan sebagai null, serta kiraan kad/tab dikemas kini. Tiada data produksi digunakan.

---

## Kemas kini v1.3.0 — grid murid, popup dan animasi Unit Koku

- Klik kelas untuk melihat semua murid dalam grid kad. Setiap kad memaparkan empat kategori dan bilangan medan yang perlu disemak, menggunakan validasi asal.
- Klik kad/nama murid untuk membuka borang asal dalam popup besar. Borang mempunyai scroll sendiri; tajuk, X dan SIMPAN kekal mudah dicapai.
- Selepas SIMPAN berjaya, kad murid dan kiraan lengkap pada kelas dikemas kini. Penanda “Pengisian lengkap” masih dikawal oleh guru seperti sebelum ini.
- X atau Escape menutup popup dan kembali ke grid kelas yang sama. Jika ada perubahan belum disimpan, pengesahan dipaparkan sebelum membuang perubahan tersebut.
- Logo Unit Koku dengan dua garisan pastel bercahaya berpusing mengikut arah jam dan lawan arah jam dipaparkan ketika memuatkan data, membuka borang dan menyimpan.
- Logo dibundel dalam `public/logo-unit-koku.png`, jadi animasi tidak bergantung pada Postimg semasa digunakan.
- Hanya selepas API mengesahkan simpan berjaya, mesej berikut dipaparkan bersama 26 hati kecil yang naik dan pudar:

  **MAKLUMAT TELAH DISIMPAN RAPI SEPERTI SAYA SIMPAN RAHSIA KITA BERDUA**

- Kegagalan simpan memaparkan ralat dan mengekalkan isian untuk dicuba semula. Tiada mesej kejayaan atau hati dipaparkan untuk simpan yang gagal.
- Animasi juga digunakan pada simpan pilihan PPKI. Susun atur responsif dan tetapan reduced motion disokong.

### Cara upload semula ke GitHub

1. Extract ZIP ini.
2. Buka folder `PAJSK-SKSA-main` dan upload **kandungannya** ke root repo frontend sedia ada (tempat `package.json` berada). Jangan letakkan satu lagi folder projek di dalam root repo.
3. Gantikan fail sedia ada dan pastikan folder baharu `public/` turut dimuat naik.
4. Commit dan deploy menggunakan proses sedia ada. Kekalkan environment variable dan tetapan hosting sedia ada.

Fail berubah untuk v1.3.0: `src/App.tsx`, `src/index.css`, `README.md`, `package.json`, `package-lock.json`. Fail baharu: `public/logo-unit-koku.png`.

API, validasi asal dan semua fail `supabase/` tidak berubah. **Tidak perlu SQL/migration atau deploy semula Supabase Edge Function.** ZIP tidak mengandungi `node_modules/` atau `dist/` dan belum dideploy.

### Semakan v1.3.0

```bash
npm ci
npm run lint
npm test
npm run build
```

TypeScript, sembilan ujian validasi dan build produksi lulus. Ujian interaksi Chromium dengan API tiruan turut lulus: kiraan empat kategori pada kad, popup, simpan slot Pelibatan 2 dan kehadiran 0, overlay loading, dua arah putaran, mesej kejayaan selepas respons pelayan, 26 hati, X/buka semula, kemas kini kiraan kelas, kegagalan simpan, pengesahan perubahan belum disimpan, paparan telefon 390px, PPKI dan reduced motion. Tiada ralat JavaScript pelayar. Ujian simpan sebenar ke Supabase perlu dibuat selepas deploy menggunakan akses sistem anda.

---

## Catatan versi asal

## Kemas kini v1.2.3 — amaran medan belum lengkap

- Medan kosong ditanda merah serta disenaraikan di bawah setiap tab. Jumlah amaran dipaparkan pada butang tab.
- SIMPAN tetap dibenarkan walaupun ada amaran. Amaran dikira semula serta-merta apabila guru mengubah pilihan.
- Kelab/Persatuan, Badan Beruniform dan Sukan/Permainan: semak Aktiviti, Jawatan, sekurang-kurangnya satu slot Pelibatan, kedua-dua medan Pencapaian, sekurang-kurangnya satu Komitmen (maksimum empat), Khidmat Sumbangan dan Kehadiran (0–12).
- Ekstra Kurikulum: Perkhidmatan/Jawatan dan Anugerah Khas ialah pilihan sahaja; boleh kosong tanpa amaran. Khidmat Masyarakat dan NILAM yang kosong masih diberi amaran seperti permintaan pengisian.
- Ini semakan kelengkapan webapp; bukan pengesahan penerimaan oleh iDME. Amaran tidak mengisi jawapan atau mencipta pencapaian murid secara automatik.
- Bahagian dengan Ditaksir tidak ditanda dikecualikan. Nilai kehadiran 0 sah; nilai kosong tidak lagi dipaparkan sebagai 12.
- Pilihan “Pengisian lengkap” kekal manual. Jika ditanda ketika masih ada amaran, peringatan tambahan dipaparkan.
- Tiada perubahan kepada API, struktur rekod, pemetaan extension, migrasi atau data Supabase. Semua fail dalam `supabase/` dan `src/lib/api.ts` kekal sama seperti ZIP asal.

### Kemas kini webapp sedia ada

Muat naik kandungan folder projek ini ke repositori frontend sedia ada, kemudian deploy melalui proses sedia ada. Kekalkan tetapan environment/deployment yang sedang digunakan. Kemas kini ini **tidak memerlukan** sebarang SQL/migration atau deploy semula Edge Function.

Fail pelaksanaan yang berubah: `src/App.tsx`, `src/index.css`; fail baharu: `src/lib/validation.ts`. `package.json` dan `package-lock.json` menyertakan jenis TypeScript React serta arahan ujian. ZIP ini belum dideploy ke laman langsung.

Pengesahan:

```bash
npm ci
npm run lint
npm test
npm run build
```

Sembilan ujian validasi lulus. Ujian interaksi pelayar dengan API tiruan juga lulus: amaran keempat-empat tab, amaran hilang secara langsung, pengecualian Perkhidmatan Ekstra dan Anugerah Khas, Ditaksir, SIMPAN ketika tidak lengkap, pengekalan payload asal, slot Pelibatan 2, kehadiran 0 dan lebar paparan telefon. Tiada data produksi digunakan dalam ujian.

---

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



## v1.2.1
- Betulkan Pelibatan 1/2/3 supaya setiap slot adalah bebas.
- Pilihan pada slot 2 atau slot 3 tidak lagi berpindah ke slot 1 selepas simpan / muat semula.
- Format simpan kekal sebagai objek `{ slot, peringkat }` untuk extension SPPB/iDME.

## v1.2.0
- Jawatan kosong dari Portal Koku dipraisi sebagai **AHLI AKTIF**.
- Komitmen ditukar kepada senarai checkbox iDME (maksimum 4).
- Khidmat Sumbangan ditukar kepada pilihan tunggal iDME.
- Ekstra Kurikulum Perkhidmatan, Anugerah Khas dan Khidmat Masyarakat menggunakan pilihan berstruktur, bukan input teks bebas.
- Khidmat Masyarakat menggunakan 7 kategori PAJSK dan jumlah maksimum 5 aktiviti.
