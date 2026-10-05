import { Children, cloneElement, isValidElement, useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { CheckCircle2, Circle, X, LogOut, RefreshCw, Save, UsersRound } from 'lucide-react';
import { apiCall } from './lib/api';
import { coreWarnings, extraWarnings, type FormWarnings } from './lib/validation';

type Membership={unitId:string;category:string;name:string;slug:string;idmeLabel?:string;mappingStatus?:string;portalPosition?:string;idmePosition?:string;positionMappingStatus?:string};
type Student={id:string;name:string;myid:string;gender:string;classCode:string;className:string;yearLevel:number;classTeacher?:string;memberships:Membership[];complete:boolean;status:string;record:any};
type ClassRow={id:string;code:string;name:string;year_level:number;class_teacher_name?:string;total:number;saved:number;complete:number};
type RefOption={section:string;code:string;label:string;score?:number|null;meta?:any};
type PpkiStudent={id:string;name:string;myid:string;classCode:string;className:string;selected:boolean};

const LOGO='https://i.postimg.cc/3RF9M05N/Logo-SKSA.png';
const KOKU_LOGO=`${import.meta.env.BASE_URL}logo-unit-koku.png`;
const SAVED_MESSAGE='MAKLUMAT TELAH DISIMPAN RAPI SEPERTI SAYA SIMPAN RAHSIA KITA BERDUA';
const tabs=[['kelabPersatuan','Kelab & Persatuan','club'],['badanBeruniform','Badan Beruniform','uniform'],['sukanPermainan','Sukan & Permainan','sport'],['ekstraKurikulum','Ekstra Kurikulum','extra']] as const;
const levels=['','ANTARABANGSA','KEBANGSAAN','NEGERI','BAHAGIAN (SABAH/SARAWAK)','ZON/DAERAH','SEKOLAH'];
const places=['','JOHAN','NAIB JOHAN','KETIGA','KEEMPAT','KELIMA'];
const emptyCore=()=>({ditaksir:true,aktiviti:'',portalAktiviti:'',unitId:'',activityMappingStatus:'',jawatan:'',portalJawatan:'',positionMappingStatus:'',pelibatan:[],pencapaian:null,komitmen:[],khidmatSumbangan:'',kehadiran:12});
const emptyExtra=()=>({ditaksir:true,perkhidmatan:null,anugerahKhas:null,khidmatMasyarakat:[],nilamStars:null});
const clone=<T,>(x:T):T=>JSON.parse(JSON.stringify(x));

function initRecord(student:Student){
  const r=clone(student.record||{});
  r.kelabPersatuan={...emptyCore(),...(r.kelabPersatuan||{})};
  r.badanBeruniform={...emptyCore(),...(r.badanBeruniform||{})};
  r.sukanPermainan={...emptyCore(),...(r.sukanPermainan||{})};
  r.ekstraKurikulum={...emptyExtra(),...(r.ekstraKurikulum||{})};
  return r;
}

export default function App(){
  const [password,setPassword]=useState(sessionStorage.getItem('pajsk_app_password')||'');
  const [logged,setLogged]=useState(false); const [loginError,setLoginError]=useState('');
  const [sessions,setSessions]=useState<any[]>([]); const [year,setYear]=useState(2026);
  const [refs,setRefs]=useState<RefOption[]>([]);
  const [mode,setMode]=useState<'mainstream'|'ppki'>('mainstream');
  const [classes,setClasses]=useState<ClassRow[]>([]); const [classCode,setClassCode]=useState('');
  const [students,setStudents]=useState<Student[]>([]); const [selectedId,setSelectedId]=useState('');
  const [record,setRecord]=useState<any>(null); const [tab,setTab]=useState<string>('kelabPersatuan');
  const [complete,setComplete]=useState(false); const [busy,setBusy]=useState(false); const [status,setStatus]=useState('');
  const [busyLabel,setBusyLabel]=useState('Memuatkan maklumat...');
  const [saveSuccess,setSaveSuccess]=useState(0);
  const dismissSuccess=useCallback(()=>setSaveSuccess(0),[]);
  const [ppki,setPpki]=useState<PpkiStudent[]>([]);

  const selected=useMemo(()=>students.find(s=>s.id===selectedId)||null,[students,selectedId]);
  const activeTab=useMemo(()=>tabs.find(t=>t[0]===tab),[tab]);

  const warningsByTab:Record<string,FormWarnings>=Object.fromEntries(tabs.map(([key])=>[key,record?(key==='ekstraKurikulum'?extraWarnings(record[key]):coreWarnings(record[key])):{}]));
  const warningCount=Object.values(warningsByTab).reduce((n,issues)=>n+Object.keys(issues).length,0);

  async function login(){
    if(busy)return;
    setBusyLabel('Menyemak akses sistem...');setBusy(true);setLoginError('');
    try{
      const [d,r]:any[]=await Promise.all([apiCall('getConfig',{},password),apiCall('getReferenceOptions',{},password)]);
      sessionStorage.setItem('pajsk_app_password',password);
      setSessions(d.sessions||[]);setRefs(r.options||[]);
      const ys=(d.sessions||[]).map((x:any)=>Number(x.year));
      const y=ys.includes(new Date().getFullYear())?new Date().getFullYear():(ys.at(-1)||2026);
      setYear(y);setLogged(true);await loadClasses(y,password);
    }catch(e:any){setLoginError(e.message||String(e));}finally{setBusy(false)}
  }
  async function loadClasses(y=year,pw?:string){
    setBusyLabel('Memuatkan maklumat...');setBusy(true);setStatus('');
    try{const d:any=await apiCall('getClasses',{year:y},pw);setClasses(d.classes||[]);setClassCode('');setStudents([]);setSelectedId('');setRecord(null);}
    catch(e:any){setStatus(e.message);}finally{setBusy(false)}
  }
  async function loadStudents(code:string){
    setBusyLabel('Memuatkan maklumat...');setBusy(true);setStatus('');
    try{const d:any=await apiCall('getStudents',{year,classCode:code});setStudents(d.students||[]);setClassCode(code);setSelectedId('');setRecord(null);}
    catch(e:any){setStatus(e.message);}finally{setBusy(false)}
  }
  async function loadPpki(y=year,pw?:string){
    setBusyLabel('Memuatkan maklumat...');setBusy(true);setStatus('');
    try{const d:any=await apiCall('getPpkiStudents',{year:y},pw);setPpki(d.students||[]);}
    catch(e:any){setStatus(e.message);}finally{setBusy(false)}
  }
  async function switchMode(next:'mainstream'|'ppki'){
    setSaveSuccess(0);setMode(next);setStatus('');setClassCode('');setStudents([]);setSelectedId('');setRecord(null);
    if(next==='ppki') await loadPpki(); else await loadClasses();
  }
  async function changeYear(y:number){
    setSaveSuccess(0);setYear(y);setClassCode('');setStudents([]);setSelectedId('');setRecord(null);
    if(mode==='ppki')await loadPpki(y);else await loadClasses(y);
  }
  async function chooseStudent(s:Student){
    if(busy)return;
    setBusyLabel('Membuka borang murid...');setBusy(true);setSaveSuccess(0);
    // Give the loading indicator a painted frame before mounting the long form.
    await new Promise(resolve=>window.setTimeout(resolve,280));
    setSelectedId(s.id);setRecord(initRecord(s));setComplete(!!s.complete);setTab('kelabPersatuan');setStatus('');setBusy(false);
  }
  function closeStudent(){
    if(busy)return;
    const changed=selected&&(JSON.stringify(record)!==JSON.stringify(initRecord(selected))||complete!==!!selected.complete);
    if(changed&&!window.confirm('Perubahan belum disimpan. Tutup borang dan buang perubahan ini?'))return;
    setSelectedId('');setRecord(null);setStatus('');setSaveSuccess(0);
  }
  async function save(){
    if(!selected||!record||busy)return;
    setBusyLabel('Menyimpan maklumat ke Supabase...');setBusy(true);setStatus('');setSaveSuccess(0);
    try{
      const d:any=await apiCall('saveStudent',{year,studentId:selected.id,record,complete});
      const updated={...selected,record:clone(d.record),complete:!!d.complete,status:d.status};
      setStudents(v=>v.map(s=>s.id===selected.id?updated:s));
      setClasses(v=>v.map(c=>c.code===classCode?{...c,complete:c.complete+Number(updated.complete)-Number(selected.complete)}:c));
      setRecord(initRecord(updated));setComplete(updated.complete);
      setStatus('Rekod PAJSK berjaya disimpan.');setSaveSuccess(Date.now());
    }catch(e:any){setStatus(`Gagal menyimpan: ${e.message||String(e)}. Sila cuba semula.`);}finally{setBusy(false)}
  }
  async function savePpki(){
    if(busy)return;
    setBusyLabel('Menyimpan pilihan PPKI ke Supabase...');setBusy(true);setStatus('');setSaveSuccess(0);
    try{const selectedIds=ppki.filter(x=>x.selected).map(x=>x.id);const d:any=await apiCall('savePpkiSelections',{year,selectedIds});setStatus(`Pilihan PPKI disimpan: ${d.selectedCount} murid.`);setSaveSuccess(Date.now());}
    catch(e:any){setStatus(`Gagal menyimpan: ${e.message||String(e)}. Sila cuba semula.`);}finally{setBusy(false)}
  }
  function logout(){sessionStorage.removeItem('pajsk_app_password');setLogged(false);setPassword('');setClasses([]);setStudents([]);setPpki([]);setRecord(null)}

  if(!logged)return <div className="login"><div className="loginCard"><img src={LOGO}/><h1>SISTEM PAJSK SKSA</h1><p>SEKOLAH KEBANGSAAN SUNGAI ABONG</p><input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!busy&&login()} placeholder="Password sistem"/><button onClick={login} disabled={busy}>{busy?'Menyemak...':'MASUK'}</button>{loginError&&<div className="error" role="alert">{loginError}</div>}</div>{busy&&<LoadingOverlay label={busyLabel}/>}</div>;

  return <div className="app">
    <header><div className="brand"><img src={LOGO}/><div><b>SISTEM PAJSK SKSA</b><small>Master murid/unit: Supabase Portal Koku</small></div></div><div className="topActions"><select value={year} onChange={e=>changeYear(Number(e.target.value))}>{sessions.map(s=><option key={s.year} value={s.year}>SESI {s.year}</option>)}</select><button onClick={()=>mode==='ppki'?loadPpki():loadClasses()}><RefreshCw size={16}/> Muat Semula</button><button onClick={logout}><LogOut size={16}/> Keluar</button></div></header>
    <main>
      <div className="modeTabs"><button className={mode==='mainstream'?'active':''} onClick={()=>switchMode('mainstream')}>TAHAP 2 · TAHUN 4-6</button><button className={mode==='ppki'?'active':''} onClick={()=>switchMode('ppki')}>PPKI</button></div>
      {mode==='mainstream'?<>
        <section className="classes"><div><b>PILIH KELAS TAHAP 2</b><small>PAJSK arus perdana hanya Tahun 4, 5 dan 6. Tahun 1-3 tidak dipaparkan.</small></div><div className="classGrid">{classes.map(c=><button key={c.id} className={classCode===c.code?'active':''} onClick={()=>loadStudents(c.code)}><span>{c.code}</span><small>{c.complete}/{c.total} lengkap</small></button>)}</div></section>
        {classCode&&<section className="classWorkspace" aria-label={`Murid kelas ${classCode}`}>
          <div className="classHeading"><div><h2>Kelas {classCode}</h2><p>Klik nama murid untuk buka borang pengisian PAJSK.</p></div><span className="classSummary"><UsersRound size={18}/>{students.filter(s=>s.complete).length}/{students.length} lengkap</span></div>
          <div className="studentGrid">{students.map((s,index)=>{
            const saved=initRecord(s);
            return <button type="button" key={s.id} className={`studentCard ${s.complete?'isComplete':''}`} onClick={()=>chooseStudent(s)} aria-label={`Buka borang ${s.name}`}>
              <span className="studentCardTop"><span className="studentNumber">{String(index+1).padStart(2,'0')}</span><span className={`studentState ${s.complete?'done':''}`}>{s.complete?<CheckCircle2 size={14}/>:<Circle size={14}/>} {s.complete?'Ditanda lengkap':'Belum lengkap'}</span></span>
              <strong className="studentName">{s.name}</strong>
              <span className="studentMeta">{s.className} · Tahun {s.yearLevel}</span>
              <span className="studentStatuses">{tabs.map(([key,label])=>{
                const count=Object.keys(key==='ekstraKurikulum'?extraWarnings(saved[key]):coreWarnings(saved[key])).length;
                return <span key={key} className={`categoryStatus ${count?'needsReview':'ready'}`}><span>{label}</span><b aria-label={count?`${count} medan belum lengkap`:'Tiada amaran'}>{count?`! ${count}`:'✓'}</b></span>
              })}</span>
              <span className="openStudent">Buka pengisian <span aria-hidden="true">↗</span></span>
            </button>
          })}</div>
          {!students.length&&<div className="empty">Tiada murid dalam kelas ini.</div>}
        </section>}
        {selected&&record&&<StudentModal onClose={closeStudent}>
          <div className="modalHeader"><div className="studentHead"><div><h2 id="student-modal-title">{selected.name}</h2><p>{selected.myid||'-'} · {selected.className} · Tahun {selected.yearLevel}</p></div><label className="complete"><input type="checkbox" checked={complete} onChange={e=>setComplete(e.target.checked)}/> Pengisian lengkap</label></div><button type="button" className="modalClose" aria-label="Tutup borang murid" onClick={closeStudent}><X size={22}/></button></div>
          <div className="modalScroll">
            <div className="prefillInfo">Aktiviti dan jawatan yang boleh dipadankan telah diambil terus daripada Portal Koku. Nilai disimpan menggunakan label SPPB/iDME supaya extension tidak perlu meneka semasa pemindahan.</div>
            <div className="tabs">{tabs.map(([k,l])=>{const count=Object.keys(warningsByTab[k]).length;return <button className={`${tab===k?'active':''} ${count?'hasWarnings':''}`} key={k} onClick={()=>setTab(k)}>{l}{count>0&&<span className="warningBadge" aria-label={`${count} amaran`}>! {count}</span>}</button>})}</div>
            <div className="validationInfo">Medan bertanda merah perlu disemak. SIMPAN tetap boleh digunakan untuk sambung kemudian. Perkhidmatan/Jawatan dan Anugerah Khas Ekstra Kurikulum ialah pilihan sahaja; boleh dikosongkan jika tidak berkenaan.</div>
            {complete&&warningCount>0&&<div className="completionWarning" role="status">“Pengisian lengkap” ditanda, tetapi masih ada {warningCount} amaran medan. Semak tab bertanda merah sebelum pemindahan ke iDME.</div>}
            {tab==='ekstraKurikulum'?<ExtraForm refs={refs} data={record.ekstraKurikulum} onChange={(v:any)=>setRecord({...record,ekstraKurikulum:v})}/>:<CoreForm category={(activeTab?.[2]||'club') as 'club'|'uniform'|'sport'} refs={refs} data={record[tab]} onChange={(v:any)=>setRecord({...record,[tab]:v})}/>} 
          </div>
            <div className="savebar modalSave"><span role="status">{status||'Klik SIMPAN untuk menyimpan perubahan sebelum tutup.'}</span><button onClick={save} disabled={busy}><Save size={16}/> {busy?'MENYIMPAN...':'SIMPAN'}</button></div>
          {saveSuccess>0&&<SaveCelebration key={saveSuccess} onDismiss={dismissSuccess}/>}
        </StudentModal>}
        {!classCode&&<div className="welcome">Pilih kelas Tahun 4, 5 atau 6 di atas.</div>}
      </>:<PpkiPanel students={ppki} setStudents={setPpki} onSave={savePpki} busy={busy} status={status}/>} 
      {status&&!selected&&mode==='mainstream'&&<div className="pageStatus" role="status">{status}</div>}
    </main>
    {saveSuccess>0&&mode==='ppki'&&<SaveCelebration key={saveSuccess} onDismiss={dismissSuccess}/>}
    {busy&&<LoadingOverlay label={busyLabel}/>}
  </div>
}

