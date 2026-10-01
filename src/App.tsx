import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, LogOut, RefreshCw, Save } from 'lucide-react';
import { apiCall } from './lib/api';

type Membership={unitId:string;category:string;name:string;slug:string};
type Student={id:string;name:string;myid:string;gender:string;classCode:string;className:string;yearLevel:number;classTeacher?:string;memberships:Membership[];complete:boolean;status:string;record:any};
type ClassRow={id:string;code:string;name:string;year_level:number;class_teacher_name?:string;total:number;saved:number;complete:number};
const LOGO='https://i.postimg.cc/3RF9M05N/Logo-SKSA.png';
const tabs=[['kelabPersatuan','Kelab & Persatuan'],['badanBeruniform','Badan Beruniform'],['sukanPermainan','Sukan & Permainan'],['ekstraKurikulum','Ekstra Kurikulum']] as const;
const levels=['','ANTARABANGSA','KEBANGSAAN','NEGERI','BAHAGIAN (SABAH/SARAWAK)','ZON/DAERAH','SEKOLAH'];
const places=['','JOHAN','NAIB JOHAN','KETIGA','KEEMPAT','KELIMA'];
const emptyCore=()=>({ditaksir:true,aktiviti:'',jawatan:'',pelibatan:[],pencapaian:null,komitmen:[],khidmatSumbangan:'',kehadiran:12});
const emptyExtra=()=>({ditaksir:true,perkhidmatan:null,anugerahKhas:null,khidmatMasyarakat:[],nilamStars:null});
const clone=<T,>(x:T):T=>JSON.parse(JSON.stringify(x));

function initRecord(student:Student){
  const r=clone(student.record||{});
  const by=(cat:string)=>student.memberships?.find(m=>m.category===cat)?.name||'';
  r.kelabPersatuan={...emptyCore(),...(r.kelabPersatuan||{})};
  r.badanBeruniform={...emptyCore(),...(r.badanBeruniform||{})};
  r.sukanPermainan={...emptyCore(),...(r.sukanPermainan||{})};
  r.ekstraKurikulum={...emptyExtra(),...(r.ekstraKurikulum||{})};
  if(!r.kelabPersatuan.aktiviti)r.kelabPersatuan.aktiviti=by('club');
  if(!r.badanBeruniform.aktiviti)r.badanBeruniform.aktiviti=by('uniform');
  if(!r.sukanPermainan.aktiviti)r.sukanPermainan.aktiviti=by('sport');
  return r;
}

