'use client';
import {optimizeUpload} from '@/lib/optimizeUpload';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Search,ChevronLeft,ChevronRight,Loader2,PencilLine,ExternalLink,CheckCircle2,XCircle,RefreshCw,Plus,Eye,Sparkles} from 'lucide-react';
import {editValue,uploadCategory} from '@/lib/formValues';
import type {Module,Column} from '@/lib/modules';

type Row = Record<string,unknown>;
type ApiResponse = {rows:Row[];count:number};

function cellValue(col:Column,row:Row):string{
  const v=row[col.key];
  if(v==null||v==='')return '—';
  if(col.key==='shipping_address' && typeof v==='object'){
    const address = v as Record<string, unknown>;
    return [address.name,address.phone,address.address].filter(Boolean).join(' · ');
  }
  if(col.kind==='currency')return `Rs. ${Number(v).toLocaleString('en-LK')}`;
  if(col.kind==='date')return new Date(String(v)).toLocaleDateString('en-LK',{dateStyle:'medium'});
  if(col.kind==='number')return Number(v).toLocaleString('en-LK');
  return String(v);
}

function StatusBadge({value}:{value:string}){
  return <span className={`badge ${value}`}>{value}</span>;
}

type FormState = {open:boolean;creating:boolean;row:Row|null};

