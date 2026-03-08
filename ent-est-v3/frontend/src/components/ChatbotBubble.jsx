import { useState, useEffect, useRef } from 'react'
import { Bot, X, Trash2, Send, Loader, RefreshCw } from 'lucide-react'

export default function ChatbotBubble({ user }) {
  const [open, setOpen]         = useState(false)
  const [models, setModels]     = useState([])
  const [model, setModel]       = useState('')
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [connected, setConnected] = useState(false)
  const bottomRef = useRef()

  useEffect(() => { if (open) fetchModels() }, [open])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages])

  const fetchModels = async () => {
    try {
      const r = await fetch('/api/ollama/api/tags')
      const data = await r.json()
      const list = data.models?.map(m => m.name) || []
      setModels(list); if (list.length > 0) { setModel(list[0]); setConnected(true) }
    } catch { setConnected(false) }
  }

  const send = async () => {
    if (!input.trim() || !model || loading) return
    const userMsg = { role:'user', content:input.trim() }
    setMessages(m => [...m, userMsg]); setInput(''); setLoading(true)
    try {
      const r = await fetch('/api/ollama/api/chat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ model, messages:[...messages, userMsg], stream:false })
      })
      const data = await r.json()
      setMessages(m => [...m, { role:'assistant', content: data.message?.content || '...' }])
    } catch {
      setMessages(m => [...m, { role:'assistant', content:'Erreur de connexion à Ollama' }])
    } finally { setLoading(false) }
  }

  const init = ((user.first_name||'?')[0]).toUpperCase()

  return (
    <>
      {open && (
        <div style={S.popup}>
          <div style={S.head}>
            <div style={{display:'flex', alignItems:'center', gap:10}}>
              <div style={S.botIcon}><Bot size={18} color="var(--accent2)"/></div>
              <div>
                <div style={{fontFamily:'var(--font-display)', fontWeight:700, fontSize:14}}>Assistant IA</div>
                <div style={{fontSize:11, color: connected?'#10b981':'#ef4444'}}>
                  {connected ? `● ${model}` : '● Hors ligne'}
                </div>
              </div>
            </div>
            <div style={{display:'flex', gap:6}}>
              {models.length > 1 && (
                <select style={S.modelSel} value={model} onChange={e=>setModel(e.target.value)}>
                  {models.map(m=><option key={m} value={m}>{m}</option>)}
                </select>
              )}
              <button style={S.iconBtn} onClick={()=>setMessages([])} title="Effacer">
                <Trash2 size={13}/>
              </button>
              <button style={S.iconBtn} onClick={()=>setOpen(false)}>
                <X size={13}/>
              </button>
            </div>
          </div>

          <div style={S.messages}>
            {messages.length === 0 && (
              <div style={S.welcome}>
                <div style={{width:48,height:48,borderRadius:14,background:'rgba(45,138,78,.15)',
                  display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}>
                  <Bot size={26} color="var(--accent2)" strokeWidth={1.5}/>
                </div>
                <div style={{fontWeight:600, fontSize:13, marginBottom:4}}>Bonjour {user.first_name} !</div>
                <div style={{fontSize:12, color:'var(--text2)', marginBottom:12}}>Comment puis-je vous aider ?</div>
                {connected && (
                  <div style={{display:'flex', flexDirection:'column', gap:6}}>
                    {['Explique un concept de cours', 'Aide-moi à préparer un examen', 'Résous un exercice'].map(s=>(
                      <div key={s} style={S.chip} onClick={()=>setInput(s)}
                        onMouseEnter={e=>e.currentTarget.style.borderColor='var(--accent)'}
                        onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
                        {s}
                      </div>
                    ))}
                  </div>
                )}
                {!connected && (
                  <button style={S.retryBtn} onClick={fetchModels}>
                    <RefreshCw size={13}/> Reconnecter Ollama
                  </button>
                )}
              </div>
            )}

            {messages.map((m,i) => (
              <div key={i} style={{display:'flex', gap:8, alignItems:'flex-end',
                justifyContent: m.role==='user'?'flex-end':'flex-start', marginBottom:6}}>
                {m.role==='assistant' && (
                  <div style={S.botAvaSm}><Bot size={13} color="var(--accent2)"/></div>
                )}
                <div style={{
                  maxWidth:'82%', borderRadius:12, padding:'9px 12px', fontSize:13, lineHeight:1.6, whiteSpace:'pre-wrap',
                  ...(m.role==='user'
                    ? {background:'linear-gradient(135deg,#2d8a4e,#1a5c32)', color:'#fff', borderBottomRightRadius:3}
                    : {background:'var(--surface2)', border:'1px solid var(--border)', borderBottomLeftRadius:3})
                }}>{m.content}</div>
                {m.role==='user' && (
                  <div style={{...S.botAvaSm, background:'linear-gradient(135deg,#2d8a4e,#1a5c32)', fontSize:11, fontWeight:700, color:'#fff'}}>{init}</div>
                )}
              </div>
            ))}

            {loading && (
              <div style={{display:'flex', gap:8, alignItems:'flex-end'}}>
                <div style={S.botAvaSm}><Bot size={13} color="var(--accent2)"/></div>
                <div style={{background:'var(--surface2)', border:'1px solid var(--border)',
                  borderRadius:12, borderBottomLeftRadius:3, padding:'10px 14px'}}>
                  <div style={{display:'flex', gap:4}}>
                    {[0,1,2].map(i=>(
                      <div key={i} style={{width:6, height:6, borderRadius:'50%',
                        background:'var(--text3)', animation:`bounce 1.2s ${i*0.2}s infinite`}}/>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          <div style={S.inputArea}>
            <input style={S.input}
              placeholder="Votre message..."
              value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()}
              disabled={!connected}/>
            <button style={{...S.sendBtn, opacity:(!input.trim()||loading||!connected)?.4:1}}
              onClick={send} disabled={!input.trim()||loading||!connected}>
              {loading ? <Loader size={14} style={{animation:'spin 1s linear infinite'}}/> : <Send size={14}/>}
            </button>
          </div>
        </div>
      )}

      <button style={{...S.fab, ...(open?S.fabOpen:{})}} onClick={()=>setOpen(o=>!o)}>
        {open ? <X size={20} color="var(--text2)"/> : <Bot size={22} color="#fff"/>}
        {!open && messages.length > 0 && (
          <div style={S.badge}>{messages.filter(m=>m.role==='assistant').length}</div>
        )}
      </button>

      <style>{`
        @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}
        @keyframes popIn{from{opacity:0;transform:scale(.95) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
    </>
  )
}

const S = {
  fab:{ position:'fixed', bottom:24, right:24, width:54, height:54, borderRadius:'50%',
    background:'linear-gradient(135deg,#2d8a4e,#1a5c32)', border:'none',
    cursor:'pointer', zIndex:9000, boxShadow:'0 4px 20px rgba(45,138,78,.4)',
    transition:'all .2s', display:'flex', alignItems:'center', justifyContent:'center' },
  fabOpen:{ background:'var(--surface)', boxShadow:'none', border:'1px solid var(--border)' },
  badge:{ position:'absolute', top:-4, right:-4, width:18, height:18, borderRadius:'50%',
    background:'#ef4444', color:'#fff', fontSize:10, fontWeight:700,
    display:'flex', alignItems:'center', justifyContent:'center' },
  popup:{ position:'fixed', bottom:90, right:24, width:380, height:520,
    background:'var(--surface)', border:'1px solid var(--border)', borderRadius:20,
    boxShadow:'0 20px 60px rgba(0,0,0,.5)', zIndex:8999,
    display:'flex', flexDirection:'column', overflow:'hidden', animation:'popIn .2s ease' },
  head:{ display:'flex', justifyContent:'space-between', alignItems:'center',
    padding:'14px 16px', borderBottom:'1px solid var(--border)', flexShrink:0 },
  botIcon:{ width:34, height:34, borderRadius:10, background:'rgba(45,138,78,.12)',
    border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center' },
  modelSel:{ background:'var(--surface2)', border:'1px solid var(--border)',
    borderRadius:7, color:'var(--text)', padding:'4px 8px', fontSize:11, outline:'none' },
  iconBtn:{ background:'var(--surface2)', border:'1px solid var(--border)',
    borderRadius:7, padding:'6px 8px', cursor:'pointer', color:'var(--text2)',
    display:'flex', alignItems:'center', justifyContent:'center' },
  messages:{ flex:1, overflow:'auto', padding:'12px 14px' },
  welcome:{ textAlign:'center', padding:'20px 10px', color:'var(--text2)' },
  chip:{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8,
    padding:'8px 12px', fontSize:12, cursor:'pointer', textAlign:'left',
    color:'var(--text2)', transition:'border-color .15s' },
  retryBtn:{ background:'linear-gradient(135deg,#2d8a4e,#1a5c32)', border:'none',
    borderRadius:8, color:'#fff', padding:'8px 16px', fontSize:12, cursor:'pointer',
    display:'flex', alignItems:'center', gap:6, margin:'0 auto' },
  botAvaSm:{ width:26, height:26, borderRadius:8, background:'var(--surface2)',
    border:'1px solid var(--border)', display:'flex', alignItems:'center',
    justifyContent:'center', flexShrink:0 },
  inputArea:{ display:'flex', gap:8, padding:'10px 12px', borderTop:'1px solid var(--border)', flexShrink:0 },
  input:{ flex:1, background:'var(--surface2)', border:'1.5px solid var(--border)',
    borderRadius:9, padding:'9px 12px', color:'var(--text)', fontSize:13,
    outline:'none', fontFamily:'var(--font-body)' },
  sendBtn:{ width:38, height:38, background:'linear-gradient(135deg,#2d8a4e,#1a5c32)',
    border:'none', borderRadius:9, color:'#fff', cursor:'pointer', flexShrink:0,
    display:'flex', alignItems:'center', justifyContent:'center' }
}
