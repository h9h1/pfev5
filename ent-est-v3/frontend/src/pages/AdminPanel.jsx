import { useState, useEffect } from 'react'
import { Settings, Plus, Users, Lock, Unlock, Key, Trash2, Check, Loader, Mail, AlertTriangle } from 'lucide-react'
import { adminAPI } from '../services/api.js'

export default function AdminPanel() {
  const [users, setUsers]   = useState([])
  const [form, setForm]     = useState({ first_name:'', last_name:'', role:'student', department:'' })
  const [created, setCreated] = useState(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab]       = useState('create')
  const [filter, setFilter] = useState('all')
  const [toast, setToast]   = useState(null)
  const [resetResult, setResetResult] = useState({})

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),4000) }
  useEffect(() => { if(tab==='list') loadUsers() }, [tab])

  const loadUsers = async () => {
    try { const r = await adminAPI.listUsers(); setUsers(r.data) }
    catch { showToast('Erreur chargement','error') }
  }

  const createUser = async () => {
    if (!form.first_name || !form.last_name) return showToast('Prénom et nom requis','error')
    setLoading(true)
    try {
      const r = await adminAPI.createUser(form)
      setCreated(r.data)
      setForm({ first_name:'', last_name:'', role:'student', department:'' })
      showToast(`Compte créé : ${r.data.email}`)
    } catch(e) { showToast(e.response?.data?.detail||'Erreur création','error') }
    finally { setLoading(false) }
  }

  const toggle = async (id, name) => {
    try { const r = await adminAPI.toggleUser(id); await loadUsers(); showToast(r.data.is_active ? `${name} activé` : `${name} désactivé`) }
    catch { showToast('Erreur','error') }
  }

  const resetPw = async (id, name) => {
    try {
      const r = await adminAPI.resetPassword(id)
      setResetResult(prev => ({...prev, [id]: r.data.temp_password}))
      showToast(`Nouveau mot de passe généré pour ${name}`)
    } catch { showToast('Erreur','error') }
  }

  const del = async (id, email) => {
    if (!confirm(`Supprimer ${email} ?`)) return
    try { await adminAPI.deleteUser(id); await loadUsers(); showToast('Compte supprimé') }
    catch { showToast('Erreur','error') }
  }

  const roleColor = r => ({student:'#2d8a4e',teacher:'#c8a84b',admin:'#ef4444'}[r]||'#2d8a4e')
  const roleLabel = r => ({student:'Étudiant',teacher:'Enseignant',admin:'Admin'}[r]||r)
  const filtered = users.filter(u => filter==='all' || u.role===filter)

  return (
    <div style={{maxWidth:900}} className="fade-in">
      {toast && (
        <div style={{...S.toast, background:toast.type==='error'?'#ef4444':'#10b981'}}>
          {toast.type==='error' ? <AlertTriangle size={14}/> : <Check size={14}/>}
          {toast.msg}
        </div>
      )}

      <div style={{marginBottom:24,display:'flex',alignItems:'center',gap:10}}>
        <Settings size={22} color="var(--accent2)" strokeWidth={1.8}/>
        <div>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:800,marginBottom:2}}>Administration</h2>
          <p style={{color:'var(--text2)',fontSize:13}}>Gestion des comptes universitaires</p>
        </div>
      </div>

      <div style={S.tabs}>
        <button style={{...S.tab,...(tab==='create'?S.tabOn:{})}} onClick={()=>setTab('create')}>
          <Plus size={13}/> Créer un compte
        </button>
        <button style={{...S.tab,...(tab==='list'?S.tabOn:{})}} onClick={()=>setTab('list')}>
          <Users size={13}/> Gérer les comptes
        </button>
      </div>

      {tab==='create' && (
        <div style={S.card}>
          <div style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:700,marginBottom:20}}>
            Créer un compte universitaire
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <div style={S.field}>
              <label style={S.label}>Prénom *</label>
              <input style={S.input} placeholder="Ahmed" value={form.first_name}
                onChange={e=>setForm(f=>({...f,first_name:e.target.value}))} autoFocus/>
            </div>
            <div style={S.field}>
              <label style={S.label}>Nom *</label>
              <input style={S.input} placeholder="Benali" value={form.last_name}
                onChange={e=>setForm(f=>({...f,last_name:e.target.value}))}/>
            </div>
            <div style={S.field}>
              <label style={S.label}>Rôle *</label>
              <select style={S.select} value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
                <option value="student">Étudiant</option>
                <option value="teacher">Enseignant</option>
              </select>
            </div>
            <div style={S.field}>
              <label style={S.label}>Département</label>
              <input style={S.input} placeholder="Informatique" value={form.department}
                onChange={e=>setForm(f=>({...f,department:e.target.value}))}/>
            </div>
          </div>
          <div style={{marginTop:8,padding:'12px 16px',background:'rgba(45,138,78,.07)',
            border:'1px solid rgba(45,138,78,.15)',borderRadius:9,fontSize:12,color:'var(--text2)',marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
            <Mail size={13} color="var(--accent2)"/>
            Email généré automatiquement :&nbsp;
            <strong style={{color:'var(--accent)'}}>
              {form.first_name&&form.last_name
                ? `${form.first_name.toLowerCase()}.${form.last_name.toLowerCase()}@est.ac.ma`
                : 'prenom.nom@est.ac.ma'}
            </strong>
          </div>
          <button style={S.btn} onClick={createUser} disabled={loading}>
            {loading ? <><Loader size={14} style={{animation:'spin 1s linear infinite'}}/> Création...</> : <><Plus size={14}/> Créer le compte</>}
          </button>

          {created && (
            <div style={S.createdBox}>
              <div style={{display:'flex',alignItems:'center',gap:8,fontFamily:'var(--font-display)',fontWeight:700,marginBottom:12,fontSize:15,color:'#10b981'}}>
                <Check size={16}/> Compte créé avec succès
              </div>
              <div style={S.createdGrid}>
                <span style={S.createdLbl}>Email :</span>
                <span style={{color:'var(--accent)',fontWeight:600}}>{created.email}</span>
                <span style={S.createdLbl}>Matricule :</span>
                <span style={{fontWeight:600}}>{created.student_id}</span>
                <span style={S.createdLbl}>Mot de passe temporaire :</span>
                <span style={{fontFamily:'monospace',background:'var(--surface2)',padding:'3px 10px',
                  borderRadius:6,color:'#f59e0b',fontWeight:700,fontSize:15}}>
                  {created.temp_password}
                </span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--text3)',marginTop:10}}>
                <AlertTriangle size={12}/> Communiquez ces informations à l'utilisateur. Le mot de passe doit être changé à la première connexion.
              </div>
              <button style={{...S.btn,marginTop:12,background:'var(--surface2)',color:'var(--text)',border:'1px solid var(--border)'}} onClick={()=>setCreated(null)}>
                Fermer
              </button>
            </div>
          )}
        </div>
      )}

      {tab==='list' && (
        <div>
          <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
            {['all','student','teacher','admin'].map(f=>(
              <button key={f} style={{...S.filterBtn,...(filter===f?S.filterOn:{})}} onClick={()=>setFilter(f)}>
                {f==='all'?'Tous':roleLabel(f)} {f!=='all'&&`(${users.filter(u=>u.role===f).length})`}
              </button>
            ))}
          </div>
          <div style={S.table}>
            <div style={S.tableHead}>
              <span style={{flex:2}}>Nom</span>
              <span style={{flex:2.5}}>Email</span>
              <span style={{flex:1}}>Rôle</span>
              <span style={{flex:1}}>Matricule</span>
              <span style={{flex:1}}>Statut</span>
              <span style={{flex:2}}>Actions</span>
            </div>
            {filtered.map(u=>(
              <div key={u.id} style={{...S.tableRow, opacity:u.is_active?1:.5}}>
                <span style={{flex:2,fontWeight:500}}>{u.first_name} {u.last_name}</span>
                <span style={{flex:2.5,color:'var(--text2)',fontSize:12,overflow:'hidden',textOverflow:'ellipsis'}}>{u.email}</span>
                <span style={{flex:1}}>
                  <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:20,
                    background:`${roleColor(u.role)}22`,color:roleColor(u.role)}}>
                    {roleLabel(u.role)}
                  </span>
                </span>
                <span style={{flex:1,fontSize:12,color:'var(--text3)'}}>{u.student_id}</span>
                <span style={{flex:1}}>
                  <span style={{fontSize:11,padding:'3px 8px',borderRadius:20,
                    background:u.is_active?'rgba(16,185,129,.15)':'rgba(239,68,68,.1)',
                    color:u.is_active?'#10b981':'#ef4444'}}>
                    {u.is_active?'Actif':'Inactif'}
                  </span>
                </span>
                <div style={{flex:2,display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                  <button style={S.actBtn} onClick={()=>toggle(u.id,u.first_name)} title={u.is_active?'Désactiver':'Activer'}>
                    {u.is_active ? <Lock size={13}/> : <Unlock size={13}/>}
                  </button>
                  <button style={S.actBtn} onClick={()=>resetPw(u.id,u.first_name)} title="Réinitialiser mot de passe">
                    <Key size={13}/>
                  </button>
                  {resetResult[u.id] && (
                    <span style={{fontSize:11,color:'#f59e0b',background:'rgba(245,158,11,.1)',
                      padding:'2px 8px',borderRadius:6,fontFamily:'monospace'}}>
                      {resetResult[u.id]}
                    </span>
                  )}
                  <button style={{...S.actBtn,color:'#ef4444',borderColor:'rgba(239,68,68,.3)'}} onClick={()=>del(u.id,u.email)}>
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

const S = {
  toast:{ position:'fixed',top:20,right:20,zIndex:9999,borderRadius:10,display:'flex',alignItems:'center',gap:8,
    padding:'12px 20px',color:'#fff',fontSize:13,fontWeight:500,boxShadow:'0 4px 20px rgba(0,0,0,.4)' },
  tabs:{ display:'flex',gap:4,marginBottom:20,background:'var(--surface)',
    border:'1px solid var(--border)',borderRadius:11,padding:4,width:'fit-content' },
  tab:{ padding:'8px 16px',border:'none',borderRadius:8,background:'transparent',
    color:'var(--text2)',cursor:'pointer',fontSize:13,fontWeight:500,display:'flex',alignItems:'center',gap:6 },
  tabOn:{ background:'var(--surface2)',color:'var(--text)' },
  card:{ background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,padding:'28px' },
  field:{ marginBottom:0 },
  label:{ display:'block',fontSize:11,color:'var(--text3)',marginBottom:6,fontWeight:600,
    textTransform:'uppercase',letterSpacing:.8 },
  input:{ width:'100%',background:'var(--surface2)',border:'1.5px solid var(--border)',
    borderRadius:9,padding:'10px 13px',color:'var(--text)',fontSize:13.5,outline:'none' },
  select:{ width:'100%',background:'var(--surface2)',border:'1.5px solid var(--border)',
    borderRadius:9,padding:'10px 13px',color:'var(--text)',fontSize:13.5,outline:'none' },
  btn:{ background:'linear-gradient(135deg,#2d8a4e,#1a5c32)',border:'none',borderRadius:10,
    color:'#fff',padding:'11px 22px',fontSize:13,fontWeight:700,cursor:'pointer',
    fontFamily:'var(--font-display)',display:'flex',alignItems:'center',gap:7 },
  createdBox:{ marginTop:20,background:'rgba(16,185,129,.07)',border:'1px solid rgba(16,185,129,.2)',
    borderRadius:12,padding:'20px' },
  createdGrid:{ display:'grid',gridTemplateColumns:'auto 1fr',gap:'8px 16px',alignItems:'center' },
  createdLbl:{ color:'var(--text2)',fontSize:12 },
  table:{ background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,overflow:'hidden' },
  tableHead:{ display:'flex',gap:8,padding:'12px 16px',background:'var(--surface2)',
    fontSize:11,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:.8,borderBottom:'1px solid var(--border)' },
  tableRow:{ display:'flex',gap:8,padding:'12px 16px',alignItems:'center',fontSize:13,
    borderBottom:'1px solid var(--border)' },
  filterBtn:{ padding:'7px 14px',border:'1px solid var(--border)',borderRadius:8,
    background:'var(--surface)',color:'var(--text2)',cursor:'pointer',fontSize:12,fontWeight:500 },
  filterOn:{ background:'rgba(45,138,78,.12)',borderColor:'var(--accent)',color:'var(--accent)' },
  actBtn:{ padding:'6px 8px',border:'1px solid var(--border)',borderRadius:7,
    background:'var(--surface2)',cursor:'pointer',color:'var(--text2)',display:'flex',alignItems:'center' }
}