export default function ModuleView({mod}:{mod:Module}){
  const [data,setData]=useState<ApiResponse|null>(null);
  const [loading,setLoading]=useState(true);
  const [page,setPage]=useState(1);
  const [limit,setLimit]=useState(10);
  const [search,setSearch]=useState('');
  const [debouncedSearch,setDebouncedSearch]=useState('');
  const [statusFilter,setStatusFilter]=useState('all');
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [form,setForm]=useState<FormState>({open:false,creating:false,row:null});
  const [fields,setFields]=useState<Row>({});
  const [saving,setSaving]=useState(false);
  const [formError,setFormError]=useState('');
  const [approveId,setApproveId]=useState<string|null>(null);
  const [inspectRow,setInspectRow]=useState<Row|null>(null);
  const debounceRef=useRef<ReturnType<typeof setTimeout>|null>(null);

  // Debounce search
  useEffect(()=>{
    if(debounceRef.current)clearTimeout(debounceRef.current);
    debounceRef.current=setTimeout(()=>{setDebouncedSearch(search);setPage(1);},350);
    return()=>{if(debounceRef.current)clearTimeout(debounceRef.current);};
  },[search]);

  // Reset to page 1 on filter change


  const loadSequence=useRef(0);
  const load=useCallback(async()=>{
    const sequence=++loadSequence.current;
    setLoading(true);setError('');
    
    try{
      const params=new URLSearchParams({page:String(page),limit:String(limit)});
      if(debouncedSearch)params.set('search',debouncedSearch);
      if(statusFilter!=='all')params.set('status',statusFilter);
      const r=await fetch(`/api/manager/${mod.slug}?${params}`,{cache:'no-store'});
      const j=await r.json();
      if(!r.ok)throw new Error(j.error||'Failed to load');
      if(sequence===loadSequence.current)setData(j);
    }catch(e){if(sequence===loadSequence.current){setData(null);setError(e instanceof Error?e.message:'Failed to load data');}}
    finally{if(sequence===loadSequence.current)setLoading(false);}
  },[mod.slug,page,limit,debouncedSearch,statusFilter]);

  useEffect(()=>{// The loader only updates state after awaiting the network response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();},[load]);

  const totalPages=data?Math.max(1,Math.ceil(data.count/limit)):1;

  function openCreate(){
    const defaults:Row={};
    for(const f of mod.fields){if(f.type==='select'&&f.options?.length)defaults[f.key]=f.options[0];else defaults[f.key]='';}
    setFields(defaults);setFormError('');setForm({open:true,creating:true,row:null});
  }
  function openEdit(row:Row){
    const defaults:Row={};
    for(const f of mod.fields){if(!f.readonly)defaults[f.key]=editValue(f,row[f.key]);}
    setFields(defaults);setFormError('');setForm({open:true,creating:false,row});
  }
  function closeForm(){setForm({open:false,creating:false,row:null});setFormError('');}
  function setField(key:string,val:unknown){setFields(v=>({...v,[key]:val}));}

  async function uploadFile(key:string,file:File){
    setSaving(true);setFormError('');
    try{
      const category=uploadCategory(mod.slug);
      if(!category)throw new Error('Uploads are not supported for this module');
      const fd=new FormData();fd.set('file',await optimizeUpload(file, key === 'file_path'));fd.set('category',category);
      const r=await fetch('/api/manager/upload',{method:'POST',body:fd});
      const j=await r.json();if(!r.ok)throw new Error(j.error||'Upload failed');
      setField(key,j.path);
    }catch(e){setFormError(e instanceof Error?e.message:'Upload failed');}
    finally{setSaving(false);}
  }

  async function saveForm(e:React.FormEvent){
    e.preventDefault();setSaving(true);setFormError('');
    try{
      const payload:Row={};
      for(const f of mod.fields){
        if(f.readonly)continue;
        const v=fields[f.key];
        if(!form.creating && mod.slug==='recordings' && f.key==='youtube_video_id' && !v)continue;
        if(f.type==='number')payload[f.key]=v===''||v==null?null:Number(v);
        else if(v===''||v==null)payload[f.key]=null;
        else payload[f.key]=v;
      }
      const id=form.row?.id??form.row?.user_id;
      const url=`/api/manager/${mod.slug}${!form.creating&&id?`/${id}`:''}`;
      const method=form.creating?'POST':'PATCH';
      const r=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const j=await r.json();
      if(!r.ok)throw new Error(j.error||'Save failed');
      setNotice(form.creating?'Record created.':'Record updated.');
      closeForm();await load();
    }catch(e){setFormError(e instanceof Error?e.message:'Save failed');}
    finally{setSaving(false);}
  }

  async function doApprove(rowId:string,approved:boolean,deliveryMethod?:unknown){
    let reason = '';
    if (!approved) {
      const input = prompt('Enter a rejection reason for the student (e.g. Unreadable bank slip, Incorrect deposit amount):');
      if (input === null) return;
      reason = input.trim();
    }
    setApproveId(rowId);setError('');
    try{
      const r=await fetch(`/api/manager/${mod.slug}/${rowId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:approved?'approved':'rejected',reason})});
      const j=await r.json();if(!r.ok)throw new Error(j.error||'Action failed');
      setNotice(approved?(mod.slug==='tute-orders' && deliveryMethod==='courier'?'Payment approved. The tute is ready for dispatch.':'Transaction approved.'):'Transaction rejected.');await load();
    }catch(e){setError(e instanceof Error?e.message:'Action failed');}
    finally{setApproveId(null);}
  }

  async function doArchive(row:Row){
    if(!mod.canArchive)return;
    const id=row.id??row.user_id;if(!id)return;
    if(!confirm('Archive this record? It will be hidden from active lists.'))return;
    setSaving(true);setError('');
    try{
      const r=await fetch(`/api/manager/${mod.slug}/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'archived'})});
      const j=await r.json();if(!r.ok)throw new Error(j.error||'Archive failed');
      setNotice('Record archived.');await load();
    }catch(e){setError(e instanceof Error?e.message:'Archive failed');}
    finally{setSaving(false);}
  }

  const hasStatus=mod.columns.some(c=>c.key==='status');
  const isStudentsModule=mod.slug==='students';
  const isCoursesModule=mod.slug==='courses';

  // Field renderer for forms
  function renderField(f:typeof mod.fields[0]){
    const v=fields[f.key];
    if(f.readonly)return null;
    if(f.type==='file'){
      return(
        <div className="form-field" key={f.key}>
          <label htmlFor={`mf-${f.key}`}>{f.label}{f.required&&<span className="required"> *</span>}</label>
          <div className="form-file-control">
            <label className="form-file-choose btn btn-outline btn-small">
              <input id={`mf-${f.key}`} type="file" accept={f.accept||'*'} onChange={e=>{const file=e.target.files?.[0];if(file)void uploadFile(f.key,file);}}/>
              Choose file
            </label>
            <span className="form-file-name">{v?String(v):'No file chosen'}</span>
          </div>
          {f.hint&&<small>{f.hint}</small>}
        </div>
      );
    }
    if(f.type==='textarea'){
      return(
        <div className="form-field form-field-wide" key={f.key}>
          <label htmlFor={`mf-${f.key}`}>{f.label}{f.required&&<span className="required"> *</span>}</label>
          <textarea id={`mf-${f.key}`} rows={3} maxLength={5000} required={f.required && !(mod.slug==='recordings' && f.key==='youtube_video_id' && !form.creating)} value={String(v??'')} onChange={e=>setField(f.key,e.target.value)}/>
          {f.hint&&<small>{f.hint}</small>}
        </div>
      );
    }
    if(f.type==='select'&&f.options){
      return(
        <div className="form-field" key={f.key}>
          <label htmlFor={`mf-${f.key}`}>{f.label}{f.required&&<span className="required"> *</span>}</label>
          <select id={`mf-${f.key}`} required={f.required && !(mod.slug==='recordings' && f.key==='youtube_video_id' && !form.creating)} value={String(v??'')} onChange={e=>setField(f.key,e.target.value)}>
            {!f.required&&<option value="">— not set —</option>}
            {f.options.map(o=><option key={o}>{o}</option>)}
          </select>
          {f.hint&&<small>{f.hint}</small>}
        </div>
      );
    }
    return(
      <div className="form-field" key={f.key}>
        <label htmlFor={`mf-${f.key}`}>{f.label}{f.required&&<span className="required"> *</span>}</label>
        <input
          id={`mf-${f.key}`}
          type={f.type==='number'?'number':f.type==='email'?'email':f.type==='url'?'url':f.type==='date'?'date':f.type==='datetime-local'?'datetime-local':'text'}
          required={f.required && !(mod.slug==='recordings' && f.key==='youtube_video_id' && !form.creating)}
          min={f.min}
          max={f.max}
          maxLength={f.type!=='number'?5000:undefined}
          value={String(v??'')}
          onChange={e=>setField(f.key,f.type==='number'&&e.target.value!==''?Number(e.target.value):e.target.value)}
          placeholder={f.hint}
        />
        {f.hint&&<small>{f.hint}</small>}
      </div>
    );
  }

  // Group form fields by section
  const sections=Array.from(new Set(mod.fields.filter(f=>!f.readonly).map(f=>f.section??'')));

  return(
    <section className="page-content module-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">MENTORA / {mod.slug.toUpperCase()}</p>
          <h1>{mod.title}</h1>
          <p className="subhead">{mod.description}</p>
        </div>
        {!mod.readOnly&&!form.open&&(
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={15}/> Add {mod.title.replace(/s$/,'').toLowerCase()}
          </button>
        )}
      </div>

      {notice&&<p role="status" className="success module-notice"><CheckCircle2 size={15}/> {notice} <button onClick={()=>setNotice('')}>×</button></p>}
      {error&&<p role="alert" className="error module-notice"><XCircle size={15}/> {error}</p>}

      {/* ---- Inline editor / creator ---- */}
      {form.open&&(
        <div className="manager-form-workspace">
          <div className="form-workspace-top">
            <div>
              <h2>{form.creating?`New ${mod.title.replace(/s$/,'').toLowerCase()}`:mod.title.replace(/s$/,'')}</h2>
              <p className="subhead">Fill in the details and save to update the shared Mentora database.</p>
            </div>
            <div style={{display:'flex',gap:9}}>
              <button className="btn btn-outline" onClick={closeForm} disabled={saving}>Cancel</button>
            </div>
          </div>
          {formError&&<p role="alert" className="error">{formError}</p>}
          <form onSubmit={e=>void saveForm(e)}>
            {sections.map(section=>{
              const sectionFields=mod.fields.filter(f=>(f.section??'')===section&&!f.readonly);
              if(!sectionFields.length)return null;
              return(
                <div className="form-section" key={section||'__root'}>
                  {section&&<div className="form-section-title"><h3>{section}</h3></div>}
                  <div className="form-fields-grid">
                    {sectionFields.map(f=>renderField(f))}
                  </div>
                </div>
              );
            })}
            <div className="form-save-bar">
              <span>All fields marked <span className="required">*</span> are required.</span>
              <div>
                <button type="button" className="btn btn-outline" onClick={closeForm} disabled={saving}>Discard</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?<><Loader2 size={14} className="spin"/> Saving…</>:'Save'}</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ---- Table ---- */}
      {!form.open&&(
        <div className="panel table-panel">
          <div className="table-top">
            <div>
              <h3>{mod.title}</h3>
              <p>{loading?'Loading…':`${data?.count??0} records`}</p>
            </div>
            <div className="table-tools">
              <button className="btn btn-outline btn-small" onClick={()=>void load()} title="Refresh" aria-label="Refresh records"><RefreshCw size={14}/></button>
            </div>
          </div>

          <div className="table-filters">
            <div className="table-search">
              <Search size={15}/>
              <input
                placeholder={`Search ${mod.title.toLowerCase()}…`}
                value={search}
                onChange={e=>setSearch(e.target.value)}
                aria-label="Search"
              />
            </div>
            {hasStatus&&(
              <div className="filter-select">
                <span style={{fontSize:11,color:'#728a96'}}>Status</span>
                <select aria-label="Filter by status" value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setPage(1);}}>
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            )}
            <div className="per-page">
              <span>Rows</span>
              <select aria-label="Rows per page" value={limit} onChange={e=>{setLimit(Number(e.target.value));setPage(1);}}>
                {[10,25,50,100].map(n=><option key={n}>{n}</option>)}
              </select>
            </div>
          </div>

          {loading?(
            <div role="status" aria-live="polite" className="empty"><Loader2 className="spin" size={28}/><b>Loading {mod.title.toLowerCase()}…</b></div>
          ):!data||data.rows.length===0?(
            <div className="empty">
              <div className="empty-icon"><Search size={22}/></div>
              <b>No records found</b>
              <span>{search?`No results for "${search}".`:`No ${mod.title.toLowerCase()} have been added yet.`}</span>
              {!mod.readOnly&&<button className="btn btn-primary" style={{marginTop:8}} onClick={openCreate}><Plus size={14}/> Add first record</button>}
            </div>
          ):(
            <>
              <div className="table-overflow" role="region" aria-label={`${mod.title} records`} tabIndex={0}>
                <table className="data-table">
                  <thead>
                    <tr>
                      {mod.columns.map(col=><th key={col.key}>{col.label}</th>)}
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row,i)=>{
                      const rowId=String(row.id??row.user_id??i);
                      return(
                        <tr key={rowId}>
                          {mod.columns.map(col=>(
                            <td key={col.key}>
                              {col.kind==='status'
                                ?<StatusBadge value={mod.slug==='tute-orders' && col.key==='dispatch_status' && row.delivery_method==='courier' && row.status==='approved' && row.dispatch_status==='pending' ? 'Ready for dispatch' : String(row[col.key]??'')}/>
                                :cellValue(col,row)
                              }
                            </td>
                          ))}
                          <td>
                            <div className="row-actions">
                              {/* Students: open dedicated workspace */}
                              {isStudentsModule&&(
                                <Link
                                  href={`/student/${rowId}`}
                                  className="btn btn-outline btn-small"
                                  title="Open student workspace"
                                >
                                  <Eye size={13}/> Manage
                                </Link>
                              )}
                              {/* Courses: open class workspace */}
                              {isCoursesModule&&(
                                <Link
                                  href={`/classroom/${rowId}`}
                                  className="btn btn-outline btn-small"
                                  title="Open class workspace"
                                >
                                  <Eye size={13}/> Open
                                </Link>
                              )}
                              {/* Generic edit */}
                              {mod.allowEdit&&!isStudentsModule&&(
                                <button
                                  title="Edit"
                                  className="row-actions"
                                  style={{border:'1px solid #dbe4ea',background:'#fff',color:'#5d7987',borderRadius:8,padding:7,display:'grid',placeItems:'center'}}
                                  onClick={()=>openEdit(row)}
                                >
                                  <PencilLine size={13}/>
                                </button>
                              )}
                              {/* View payment proof slip if available */}
                              {Boolean(row.payment_proof_path)&&(
                                <a
                                  href={`/api/manager/${mod.slug}/${rowId}/receipt`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-outline btn-small"
                                  style={{border:'1px solid #cce5ff',background:'#f0f7ff',color:'#0066cc',gap:4}}
                                  title="View submitted bank deposit proof slip"
                                >
                                  <ExternalLink size={12}/> Slip
                                </a>
                              )}
                              {/* Approval */}
                              {mod.approval&&(
                                <>
                                  <button
                                    className="approve-action"
                                    style={{border:'1px solid #c8edd8',background:'#edfaf3',color:'#1a7a52',borderRadius:8,padding:'7px 11px',fontSize:11,fontWeight:700,display:'flex',alignItems:'center',gap:5}}
                                    disabled={approveId===rowId||row.status==='approved'}
                                    onClick={()=>void doApprove(rowId,true,row.delivery_method)}
                                  >
                                    <CheckCircle2 size={12}/> Approve
                                  </button>
                                  <button
                                    className="reject-action"
                                    style={{border:'1px solid #f5c5c5',background:'#fff5f5',color:'#c83f4a',borderRadius:8,padding:'7px 11px',fontSize:11,fontWeight:700,display:'flex',alignItems:'center',gap:5}}
                                    disabled={approveId===rowId||row.status==='rejected'}
                                    onClick={()=>void doApprove(rowId,false)}
                                  >
                                    <XCircle size={12}/> Reject
                                  </button>
                                </>
                              )}
                              {/* Reward adjustment */}
                              {mod.reward&&(
                                <button
                                  style={{border:'1px solid #a8e5ce',background:'#eaf9f3',color:'#0a8862',borderRadius:8,padding:'7px 11px',fontSize:11,fontWeight:700,display:'flex',alignItems:'center',gap:4}}
                                  onClick={async()=>{
                                    const input=prompt(`Enter ${mod.reward} adjustment (+/- integer e.g. 50 or -20):`);
                                    if(!input)return;
                                    const amount=parseInt(input.trim(),10);
                                    if(isNaN(amount)||amount===0){
                                      alert('Please enter a valid non-zero integer');
                                      return;
                                    }
                                    const reason=prompt(`Enter reason for adjusting ${mod.reward}:`);
                                    if(!reason||!reason.trim()){
                                      alert('Reason is required for reward ledger');
                                      return;
                                    }
                                    try{
                                      const res=await fetch('/api/manager/actions',{
                                        method:'POST',
                                        headers:{'Content-Type':'application/json'},
                                        body:JSON.stringify({
                                          module:mod.slug,
                                          action:'adjust',
                                          id:rowId,
                                          details:`${amount}|${reason.trim()}`
                                        })
                                      });
                                      const json=await res.json();
                                      if(!res.ok)throw new Error(json.error||'Adjustment failed');
                                      setNotice(`${mod.reward} balance updated successfully.`);
                                      await load();
                                    }catch(e){
                                      setError(e instanceof Error?e.message:'Adjustment failed');
                                    }
                                  }}
                                >
                                  <Sparkles size={12}/> Adjust {mod.reward}
                                </button>
                              )}
                              {/* Archive */}
                              {mod.canArchive&&row.status!=='archived'&&(
                                <button
                                  style={{border:'1px solid #dbe4ea',background:'#fff',color:'#8899a2',borderRadius:8,padding:'7px 10px',fontSize:11}}
                                  onClick={()=>void doArchive(row)}
                                  disabled={saving}
                                >
                                  Archive
                                </button>
                              )}
                              {/* Audit log inspector */}
                              {mod.slug==='audit'&&(
                                <button
                                  type="button"
                                  style={{border:'1px solid #19e69a',background:'rgba(25,230,154,0.12)',color:'#062a35',borderRadius:8,padding:'6px 10px',fontSize:11,display:'inline-flex',alignItems:'center',gap:4,cursor:'pointer',fontWeight:600}}
                                  onClick={()=>setInspectRow(row)}
                                >
                                  <Eye size={12}/> Details
                                </button>
                              )}
                              {/* Readonly indicator */}
                              {mod.readOnly&&!isStudentsModule&&!isCoursesModule&&!mod.approval&&!mod.reward&&mod.slug!=='audit'&&(
                                <span style={{fontSize:11,color:'#92a8b2'}}>View only</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="table-bottom">
                <span>Showing {(page-1)*limit+1}–{Math.min(page*limit,data.count)} of {data.count}</span>
                <div className="pagination">
                  <button disabled={page<=1} onClick={()=>setPage(p=>p-1)} aria-label="Previous page"><ChevronLeft size={15}/></button>
                  <span>Page {page} of {totalPages}</span>
                  <button disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)} aria-label="Next page"><ChevronRight size={15}/></button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Audit Log Details Modal */}
      {inspectRow&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:'1rem'}}>
          <div style={{background:'#ffffff',color:'#062a35',borderRadius:12,width:'100%',maxWidth:600,maxHeight:'85vh',overflowY:'auto',boxShadow:'0 20px 40px rgba(0,0,0,0.3)',padding:'1.5rem'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem',borderBottom:'1px solid #edf2f7',paddingBottom:'0.75rem'}}>
              <h3 style={{margin:0,fontSize:'1.1rem',fontWeight:700}}>Audit Log Record</h3>
              <button onClick={()=>setInspectRow(null)} style={{background:'none',border:'none',fontSize:'1.2rem',cursor:'pointer',color:'#718096'}}>✕</button>
            </div>
            <div style={{display:'grid',gap:'0.75rem',fontSize:'0.85rem'}}>
              <div><strong>Action:</strong> <span className="badge" style={{marginLeft:6}}>{String(inspectRow.action??'—')}</span></div>
              <div><strong>Target Entity:</strong> {String(inspectRow.entity??'—')} ({String(inspectRow.entity_id??'—')})</div>
              <div><strong>Actor:</strong> {String(inspectRow.actor_name??'—')} ({String(inspectRow.actor_email??'—')})</div>
              <div><strong>Recorded At:</strong> {inspectRow.created_at?new Date(String(inspectRow.created_at)).toLocaleString('en-LK'):'—'}</div>
              <div><strong>Payload Details:</strong></div>
              <pre style={{background:'#062a35',color:'#19e69a',padding:'1rem',borderRadius:8,fontSize:'0.8rem',overflowX:'auto',fontFamily:'monospace',margin:0}}>
                {JSON.stringify(inspectRow.details??{}, null, 2)}
              </pre>
            </div>
            <div style={{marginTop:'1.25rem',display:'flex',justifyContent:'flex-end'}}>
              <button className="btn btn-outline btn-small" onClick={()=>setInspectRow(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
