import { useState, useEffect } from 'react'
import { LayoutGrid, BookOpen, FileText, MessageSquare, Mail, Calendar, Users, Settings, LogOut, Bell, ChevronLeft, ChevronRight, X, CheckCheck, HelpCircle } from 'lucide-react'
import Courses    from './Courses.jsx'
import Exams      from './Exams.jsx'
import Messaging  from './Messaging.jsx'
import Forum      from './Forum.jsx'
import CalendarPage from './Calendar.jsx'
import People     from './People.jsx'
import FAQ        from './FAQ.jsx'
import AdminPanel from './AdminPanel.jsx'
import ChatbotBubble from '../components/ChatbotBubble.jsx'
import { notificationsAPI } from '../services/api.js'

const NAV = [
  { id:'home',      icon:LayoutGrid,    label:'Accueil'    },
  { id:'courses',   icon:BookOpen,      label:'Cours'      },
  { id:'exams',     icon:FileText,      label:'Examens'    },
  { id:'forum',     icon:MessageSquare, label:'Forum'      },
  { id:'messaging', icon:Mail,          label:'Messages'   },
  { id:'calendar',  icon:Calendar,      label:'Calendrier' },
  { id:'people',    icon:Users,         label:'Annuaire'   },
  { id:'faq',       icon:HelpCircle,    label:'Aide & FAQ'  },
]