export default function App(){
  const [password,setPassword]=useState(sessionStorage.getItem('pajsk_app_password')||'');
  const [logged,setLogged]=useState(false); const [loginError,setLoginError]=useState('');
  const [sessions,setSessions]=useState<any[]>([]); const [year,setYear]=useState(2026);
  const [classes,setClasses]=useState<ClassRow[]>([]); const [classCode,setClassCode]=useState('');
  const [students,setStudents]=useState<Student[]>([]); const [selectedId,setSelectedId]=useState('');
  const [record,setRecord]=useState<any>(null); const [tab,setTab]=useState<string>('kelabPersatuan');
  const [complete,setComplete]=useState(false); const [busy,setBusy]=useState(false); const [status,setStatus]=useState('');

  const selected=useMemo(()=>students.find(s=>s.id===selectedId)||null,[students,selectedId]);

  async function login(){setBusy(true);setLoginError('');try{const d:any=await apiCall('getConfig',{},password);sessionStorage.setItem('pajsk_app_password',password);setSessions(d.sessions||[]);const ys=(d.sessions||[]).map((x:any)=>Number(x.year));const y=ys.includes(new Date().getFullYear())?new Date().getFullYear():(ys.at(-1)||2026);setYear(y);setLogged(true);await loadClasses(y,password);}catch(e:any){setLoginError(e.message||String(e));}finally{setBusy(false)}}
  async function loadClasses(y=year,pw?:string){setBusy(true);try{const d:any=await apiCall('getClasses',{year:y},pw);setClasses(d.classes||[]);setClassCode('');setStudents([]);setSelectedId('');setRecord(null);}catch(e:any){setStatus(e.message);}finally{setBusy(false)}}
  async function loadStudents(code:string){setBusy(true);setStatus('');try{const d:any=await apiCall('getStudents',{year,classCode:code});setStudents(d.students||[]);setClassCode(code);setSelectedId('');setRecord(null);}catch(e:any){setStatus(e.message);}finally{setBusy(false)}}
  function chooseStudent(s:Student){setSelectedId(s.id);setRecord(initRecord(s));setComplete(!!s.complete);setTab('kelabPersatuan');}
  async function save(){if(!selected||!record)return;setBusy(true);try{const d:any=await apiCall('saveStudent',{year,studentId:selected.id,record,complete});setStatus('Rekod PAJSK berjaya disimpan.');setStudents(v=>v.map(s=>s.id===selected.id?{...s,record:clone(d.record),complete:!!d.complete,status:d.status}:s));}catch(e:any){setStatus(e.message);}finally{setBusy(false)}}
  function logout(){sessionStorage.removeItem('pajsk_app_password');setLogged(false);setPassword('');setClasses([]);setStudents([]);setRecord(null)}

  if(!logged)return <div className="login"><div className="loginCard"><img src={LOGO}/><h1>SISTEM PAJSK SKSA</h1><p>SEKOLAH KEBANGSAAN SUNGAI ABONG</p><input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()} placeholder="Password sistem"/><button onClick={login} disabled={busy}>{busy?'Menyemak...':'MASUK'}</button>{loginError&&<div className="error">{loginError}</div>}</div></div>;

  return <div className="app">
    <header><div className="brand"><img src={LOGO}/><div><b>SISTEM PAJSK SKSA</b><small>Master murid/kelas: Supabase Portal Koku</small></div></div><div className="topActions"><select value={year} onChange={e=>{const y=Number(e.target.value);setYear(y);loadClasses(y)}}>{sessions.map(s=><option key={s.year} value={s.year}>SESI {s.year}</option>)}</select><button onClick={()=>loadClasses()}><RefreshCw size={16}/> Muat Semula</button><button onClick={logout}><LogOut size={16}/> Keluar</button></div></header>
    <main>
      <section className="classes"><div><b>PILIH KELAS</b><small>Data kelas dibaca terus daripada Portal Koku. Rekod PAJSK disimpan berasingan.</small></div><div className="classGrid">{classes.map(c=><button key={c.id} className={classCode===c.code?'active':''} onClick={()=>loadStudents(c.code)}><span>{c.code}</span><small>{c.complete}/{c.total} lengkap</small></button>)}</div></section>
      {classCode&&<div className="workspace">
        <aside><h3>{classCode}</h3><div className="studentList">{students.map(s=><button key={s.id} className={selectedId===s.id?'active':''} onClick={()=>chooseStudent(s)}><span>{s.name}</span>{s.complete?<CheckCircle2 size={16}/>:<Circle size={16}/>}</button>)}</div></aside>
        <section className="editor">{!selected||!record?<div className="empty">Pilih murid untuk mula pengisian.</div>:<>
          <div className="studentHead"><div><h2>{selected.name}</h2><p>{selected.myid||'-'} · {selected.className} · Tahun {selected.yearLevel}</p></div><label className="complete"><input type="checkbox" checked={complete} onChange={e=>setComplete(e.target.checked)}/> Pengisian lengkap</label></div>
          <div className="tabs">{tabs.map(([k,l])=><button className={tab===k?'active':''} key={k} onClick={()=>setTab(k)}>{l}</button>)}</div>
          {tab==='ekstraKurikulum'?<ExtraForm data={record.ekstraKurikulum} onChange={(v:any)=>setRecord({...record,ekstraKurikulum:v})}/>:<CoreForm data={record[tab]} onChange={(v:any)=>setRecord({...record,[tab]:v})}/>} 
          <div className="savebar"><span>{status}</span><button onClick={save} disabled={busy}><Save size={16}/> {busy?'MENYIMPAN...':'SIMPAN'}</button></div>
        </>}</section>
      </div>}
      {!classCode&&<div className="welcome">Pilih kelas di atas untuk memaparkan murid.</div>}
    </main>
  </div>
}

