import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type,x-app-password",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
});

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const db = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

const cleanMyid = (v: unknown) => String(v ?? "").replace(/\D/g, "");
const normName = (v: unknown) => String(v ?? "")
  .toUpperCase().normalize("NFKD").replace(/[’‘`]/g, "'")
  .replace(/[^A-Z0-9]+/g, " ").replace(/\s+/g, " ").trim();

async function sha256(v: string) {
  const bytes = new TextEncoder().encode(v);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function setting(key: string) {
  const { data, error } = await db.from("pajsk_settings").select("value").eq("key", key).maybeSingle();
  if (error) throw error;
  return String(data?.value || "");
}

async function requireAppPassword(req: Request) {
  const raw = req.headers.get("x-app-password") || "";
  if (!raw) return false;
  const expected = await setting("app_password_sha256");
  return Boolean(expected) && await sha256(raw) === expected;
}

async function getSession(year: number) {
  const { data, error } = await db.from("academic_sessions").select("id,year,name,is_active").eq("year", year).maybeSingle();
  if (error) throw error;
  return data;
}

async function getStudentMasterById(studentId: string, year: number) {
  const session = await getSession(year);
  if (!session) return null;
  const { data: student, error: se } = await db.from("students")
    .select("id,full_name,normalized_name,identification_no,idme_student_id,gender,active")
    .eq("id", studentId).maybeSingle();
  if (se) throw se;
  if (!student) return null;
  const { data: enrol, error: ee } = await db.from("student_enrolments")
    .select("class_id")
    .eq("student_id", studentId).eq("session_id", session.id).eq("is_current", true).maybeSingle();
  if (ee) throw ee;
  let cls: any = null;
  if (enrol?.class_id) {
    const { data, error } = await db.from("classes").select("id,code,name,year_level,class_teacher_name").eq("id", enrol.class_id).maybeSingle();
    if (error) throw error;
    cls = data;
  }
  return { student, session, cls };
}

async function findStudent(year: number, myidRaw: unknown, nameRaw: unknown) {
  const session = await getSession(year);
  if (!session) return { session: null, match: null, ambiguous: false };
  const myid = cleanMyid(myidRaw);
  const name = normName(nameRaw);
  let candidates: any[] = [];

  if (myid) {
    const { data, error } = await db.from("students")
      .select("id,full_name,normalized_name,identification_no,idme_student_id,gender,active")
      .eq("active", true)
      .or(`identification_no.eq.${myid},idme_student_id.eq.${myid}`)
      .limit(3);
    if (error) throw error;
    candidates = data || [];
  }

  if (!candidates.length && name) {
    const { data, error } = await db.from("students")
      .select("id,full_name,normalized_name,identification_no,idme_student_id,gender,active")
      .eq("active", true).eq("normalized_name", name).limit(3);
    if (error) throw error;
    candidates = data || [];
  }

  const enrolled: any[] = [];
  for (const s of candidates) {
    const { data: e, error } = await db.from("student_enrolments")
      .select("class_id").eq("student_id", s.id).eq("session_id", session.id).eq("is_current", true).maybeSingle();
    if (error) throw error;
    if (!e) continue;
    const { data: cls, error: ce } = await db.from("classes")
      .select("id,code,name,year_level,class_teacher_name").eq("id", e.class_id).maybeSingle();
    if (ce) throw ce;
    enrolled.push({ student: s, cls });
  }

  return { session, match: enrolled.length === 1 ? enrolled[0] : null, ambiguous: enrolled.length > 1 };
}

async function memberships(studentId: string, sessionId: string) {
  const { data: rows, error } = await db.from("student_unit_memberships")
    .select("unit_id,category").eq("student_id", studentId).eq("session_id", sessionId).eq("is_current", true);
  if (error) throw error;
  const ids = [...new Set((rows || []).map(r => r.unit_id).filter(Boolean))];
  let units: any[] = [];
  if (ids.length) {
    const { data, error: ue } = await db.from("units").select("id,name,slug,category,active").in("id", ids);
    if (ue) throw ue;
    units = data || [];
  }
  const byId = new Map(units.map(u => [u.id, u]));
  return (rows || []).map(r => {
    const u: any = byId.get(r.unit_id) || {};
    return { unitId: r.unit_id, category: String(r.category || u.category || ""), name: u.name || "", slug: u.slug || "" };
  });
}

function publicRecord(row: any) {
  if (!row) return null;
  return {
    kelabPersatuan: row.kelab_persatuan || null,
    badanBeruniform: row.badan_beruniform || null,
    sukanPermainan: row.sukan_permainan || null,
    ekstraKurikulum: row.ekstra_kurikulum || null,
    complete: Boolean(row.complete),
    status: row.status || "draft",
    source: row.source || "webapp",
    updatedAt: row.updated_at || null,
  };
}

function sanitizeCore(input: any) {
  if (!input || typeof input !== "object") return {};
  const pelibatan = Array.isArray(input.pelibatan || input.involvements) ? (input.pelibatan || input.involvements).slice(0, 3) : [];
  const komitmen = Array.isArray(input.komitmen || input.commitments) ? (input.komitmen || input.commitments).slice(0, 4) : [];
  let kehadiran = input.kehadiran ?? input.attendance ?? null;
  if (kehadiran !== null && kehadiran !== "") kehadiran = Math.max(0, Math.min(12, Number(kehadiran)));
  return {
    ditaksir: input.ditaksir ?? input.assessed ?? true,
    aktiviti: String(input.aktiviti ?? input.activity ?? input.activityLabel ?? "").trim(),
    jawatan: String(input.jawatan ?? input.position ?? input.positionLabel ?? "").trim(),
    pelibatan,
    pencapaian: input.pencapaian ?? input.achievement ?? null,
    komitmen,
    khidmatSumbangan: input.khidmatSumbangan ?? input.serviceContribution ?? null,
    kehadiran,
    skor: input.skor ?? input.score ?? null,
  };
}

function sanitizeExtra(input: any) {
  if (!input || typeof input !== "object") return {};
  const community = Array.isArray(input.khidmatMasyarakat || input.communityService)
    ? (input.khidmatMasyarakat || input.communityService).slice(0, 5) : [];
  return {
    ditaksir: input.ditaksir ?? input.assessed ?? true,
    perkhidmatan: input.perkhidmatan ?? input.serviceRole ?? null,
    anugerahKhas: input.anugerahKhas ?? input.specialAward ?? null,
    khidmatMasyarakat: community,
    nilamStars: input.nilamStars ?? input.nilam ?? null,
    skor: input.skor ?? input.score ?? null,
  };
}

function recordComplete(record: any) {
  const core = [record.kelabPersatuan, record.badanBeruniform, record.sukanPermainan];
  if (core.some((x: any) => !x || x.ditaksir === false || !x.aktiviti || !x.jawatan || x.kehadiran === null || x.kehadiran === undefined)) return false;
  return true;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "health");
    if (action === "health") return json({ success: true, service: "pajsk-api", version: "1.0.0" });
    if (!(await requireAppPassword(req))) return json({ success: false, error: "KATA_LALUAN_TIDAK_SAH" }, 401);

    if (action === "getConfig") {
      const { data, error } = await db.from("academic_sessions").select("year,name,is_active").order("year", { ascending: true });
      if (error) throw error;
      return json({ success: true, schoolName: await setting("school_name"), sessions: data || [] });
    }

    if (action === "getClasses") {
      const year = Number(body.year);
      const session = await getSession(year);
      if (!session) return json({ success: false, error: "Sesi tidak dijumpai." }, 404);
      const { data: classes, error } = await db.from("classes")
        .select("id,code,name,year_level,class_teacher_name").eq("session_id", session.id).order("year_level").order("code");
      if (error) throw error;
      const { data: records, error: re } = await db.from("pajsk_student_records")
        .select("class_code,complete").eq("session_year", year);
      if (re) throw re;
      const summary = new Map<string, { saved: number; complete: number }>();
      for (const r of records || []) {
        const s = summary.get(r.class_code) || { saved: 0, complete: 0 };
        s.saved += 1; if (r.complete) s.complete += 1; summary.set(r.class_code, s);
      }
      const out = [];
      for (const c of classes || []) {
        const { count, error: ce } = await db.from("student_enrolments").select("id", { count: "exact", head: true })
          .eq("session_id", session.id).eq("class_id", c.id).eq("is_current", true);
        if (ce) throw ce;
        const s = summary.get(c.code || "") || { saved: 0, complete: 0 };
        out.push({ ...c, total: count || 0, saved: s.saved, complete: s.complete });
      }
      return json({ success: true, year, classes: out });
    }

    if (action === "getStudents") {
      const year = Number(body.year);
      const classCode = String(body.classCode || "").trim();
      const session = await getSession(year);
      if (!session) return json({ success: false, error: "Sesi tidak dijumpai." }, 404);
      const { data: cls, error: ce } = await db.from("classes").select("id,code,name,year_level,class_teacher_name")
        .eq("session_id", session.id).eq("code", classCode).maybeSingle();
      if (ce) throw ce;
      if (!cls) return json({ success: false, error: "Kelas tidak dijumpai." }, 404);
      const { data: enrol, error: ee } = await db.from("student_enrolments").select("student_id")
        .eq("session_id", session.id).eq("class_id", cls.id).eq("is_current", true);
      if (ee) throw ee;
      const ids = (enrol || []).map(x => x.student_id);
      let students: any[] = [];
      if (ids.length) {
        const { data, error } = await db.from("students")
          .select("id,full_name,identification_no,idme_student_id,gender,active").in("id", ids).eq("active", true).order("full_name");
        if (error) throw error;
        students = data || [];
      }
      const { data: recs, error: re } = await db.from("pajsk_student_records").select("*")
        .eq("session_year", year).in("student_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
      if (re) throw re;
      const recMap = new Map((recs || []).map(r => [r.student_id, r]));
      const result = [];
      for (const s of students) {
        const r: any = recMap.get(s.id);
        const mem = await memberships(s.id, session.id);
        result.push({
          id: s.id,
          name: s.full_name,
          myid: s.identification_no || s.idme_student_id || "",
          gender: s.gender || "",
          classCode: cls.code || "",
          className: cls.name || "",
          yearLevel: cls.year_level,
          classTeacher: cls.class_teacher_name || "",
          memberships: mem,
          complete: Boolean(r?.complete),
          status: r?.status || "draft",
          record: publicRecord(r),
        });
      }
      return json({ success: true, class: cls, students: result });
    }

    if (action === "getStudent") {
      const year = Number(body.year);
      const found = body.studentId
        ? { session: await getSession(year), match: await (async () => {
            const m = await getStudentMasterById(String(body.studentId), year); return m ? { student: m.student, cls: m.cls } : null;
          })(), ambiguous: false }
        : await findStudent(year, body.mykid, body.name);
      if (!found.session || !found.match) return json({ success: true, found: false, ambiguous: found.ambiguous });
      const { student, cls } = found.match;
      const { data: r, error } = await db.from("pajsk_student_records").select("*")
        .eq("student_id", student.id).eq("session_year", year).maybeSingle();
      if (error) throw error;
      return json({ success: true, found: true, student: {
        id: student.id, name: student.full_name, myid: student.identification_no || student.idme_student_id || "",
        classCode: cls?.code || "", className: cls?.name || "", yearLevel: cls?.year_level ?? null,
        memberships: await memberships(student.id, found.session.id),
      }, record: publicRecord(r) });
    }

    if (action === "saveStudent") {
      const year = Number(body.year);
      const studentId = String(body.studentId || "");
      const master = await getStudentMasterById(studentId, year);
      if (!master?.student || !master.session || !master.cls) return json({ success: false, error: "Murid/sesi/kelas tidak dijumpai." }, 404);
      const incoming = body.record && typeof body.record === "object" ? body.record : {};
      const record = {
        kelabPersatuan: sanitizeCore(incoming.kelabPersatuan || incoming.kelab_persatuan || {}),
        badanBeruniform: sanitizeCore(incoming.badanBeruniform || incoming.badan_beruniform || {}),
        sukanPermainan: sanitizeCore(incoming.sukanPermainan || incoming.sukan_permainan || {}),
        ekstraKurikulum: sanitizeExtra(incoming.ekstraKurikulum || incoming.ekstra_kurikulum || {}),
      };
      const complete = body.complete === undefined ? recordComplete(record) : Boolean(body.complete);
      const status = complete ? "complete" : "draft";
      const row = {
        student_id: master.student.id,
        session_year: year,
        class_id: master.cls.id,
        class_code: master.cls.code || "",
        class_name: master.cls.name || "",
        year_level: master.cls.year_level,
        myid_cache: master.student.identification_no || master.student.idme_student_id || "",
        full_name_cache: master.student.full_name || "",
        kelab_persatuan: record.kelabPersatuan,
        badan_beruniform: record.badanBeruniform,
        sukan_permainan: record.sukanPermainan,
        ekstra_kurikulum: record.ekstraKurikulum,
        complete,
        status,
        source: "webapp",
      };
      const { error } = await db.from("pajsk_student_records").upsert(row, { onConflict: "student_id,session_year" });
      if (error) throw error;
      await db.from("pajsk_audit_log").insert({ action: "save_student", session_year: year, class_code: master.cls.code || "", student_id: master.student.id, detail: { complete } });
      return json({ success: true, saved: true, complete, status, record });
    }

    if (action === "getReferenceOptions") {
      const { data, error } = await db.from("pajsk_reference_options").select("section,code,label,score,meta,active").eq("active", true).order("section").order("id");
      if (error) throw error;
      return json({ success: true, options: data || [] });
    }

    return json({ success: false, error: `Action tidak dikenali: ${action}` }, 400);
  } catch (error) {
    console.error(error);
    return json({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