function StudentModal({children,onClose}:{children:ReactNode;onClose:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    const el=dialog.current!;const previous=document.activeElement as HTMLElement|null;
    const overflow=document.body.style.overflow;document.body.style.overflow='hidden';el.showModal();
    return()=>{el.close();document.body.style.overflow=overflow;previous?.focus({preventScroll:true})};
  },[]);
  return <dialog ref={dialog} className="studentModal" aria-labelledby="student-modal-title" onCancel={e=>{e.preventDefault();onClose()}}>{children}</dialog>;
}
function LoadingOverlay({label}:{label:string}){
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const el=dialog.current!;el.showModal();return()=>el.close()},[]);
  return <dialog ref={dialog} className="loadingOverlay" aria-label={label} onCancel={e=>e.preventDefault()}>
    <div role="status" aria-live="polite" className="loadingContent">
      <div className="kokuLoader"><span className="electricOrbit orbitClockwise"/><span className="electricOrbit orbitCounter"/><img src={KOKU_LOGO} alt="Unit Kokurikulum"/></div>
      <strong>{label}</strong><small>Sebentar ya, sistem sedang bekerja.</small>
    </div>
  </dialog>;
}
function SaveCelebration({onDismiss}:{onDismiss:()=>void}){
  useEffect(()=>{const timer=window.setTimeout(onDismiss,6500);return()=>window.clearTimeout(timer)},[onDismiss]);
  return <div className="saveCelebration">
    <div className="heartShower" aria-hidden="true">{Array.from({length:26},(_,i)=><span key={i} style={{'--left':`${(i*37)%100}%`,'--delay':`${(i%8)*.16}s`,'--drift':`${(i%2?1:-1)*(20+i*3)}px`,'--size':`${12+(i%5)*4}px`} as CSSProperties}>♥</span>)}</div>
    <div className="successToast" role="status" aria-live="polite"><CheckCircle2 size={25}/><p>{SAVED_MESSAGE}</p><button type="button" aria-label="Tutup mesej berjaya" onClick={onDismiss}><X size={18}/></button></div>
  </div>;
}

