import { FileText, Plus, Upload, Download, Trash2, X, Check, Loader, Clock, ShieldCheck } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { examsAPI, coursesAPI, downloadBlob } from '../services/api.js'

export default function Exams({ user }) {
  const [exams, setExams]       = useState([])
  const [courses, setCourses]   = useState([])
  const [selected, setSelected] = useState(null)
  const [subs, setSubs]         = useState([])
  const [showNew, setShowNew]   = useState(false)
  const [form, setForm]         = useState({ title:'', course_id:'', exam_type:'examen', duration_min:'' })
  const [grades, setGrades]     = useState({})
  const [myGrades, setMyGrades] = useState([])
  const [pending, setPending]   = useState([])
  const [toast, setToast]       = useState(null)
  const sujetRef = useRef(); const subRef = useRef()
  const isTeacher = user.role === 'teacher'
  const isAdmin   = user.role === 'admin'
  const isStudent = user.role === 'student'

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null), 3000) }

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const [e, c] = await Promise.all([examsAPI.list(), coursesAPI.list()])
      setExams(e.data); setCourses(c.data)
      if (isStudent) {
        try { const r = await examsAPI.myGrades(); setMyGrades(r.data) } catch { setMyGrades([]) }
      }
      if (isAdmin) {
        try { const r = await examsAPI.pendingApproval(); setPending(r.data) } catch { setPending([]) }
      }
    } catch { showToast('Erreur chargement','error') }
  }

  const openExam = async (exam) => {
    setSelected(exam)
    if (isTeacher || isAdmin) {
      try { const r = await examsAPI.listSubmissions(exam.id); setSubs(r.data) } catch { setSubs([]) }
    }
  }

  const createExam = async () => {
    if (!form.title || !form.course_id) return showToast('Titre et cours requis','error')
    try {
      await examsAPI.create({...form, duration_min: form.duration_min || null})
      setForm({title:'',course_id:'',exam_type:'examen',duration_min:''}); setShowNew(false)
      await load(); showToast('Examen créé')
    } catch(e) { showToast(e.response?.data?.detail || 'Erreur','error') }
  }

  const deleteExam = async (exam, e) => {
    e.stopPropagation()
    if (!confirm(`Supprimer "${exam.title}" et toutes les soumissions ?`)) return
    try {
      await examsAPI.deleteExam(exam.id)
      await load(); showToast('Examen supprimé')
      if (selected?.id === exam.id) setSelected(null)
    } catch(e) { showToast(e.response?.data?.detail || 'Erreur','error') }
  }

  const uploadSujet = async (e) => {
    const file = e.target.files[0]; if (!file) return
    try {
      await examsAPI.uploadSujet(selected.id, file); showToast('Sujet uploadé')
      const r = await examsAPI.list(); setExams(r.data)
      setSelected(r.data.find(x => x.id === selected.id) || selected)
    } catch { showToast('Erreur','error') }
    finally { e.target.value = '' }
  }

  const dlSujet = async () => {
    try { const r = await examsAPI.downloadSujet(selected.id); downloadBlob(r.data, `sujet_${selected.title}.pdf`) }
    catch { showToast('Sujet non disponible','error') }
  }

  const submitDevoir = async (e) => {
    const file = e.target.files[0]; if (!file) return
    try {
      const s = await examsAPI.createSubmission(selected.id)
      await examsAPI.uploadSubmission(s.data.id, selected.id, file)
      showToast('Devoir soumis !')
    } catch(e) { showToast(e.response?.data?.detail || 'Erreur soumission','error') }
    finally { e.target.value = '' }
  }

  const gradeSubmission = async (sub) => {
    const g = parseFloat(grades[sub.id])
    if (isNaN(g) || g < 0 || g > 20) return showToast('Note entre 0 et 20','error')
    try {
      await examsAPI.grade(sub.id, {grade:g, comment:''})
      const r = await examsAPI.listSubmissions(selected.id); setSubs(r.data)
      showToast(`${g}/20 attribué — en attente d'approbation admin`)
    } catch { showToast('Erreur','error') }
  }

  const approveGrade = async (sub) => {
    try {
      await examsAPI.approveGrade(sub.id)
      // Refresh pending list and current exam subs
      const [p, s] = await Promise.all([
        examsAPI.pendingApproval(),
        selected ? examsAPI.listSubmissions(selected.id) : Promise.resolve({data:[]})
      ])
      setPending(p.data); setSubs(s.data)
      showToast(`Note ${sub.grade}/20 approuvée — étudiant notifié`)
    } catch { showToast('Erreur approbation','error') }
  }

  const dlSub = async (sub) => {
    try { const r = await examsAPI.downloadSubmission(sub.id); downloadBlob(r.data, `copie_${sub.student_name}.pdf`) }
    catch { showToast('Pas de fichier','error') }
  }

  const TC = {examen:'#ef4444', devoir:'#f59e0b', quiz:'#2d8a4e'}
  const TL = {examen:'Examen', devoir:'Devoir', quiz:'Quiz'}

  return (
    <div className="fade-in">
      {toast && <div style={{...T.toast, background: toast.type==='error' ? '#ef4444' : '#10b981'}}>{toast.msg}</div>}

      {/* ── Header ── */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
        <div>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:800,marginBottom:4}}>Examens</h2>
          <p style={{color:'var(--text2)',fontSize:13}}>{exams.length} évaluation{exams.length!==1?'s':''}</p>
        </div>
        {isTeacher && <button style={T.btn} onClick={()=>setShowNew(true)}><Plus size={14}/> Créer</button>}
      </div>

      {/* ── Admin: pending approvals banner ── */}
      {isAdmin && pending.length > 0 && (
        <div style={T.pendingBanner}>
          <ShieldCheck size={16} style={{flexShrink:0}}/>
          <span style={{fontWeight:600}}>{pending.length} note{pending.length>1?'s':''} en attente d'approbation</span>
          <span style={{color:'var(--text2)',fontSize:12,flex:1}}>— les étudiants ne verront leurs notes qu'après votre validation</span>
        </div>
      )}

      {/* ── Student: my approved grades ── */}
      {isStudent && myGrades.length > 0 && (
        <div style={T.gradesSection}>
          <div style={T.secTitle}><ShieldCheck size={12}/> Mes notes publiées</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {myGrades.map(g => (
              <div key={g.submission_id} style={T.gradeRow}>
                <div>
                  <span style={{fontWeight:600,fontSize:13}}>{g.exam_title}</span>
                  <span style={{...T.typeBadge, background:`${TC[g.exam_type]||'#2d8a4e'}22`, color:TC[g.exam_type]||'#2d8a4e', marginLeft:8}}>
                    {TL[g.exam_type]||g.exam_type}
                  </span>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={T.gradeChip}>{g.grade}/20</span>
                  {g.comment && <span style={{fontSize:11,color:'var(--text3)'}}>{g.comment}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Create exam modal ── */}
      {showNew && (
        <div style={T.overlay} onClick={e=>e.target===e.currentTarget&&setShowNew(false)}>
          <div style={T.modal}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
              <span style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:16}}>Nouvelle évaluation</span>
              <button style={T.closeBtn} onClick={()=>setShowNew(false)}><X size={14}/></button>
            </div>
            <div style={T.field}><label style={T.label}>Titre *</label>
              <input style={T.input} autoFocus value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/></div>
            <div style={T.field}><label style={T.label}>Cours *</label>
              <select style={T.select} value={form.course_id} onChange={e=>setForm(f=>({...f,course_id:e.target.value}))}>
                <option value="">-- Sélectionner --</option>
                {courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}
              </select></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div style={T.field}><label style={T.label}>Type</label>
                <select style={T.select} value={form.exam_type} onChange={e=>setForm(f=>({...f,exam_type:e.target.value}))}>
                  <option value="examen">📝 Examen</option>
                  <option value="devoir">📋 Devoir</option>
                  <option value="quiz">❓ Quiz</option>
                </select></div>
              <div style={T.field}><label style={T.label}>Durée (min)</label>
                <input style={T.input} type="number" value={form.duration_min} onChange={e=>setForm(f=>({...f,duration_min:e.target.value}))}/></div>
            </div>
            <div style={{display:'flex',gap:8,marginTop:8}}>
              <button style={T.btnSec} onClick={()=>setShowNew(false)}>Annuler</button>
              <button style={T.btn} onClick={createExam}>Créer</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Exam cards ── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:14}}>
        {exams.map(e => (
          <div key={e.id} style={{...T.card,borderTop:`3px solid ${TC[e.exam_type]||'#2d8a4e'}`,position:'relative'}}
            onClick={()=>openExam(e)}
            onMouseEnter={ev=>ev.currentTarget.style.transform='translateY(-2px)'}
            onMouseLeave={ev=>ev.currentTarget.style.transform='translateY(0)'}>
            {isTeacher && e.teacher_id===user.id && (
              <button style={T.deleteCardBtn} onClick={ev=>deleteExam(e,ev)} title="Supprimer"><Trash2 size={13}/></button>
            )}
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:10,paddingRight:30}}>
              <span style={{fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:20,
                background:`${TC[e.exam_type]||'#2d8a4e'}22`,color:TC[e.exam_type]||'#2d8a4e'}}>
                {TL[e.exam_type]||e.exam_type}
              </span>
              {e.minio_key && <span style={{fontSize:11,color:'#10b981',background:'rgba(16,185,129,.12)',padding:'3px 8px',borderRadius:6}}><FileText size={11}/> Sujet</span>}
            </div>
            <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:15,margin:'8px 0 10px'}}>{e.title}</div>
            <div style={{display:'flex',gap:8}}>
              {e.duration_min && <span style={T.meta}>{e.duration_min} min</span>}
              {(isTeacher||isAdmin) && <span style={T.meta}>{e.submission_count||0} copies</span>}
            </div>
          </div>
        ))}
      </div>

      {/* ── Exam detail panel ── */}
      {selected && (
        <div style={T.overlay} onClick={e=>e.target===e.currentTarget&&setSelected(null)}>
          <div style={T.panel} className="slide-right">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
              <div>
                <span style={{fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:20,
                  background:`${TC[selected.exam_type]||'#2d8a4e'}22`,color:TC[selected.exam_type]||'#2d8a4e',display:'inline-block',marginBottom:8}}>
                  {TL[selected.exam_type]||selected.exam_type}
                </span>
                <div style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:18}}>{selected.title}</div>
                {selected.duration_min && <div style={{fontSize:13,color:'var(--text2)',marginTop:4}}>⏱ {selected.duration_min} min</div>}
              </div>
              <button style={T.closeBtn} onClick={()=>setSelected(null)}><X size={14}/></button>
            </div>

            {/* Teacher view */}
            {isTeacher && (
              <div>
                <div style={T.secTitle}>📋 Sujet</div>
                <input ref={sujetRef} type="file" style={{display:'none'}} onChange={uploadSujet} accept=".pdf,.doc,.docx"/>
                <div style={{display:'flex',gap:10,marginBottom:24,flexWrap:'wrap'}}>
                  {selected.teacher_id === user.id && (
                    <button style={T.btn} onClick={()=>sujetRef.current?.click()}><Upload size={13}/> Uploader sujet</button>
                  )}
                  {selected.minio_key && <button style={T.dlBtn} onClick={dlSujet}><Download size={13}/> Télécharger sujet</button>}
                </div>

                <div style={T.secTitle}>📥 Copies ({subs.length})</div>
                {subs.length === 0 ? (
                  <div style={{color:'var(--text3)',fontSize:13,padding:'12px 0'}}>Aucune copie rendue</div>
                ) : (
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {subs.map(s => (
                      <div key={s.id} style={{...T.fileItem,flexWrap:'wrap',gap:8}}>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:500,fontSize:13}}>{s.student_name||s.student_id?.slice(0,8)}</div>
                          <div style={{fontSize:11,color:'var(--text3)'}}>{s.submitted_at?.slice(0,16)}</div>
                          {s.grade != null && (
                            <div style={{display:'flex',alignItems:'center',gap:6,marginTop:4}}>
                              <span style={{fontSize:12,fontWeight:600,color: s.grade_approved ? '#10b981' : '#f59e0b'}}>
                                {s.grade_approved ? '✓' : <Clock size={11}/>} {s.grade}/20
                              </span>
                              <span style={{fontSize:11,color:'var(--text3)'}}>
                                {s.grade_approved ? 'Approuvé' : '— en attente d\'approbation admin'}
                              </span>
                            </div>
                          )}
                        </div>
                        <div style={{display:'flex',gap:6,alignItems:'center'}}>
                          {s.minio_key && <button style={T.dlBtn} onClick={()=>dlSub(s)}><Download size={13}/></button>}
                          <input style={{...T.input,width:64,padding:'5px 8px',fontSize:12}} type="number"
                            min="0" max="20" placeholder="/20"
                            value={grades[s.id]||''} onChange={e=>setGrades(g=>({...g,[s.id]:e.target.value}))}/>
                          <button style={T.btn} onClick={()=>gradeSubmission(s)}><Check size={13}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Admin view */}
            {isAdmin && (
              <div>
                <div style={T.secTitle}>📋 Sujet</div>
                <div style={{marginBottom:24}}>
                  {selected.minio_key
                    ? <button style={T.dlBtn} onClick={dlSujet}><Download size={13}/> Télécharger le sujet</button>
                    : <span style={{color:'var(--text3)',fontSize:13}}>Sujet non disponible</span>}
                </div>

                <div style={T.secTitle}>
                  <ShieldCheck size={12}/> Copies & Approbation des notes ({subs.length})
                </div>
                {subs.length === 0 ? (
                  <div style={{color:'var(--text3)',fontSize:13,padding:'12px 0'}}>Aucune copie rendue</div>
                ) : (
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {subs.map(s => (
                      <div key={s.id} style={{...T.fileItem,flexWrap:'wrap',gap:8}}>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:500,fontSize:13}}>{s.student_name||s.student_id?.slice(0,8)}</div>
                          <div style={{fontSize:11,color:'var(--text3)'}}>{s.submitted_at?.slice(0,16)}</div>
                          {s.grade != null ? (
                            <div style={{display:'flex',alignItems:'center',gap:6,marginTop:4}}>
                              <span style={{fontSize:12,fontWeight:600,color: s.grade_approved ? '#10b981' : '#f59e0b'}}>
                                {s.grade}/20
                              </span>
                              {s.grade_approved
                                ? <span style={T.approvedBadge}><Check size={10}/> Approuvé</span>
                                : <span style={T.pendingBadge}><Clock size={10}/> En attente</span>}
                            </div>
                          ) : (
                            <span style={{fontSize:11,color:'var(--text3)'}}>Pas encore noté</span>
                          )}
                        </div>
                        <div style={{display:'flex',gap:6,alignItems:'center'}}>
                          {s.minio_key && <button style={T.dlBtn} onClick={()=>dlSub(s)}><Download size={13}/></button>}
                          {s.grade != null && !s.grade_approved && (
                            <button style={T.approveBtn} onClick={()=>approveGrade(s)}>
                              <ShieldCheck size={13}/> Approuver
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Student view */}
            {isStudent && (
              <div>
                <div style={T.secTitle}><FileText size={11}/> Sujet</div>
                {selected.minio_key ? (
                  <button style={{...T.dlBtn,marginBottom:24}} onClick={dlSujet}><Download size={13}/> Télécharger le sujet</button>
                ) : (
                  <div style={{color:'var(--text3)',fontSize:13,marginBottom:24}}>Sujet non disponible</div>
                )}

                <div style={T.secTitle}>📤 Rendre mon devoir</div>
                <input ref={subRef} type="file" style={{display:'none'}} onChange={submitDevoir} accept=".pdf,.doc,.docx"/>
                <button style={T.btn} onClick={()=>subRef.current?.click()}><Upload size={13}/> Soumettre mon devoir</button>
                <div style={{fontSize:12,color:'var(--text3)',marginTop:8}}>Formats: PDF, Word</div>

                {/* Show approved grade for this exam if exists */}
                {(() => {
                  const g = myGrades.find(x => x.exam_id === selected.id)
                  if (!g) return (
                    <div style={{...T.gradeWaiting, marginTop:20}}>
                      <Clock size={14}/>
                      <span>Votre note sera visible ici après correction .</span>
                    </div>
                  )
                  return (
                    <div style={{...T.gradeApprovedBox, marginTop:20}}>
                      <ShieldCheck size={16} color="#10b981"/>
                      <div>
                        <div style={{fontWeight:700,fontSize:15}}>{g.grade}/20</div>
                        {g.comment && <div style={{fontSize:12,color:'var(--text2)',marginTop:2}}>{g.comment}</div>}
                        <div style={{fontSize:11,color:'#10b981',marginTop:4}}>Note approuvée par l'administration</div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const T = {
  toast:            {position:'fixed',top:20,right:20,zIndex:9999,borderRadius:10,padding:'12px 20px',color:'#fff',fontSize:13,fontWeight:500,boxShadow:'0 4px 20px rgba(0,0,0,.4)'},
  btn:              {background:'linear-gradient(135deg,#2d8a4e,#1a5c32)',border:'none',borderRadius:9,color:'#fff',padding:'9px 16px',fontSize:13,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap',display:'inline-flex',alignItems:'center',gap:6},
  btnSec:           {background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:9,color:'var(--text)',padding:'9px 16px',fontSize:13,cursor:'pointer'},
  dlBtn:            {background:'rgba(45,138,78,.12)',border:'1px solid rgba(45,138,78,.3)',borderRadius:7,color:'var(--accent2)',padding:'7px 12px',fontSize:12,cursor:'pointer',fontWeight:500,whiteSpace:'nowrap',display:'inline-flex',alignItems:'center',gap:5},
  approveBtn:       {background:'linear-gradient(135deg,#2563eb,#1d4ed8)',border:'none',borderRadius:7,color:'#fff',padding:'7px 12px',fontSize:12,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:5},
  deleteCardBtn:    {position:'absolute',top:10,right:10,background:'rgba(239,68,68,.15)',border:'1px solid rgba(239,68,68,.3)',borderRadius:7,color:'#ef4444',padding:'4px 8px',cursor:'pointer',fontSize:12,zIndex:1},
  card:             {background:'var(--surface)',border:'1.5px solid var(--border)',borderRadius:14,padding:'18px',cursor:'pointer',transition:'all .2s'},
  meta:             {fontSize:11,color:'var(--text3)',background:'var(--surface2)',padding:'3px 8px',borderRadius:6},
  overlay:          {position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'flex-end'},
  modal:            {background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,padding:'28px',width:'100%',maxWidth:460,margin:'auto'},
  panel:            {background:'var(--surface)',borderLeft:'1px solid var(--border)',width:'100%',maxWidth:540,height:'100vh',overflow:'auto',padding:'28px'},
  closeBtn:         {background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text2)',width:32,height:32,cursor:'pointer'},
  secTitle:         {fontSize:11,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:1,marginBottom:12,paddingBottom:8,borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:5},
  field:            {marginBottom:16},
  label:            {display:'block',fontSize:11,color:'var(--text3)',marginBottom:6,fontWeight:600,textTransform:'uppercase',letterSpacing:.8},
  input:            {width:'100%',background:'var(--surface2)',border:'1.5px solid var(--border)',borderRadius:9,padding:'10px 13px',color:'var(--text)',fontSize:13.5,outline:'none'},
  select:           {width:'100%',background:'var(--surface2)',border:'1.5px solid var(--border)',borderRadius:9,padding:'10px 13px',color:'var(--text)',fontSize:13.5,outline:'none'},
  fileItem:         {display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:'var(--surface2)',borderRadius:10,border:'1px solid var(--border)'},
  pendingBanner:    {display:'flex',alignItems:'center',gap:10,padding:'12px 16px',marginBottom:20,background:'rgba(245,158,11,.1)',border:'1px solid rgba(245,158,11,.3)',borderRadius:10,color:'#f59e0b',fontSize:13},
  approvedBadge:    {display:'inline-flex',alignItems:'center',gap:3,fontSize:11,fontWeight:600,color:'#10b981',background:'rgba(16,185,129,.12)',padding:'2px 8px',borderRadius:10},
  pendingBadge:     {display:'inline-flex',alignItems:'center',gap:3,fontSize:11,fontWeight:600,color:'#f59e0b',background:'rgba(245,158,11,.12)',padding:'2px 8px',borderRadius:10},
  gradeWaiting:     {display:'flex',alignItems:'center',gap:8,padding:'12px 16px',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:10,fontSize:12,color:'var(--text3)'},
  gradeApprovedBox: {display:'flex',alignItems:'flex-start',gap:12,padding:'14px 16px',background:'rgba(16,185,129,.08)',border:'1px solid rgba(16,185,129,.25)',borderRadius:10},
  gradesSection:    {marginBottom:24,padding:'16px',background:'var(--surface)',border:'1.5px solid var(--border)',borderRadius:12},
  gradeRow:         {display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 12px',background:'var(--surface2)',borderRadius:8,border:'1px solid var(--border)'},
  gradeChip:        {fontSize:14,fontWeight:700,color:'#10b981',background:'rgba(16,185,129,.12)',padding:'3px 10px',borderRadius:8},
  typeBadge:        {fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:10},
}