function CoreForm({data,onChange}:{data:any,onChange:(v:any)=>void}){
  const d=data||emptyCore(); const patch=(x:any)=>onChange({...d,...x});
  const pel=[0,1,2].map(i=>d.pelibatan?.[i]||{}); const kom=[0,1,2,3].map(i=>d.komitmen?.[i]||'');
  return <div className="form">
    <label className="switch"><input type="checkbox" checked={d.ditaksir!==false} onChange={e=>patch({ditaksir:e.target.checked})}/> Ditaksir</label>
    <div className="grid2"><Field label="Aktiviti Kokurikulum"><input value={d.aktiviti||''} onChange={e=>patch({aktiviti:e.target.value})}/></Field><Field label="Jawatan"><input value={d.jawatan||''} onChange={e=>patch({jawatan:e.target.value})}/></Field></div>
    <Card title="Pelibatan (maksimum 3)">{pel.map((p,i)=><div className="grid2" key={i}><Field label={`Pelibatan ${i+1} - Peringkat`}><select value={p.peringkat||''} onChange={e=>{const a=[...pel];a[i]={...a[i],peringkat:e.target.value,slot:i+1};patch({pelibatan:a.filter(x=>x.peringkat)})}}>{levels.map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Slot"><input value={i+1} disabled/></Field></div>)}</Card>
    <Card title="Tahap Pencapaian Tertinggi"><div className="grid2"><Field label="Peringkat"><select value={d.pencapaian?.peringkat||''} onChange={e=>patch({pencapaian:{...(d.pencapaian||{}),peringkat:e.target.value}})}>{levels.map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Kedudukan"><select value={d.pencapaian?.kedudukan||''} onChange={e=>patch({pencapaian:{...(d.pencapaian||{}),kedudukan:e.target.value}})}>{places.map(x=><option key={x}>{x}</option>)}</select></Field></div></Card>
    <Card title="Komitmen (maksimum 4)">{kom.map((x,i)=><Field key={i} label={`Komitmen ${i+1}`}><input value={x} onChange={e=>{const a=[...kom];a[i]=e.target.value;patch({komitmen:a.filter(Boolean)})}}/></Field>)}</Card>
    <div className="grid2"><Field label="Khidmat Sumbangan"><input value={d.khidmatSumbangan||''} onChange={e=>patch({khidmatSumbangan:e.target.value})}/></Field><Field label="Kehadiran (0-12)"><select value={d.kehadiran??12} onChange={e=>patch({kehadiran:Number(e.target.value)})}>{Array.from({length:13},(_,i)=>i).map(x=><option key={x} value={x}>{x}</option>)}</select></Field></div>
  </div>
}

function ExtraForm({data,onChange}:{data:any,onChange:(v:any)=>void}){
  const d=data||emptyExtra(); const patch=(x:any)=>onChange({...d,...x}); const c=[0,1,2,3,4].map(i=>d.khidmatMasyarakat?.[i]||{});
  return <div className="form">
    <label className="switch"><input type="checkbox" checked={d.ditaksir!==false} onChange={e=>patch({ditaksir:e.target.checked})}/> Ditaksir</label>
    <Card title="Perkhidmatan"><div className="grid2"><Field label="Jawatan / Perkhidmatan"><input value={d.perkhidmatan?.label||''} onChange={e=>patch({perkhidmatan:{...(d.perkhidmatan||{}),label:e.target.value}})}/></Field><Field label="Skor"><input type="number" value={d.perkhidmatan?.score??''} onChange={e=>patch({perkhidmatan:{...(d.perkhidmatan||{}),score:e.target.value===''?null:Number(e.target.value)}})}/></Field></div></Card>
    <Card title="Anugerah Khas"><div className="grid2"><Field label="Anugerah"><input value={d.anugerahKhas?.name||''} onChange={e=>patch({anugerahKhas:{...(d.anugerahKhas||{}),name:e.target.value}})}/></Field><Field label="Pencapaian"><select value={d.anugerahKhas?.achievement||''} onChange={e=>patch({anugerahKhas:{...(d.anugerahKhas||{}),achievement:e.target.value}})}>{['','PENERIMA','EMAS','PERAK','GANGSA'].map(x=><option key={x}>{x}</option>)}</select></Field></div></Card>
    <Card title="Khidmat Masyarakat (maksimum 5)">{c.map((x,i)=><div className="grid2" key={i}><Field label={`Aktiviti ${i+1}`}><input value={x.activity||''} onChange={e=>{const a=[...c];a[i]={...a[i],activity:e.target.value,count:a[i]?.count||1};patch({khidmatMasyarakat:a.filter(v=>v.activity)})}}/></Field><Field label="Bilangan"><select value={x.count||1} onChange={e=>{const a=[...c];a[i]={...a[i],count:Number(e.target.value)};patch({khidmatMasyarakat:a.filter(v=>v.activity)})}}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}</select></Field></div>)}</Card>
    <Field label="Program NILAM"><select value={d.nilamStars||''} onChange={e=>patch({nilamStars:e.target.value?Number(e.target.value):null})}><option value=""></option>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n} BINTANG</option>)}</select></Field>
  </div>
}
function Field({label,children}:{label:string;children:any}){return <label className="field"><span>{label}</span>{children}</label>}
function Card({title,children}:{title:string;children:any}){return <div className="card"><h4>{title}</h4>{children}</div>}
