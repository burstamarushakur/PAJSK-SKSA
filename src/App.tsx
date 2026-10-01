import { useMemo, useState } from 'react';
import { CheckCircle2, Circle, LogOut, RefreshCw, Save, UsersRound } from 'lucide-react';
import { apiCall } from './lib/api';

type Membership={unitId:string;category:string;name:string;slug:string;idmeLabel?:string;mappingStatus?:string;portalPosition?:string;idmePosition?:string;positionMappingStatus?:string};
type Student={id:string;name:string;myid:string;gender:string;classCode:string;className:string;yearLevel:number;classTeacher?:string;memberships:Membership[];complete:boolean;status:string;record:any};
type ClassRow={id:string;code:string;name:string;year_level:number;class_teacher_name?:string;total:number;saved:number;complete:number};
type RefOption={section:string;code:string;label:string;score?:number|null;meta?:any};
type PpkiStudent={id:string;name:string;myid:string;classCode:string;className:string;selected:boolean};

const LOGO='https://i.postimg.cc/3RF9M05N/Logo-SKSA.png';
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
  const [ppki,setPpki]=useState<PpkiStudent[]>([]);

  const selected=useMemo(()=>students.find(s=>s.id===selectedId)||null,[students,selectedId]);
  const activeTab=useMemo(()=>tabs.find(t=>t[0]===tab),[tab]);

  async function login(){
    setBusy(true);setLoginError('');
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
    setBusy(true);setStatus('');
    try{const d:any=await apiCall('getClasses',{year:y},pw);setClasses(d.classes||[]);setClassCode('');setStudents([]);setSelectedId('');setRecord(null);}
    catch(e:any){setStatus(e.message);}finally{setBusy(false)}
  }
  async function loadStudents(code:string){
    setBusy(true);setStatus('');
    try{const d:any=await apiCall('getStudents',{year,classCode:code});setStudents(d.students||[]);setClassCode(code);setSelectedId('');setRecord(null);}
    catch(e:any){setStatus(e.message);}finally{setBusy(false)}
  }
  async function loadPpki(y=year,pw?:string){
    setBusy(true);setStatus('');
    try{const d:any=await apiCall('getPpkiStudents',{year:y},pw);setPpki(d.students||[]);}
    catch(e:any){setStatus(e.message);}finally{setBusy(false)}
  }
  async function switchMode(next:'mainstream'|'ppki'){
    setMode(next);setStatus('');setClassCode('');setStudents([]);setSelectedId('');setRecord(null);
    if(next==='ppki') await loadPpki(); else await loadClasses();
  }
  async function changeYear(y:number){
    setYear(y);setClassCode('');setStudents([]);setSelectedId('');setRecord(null);
    if(mode==='ppki')await loadPpki(y);else await loadClasses(y);
  }
  function chooseStudent(s:Student){setSelectedId(s.id);setRecord(initRecord(s));setComplete(!!s.complete);setTab('kelabPersatuan');setStatus('');}
  async function save(){
    if(!selected||!record)return;setBusy(true);
    try{const d:any=await apiCall('saveStudent',{year,studentId:selected.id,record,complete});setStatus('Rekod PAJSK berjaya disimpan.');setStudents(v=>v.map(s=>s.id===selected.id?{...s,record:clone(d.record),complete:!!d.complete,status:d.status}:s));}
    catch(e:any){setStatus(e.message);}finally{setBusy(false)}
  }
  async function savePpki(){
    setBusy(true);try{const selectedIds=ppki.filter(x=>x.selected).map(x=>x.id);const d:any=await apiCall('savePpkiSelections',{year,selectedIds});setStatus(`Pilihan PPKI disimpan: ${d.selectedCount} murid.`);}catch(e:any){setStatus(e.message);}finally{setBusy(false)}
  }
  function logout(){sessionStorage.removeItem('pajsk_app_password');setLogged(false);setPassword('');setClasses([]);setStudents([]);setPpki([]);setRecord(null)}

  if(!logged)return <div className="login"><div className="loginCard"><img src={LOGO}/><h1>SISTEM PAJSK SKSA</h1><p>SEKOLAH KEBANGSAAN SUNGAI ABONG</p><input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()} placeholder="Password sistem"/><button onClick={login} disabled={busy}>{busy?'Menyemak...':'MASUK'}</button>{loginError&&<div className="error">{loginError}</div>}</div></div>;

  return <div className="app">
    <header><div className="brand"><img src={LOGO}/><div><b>SISTEM PAJSK SKSA</b><small>Master murid/unit: Supabase Portal Koku</small></div></div><div className="topActions"><select value={year} onChange={e=>changeYear(Number(e.target.value))}>{sessions.map(s=><option key={s.year} value={s.year}>SESI {s.year}</option>)}</select><button onClick={()=>mode==='ppki'?loadPpki():loadClasses()}><RefreshCw size={16}/> Muat Semula</button><button onClick={logout}><LogOut size={16}/> Keluar</button></div></header>
    <main>
      <div className="modeTabs"><button className={mode==='mainstream'?'active':''} onClick={()=>switchMode('mainstream')}>TAHAP 2 · TAHUN 4-6</button><button className={mode==='ppki'?'active':''} onClick={()=>switchMode('ppki')}>PPKI</button></div>
      {mode==='mainstream'?<>
        <section className="classes"><div><b>PILIH KELAS TAHAP 2</b><small>PAJSK arus perdana hanya Tahun 4, 5 dan 6. Tahun 1-3 tidak dipaparkan.</small></div><div className="classGrid">{classes.map(c=><button key={c.id} className={classCode===c.code?'active':''} onClick={()=>loadStudents(c.code)}><span>{c.code}</span><small>{c.complete}/{c.total} lengkap</small></button>)}</div></section>
        {classCode&&<div className="workspace">
          <aside><h3>{classCode}</h3><div className="studentList">{students.map(s=><button key={s.id} className={selectedId===s.id?'active':''} onClick={()=>chooseStudent(s)}><span>{s.name}</span>{s.complete?<CheckCircle2 size={16}/>:<Circle size={16}/>}</button>)}</div></aside>
          <section className="editor">{!selected||!record?<div className="empty">Pilih murid untuk mula pengisian.</div>:<>
            <div className="studentHead"><div><h2>{selected.name}</h2><p>{selected.myid||'-'} · {selected.className} · Tahun {selected.yearLevel}</p></div><label className="complete"><input type="checkbox" checked={complete} onChange={e=>setComplete(e.target.checked)}/> Pengisian lengkap</label></div>
            <div className="prefillInfo">Aktiviti dan jawatan yang boleh dipadankan telah diambil terus daripada Portal Koku. Nilai disimpan menggunakan label SPPB/iDME supaya extension tidak perlu meneka semasa pemindahan.</div>
            <div className="tabs">{tabs.map(([k,l])=><button className={tab===k?'active':''} key={k} onClick={()=>setTab(k)}>{l}</button>)}</div>
            {tab==='ekstraKurikulum'?<ExtraForm data={record.ekstraKurikulum} onChange={(v:any)=>setRecord({...record,ekstraKurikulum:v})}/>:<CoreForm category={(activeTab?.[2]||'club') as 'club'|'uniform'|'sport'} refs={refs} data={record[tab]} onChange={(v:any)=>setRecord({...record,[tab]:v})}/>} 
            <div className="savebar"><span>{status}</span><button onClick={save} disabled={busy}><Save size={16}/> {busy?'MENYIMPAN...':'SIMPAN'}</button></div>
          </>}</section>
        </div>}
        {!classCode&&<div className="welcome">Pilih kelas Tahun 4, 5 atau 6 di atas.</div>}
      </>:<PpkiPanel students={ppki} setStudents={setPpki} onSave={savePpki} busy={busy} status={status}/>} 
    </main>
  </div>
}