function CoreForm({data,onChange,category,refs}:{data:any,onChange:(v:any)=>void;category:'club'|'uniform'|'sport';refs:RefOption[]}){
  const d=data||emptyCore(); const patch=(x:any)=>onChange({...d,...x});
  const errors=coreWarnings(d);
  const savedPelibatan:Array<any>=Array.isArray(d.pelibatan)?d.pelibatan:[];
  // Pelibatan 1/2/3 ialah slot bebas, bukan senarai berturutan.
  // Contoh: hanya slot 2 boleh diisi tanpa slot 1. Gunakan `slot` untuk
  // meletakkan semula nilai pada dropdown yang betul selepas save/reload.
  const pel=[1,2,3].map(slot=>{
    const found=savedPelibatan.find((x:any,index:number)=>Number(x?.slot??(index+1))===slot);
    return found?{...found,slot}:{slot,peringkat:''};
  });
  const activities=refs.filter(x=>x.section===`activity_${category}`).map(x=>x.label);
  const positions=refs.filter(x=>x.section===`position_${category}`).map(x=>x.label);
  const commitmentOptions=refs.filter(x=>x.section==='commitment');
  const serviceOptions=refs.filter(x=>x.section==='service_contribution');
  const selectedCommitments:Array<string>=Array.isArray(d.komitmen)?d.komitmen:[];
  const toggleCommitment=(label:string)=>{
    if(selectedCommitments.includes(label)) patch({komitmen:selectedCommitments.filter(x=>x!==label)});
    else if(selectedCommitments.length<4) patch({komitmen:[...selectedCommitments,label]});
  };
  return <div className="form">
    <label className="switch"><input type="checkbox" checked={d.ditaksir!==false} onChange={e=>patch({ditaksir:e.target.checked})}/> Ditaksir</label>
    <div className="grid2">
      <Field label="Aktiviti Kokurikulum (label iDME)" error={errors.aktiviti}><ExactSelect value={d.aktiviti||''} options={activities} onChange={v=>patch({aktiviti:v,activityMappingStatus:'manual'})}/><SourceHint label="Portal Koku" value={d.portalAktiviti} status={d.activityMappingStatus}/></Field>
      <Field label="Jawatan (label iDME)" error={errors.jawatan}><ExactSelect value={d.jawatan||''} options={positions} onChange={v=>patch({jawatan:v,positionMappingStatus:'manual'})}/><SourceHint label="Jawatan Portal Koku" value={d.portalJawatan} status={d.positionMappingStatus}/></Field>
    </div>
    <Card title="Pelibatan (maksimum 3)" error={errors.pelibatan}>{pel.map((p,i)=><div className="grid2" key={i}><Field label={`Pelibatan ${i+1} - Peringkat`} invalid={!!errors.pelibatan}><select value={p.peringkat||''} onChange={e=>{
      const a=pel.map((row:any)=>({...row}));
      a[i]={...a[i],peringkat:e.target.value,slot:i+1};
      // Simpan hanya slot yang berisi, tetapi kekalkan nombor slot asal.
      // Jangan compact/reindex kerana slot 2 atau 3 boleh wujud sendiri.
      patch({pelibatan:a.filter((x:any)=>String(x.peringkat||'').trim()).map((x:any)=>({slot:Number(x.slot),peringkat:x.peringkat}))});
    }}>{levels.map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Slot"><input value={i+1} disabled/></Field></div>)}</Card>
    <Card title="Tahap Pencapaian Tertinggi"><div className="grid2"><Field label="Peringkat" error={errors.pencapaianPeringkat}><select value={d.pencapaian?.peringkat||''} onChange={e=>patch({pencapaian:{...(d.pencapaian||{}),peringkat:e.target.value}})}>{levels.map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Kedudukan" error={errors.pencapaianKedudukan}><select value={d.pencapaian?.kedudukan||''} onChange={e=>patch({pencapaian:{...(d.pencapaian||{}),kedudukan:e.target.value}})}>{places.map(x=><option key={x}>{x}</option>)}</select></Field></div></Card>
    <Card title="Komitmen (maksimum 4)" error={errors.komitmen}>
      <div className="choiceList">{commitmentOptions.map(o=>{const checked=selectedCommitments.includes(o.label);const disabled=!checked&&selectedCommitments.length>=4;return <label className={`choiceRow ${disabled?'disabled':''}`} key={o.code}><input type="checkbox" checked={checked} disabled={disabled} onChange={()=>toggleCommitment(o.label)}/><span>{o.label}</span><b>{o.score??''}</b></label>})}</div>
      <div className="choiceSummary">Dipilih: {selectedCommitments.length}/4</div>
    </Card>
    <Card title="Khidmat Sumbangan (maksimum 1)" error={errors.khidmatSumbangan}>
      <div className="choiceList">{serviceOptions.map(o=><label className="choiceRow" key={o.code}><input type="radio" name={`service-${category}`} checked={d.khidmatSumbangan===o.label} onChange={()=>patch({khidmatSumbangan:o.label})}/><span>{o.label}</span><b>{o.score??''}</b></label>)}</div>
      {d.khidmatSumbangan&&<button type="button" className="clearChoice" onClick={()=>patch({khidmatSumbangan:''})}>Kosongkan pilihan</button>}
    </Card>
    <Field label="Kehadiran (0-12)" error={errors.kehadiran}><select value={d.kehadiran??''} onChange={e=>patch({kehadiran:e.target.value===''?null:Number(e.target.value)})}><option value="">-- PILIH KEHADIRAN --</option>{Array.from({length:13},(_,i)=>i).map(x=><option key={x} value={x}>{x}</option>)}</select></Field>
    <ValidationSummary errors={errors} assessed={d.ditaksir!==false}/>
  </div>
}

function ExactSelect({value,options,onChange,...accessibility}:{value:string;options:string[];onChange:(v:string)=>void;'aria-invalid'?:boolean;'aria-describedby'?:string}){
  const uniq=[...new Set(options)]; const missing=value&&!uniq.includes(value);
  return <select {...accessibility} value={value} onChange={e=>onChange(e.target.value)}><option value="">-- PILIH LABEL iDME --</option>{missing&&<option value={value}>{value} · NILAI SEMASA</option>}{uniq.map(x=><option key={x} value={x}>{x}</option>)}</select>
}
function SourceHint({label,value,status}:{label:string;value?:string;status?:string}){
  if(!value)return <small className={`hint ${status==='default_active'?'ok':'warn'}`}>{status==='default_active'?`${label}: tiada jawatan dalam Portal Koku → AHLI AKTIF`:`${label}: tiada data — pilih nilai iDME secara manual.`}</small>;
  const bad=status==='review'||status==='missing';
  return <small className={`hint ${bad?'warn':'ok'}`}>{label}: <b>{value}</b>{bad?' · perlu semak/pilih padanan iDME':''}</small>
}

function PpkiPanel({students,setStudents,onSave,busy,status}:{students:PpkiStudent[];setStudents:(v:PpkiStudent[])=>void;onSave:()=>void;busy:boolean;status:string}){
  const selected=students.filter(x=>x.selected).length;
  const grouped=students.reduce((m:Record<string,PpkiStudent[]>,s)=>{(m[s.classCode]??=[]).push(s);return m},{});
  return <section className="ppkiPanel"><div className="ppkiHead"><div><h2><UsersRound size={20}/> PPKI · ALIRAN BERASINGAN</h2><p>Struktur PAJSK PPKI tidak dicampur dengan borang Tahun 4-6. Seperti aliran Sijil Berhenti/Tamat Sekolah, pilih dahulu murid PPKI yang hendak diuruskan.</p></div><div className="ppkiCount">{selected}/{students.length} dipilih</div></div>
    <div className="ppkiActions"><button onClick={()=>setStudents(students.map(x=>({...x,selected:true})))}>Pilih Semua</button><button onClick={()=>setStudents(students.map(x=>({...x,selected:false})))}>Kosongkan</button></div>
    <div className="ppkiGroups">{Object.entries(grouped).map(([code,list])=><div className="ppkiGroup" key={code}><h3>{code} <small>{list[0]?.className}</small></h3>{list.map(s=><label key={s.id} className="ppkiRow"><input type="checkbox" checked={s.selected} onChange={e=>setStudents(students.map(x=>x.id===s.id?{...x,selected:e.target.checked}:x))}/><span><b>{s.name}</b><small>{s.myid||'-'}</small></span></label>)}</div>)}</div>
    <div className="ppkiNote">Borang pengisian PPKI akan kekal berasingan sehingga struktur sebenar PAJSK PPKI dalam SPPB/iDME dipetakan. Data Tahun 4-6 tidak akan digunakan untuk PPKI.</div>
    <div className="savebar ppkiSave"><span>{status}</span><button onClick={onSave} disabled={busy}><Save size={16}/> {busy?'MENYIMPAN...':'SIMPAN PILIHAN PPKI'}</button></div>
  </section>
}
function ExtraForm({data,onChange,refs}:{data:any,onChange:(v:any)=>void;refs:RefOption[]}){
  const d=data||emptyExtra(); const patch=(x:any)=>onChange({...d,...x});
  const errors=extraWarnings(d);
  const services=refs.filter(x=>x.section==='extra_service');
  const awards=refs.filter(x=>x.section==='special_award');
  const community=refs.filter(x=>x.section==='community_service');
  const communityRows=community.map(o=>{
    const saved=(Array.isArray(d.khidmatMasyarakat)?d.khidmatMasyarakat:[]).find((x:any)=>x.activity===o.label);
    return {option:o,count:Number(saved?.count||0)};
  });
  const totalCommunity=communityRows.reduce((a,x)=>a+x.count,0);
  const serviceValue=d.perkhidmatan?.label||'';
  const awardName=d.anugerahKhas?.name||'';
  const awardAchievement=d.anugerahKhas?.achievement||'';
  const setCommunity=(label:string,count:number)=>{
    const existing=Array.isArray(d.khidmatMasyarakat)?d.khidmatMasyarakat:[];
    const rest=existing.filter((x:any)=>x.activity!==label);
    patch({khidmatMasyarakat:count>0?[...rest,{activity:label,count}]:rest});
  };
  return <div className="form">
    <label className="switch"><input type="checkbox" checked={d.ditaksir!==false} onChange={e=>patch({ditaksir:e.target.checked})}/> Ditaksir</label>
    <Card title="Perkhidmatan">
      <p className="optionalNote">Pilihan sahaja — biarkan kosong jika murid tiada jawatan/perkhidmatan. Tiada amaran akan diberikan.</p>
      <Field label="Perkhidmatan (ikut dropdown iDME)"><select value={serviceValue} onChange={e=>{const o=services.find(x=>x.label===e.target.value);patch({perkhidmatan:o?{label:o.label,score:o.score??null}:null})}}><option value="">-- TIADA / PILIH --</option>{services.map(o=><option key={o.code} value={o.label}>{o.label}</option>)}</select></Field>
      {d.perkhidmatan&&<div className="choiceSummary">Skor: {d.perkhidmatan.score??'-'}</div>}
    </Card>
    <Card title="Anugerah Khas (pilihan, maksimum 1)">
      <p className="optionalNote">Tidak wajib — biarkan kosong jika murid tidak menerima anugerah. Tiada amaran akan diberikan.</p>
      <div className="awardTable"><div className="awardHead"><b>PERKARA</b><b>PENERIMA</b><b>EMAS</b><b>PERAK</b><b>GANGSA</b></div>{awards.map(o=>{const allowed:Array<string>=Array.isArray(o.meta?.achievements)?o.meta.achievements:['PENERIMA'];return <div className="awardRow" key={o.code}><span>{o.label}</span>{['PENERIMA','EMAS','PERAK','GANGSA'].map(a=><label key={a} className={!allowed.includes(a)?'notAllowed':''}><input type="radio" name="special-award" disabled={!allowed.includes(a)} checked={awardName===o.label&&awardAchievement===a} onChange={()=>patch({anugerahKhas:{name:o.label,achievement:a}})}/></label>)}</div>})}</div>
      {awardName&&<button type="button" className="clearChoice" onClick={()=>patch({anugerahKhas:null})}>Kosongkan anugerah</button>}
    </Card>
    <Card title="Khidmat Masyarakat (maksimum 5)" error={errors.khidmatMasyarakat}>
      <div className="communityTable">{communityRows.map(({option:o,count})=>{const other=totalCommunity-count;const max=Math.max(0,5-other);return <div className="communityRow" key={o.code}><span>{o.label}</span><label>Bilangan <select value={count} onChange={e=>setCommunity(o.label,Number(e.target.value))}>{Array.from({length:max+1},(_,i)=>i).map(n=><option key={n} value={n}>{n}</option>)}</select></label></div>})}</div>
      <div className="choiceSummary">Jumlah aktiviti: {totalCommunity}/5</div>
    </Card>
    <Field label="Program NILAM" error={errors.nilamStars}><select value={d.nilamStars||''} onChange={e=>patch({nilamStars:e.target.value?Number(e.target.value):null})}><option value="">-- PILIH BINTANG --</option>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n} BINTANG</option>)}</select></Field>
    <ValidationSummary errors={errors} assessed={d.ditaksir!==false}/>
  </div>
}
function Field({label,children,error,invalid=false}:{label:string;children:any;error?:string;invalid?:boolean}){
  const errorId=useId(); const hasError=!!error||invalid;
  return <label className={`field ${hasError?'fieldInvalid':''}`}><span>{label}</span>{Children.map(children,child=>isValidElement(child)&&(child.type==='select'||child.type==='input'||child.type===ExactSelect)?cloneElement(child as any,{'aria-invalid':hasError||undefined,'aria-describedby':error?errorId:undefined}):child)}{error&&<small id={errorId} className="fieldError">⚠ {error}</small>}</label>
}
function Card({title,children,error}:{title:string;children:any;error?:string}){
  const titleId=useId(); const errorId=useId();
  return <div className={`card ${error?'cardInvalid':''}`} role="group" aria-labelledby={titleId} aria-describedby={error?errorId:undefined} aria-invalid={!!error||undefined}><h4 id={titleId}>{title}</h4>{children}{error&&<p id={errorId} className="fieldError">⚠ {error}</p>}</div>
}
function ValidationSummary({errors,assessed}:{errors:FormWarnings;assessed:boolean}){
  const messages=Object.values(errors);
  return <div className={`validationSummary ${messages.length?'hasErrors':'noErrors'}`} role="status" aria-live="polite">
    {!assessed?'Bahagian ini tidak ditaksir. Semakan medan tidak dikenakan.':messages.length?<><b>⚠ {messages.length} medan perlu disemak dalam tab ini</b><ul>{messages.map(message=><li key={message}>{message}</li>)}</ul><p>Anda masih boleh SIMPAN. Amaran hilang secara automatik apabila medan diisi.</p></>:<b>✓ Semua medan yang disemak dalam tab ini telah diisi.</b>}
  </div>
}
