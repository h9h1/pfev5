import { useState, useEffect } from 'react'
import { MessageSquare, Plus, ArrowLeft, Pin, Lock, Unlock, Trash2, Edit, Eye, MessageCircle } from 'lucide-react'
import { forumAPI } from '../services/api.js'

export default function Forum({ user }) {
  const [view, setView]       = useState('categories')
  const [cats, setCats]       = useState([])
  const [threads, setThreads] = useState([])
  const [thread, setThread]   = useState(null)
  const [selCat, setSelCat]   = useState(null)
  const [reply, setReply]     = useState('')
  const [newThread, setNewThread] = useState({ title:'', content:'' })
  const [showNewThread, setShowNewThread] = useState(false)
  const [showNewCat, setShowNewCat] = useState(false)
  const [newCat, setNewCat]   = useState({ name:'', description:'' })
  const [toast, setToast]     = useState(null)
  const isTeacher = user.role==='teacher'||user.role==='admin'
  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000) }

  useEffect(() => { loadCats() }, [])

  const loadCats = async () => {
    try { const r = await forumAPI.categories(); setCats(r.data) }
    catch { showToast('Erreur chargement','error') }
  }
  const openCat = async (cat) => {
    setSelCat(cat); setView('threads')
    try { const r = await forumAPI.threads(cat.id); setThreads(r.data) }
    catch { setThreads([]) }
  }
  const openThread = async (t) => {
    setView('thread')
    try { const r = await forumAPI.getThread(t.id); setThread(r.data) }
    catch { showToast('Erreur','error') }
  }
  const createThread = async () => {
    if (!newThread.title || !newThread.content) return showToast('Titre et contenu requis','error')
    try {
      await forumAPI.createThread({ category_id: selCat.id, ...newThread })
      setNewThread({ title:'', content:'' }); setShowNewThread(false)
      const r = await forumAPI.threads(selCat.id); setThreads(r.data)
      showToast('Sujet créé !')
    } catch { showToast('Erreur','error') }
  }
  const sendReply = async () => {
    if (!reply.trim()) return
    try {
      await forumAPI.reply(thread.id, { content: reply })
      setReply('')
      const r = await forumAPI.getThread(thread.id); setThread(r.data)
      showToast('Réponse publiée')
    } catch(e) { showToast(e.response?.data?.detail||'Erreur','error') }
  }
  const createCat = async () => {
    if (!newCat.name) return showToast('Nom requis','error')
    try {
      await forumAPI.createCat(newCat)
      setNewCat({ name:'', description:'' }); setShowNewCat(false)
      await loadCats(); showToast('Catégorie créée')
    } catch { showToast('Erreur','error') }
  }
  const togglePin = async (tid) => {
    try { const r = await forumAPI.pin(tid); showToast(r.data.is_pinned?'Épinglé':'Désépinglé') }
    catch {}
  }
  const toggleLock = async (tid) => {
    try { const r = await forumAPI.lock(tid); showToast(r.data.is_locked?'Verrouillé':'Déverrouillé') }
    catch {}
  }
  const deleteThread = async (tid) => {
    if (!confirm('Supprimer ce sujet ?')) return
    try {
      await forumAPI.deleteThread(tid)
      const r = await forumAPI.threads(selCat.id); setThreads(r.data)
      showToast('Sujet supprimé')
    } catch { showToast('Erreur','error') }
  }
  const timeAgo = d => {
    if (!d) return ''
    const dt = new Date(d), now = new Date()
    const diff = Math.floor((now - dt) / 60000)
    if (diff < 1) return "à l'instant"
    if (diff < 60) return `il y a ${diff} min`
    if (diff < 1440) return `il y a ${Math.floor(diff/60)}h`
    return dt.toLocaleDateString('fr', {day:'2-digit', month:'short'})
  }
  const roleColor = r => ({teacher:'#c8a84b',admin:'#ef4444',student:'#2d8a4e'}[r]||'#2d8a4e')
  const CAT_COLORS = ['#2d8a4e','#c8a84b','#3b82f6','#8b5cf6','#ef4444','#f59e0b','#06b6d4','#10b981']

  return (
    <div style={{maxWidth:860}} className="fade-in">
      {toast && <div style={{...S.toast,background:toast.type==='error'?'#ef4444':'#10b981'}}>{toast.msg}</div>}

      {/* CATEGORIES */}
      {view==='categories' && (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <MessageSquare size={22} color="var(--accent2)" strokeWidth={1.8}/>
              <div>
                <h2 style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:800,marginBottom:2}}>Forum</h2>
                <p style={{color:'var(--text2)',fontSize:13}}>Partagez, posez des questions, discutez</p>
              </div>
            </div>
            {isTeacher && <button style={S.btn} onClick={()=>setShowNewCat(true)}><Plus size={14}/> Catégorie</button>}
          </div>

          {showNewCat && (
            <div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setShowNewCat(false)}>
              <div style={S.modal}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
                  <span style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:16}}>Nouvelle catégorie</span>
                  <button style={S.closeBtn} onClick={()=>setShowNewCat(false)}>✕</button>
                </div>
                <div style={S.field}><label style={S.label}>Nom *</label>
                  <input style={S.input} value={newCat.name} onChange={e=>setNewCat(c=>({...c,name:e.target.value}))} autoFocus/></div>
                <div style={S.field}><label style={S.label}>Description</label>
                  <input style={S.input} value={newCat.description} onChange={e=>setNewCat(c=>({...c,description:e.target.value}))}/></div>
                <div style={{display:'flex',gap:8,marginTop:8}}>
                  <button style={S.btnSec} onClick={()=>setShowNewCat(false)}>Annuler</button>
                  <button style={S.btn} onClick={createCat}>Créer</button>
                </div>
              </div>
            </div>
          )}

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:12}}>
            {cats.map((c,i) => (
              <div key={c.id} style={S.catCard} onClick={()=>openCat(c)}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=CAT_COLORS[i%CAT_COLORS.length];e.currentTarget.style.transform='translateY(-2px)'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.transform='translateY(0)'}}>
                <div style={{width:40,height:40,borderRadius:11,background:`${CAT_COLORS[i%CAT_COLORS.length]}22`,
                  display:'flex',alignItems:'center',justifyContent:'center',marginBottom:12}}>
                  <MessageSquare size={20} color={CAT_COLORS[i%CAT_COLORS.length]} strokeWidth={1.8}/>
                </div>
                <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:15,marginBottom:4}}>{c.name}</div>
                <div style={{fontSize:12,color:'var(--text2)',marginBottom:10}}>{c.description}</div>
                <div style={{fontSize:11,color:'var(--text3)',display:'flex',alignItems:'center',gap:4}}>
                  <MessageCircle size={11}/> {c.thread_count || 0} sujet{(c.thread_count||0)!==1?'s':''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* THREADS */}
      {view==='threads' && (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <button style={S.back} onClick={()=>setView('categories')}><ArrowLeft size={14}/> Retour</button>
              <h2 style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:800}}>{selCat?.name}</h2>
            </div>
            <button style={S.btn} onClick={()=>setShowNewThread(true)}><Edit size={14}/> Nouveau sujet</button>
          </div>

          {showNewThread && (
            <div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setShowNewThread(false)}>
              <div style={{...S.modal,maxWidth:540}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
                  <span style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:16}}>Nouveau sujet</span>
                  <button style={S.closeBtn} onClick={()=>setShowNewThread(false)}>✕</button>
                </div>
                <div style={S.field}><label style={S.label}>Titre *</label>
                  <input style={S.input} value={newThread.title} onChange={e=>setNewThread(t=>({...t,title:e.target.value}))} autoFocus placeholder="Titre de votre sujet"/></div>
                <div style={S.field}><label style={S.label}>Contenu *</label>
                  <textarea style={{...S.input,height:120,resize:'vertical'}} value={newThread.content}
                    onChange={e=>setNewThread(t=>({...t,content:e.target.value}))} placeholder="Décrivez votre question..."/></div>
                <div style={{display:'flex',gap:8,marginTop:8}}>
                  <button style={S.btnSec} onClick={()=>setShowNewThread(false)}>Annuler</button>
                  <button style={S.btn} onClick={createThread}>Publier</button>
                </div>
              </div>
            </div>
          )}

          {threads.length===0 ? (
            <div style={{textAlign:'center',padding:'60px',color:'var(--text2)'}}>
              <MessageSquare size={48} style={{marginBottom:12,opacity:.2}}/>
              <div style={{fontWeight:500}}>Aucun sujet dans cette catégorie</div>
              <div style={{fontSize:13,color:'var(--text3)',marginTop:4}}>Soyez le premier à poster !</div>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {threads.map(t=>(
                <div key={t.id} style={S.threadRow} onClick={()=>openThread(t)}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'}
                  onMouseLeave={e=>e.currentTarget.style.background='var(--surface)'}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:4}}>
                      {t.is_pinned && <span style={S.pinBadge}><Pin size={10}/> Épinglé</span>}
                      {t.is_locked && <span style={S.lockBadge}><Lock size={10}/> Fermé</span>}
                      <span style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:14}}>{t.title}</span>
                    </div>
                    <div style={{fontSize:12,color:'var(--text3)'}}>
                      par <strong style={{color:'var(--text2)'}}>{t.author_name}</strong> · {timeAgo(t.created_at)}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:16,fontSize:12,color:'var(--text3)',flexShrink:0,alignItems:'center'}}>
                    <span style={{display:'flex',alignItems:'center',gap:4}}><MessageCircle size={12}/>{t.reply_count}</span>
                    <span style={{display:'flex',alignItems:'center',gap:4}}><Eye size={12}/>{t.view_count}</span>
                    {isTeacher && (
                      <div style={{display:'flex',gap:4}} onClick={e=>e.stopPropagation()}>
                        <button style={S.tinyBtn} onClick={()=>togglePin(t.id)} title="Épingler"><Pin size={12}/></button>
                        <button style={S.tinyBtn} onClick={()=>toggleLock(t.id)} title="Verrouiller"><Lock size={12}/></button>
                        <button style={{...S.tinyBtn,color:'#ef4444'}} onClick={()=>deleteThread(t.id)} title="Supprimer"><Trash2 size={12}/></button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* THREAD DETAIL */}
      {view==='thread' && thread && (
        <div>
          <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:20}}>
            <button style={S.back} onClick={async ()=>{
              setView('threads')
              if(selCat){ const r=await forumAPI.threads(selCat.id); setThreads(r.data) }
            }}><ArrowLeft size={14}/> Retour</button>
          </div>
          <div style={S.postCard}>
            <div style={S.postHead}>
              <div style={{...S.ava,background:roleColor(thread.author_role||'student')}}>{(thread.author_name||'?')[0].toUpperCase()}</div>
              <div>
                <div style={{fontWeight:600,fontSize:13}}>{thread.author_name}</div>
                <div style={{fontSize:11,color:'var(--text3)'}}>{timeAgo(thread.created_at)}</div>
              </div>
              <div style={{marginLeft:'auto',display:'flex',gap:6}}>
                {thread.is_pinned&&<span style={S.pinBadge}><Pin size={10}/></span>}
                {thread.is_locked&&<span style={S.lockBadge}><Lock size={10}/> Fermé</span>}
              </div>
            </div>
            <h2 style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:18,margin:'14px 0 10px'}}>{thread.title}</h2>
            <div style={{fontSize:14,lineHeight:1.7,color:'var(--text)',whiteSpace:'pre-wrap'}}>{thread.content}</div>
          </div>

          {thread.replies?.length > 0 && (
            <div style={{margin:'16px 0'}}>
              <div style={{fontSize:12,fontWeight:600,color:'var(--text3)',textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>
                {thread.replies.length} réponse{thread.replies.length!==1?'s':''}
              </div>
              {thread.replies.map((r,i)=>(
                <div key={r.id} style={{...S.postCard,marginBottom:8}}>
                  <div style={S.postHead}>
                    <div style={{...S.ava,background:roleColor(r.author_role||'student'),width:32,height:32,fontSize:12}}>{(r.author_name||'?')[0].toUpperCase()}</div>
                    <div>
                      <div style={{fontWeight:600,fontSize:13}}>{r.author_name}
                        {r.author_role==='teacher'&&<span style={{marginLeft:6,fontSize:10,color:'#c8a84b',background:'rgba(200,168,75,.15)',padding:'2px 6px',borderRadius:10}}>Enseignant</span>}
                      </div>
                      <div style={{fontSize:11,color:'var(--text3)'}}>{timeAgo(r.created_at)}</div>
                    </div>
                  </div>
                  <div style={{fontSize:13.5,lineHeight:1.7,marginTop:12,whiteSpace:'pre-wrap'}}>{r.content}</div>
                </div>
              ))}
            </div>
          )}

          {!thread.is_locked ? (
            <div style={S.replyBox}>
              <div style={{display:'flex',alignItems:'center',gap:8,fontFamily:'var(--font-display)',fontWeight:700,marginBottom:12}}>
                <Edit size={15} color="var(--accent2)"/> Votre réponse
              </div>
              <textarea style={{...S.input,height:100,resize:'vertical',marginBottom:10}} placeholder="Rédigez votre réponse..."
                value={reply} onChange={e=>setReply(e.target.value)}/>
              <button style={S.btn} onClick={sendReply} disabled={!reply.trim()}>Publier la réponse</button>
            </div>
          ) : (
            <div style={{padding:'16px',background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.2)',
              borderRadius:10,color:'#ef4444',fontSize:13,textAlign:'center',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
              <Lock size={14}/> Ce sujet est verrouillé — les réponses ne sont plus acceptées
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const S = {
  toast:{position:'fixed',top:20,right:20,zIndex:9999,borderRadius:10,padding:'12px 20px',color:'#fff',fontSize:13,fontWeight:500,boxShadow:'0 4px 20px rgba(0,0,0,.4)'},
  btn:{background:'linear-gradient(135deg,#2d8a4e,#1a5c32)',border:'none',borderRadius:9,color:'#fff',padding:'9px 16px',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:6,whiteSpace:'nowrap'},
  btnSec:{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:9,color:'var(--text)',padding:'9px 16px',fontSize:13,cursor:'pointer'},
  back:{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text2)',padding:'7px 12px',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',gap:6},
  catCard:{background:'var(--surface)',border:'1.5px solid var(--border)',borderRadius:14,padding:'20px',cursor:'pointer',transition:'all .2s'},
  threadRow:{display:'flex',alignItems:'center',gap:16,padding:'14px 18px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,cursor:'pointer',transition:'background .15s'},
  postCard:{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:'20px',marginBottom:12},
  postHead:{display:'flex',alignItems:'center',gap:10},
  ava:{width:38,height:38,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:700,color:'#fff',flexShrink:0},
  replyBox:{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:'20px',marginTop:16},
  pinBadge:{fontSize:11,background:'rgba(245,158,11,.15)',color:'#f59e0b',padding:'2px 8px',borderRadius:6,fontWeight:600,display:'inline-flex',alignItems:'center',gap:4},
  lockBadge:{fontSize:11,background:'rgba(239,68,68,.12)',color:'#ef4444',padding:'2px 8px',borderRadius:6,fontWeight:600,display:'inline-flex',alignItems:'center',gap:4},
  tinyBtn:{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:6,cursor:'pointer',padding:'4px 7px',display:'flex',alignItems:'center',color:'var(--text2)'},
  overlay:{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16},
  modal:{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,padding:'28px',width:'100%',maxWidth:480},
  closeBtn:{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text2)',width:32,height:32,cursor:'pointer'},
  field:{marginBottom:16},
  label:{display:'block',fontSize:11,color:'var(--text3)',marginBottom:6,fontWeight:600,textTransform:'uppercase',letterSpacing:.8},
  input:{width:'100%',background:'var(--surface2)',border:'1.5px solid var(--border)',borderRadius:9,padding:'10px 13px',color:'var(--text)',fontSize:13.5,outline:'none'}
}
