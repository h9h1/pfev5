import { BookOpen, Upload, Download, Trash2, Plus, X, File, FileText, Image, Loader } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { coursesAPI, downloadBlob } from '../services/api.js'

export default function Courses({ user }) {
  const [courses, setCourses]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState(null)
  const [files, setFiles]       = useState([])
  const [showNew, setShowNew]   = useState(false)
  const [form, setForm]         = useState({ title:'', description:'' })
  const [uploading, setUploading] = useState(false)
  const [toast, setToast]       = useState(null)
  const fileRef = useRef()
  const isTeacher = user.role==='teacher'

  const showToast=(msg,type='success')=>{setToast({msg,type});setTimeout(()=>setToast(null),3000)}

  useEffect(()=>{load()},[])

  const load=async()=>{
    setLoading(true)
    try{const r=await coursesAPI.list();setCourses(r.data)}
    catch{showToast('Erreur chargement','error')}
    finally{setLoading(false)}
  }

  const openCourse=async(c)=>{
    setSelected(c)
    try{const r=await coursesAPI.listFiles(c.id);setFiles(r.data)}
    catch{setFiles([])}
  }

  const createCourse=async()=>{
    if(!form.title.trim())return showToast('Titre requis','error')
    try{
      await coursesAPI.create(form)
      setForm({title:'',description:''});setShowNew(false)
      await load();showToast('Cours créé')
    }catch(e){showToast(e.response?.data?.detail||'Erreur','error')}
  }

  const deleteCourse=async(c,e)=>{
    e.stopPropagation()
    if(!confirm(`Supprimer "${c.title}" et tous ses fichiers ?`))return
    try{
      await coursesAPI.delete(c.id)
      await load();showToast('Cours supprimé')
      if(selected?.id===c.id)setSelected(null)
    }catch(e){showToast(e.response?.data?.detail||'Erreur suppression','error')}
  }

  const uploadFile=async(e)=>{
    const file=e.target.files[0];if(!file||!selected)return
    setUploading(true)
    try{
      await coursesAPI.upload(selected.id,file)
      const r=await coursesAPI.listFiles(selected.id);setFiles(r.data)
      showToast(`${file.name} uploadé`)
    }catch{showToast('Erreur upload','error')}
    finally{setUploading(false);e.target.value=''}
  }

  const download=async(file)=>{
    try{const r=await coursesAPI.download(selected.id,file.id);downloadBlob(r.data,file.filename)}
    catch{showToast('Erreur téléchargement','error')}
  }

  const delFile=async(file)=>{
    if(!confirm(`Supprimer "${file.filename}" ?`))return
    try{await coursesAPI.deleteFile(selected.id,file.id);setFiles(f=>f.filter(x=>x.id!==file.id));showToast('Fichier supprimé')}
    catch{showToast('Erreur','error')}
  }

  const fIcon=(type,name)=>{
    const n=(name||'').toLowerCase()
    if(n.endsWith('.pdf')||type?.includes('pdf'))return <FileText size={20} color='#ef4444'/>
    if(n.endsWith('.doc')||n.endsWith('.docx'))return <FileText size={20} color='#3b82f6'/>
    if(n.endsWith('.xls')||n.endsWith('.xlsx'))return <FileText size={20} color='#10b981'/>
    if(type?.includes('image'))return <Image size={20} color='#f59e0b'/>
    return <File size={20} color='var(--text3)'/>
  }
  const fmtSize=b=>b>1048576?`${(b/1048576).toFixed(1)} Mo`:`${Math.round((b||0)/1024)} Ko`

  return(
    <div style={{position:'relative'}} className="fade-in">
      {toast&&<div style={{...T.toast,background:toast.type==='error'?'#ef4444':'#10b981'}}>{toast.msg}</div>}

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
        <div>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:800,marginBottom:4}}>Cours</h2>
          <p style={{color:'var(--text2)',fontSize:13}}>{courses.length} cours disponible{courses.length!==1?'s':''}</p>
        </div>
        {isTeacher&&<button style={T.btn} onClick={()=>setShowNew(true)}><Plus size={14}/> Nouveau cours</button>}
      </div>

      {showNew&&(
        <div style={T.overlay} onClick={e=>e.target===e.currentTarget&&setShowNew(false)}>
          <div style={T.modal}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <span style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:16}}>Nouveau cours</span>
              <button style={T.closeBtn} onClick={()=>setShowNew(false)}><X size={14}/></button>
            </div>
            <div style={T.field}><label style={T.label}>Titre *</label>
              <input style={T.input} autoFocus value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/></div>
            <div style={T.field}><label style={T.label}>Description</label>
              <textarea style={{...T.input,height:80,resize:'vertical'}} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></div>
            <div style={{display:'flex',gap:8,marginTop:8}}>
              <button style={T.btnSec} onClick={()=>setShowNew(false)}>Annuler</button>
              <button style={T.btn} onClick={createCourse}>Créer</button>
            </div>
          </div>
        </div>
      )}

      {loading?<div style={T.empty}><Loader size={28} style={{animation:'spin 1s linear infinite'}}/></div>:courses.length===0?(
        <div style={T.empty}><BookOpen size={48} style={{marginBottom:12,opacity:.3}}/><div>Aucun cours</div></div>
      ):(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:14}}>
          {courses.map(c=>(
            <div key={c.id} style={{...T.card,position:'relative'}} onClick={()=>openCourse(c)}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--accent)';e.currentTarget.style.transform='translateY(-2px)'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.transform='translateY(0)'}}>
              {isTeacher&&c.teacher_id===user.id&&(
                <button style={T.deleteCardBtn} onClick={e=>deleteCourse(c,e)} title="Supprimer ce cours"><Trash2 size={13}/></button>
              )}
              <BookOpen size={20} color='var(--accent2)' strokeWidth={1.8}/>
              <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:15,marginBottom:6}}>{c.title}</div>
              {c.description&&<div style={{fontSize:12,color:'var(--text2)',marginBottom:10,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{c.description}</div>}
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                <span style={T.meta}>{c.teacher_name||'—'}</span>
                <span style={T.meta}>{c.file_count||0} fichier{(c.file_count||0)!==1?'s':''}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected&&(
        <div style={T.overlay} onClick={e=>e.target===e.currentTarget&&setSelected(null)}>
          <div style={T.panel} className="slide-right">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
              <div>
                <div style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:18,marginBottom:4}}>{selected.title}</div>
                <div style={{fontSize:13,color:'var(--text2)'}}>📎 Ressources du cours</div>
              </div>
              <button style={T.closeBtn} onClick={()=>setSelected(null)}><X size={14}/></button>
            </div>

            {isTeacher&&selected.teacher_id===user.id&&(
              <div style={{marginBottom:16}}>
                <div style={T.uploadZone} onClick={()=>fileRef.current?.click()}>
                  <input ref={fileRef} type="file" style={{display:'none'}} onChange={uploadFile}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.zip,.txt"/>
                  {uploading?<div>⏳ Upload...</div>:<>
                    <div style={{fontSize:26,marginBottom:8}}>⬆️</div>
                    <div style={{fontSize:13,fontWeight:500,marginBottom:4}}>Cliquez pour uploader</div>
                    <div style={{fontSize:11,color:'var(--text3)'}}>PDF, Word, Excel, PowerPoint, images...</div>
                  </>}
                </div>
              </div>
            )}

            {files.length===0?(
              <div style={T.empty}><div style={{fontSize:40,marginBottom:8}}>📂</div><div>Aucun fichier</div></div>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {files.map(f=>(
                  <div key={f.id} style={T.fileItem}>
                    <span style={{fontSize:22}}>{fIcon(f.file_type,f.filename)}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.filename}</div>
                      <div style={{fontSize:11,color:'var(--text3)'}}>{fmtSize(f.file_size)}</div>
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      <button style={T.dlBtn} onClick={()=>download(f)}>⬇️</button>
                      {isTeacher&&selected.teacher_id===user.id&&(
                        <button style={T.delBtn} onClick={()=>delFile(f)}><Trash2 size={13}/></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const T={
  toast:{position:'fixed',top:20,right:20,zIndex:9999,borderRadius:10,padding:'12px 20px',color:'#fff',fontSize:13,fontWeight:500,boxShadow:'0 4px 20px rgba(0,0,0,.4)'},
  btn:{background:'linear-gradient(135deg,#2d8a4e,#1a5c32)',border:'none',borderRadius:9,color:'#fff',padding:'9px 18px',fontSize:13,fontWeight:600,cursor:'pointer'},
  btnSec:{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:9,color:'var(--text)',padding:'9px 16px',fontSize:13,cursor:'pointer'},
  empty:{textAlign:'center',padding:'50px 20px',color:'var(--text2)'},
  card:{background:'var(--surface)',border:'1.5px solid var(--border)',borderRadius:14,padding:'20px',cursor:'pointer',transition:'all .2s'},
  deleteCardBtn:{position:'absolute',top:10,right:10,background:'rgba(239,68,68,.15)',border:'1px solid rgba(239,68,68,.3)',borderRadius:7,color:'#ef4444',padding:'4px 8px',cursor:'pointer',fontSize:12,zIndex:1},
  meta:{fontSize:11,color:'var(--text3)',background:'var(--surface2)',padding:'3px 8px',borderRadius:6},
  overlay:{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'flex-end'},
  modal:{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,padding:'28px',width:'100%',maxWidth:460,margin:'auto'},
  panel:{background:'var(--surface)',borderLeft:'1px solid var(--border)',width:'100%',maxWidth:520,height:'100vh',overflow:'auto',padding:'28px'},
  closeBtn:{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text2)',width:32,height:32,cursor:'pointer'},
  field:{marginBottom:16},
  label:{display:'block',fontSize:11,color:'var(--text3)',marginBottom:6,fontWeight:600,textTransform:'uppercase',letterSpacing:.8},
  input:{width:'100%',background:'var(--surface2)',border:'1.5px solid var(--border)',borderRadius:9,padding:'10px 13px',color:'var(--text)',fontSize:13.5,outline:'none'},
  uploadZone:{border:'2px dashed var(--border)',borderRadius:12,padding:'24px',textAlign:'center',cursor:'pointer',marginBottom:4},
  fileItem:{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:'var(--surface2)',borderRadius:10,border:'1px solid var(--border)'},
  dlBtn:{background:'rgba(45,138,78,.12)',border:'1px solid rgba(45,138,78,.3)',borderRadius:7,color:'var(--accent2)',padding:'5px 10px',fontSize:11.5,cursor:'pointer',fontWeight:500},
  delBtn:{background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.2)',borderRadius:7,color:'#ef4444',padding:'5px 8px',fontSize:12,cursor:'pointer'}
}