export default function Dashboard({ user, nav, setNav, onLogout }) {
  const [collapsed, setCollapsed]   = useState(false)
  const [refreshKey, setRefreshKey]   = useState(0)
  const [notifs, setNotifs]         = useState([])
  const [showNotifs, setShowNotifs] = useState(false)
  const isAdmin   = user.role === 'admin'
  const navItems  = isAdmin ? [...NAV, { id:'admin', icon:Settings, label:'Administration' }] : NAV
  const roleColor = { student:'#3db368', teacher:'#c8a84b', admin:'#ef4444' }[user.role] || '#3db368'
  const roleLabel = { student:'Étudiant', teacher:'Enseignant', admin:'Administrateur' }[user.role] || user.role
  const initials  = ((user.first_name||'?')[0]+(user.last_name||'?')[0]).toUpperCase()
  const unread    = notifs.filter(n => !n.is_read).length

  useEffect(() => {
    loadNotifs()
    const t = setInterval(loadNotifs, 15000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const t = setInterval(() => setRefreshKey(k => k+1), 15000)
    return () => clearInterval(t)
  }, [])

  const loadNotifs = async () => {
    try { const r = await notificationsAPI.list(); setNotifs(r.data) } catch {}
  }

  const markRead = async (id) => {
    try { await notificationsAPI.markRead(id); setNotifs(n => n.map(x => x.id===id ? {...x,is_read:true} : x)) } catch {}
  }

  const markAllRead = async () => {
    for (const n of notifs.filter(x=>!x.is_read)) await markRead(n.id)
  }

  const IconComp = ({ icon: Icon, size=18, color }) => <Icon size={size} color={color || 'currentColor'} strokeWidth={1.8}/>

  return (
    <div style={S.shell}>
      {/* SIDEBAR */}
      <aside style={{...S.side, width:collapsed?64:224}}>
        <div style={S.sideTop} onClick={()=>setCollapsed(o=>!o)}>
          <div style={S.brandMark}>
            <img src="/logo.png" style={{width:26,height:26,objectFit:'contain'}}
              onError={e=>{e.target.style.display='none'}}/>
          </div>
          {!collapsed && (
            <>
              <div>
                <div style={S.brandName}>ENT</div>
                <div style={S.brandSub}>EST Salé</div>
              </div>
              <div style={{marginLeft:'auto',color:'var(--text3)'}}>
                {collapsed ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>}
              </div>
            </>
          )}
        </div>

        <nav style={S.nav}>
          {navItems.map(item => {
            const Icon = item.icon
            return (
              <button key={item.id}
                style={{...S.navBtn, ...(nav===item.id ? S.navOn : {})}}
                onClick={()=>setNav(item.id)} title={item.label}>
                <Icon size={17} strokeWidth={nav===item.id?2.2:1.8}/>
                {!collapsed && <span style={{marginLeft:10}}>{item.label}</span>}
              </button>
            )
          })}
        </nav>

        <div style={S.sideBot}>
          {!collapsed && (
            <div style={S.profile}>
              <div style={{...S.ava, background:roleColor, fontSize:12}}>{initials}</div>
              <div style={{minWidth:0,flex:1}}>
                <div style={{fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.first_name} {user.last_name}</div>
                <div style={{fontSize:10,color:roleColor}}>{roleLabel}</div>
              </div>
            </div>
          )}
          <button style={S.logoutBtn} onClick={onLogout} title="Déconnexion">
            <LogOut size={15} strokeWidth={1.8}/>
            {!collapsed && <span style={{fontSize:12,marginLeft:8}}>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={S.main}>
        <header style={S.header}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={S.headerDot}/>
            <span style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:15}}>
              {navItems.find(n=>n.id===nav)?.label}
            </span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            {/* Notifications bell */}
            <div style={{position:'relative'}}>
              <button style={S.bellBtn} onClick={()=>setShowNotifs(o=>!o)}>
                <Bell size={18} strokeWidth={1.8}/>
                {unread>0 && <div style={S.bellBadge}>{unread}</div>}
              </button>

              {showNotifs && (
                <div style={S.notifPanel}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 14px',borderBottom:'1px solid var(--border)'}}>
                    <span style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:14}}>Notifications</span>
                    <div style={{display:'flex',gap:6}}>
                      {unread>0 && <button style={S.tinyBtn} onClick={markAllRead}><CheckCheck size={13}/></button>}
                      <button style={S.tinyBtn} onClick={()=>setShowNotifs(false)}><X size={13}/></button>
                    </div>
                  </div>
                  <div style={{maxHeight:320,overflow:'auto'}}>
                    {notifs.length===0 ? (
                      <div style={{textAlign:'center',padding:'30px',color:'var(--text3)',fontSize:13}}>
                        <Bell size={24} style={{marginBottom:8,opacity:.4}}/><br/>Aucune notification
                      </div>
                    ) : notifs.map(n=>(
                      <div key={n.id} style={{...S.notifItem, opacity:n.is_read?.6:1}}
                        onClick={()=>markRead(n.id)}>
                        <div style={{width:6,height:6,borderRadius:'50%',background:n.is_read?'transparent':'var(--accent2)',flexShrink:0,marginTop:4}}/>
                        <div style={{flex:1}}>
                          <div style={{fontSize:12,fontWeight:600,marginBottom:2}}>{n.title}</div>
                          <div style={{fontSize:11,color:'var(--text2)'}}>{n.message}</div>
                          <div style={{fontSize:10,color:'var(--text3)',marginTop:3}}>{n.created_at?.slice(0,16)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{...S.ava,background:roleColor,width:30,height:30,borderRadius:8,fontSize:11}}>{initials}</div>
            <div style={{fontSize:12,lineHeight:1.4}}>
              <div style={{fontWeight:600}}>{user.first_name} {user.last_name}</div>
              <div style={{color:'var(--text3)',fontSize:11}}>{user.student_id}</div>
            </div>
          </div>
        </header>

        <div style={S.content}>
          {nav==='home'      && <HomeView user={user} setNav={setNav} unread={unread}/>}
          {nav==='courses'   && <Courses   user={user} key={refreshKey}/>}
          {nav==='exams'     && <Exams     user={user}/>}
          {nav==='forum'     && <Forum     user={user}/>}
          {nav==='messaging' && <Messaging user={user} key={refreshKey}/>}
          {nav==='calendar'  && <CalendarPage user={user} key={refreshKey}/>}
          {nav==='people'    && <People    user={user}/>}
          {nav==='admin'     && isAdmin && <AdminPanel user={user}/>}
          {nav==='faq'       && <FAQ user={user}/>}
        </div>
      </main>

      <ChatbotBubble user={user}/>
    </div>
  )
}

function HomeView({ user, setNav, unread }) {
  const cards = [
    {nav:'courses',  Icon:BookOpen,      title:'Cours',       desc:'Ressources pédagogiques', color:'#2d8a4e'},
    {nav:'exams',    Icon:FileText,      title:'Examens',     desc:'Évaluations & devoirs',   color:'#c8a84b'},
    {nav:'forum',    Icon:MessageSquare, title:'Forum',       desc:'Discussions & entraide',  color:'#3db368'},
    {nav:'messaging',Icon:Mail,          title:'Messages',    desc:'Messagerie privée',       color:'#52cc7a'},
    {nav:'calendar', Icon:Calendar,      title:'Calendrier',  desc:'Agenda & événements',     color:'#2d8a4e'},
    {nav:'people',   Icon:Users,         title:'Annuaire',    desc:'Étudiants & enseignants', color:'#c8a84b'},
  ]
  return (
    <div style={{maxWidth:860}} className="fade-in">
      <div style={{marginBottom:32}}>
        <h2 style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:700,marginBottom:6}}>
          Bonjour, {user.first_name}
        </h2>
        <p style={{color:'var(--text2)',fontSize:14}}>{user.email} · {user.department}</p>
        {unread>0 && (
          <div style={{marginTop:12,display:'inline-flex',alignItems:'center',gap:8,
            background:'rgba(61,179,104,.1)',border:'1px solid rgba(61,179,104,.25)',
            borderRadius:10,padding:'8px 14px',fontSize:13,color:'var(--accent2)'}}>
            <Bell size={14}/> {unread} nouvelle{unread>1?'s':''} notification{unread>1?'s':''}
          </div>
        )}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:14}}>
        {cards.map(c=>(
          <div key={c.nav} onClick={()=>setNav(c.nav)}
            style={{background:'var(--surface)',border:'1.5px solid var(--border)',borderRadius:16,
              padding:'22px',cursor:'pointer',transition:'all .2s',position:'relative',overflow:'hidden'}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=c.color;e.currentTarget.style.transform='translateY(-3px)'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.transform='translateY(0)'}}>
            <div style={{width:42,height:42,borderRadius:12,background:`${c.color}22`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:14}}>
              <c.Icon size={20} color={c.color} strokeWidth={1.8}/>
            </div>
            <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:15,marginBottom:4}}>{c.title}</div>
            <div style={{fontSize:12,color:'var(--text2)'}}>{c.desc}</div>
            <div style={{position:'absolute',bottom:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${c.color},transparent)`}}/>
          </div>
        ))}
      </div>
    </div>
  )
}

const S = {
  shell:{ display:'flex', height:'100vh', overflow:'hidden' },
  side:{ display:'flex', flexDirection:'column', background:'var(--surface)', borderRight:'1px solid var(--border)', transition:'width .2s ease', overflow:'hidden', flexShrink:0 },
  sideTop:{ display:'flex', alignItems:'center', gap:10, padding:'16px 12px', cursor:'pointer', borderBottom:'1px solid var(--border)', minHeight:58 },
  brandMark:{ width:36,height:36,borderRadius:10,border:'1.5px solid var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,background:'#fff' },
  brandName:{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:700, color:'var(--text)', lineHeight:1.2 },
  brandSub:{ fontSize:10, color:'var(--text3)', letterSpacing:1 },
  nav:{ flex:1, padding:'8px', display:'flex', flexDirection:'column', gap:2 },
  navBtn:{ display:'flex', alignItems:'center', width:'100%', padding:'9px 10px', background:'transparent', border:'none', borderRadius:9, color:'var(--text2)', fontSize:13, cursor:'pointer', transition:'all .15s', whiteSpace:'nowrap', fontWeight:500 },
  navOn:{ background:'rgba(45,138,78,.15)', color:'var(--accent2)' },
  sideBot:{ padding:'10px 8px', borderTop:'1px solid var(--border)' },
  profile:{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', marginBottom:6, background:'var(--surface2)', borderRadius:10 },
  ava:{ width:34,height:34,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:'#fff',flexShrink:0 },
  logoutBtn:{ display:'flex', alignItems:'center', width:'100%', padding:'8px 10px', background:'transparent', border:'none', borderRadius:8, color:'var(--text3)', cursor:'pointer' },
  main:{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' },
  header:{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', height:54, borderBottom:'1px solid var(--border)', background:'var(--surface)', flexShrink:0 },
  headerDot:{ width:7,height:7,borderRadius:'50%',background:'var(--accent2)',boxShadow:'0 0 6px var(--accent2)' },
  bellBtn:{ position:'relative', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:9, width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--text2)' },
  bellBadge:{ position:'absolute', top:-4, right:-4, width:16, height:16, borderRadius:'50%', background:'#ef4444', color:'#fff', fontSize:9, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' },
  notifPanel:{ position:'absolute', top:44, right:0, width:320, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, boxShadow:'0 10px 40px rgba(0,0,0,.4)', zIndex:9000 },
  notifItem:{ display:'flex', gap:10, padding:'10px 14px', borderBottom:'1px solid var(--border)', cursor:'pointer', transition:'background .15s' },
  tinyBtn:{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:6, padding:'4px 7px', cursor:'pointer', color:'var(--text2)', display:'flex', alignItems:'center' },
  content:{ flex:1, overflow:'auto', padding:'22px' }
}
