import { useState, useEffect } from 'react'
import { Users, Search } from 'lucide-react'
import { usersAPI } from '../services/api.js'

export default function People({ user }) {
  const [users, setUsers] = useState([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  useEffect(()=>{ usersAPI.list().then(r=>setUsers(r.data)).catch(()=>{}) },[])
  const RC={teacher:'#c8a84b',admin:'#ef4444',student:'#2d8a4e'}
  const RL={teacher:'Enseignant',admin:'Admin',student:'Étudiant'}
  const getInit=u=>((u.first_name||'?')[0]+(u.last_name||u.username||'?')[0]).toUpperCase()
  const filtered=users.filter(u=>{
    if(filter!=='all'&&u.role!==filter)return false
    const n=`${u.first_name} ${u.last_name} ${u.username} ${u.email}`.toLowerCase()
    return n.includes(search.toLowerCase())
  })
  return(
    <div className="fade-in">
      <div style={{marginBottom:20,display:'flex',alignItems:'center',gap:10}}>
        <Users size={22} color="var(--accent2)" strokeWidth={1.8}/>
        <div>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:800,marginBottom:2}}>Annuaire</h2>
          <p style={{color:'var(--text2)',fontSize:13}}>{filtered.length} personne{filtered.length!==1?'s':''}</p>
        </div>
      </div>
      <div style={{display:'flex',gap:10,marginBottom:18,flexWrap:'wrap'}}>
        <div style={{position:'relative',flex:1,minWidth:200}}>
          <Search size={14} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text3)'}}/>
          <input style={{...S.search,paddingLeft:36}} placeholder="Rechercher par nom, email..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        {['all','student','teacher','admin'].map(f=>(
          <button key={f} style={{...S.fb,...(filter===f?S.fon:{})}} onClick={()=>setFilter(f)}>
            {f==='all'?'Tous':RL[f]}
          </button>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12}}>
        {filtered.map(u=>(
          <div key={u.id} style={S.card}>
            <div style={{...S.ava,background:RC[u.role]||'#2d8a4e'}}>{getInit(u)}</div>
            <div style={{marginTop:12,textAlign:'center'}}>
              <div style={{fontWeight:700,fontSize:14}}>{u.first_name} {u.last_name}</div>
              <div style={{fontSize:11,color:'var(--text3)',margin:'3px 0 8px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'100%'}}>{u.email}</div>
              <div style={{fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:20,display:'inline-block',
                background:`${RC[u.role]||'#2d8a4e'}22`,color:RC[u.role]||'#2d8a4e'}}>
                {RL[u.role]||u.role}
              </div>
              {u.department&&<div style={{fontSize:11,color:'var(--text3)',marginTop:6}}>{u.department}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
const S={
  search:{width:'100%',background:'var(--surface)',border:'1.5px solid var(--border)',borderRadius:9,padding:'9px 14px',color:'var(--text)',fontSize:13.5,outline:'none'},
  fb:{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text2)',padding:'8px 14px',fontSize:12,cursor:'pointer',fontWeight:500},
  fon:{background:'rgba(45,138,78,.12)',borderColor:'var(--accent)',color:'var(--accent)'},
  card:{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'20px',display:'flex',flexDirection:'column',alignItems:'center'},
  ava:{width:52,height:52,borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:700,color:'#fff'}
}
