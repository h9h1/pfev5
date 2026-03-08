import { useState } from 'react'
import { AlertTriangle, Eye, EyeOff, Loader, LogIn } from 'lucide-react'
import { authAPI } from '../services/api.js'

export default function Login({ onLogin }) {
  const [form, setForm] = useState({ email:'', password:'' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)

  const submit = async () => {
    if (!form.email || !form.password) return setError('Email et mot de passe requis')
    setLoading(true); setError('')
    try {
      const r = await authAPI.login(form.email, form.password)
      onLogin(r.data.user, r.data.access_token)
    } catch(e) {
      setError(e.response?.data?.detail || 'Identifiants incorrects')
    } finally { setLoading(false) }
  }

  return (
    <div style={S.page}>
      <div style={S.bgGrid}/>
      <div style={S.glow1}/><div style={S.glow2}/>
      <div style={S.card} className="fade-in">
        <div style={S.logoSection}>
          <div style={S.logo}>
            <img src="/logo.png" style={{width:56,height:56,objectFit:'contain',background:'white',borderRadius:8,padding:2}}/>
          </div>
          <div style={S.schoolName}>École Supérieure de Technologie</div>
          <div style={S.ent}>Espace Numérique de Travail</div>
        </div>

        {error && (
          <div style={S.errBox}>
            <AlertTriangle size={14} style={{marginRight:8,flexShrink:0}}/>{error}
          </div>
        )}

        <div style={S.field}>
          <label style={S.label}>Email universitaire</label>
          <input style={S.input} type="email" autoFocus
            placeholder="prenom.nom@est.ac.ma"
            value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}
            onKeyDown={e=>e.key==='Enter'&&submit()}/>
        </div>

        <div style={S.field}>
          <label style={S.label}>Mot de passe</label>
          <div style={{position:'relative'}}>
            <input style={{...S.input,paddingRight:44}} type={showPw?'text':'password'}
              placeholder="••••••••"
              value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}
              onKeyDown={e=>e.key==='Enter'&&submit()}/>
            <button style={S.eyeBtn} onClick={()=>setShowPw(o=>!o)}>
              {showPw ? <EyeOff size={16} color="var(--text3)"/> : <Eye size={16} color="var(--text3)"/>}
            </button>
          </div>
        </div>

        <button style={{...S.btn, opacity:loading?.6:1}} onClick={submit} disabled={loading}>
          {loading
            ? <><Loader size={15} style={{animation:'spin 1s linear infinite'}}/> Connexion...</>
            : <><LogIn size={15}/> Se connecter</>
          }
        </button>

        <div style={S.hint}>
          <span style={{color:'var(--text3)',fontSize:12}}>
            Votre compte est créé par l'administration
          </span>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

const S = {
  page: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
    background:'var(--bg)', position:'relative', overflow:'hidden' },
  bgGrid: { position:'absolute', inset:0, backgroundImage:'linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px)',
    backgroundSize:'40px 40px', opacity:.3, pointerEvents:'none' },
  glow1: { position:'absolute', width:600, height:600, borderRadius:'50%',
    background:'radial-gradient(circle,rgba(45,138,78,.08) 0%,transparent 65%)',
    top:-150, left:-100, pointerEvents:'none' },
  glow2: { position:'absolute', width:500, height:500, borderRadius:'50%',
    background:'radial-gradient(circle,rgba(45,138,78,.07) 0%,transparent 65%)',
    bottom:-150, right:-100, pointerEvents:'none' },
  card: { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:20,
    padding:'44px 40px', width:'100%', maxWidth:420, position:'relative', zIndex:1,
    boxShadow:'0 25px 60px rgba(0,0,0,.5)' },
  logoSection: { textAlign:'center', marginBottom:36 },
  logo: { width:64, height:64, borderRadius:18, display:'inline-flex', alignItems:'center', justifyContent:'center',
    background:'linear-gradient(135deg,#2d8a4e 0%,#1a5c32 100%)', marginBottom:14,
    boxShadow:'0 8px 24px rgba(45,138,78,.3)' },
  schoolName: { fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:1,
    color:'var(--text2)', marginBottom:4 },
  ent: { fontFamily:'var(--font-display)', fontSize:22, fontWeight:800, color:'var(--text)' },
  errBox: { background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.25)',
    borderRadius:10, padding:'11px 14px', fontSize:13, color:'#fc8181', marginBottom:20, display:'flex', alignItems:'center' },
  field: { marginBottom:18 },
  label: { display:'block', fontSize:11, fontWeight:600, color:'var(--text3)', marginBottom:7,
    textTransform:'uppercase', letterSpacing:1 },
  input: { width:'100%', background:'var(--surface2)', border:'1.5px solid var(--border)',
    borderRadius:10, padding:'12px 14px', color:'var(--text)', fontSize:14, outline:'none',
    transition:'border-color .2s' },
  eyeBtn: { position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
    background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center' },
  btn: { width:'100%', padding:'13px', background:'linear-gradient(135deg,#2d8a4e,#1a5c32)',
    border:'none', borderRadius:11, color:'#fff', fontSize:14, fontWeight:700,
    fontFamily:'var(--font-display)', letterSpacing:.5, cursor:'pointer',
    boxShadow:'0 4px 20px rgba(45,138,78,.25)', marginTop:6, display:'flex', alignItems:'center', justifyContent:'center', gap:8 },
  hint: { textAlign:'center', marginTop:20 }
}