function CoreForm({data,onChange,category,refs}:{data:any,onChange:(v:any)=>void;category:'club'|'uniform'|'sport';refs:RefOption[]}){
  const d=data||emptyCore(); const patch=(x:any)=>onChange({...d,...x});
  const pel=[0,1,2].map(i=>d.pelibatan?.[i]||{}); const kom=[0,1,2,3].map(i=>d.komitmen?.[i]||'');
  const activities=refs.filter(x=>x.section===`activity_${category}`).map(x=>x.label);
  const positions=refs.filter(x=>x.section===`position_${category}`).map(x=>x.label);
  return <div className="form">
    <label className="switch"><input type="checkbox" checked={d.ditaksir!==false} onChange={e=>patch({ditaksir:e.target.checked})}/> Ditaksir</label>
    <div className="grid2">
      <Field label="Aktiviti Kokurikulum (label iDME)"><ExactSelect value={d.aktiviti||''} options={activities} onChange={v=>patch({aktiviti:v,activityMappingStatus:'manual'})}/><SourceHint label="Portal Koku" value={d.portalAktiviti} status={d.activityMappingStatus}/></Field>
      <Field label="Jawatan (label iDME)"><ExactSelect value={d.jawatan||''} options={positions} onChange={v=>patch({jawatan:v,positionMappingStatus:'manual'})}/><SourceHint label="Jawatan Portal Koku" value={d.portalJawatan} status={d.positionMappingStatus}/></Field>
    </div>
    <Card title="Pelibatan (maksimum 3)">{pel.map((p,i)=><div className="grid2" key={i}><Field label={`Pelibatan ${i+1} - Peringkat`}><select value={p.peringkat||''} onChange={e=>{const a=[...pel];a[i]={...a[i],peringkat:e.target.value,slot:i+1};patch({pelibatan:a.filter(x=>x.peringkat)})}}>{levels.map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Slot"><input value={i+1} disabled/></Field></div>)}</Card>
    <Card title="Tahap Pencapaian Tertinggi"><div className="grid2"><Field label="Peringkat"><select value={d.pencapaian?.peringkat||''} onChange={e=>patch({pencapaian:{...(d.pencapaian||{}),peringkat:e.target.value}})}>{levels.map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Kedudukan"><select value={d.pencapaian?.kedudukan||''} onChange={e=>patch({pencapaian:{...(d.pencapaian||{}),kedudukan:e.target.value}})}>{places.map(x=><option key={x}>{x}</option>)}</select></Field></div></Card>
    <Card title="Komitmen (maksimum 4)">{kom.map((x,i)=><Field key={i} label={`Komitmen ${i+1}`}><input value={x} onChange={e=>{const a=[...kom];a[i]=e.target.value;patch({komitmen:a.filter(Boolean)})}}/></Field>)}</Card>
    <div className="grid2"><Field label="Khidmat Sumbangan"><input value={d.khidmatSumbangan||''} onChange={e=>patch({khidmatSumbangan:e.target.value})}/></Field><Field label="Kehadiran (0-12)"><select value={d.kehadiran??12} onChange={e=>patch({kehadiran:Number(e.target.value)})}>{Array.from({length:13},(_,i)=>i).map(x=><option key={x} value={x}>{x}</option>)}</select></Field></div>
  </div>
}

function ExactSelect({value,options,onChange}:{value:string;options:string[];onChange:(v:string)=>void}){
  const uniq=[...new Set(options)]; const missing=value&&!uniq.includes(value);
  return <select value={value} onChange={e=>onChange(e.target.value)}><option value="">-- PILIH LABEL iDME --</option>{missing&&<option value={value}>{value} · NILAI SEMASA</option>}{uniq.map(x=><option key={x} value={x}>{x}</option>)}</select>
}
function SourceHint({label,value,status}:{label:string;value?:string;status?:string}){
  if(!value)return <small className="hint warn">{label}: tiada data — pilih nilai iDME secara manual.</small>;
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
function ExtraForm({data,onChange}:{data:any,onChange:(v:any)=>void}){
  const d=data||emptyExtra(); const patch=(x:any)=>onChange({...d,...x}); const c=[0,1,2,3,4].map(i=>d.khidmatMasyarakat?.[i]||{});
  return <div className="form"><label className="switch"><input type="checkbox" checked={d.ditaksir!==false} onChange={e=>patch({ditaksir:e.target.checked})}/> Ditaksir</label><Card title="Perkhidmatan"><div className="grid2"><Field label="Jawatan / Perkhidmatan"><input value={d.perkhidmatan?.label||''} onChange={e=>patch({perkhidmatan:{...(d.perkhidmatan||{}),label:e.target.value}})}/></Field><Field label="Skor"><input type="number" value={d.perkhidmatan?.score??''} onChange={e=>patch({perkhidmatan:{...(d.perkhidmatan||{}),score:e.target.value===''?null:Number(e.target.value)}})}/></Field></div></Card><Card title="Anugerah Khas"><div className="grid2"><Field label="Anugerah"><input value={d.anugerahKhas?.name||''} onChange={e=>patch({anugerahKhas:{...(d.anugerahKhas||{}),name:e.target.value}})}/></Field><Field label="Pencapaian"><select value={d.anugerahKhas?.achievement||''} onChange={e=>patch({anugerahKhas:{...(d.anugerahKhas||{}),achievement:e.target.value}})}>{['','PENERIMA','EMAS','PERAK','GANGSA'].map(x=><option key={x}>{x}</option>)}</select></Field></div></Card><Card title="Khidmat Masyarakat (maksimum 5)">{c.map((x,i)=><div className="grid2" key={i}><Field label={`Aktiviti ${i+1}`}><input value={x.activity||''} onChange={e=>{const a=[...c];a[i]={...a[i],activity:e.target.value,count:a[i]?.count||1};patch({khidmatMasyarakat:a.filter(v=>v.activity)})}}/></Field><Field label="Bilangan"><select value={x.count||1} onChange={e=>{const a=[...c];a[i]={...a[i],count:Number(e.target.value)};patch({khidmatMasyarakat:a.filter(v=>v.activity)})}}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}</select></Field></div>)}</Card><Field label="Program NILAM"><select value={d.nilamStars||''} onChange={e=>patch({nilamStars:e.target.value?Number(e.target.value):null})}><option value=""></option>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n} BINTANG</option>)}</select></Field></div>
}
function Field({label,children}:{label:string;children:any}){return <label className="field"><span>{label}</span>{children}</label>}
function Card({title,children}:{title:string;children:any}){return <div className="card"><h4>{title}</h4>{children}</div>}
