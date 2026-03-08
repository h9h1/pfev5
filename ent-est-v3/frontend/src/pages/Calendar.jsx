import { useState, useEffect } from 'react'
import { Calendar, Plus, Clock } from 'lucide-react'
import { calendarAPI } from '../services/api.js'

export default function CalendarPage({ user }) {
  const [events, setEvents] = useState([])
  const [form, setForm] = useState({ title:'', event_date:'', event_time:'08:00', duration_min:60, event_type:'cours' })
  const [showNew, setShowNew] = useState(false)
  const isTeacher = user.role==='teacher'||user.role==='admin'

  useEffect(()=>{ calendarAPI.list().then(r=>setEvents(r.data)).catch(()=>{}) },[])

  const create=async()=>{
    if(!form.title||!form.event_date)return
    try{
      await calendarAPI.create(form)
      const r=await calendarAPI.list(); setEvents(r.data)
      setShowNew(false)
      setForm({title:'',event_date:'',event_time:'08:00',duration_min:60,event_type:'cours'})
    }catch{}
  }

  const TC={cours:'#2d8a4e',examen:'#ef4444',devoir:'#f59e0b',evenement:'#10b981'}
  const sorted=[...events].sort((a,b)=>a.event_date>b.event_date?1:-1)

  return(
    <div className="fade-in">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <Calendar size={22} color="var(--accent2)" strokeWidth={1.8}/>
          <div>
            <h2 style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:800,marginBottom:2}}>Calendrier</h2>
            <p style={{color:'var(--text2)',fontSize:13}}>{events.length} événement{events.length!==1?'s':''}</p>
          </div>
        </div>
        {isTeacher&&(
          <button style={S.btn} onClick={()=>setShowNew(true)}>
            <Plus size={14}/> Ajouter
          </button>
        )}
      </div>

      {showNew&&(
        <div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setShowNew(false)}>
          <div style={S.modal}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
              <span style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:16}}>Nouvel événement</span>
              <button style={S.closeBtn} onClick={()=>setShowNew(false)}>✕</button>
            </div>
            <div style={S.field}><label style={S.label}>Titre *</label>
              <input style={S.input} autoFocus value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div style={S.field}><label style={S.label}>Date *</label>
                <input style={S.input} type="date" value={form.event_date} onChange={e=>setForm(f=>({...f,event_date:e.target.value}))}/></div>
              <div style={S.field}><label style={S.label}>Heure</label>
                <input style={S.input} type="time" value={form.event_time} onChange={e=>setForm(f=>({...f,event_time:e.target.value}))}/></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div style={S.field}><label style={S.label}>Type</label>
                <select style={S.select} value={form.event_type} onChange={e=>setForm(f=>({...f,event_type:e.target.value}))}>
                  <option value="cours">Cours</option>
                  <option value="examen">Examen</option>
                  <option value="devoir">Devoir</option>
                  <option value="evenement">Événement</option>
                </select></div>
              <div style={S.field}><label style={S.label}>Durée (min)</label>
                <input style={S.input} type="number" value={form.duration_min} onChange={e=>setForm(f=>({...f,duration_min:e.target.value}))}/></div>
            </div>
            <div style={{display:'flex',gap:8,marginTop:8}}>
              <button style={S.btnSec} onClick={()=>setShowNew(false)}>Annuler</button>
              <button style={S.btn} onClick={create}>Créer</button>
            </div>
          </div>
        </div>
      )}

      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {sorted.map(ev=>(
          <div key={ev.id} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 18px',
            background:'var(--surface)',border:'1px solid var(--border)',
            borderLeft:`4px solid ${TC[ev.event_type]||'#2d8a4e'}`,borderRadius:10}}>
            <div style={{textAlign:'center',minWidth:36}}>
              <div style={{fontSize:18,fontWeight:800,fontFamily:'var(--font-display)',color:TC[ev.event_type]||'#2d8a4e'}}>
                {ev.event_date?.slice(8,10)}
              </div>
              <div style={{fontSize:11,color:'var(--text3)'}}>
                {new Date(ev.event_date+'T00:00').toLocaleDateString('fr',{month:'short'})}
              </div>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:600}}>{ev.title}</div>
              {(ev.event_time||ev.duration_min)&&(
                <div style={{fontSize:12,color:'var(--text3)',marginTop:2,display:'flex',alignItems:'center',gap:4}}>
                  <Clock size={11}/>
                  {ev.event_time&&ev.event_time}{ev.duration_min&&` · ${ev.duration_min} min`}
                </div>
              )}
            </div>
            <div style={{fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:20,
              background:`${TC[ev.event_type]||'#2d8a4e'}22`,color:TC[ev.event_type]||'#2d8a4e'}}>
              {ev.event_type}
            </div>
          </div>
        ))}
        {sorted.length===0&&(
          <div style={{textAlign:'center',padding:'50px',color:'var(--text3)'}}>
            <Calendar size={40} style={{marginBottom:12,opacity:.3}}/>
            <div style={{fontSize:13}}>Aucun événement</div>
          </div>
        )}
      </div>
    </div>
  )
}

const S={
  btn:{background:'linear-gradient(135deg,#2d8a4e,#1a5c32)',border:'none',borderRadius:9,color:'#fff',padding:'9px 16px',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:6},
  btnSec:{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:9,color:'var(--text)',padding:'9px 16px',fontSize:13,cursor:'pointer'},
  overlay:{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16},
  modal:{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,padding:'28px',width:'100%',maxWidth:480},
  closeBtn:{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text2)',width:32,height:32,cursor:'pointer'},
  field:{marginBottom:16},
  label:{display:'block',fontSize:11,color:'var(--text3)',marginBottom:6,fontWeight:600,textTransform:'uppercase',letterSpacing:.8},
  input:{width:'100%',background:'var(--surface2)',border:'1.5px solid var(--border)',borderRadius:9,padding:'10px 13px',color:'var(--text)',fontSize:13.5,outline:'none'},
  select:{width:'100%',background:'var(--surface2)',border:'1.5px solid var(--border)',borderRadius:9,padding:'10px 13px',color:'var(--text)',fontSize:13.5,outline:'none'}
}
