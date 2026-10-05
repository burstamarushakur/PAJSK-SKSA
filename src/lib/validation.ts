// Advisory checks only: never modify the record or block saving.
export type FormWarnings = Record<string, string>;
const filled = (value: unknown) => value !== null && value !== undefined && String(value).trim() !== '';
const integerInRange = (value: unknown, min: number, max: number) =>
  filled(value) && Number.isInteger(Number(value)) && Number(value) >= min && Number(value) <= max;

export function coreWarnings(data: any): FormWarnings {
  const d = data || {};
  if (d.ditaksir === false) return {};
  const errors: FormWarnings = {};
  if (!filled(d.aktiviti)) errors.aktiviti = 'Aktiviti Kokurikulum belum dipilih.';
  if (!filled(d.jawatan)) errors.jawatan = 'Jawatan belum dipilih.';
  // Slots are independent; slot 2 or 3 alone is a valid selection.
  if (!Array.isArray(d.pelibatan) || !d.pelibatan.some((p: any) => filled(p?.peringkat)))
    errors.pelibatan = 'Pelibatan belum diisi — pilih peringkat pada sekurang-kurangnya satu slot.';
  if (!filled(d.pencapaian?.peringkat)) errors.pencapaianPeringkat = 'Pencapaian: peringkat belum dipilih.';
  if (!filled(d.pencapaian?.kedudukan)) errors.pencapaianKedudukan = 'Pencapaian: kedudukan belum dipilih.';
  const commitments = Array.isArray(d.komitmen) ? d.komitmen.filter(filled) : [];
  if (!commitments.length) errors.komitmen = 'Komitmen belum dipilih.';
  else if (commitments.length > 4) errors.komitmen = 'Komitmen melebihi maksimum 4 pilihan.';
  if (!filled(d.khidmatSumbangan)) errors.khidmatSumbangan = 'Khidmat Sumbangan belum dipilih.';
  if (!integerInRange(d.kehadiran, 0, 12)) errors.kehadiran = 'Kehadiran belum diisi atau bukan bilangan 0–12.';
  return errors;
}

export function extraWarnings(data: any): FormWarnings {
  const d = data || {};
  if (d.ditaksir === false) return {};
  const errors: FormWarnings = {};
  // Perkhidmatan/Jawatan is intentionally optional for pupils without a role.
  if (!filled(d.anugerahKhas?.name) || !filled(d.anugerahKhas?.achievement))
    errors.anugerahKhas = 'Anugerah Khas belum dipilih atau belum lengkap.';
  const rows = Array.isArray(d.khidmatMasyarakat) ? d.khidmatMasyarakat : [];
  if (!rows.some((r: any) => filled(r?.activity) && integerInRange(r?.count, 1, 5)))
    errors.khidmatMasyarakat = 'Khidmat Masyarakat belum diisi.';
  else if (rows.some((r: any) => !filled(r?.activity) || !integerInRange(r?.count, 0, 5)) || rows.reduce((n: number, r: any) => n + Number(r?.count || 0), 0) > 5)
    errors.khidmatMasyarakat = 'Semak bilangan Khidmat Masyarakat — maksimum 5 aktiviti.';
  if (!integerInRange(d.nilamStars, 1, 5)) errors.nilamStars = 'Program NILAM belum dipilih atau bukan 1–5 bintang.';
  return errors;
}
