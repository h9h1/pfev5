import { useState, useEffect, useRef } from 'react'
import { Mail, Search, Edit, Send, MessageSquare } from 'lucide-react'
import { messagingAPI, usersAPI } from '../services/api.js'

export default function Messaging({ user }) {
  const [contacts, setContacts] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMsg, setNewMsg] = useState('')
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const bottomRef = useRef()
  const pollRef   = useRef()

  useEffect(()=>{ loadContacts(); loadAllUsers()
    return()=>clearInterval(pollRef.current) },[])

  useEffect(()=>{
    if(selected){
      loadConvo(selected)
      clearInterval(pollRef.current)
      pollRef.current=setInterval(()=>loadConvo(selected,true),3000)
    }
    return()=>clearInterval(pollRef.current)
  },[selected?.user_id])

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}) },[messages])

  const loadContacts=async()=>{
    try{
      const r=await messagingAPI.contacts()
      const contacts=r.data.map(c=>{
        if(!c.name){
          const u=allUsers.find(u=>u.id===c.user_id)
          if(u) c.name=`${u.first_name} ${u.last_name}`.trim()
        }
        return c
      })
      setContacts(contacts)
    }catch{}
  }
  const loadAllUsers=async()=>{
    try{
      const r=await usersAPI.list()
      const users=r.data.filter(u=>u.id!==user.id)
      setAllUsers(users)
      await loadContacts(users)
    }catch{}
  }
  const loadConvo=async(contact,silent=false)=>{
    try{const r=await messagingAPI.conversation(contact.user_id);setMessages(r.data)}
    catch{if(!silent)setMessages([])}
  }

  const send=async()=>{
    if(!newMsg.trim()||!selected)return
    try{
      await messagingAPI.send({receiver_id:selected.user_id,content:newMsg.trim()})
      setNewMsg('');await loadConvo(selected);await loadContacts()
    }catch{}
  }

  const startConvo=(u)=>{
    const c={user_id:u.id,name:`${u.first_name} ${u.last_name}`.trim()||u.username,unread:0}
    setSelected(c);setShowSearch(false);setSearch('')
    if(!contacts.find(x=>x.user_id===u.id))setContacts(p=>[c,...p])
  }

  const fmt=d=>{
    if(!d)return''
    const dt=new Date(d),now=new Date()
    if(dt.toDateString()===now.toDateString())return dt.toLocaleTimeString('fr',{hour:'2-digit',minute:'2-digit'})
    return dt.toLocaleDateString('fr',{day:'2-digit',month:'short'})
  }
  const getInit=name=>{const n=(name||'').trim();if(!n)return'?';return n.split(' ').filter(Boolean).map(w=>w[0]).join('').slice(0,2).toUpperCase()}
  const filtered=allUsers.filter(u=>{
    const n=`${u.first_name} ${u.last_name} ${u.username}`.toLowerCase()
    return n.includes(search.toLowerCase())
  })

  return(
    <div style={S.page}>
      <div style={S.sidebar}>
        <div style={S.sideHead}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <Mail size={16} color="var(--accent2)" strokeWidth={1.8}/>
            <span style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:15}}>Messages</span>
          </div>
          <button style={S.newBtn} onClick={()=>setShowSearch(o=>!o)} title="Nouvelle conversation">
            <Edit size={14} color="var(--text2)"/>
          </button>
        </div>

        {showSearch&&(
          <div style={{padding:'10px',borderBottom:'1px solid var(--border)'}}>
            <div style={{position:'relative',marginBottom:6}}>
              <Search size={13} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text3)'}}/>
              <input style={{...S.searchInput,paddingLeft:32}} placeholder="Chercher..." value={search}
                onChange={e=>setSearch(e.target.value)} autoFocus/>
            </div>
            <div style={{maxHeight:180,overflow:'auto'}}>
              {filtered.slice(0,6).map(u=>(
                <div key={u.id} style={S.userItem} onClick={()=>startConvo(u)}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div style={{...S.ava,background:u.role==='teacher'?'#c8a84b':'#2d8a4e',width:30,height:30,fontSize:11}}>
                    {getInit(`${u.first_name} ${u.last_name}`)}
                  </div>
                  <div>
                    <div style={{fontSize:13,fontWeight:500}}>{u.first_name} {u.last_name}</div>
                    <div style={{fontSize:11,color:'var(--text3)'}}>{u.email}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{flex:1,overflow:'auto'}}>
          {contacts.length===0?(
            <div style={{textAlign:'center',padding:'40px 16px',color:'var(--text3)'}}>
              <Mail size={32} style={{marginBottom:8,opacity:.3}}/>
              <div style={{fontSize:12}}>Aucune conversation</div>
            </div>
          ):contacts.map(c=>(
            <div key={c.user_id}
              style={{...S.contactItem,...(selected?.user_id===c.user_id?S.contactOn:{})}}
              onClick={()=>setSelected(c)}>
              <div style={{...S.ava,background:'#2d8a4e'}}>{getInit(c.name)}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600}}>{c.name}</div>
                <div style={{fontSize:11,color:'var(--text3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.last_message}</div>
              </div>
              <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:3}}>
                <div style={{fontSize:10,color:'var(--text3)'}}>{fmt(c.last_time)}</div>
                {c.unread>0&&<div style={S.badge}>{c.unread}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{flex:1,display:'flex',flexDirection:'column'}}>
        {selected?(
          <>
            <div style={S.chatHead}>
              <div style={{...S.ava,background:'#2d8a4e'}}>{getInit(selected.name)}</div>
              <div>
                <div style={{fontWeight:600,fontSize:14}}>{selected.name}</div>
                <div style={{fontSize:11,color:'#10b981'}}>● Disponible</div>
              </div>
            </div>

            <div style={S.messages}>
              {messages.length===0&&(
                <div style={{textAlign:'center',color:'var(--text3)',padding:'40px 0',fontSize:13}}>
                  Commencez la conversation
                </div>
              )}
              {messages.map((m,i)=>{
                const mine=m.sender_id===user.id
                return(
                  <div key={m.id||i} style={{display:'flex',gap:8,alignItems:'flex-end',justifyContent:mine?'flex-end':'flex-start'}}>
                    {!mine&&<div style={{...S.ava,background:'#1a5c32',width:28,height:28,fontSize:10,flexShrink:0}}>{getInit(m.sender_name)}</div>}
                    <div style={{maxWidth:'70%',borderRadius:14,padding:'10px 14px',
                      ...(mine?{background:'linear-gradient(135deg,#2d8a4e,#1a5c32)',color:'#fff',borderBottomRightRadius:4}
                               :{background:'var(--surface2)',border:'1px solid var(--border)',borderBottomLeftRadius:4})}}>
                      <div style={{fontSize:13.5}}>{m.content}</div>
                      <div style={{fontSize:10,color:mine?'rgba(255,255,255,.4)':'var(--text3)',marginTop:3,textAlign:'right'}}>{fmt(m.created_at)}</div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef}/>
            </div>

            <div style={S.inputArea}>
              <input style={S.msgInput} placeholder="Votre message..."
                value={newMsg} onChange={e=>setNewMsg(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()}/>
              <button style={{...S.sendBtn,opacity:newMsg.trim()?1:.4}} onClick={send}>
                <Send size={16}/>
              </button>
            </div>
          </>
        ):(
          <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:'var(--text2)',textAlign:'center',padding:40}}>
            <MessageSquare size={48} style={{marginBottom:16,opacity:.2}}/>
            <div style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:700,marginBottom:8}}>Messagerie</div>
            <div style={{color:'var(--text3)',fontSize:13}}>Sélectionnez une conversation ou cliquez sur <Edit size={12} style={{display:'inline',verticalAlign:'middle'}}/> pour en commencer une</div>
          </div>
        )}
      </div>
    </div>
  )
}

const S={
  page:{display:'flex',height:'calc(100vh - 104px)',border:'1px solid var(--border)',borderRadius:14,overflow:'hidden',background:'var(--surface)'},
  sidebar:{width:280,borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',flexShrink:0},
  sideHead:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 14px 10px',borderBottom:'1px solid var(--border)'},
  newBtn:{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,padding:'7px 9px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'},
  searchInput:{width:'100%',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 12px',color:'var(--text)',fontSize:13,outline:'none'},
  userItem:{display:'flex',alignItems:'center',gap:10,padding:'8px',borderRadius:8,cursor:'pointer'},
  contactItem:{display:'flex',alignItems:'center',gap:10,padding:'11px 13px',cursor:'pointer',transition:'background .15s'},
  contactOn:{background:'rgba(45,138,78,.1)'},
  ava:{width:36,height:36,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#fff',flexShrink:0},
  badge:{background:'var(--accent)',color:'#fff',fontSize:10,fontWeight:700,width:18,height:18,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'},
  chatHead:{display:'flex',alignItems:'center',gap:12,padding:'12px 18px',borderBottom:'1px solid var(--border)'},
  messages:{flex:1,overflow:'auto',padding:'16px 18px',display:'flex',flexDirection:'column',gap:8},
  inputArea:{display:'flex',gap:8,padding:'12px 14px',borderTop:'1px solid var(--border)'},
  msgInput:{flex:1,background:'var(--surface2)',border:'1.5px solid var(--border)',borderRadius:10,padding:'11px 14px',color:'var(--text)',fontSize:14,outline:'none'},
  sendBtn:{width:44,height:44,background:'linear-gradient(135deg,#2d8a4e,#1a5c32)',border:'none',borderRadius:10,color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}
}
