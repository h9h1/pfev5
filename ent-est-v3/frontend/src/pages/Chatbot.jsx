import { useState, useEffect, useRef } from 'react'
import { Bot, Trash2, Send, Loader, WifiOff, RefreshCw } from 'lucide-react'

const OLLAMA_URL = ''

export default function Chatbot({ user }) {
  const [models, setModels]     = useState([])
  const [model, setModel]       = useState('')
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [connected, setConnected] = useState(false)
  const bottomRef = useRef()

  useEffect(() => { fetchModels() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const fetchModels = async () => {
    try {
      const r = await fetch('/api/ollama/api/tags')
      const data = await r.json()
      const list = data.models?.map(m => m.name) || []
      setModels(list)
      if (list.length > 0) { setModel(list[0]); setConnected(true) }
    } catch { setConnected(false) }
  }

  const send = async () => {
    if (!input.trim() || !model || loading) return
    const userMsg = { role: 'user', content: input.trim() }
    setMessages(m => [...m, userMsg])
    setInput('')
    setLoading(true)
    try {
      const r = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [...messages, userMsg], stream: false })
      })
      const data = await r.json()
      setMessages(m => [...m, { role: 'assistant', content: data.message?.content || 'Pas de réponse' }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Erreur de connexion à Ollama' }])
    } finally { setLoading(false) }
  }

  return (
    <div style={S.page} className="fade-in">
      <div style={S.header}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <Bot size={22} color="var(--accent2)" strokeWidth={1.8}/>
          <div>
            <h2 style={S.title}>Assistant IA</h2>
            <p style={S.sub}>Propulsé par Ollama</p>
          </div>
        </div>
        <div style={S.headerRight}>
          <div style={{...S.dot, background: connected ? '#10b981' : '#ef4444'}}/>
          <span style={{fontSize:12, color:'var(--text2)'}}>{connected ? 'Connecté' : 'Hors ligne'}</span>
          {models.length > 0 && (
            <select style={S.modelSelect} value={model} onChange={e => setModel(e.target.value)}>
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
          <button style={S.resetBtn} onClick={() => setMessages([])}>
            <Trash2 size={13}/> Effacer
          </button>
        </div>
      </div>

      {!connected && (
        <div style={S.offlineBox}>
          <WifiOff size={48} style={{marginBottom:16, opacity:.3}}/>
          <div style={{fontFamily:'var(--font-display)', fontWeight:700, marginBottom:6}}>Ollama non disponible</div>
          <div style={{fontSize:13, color:'var(--text2)', marginBottom:16}}>
            Vérifiez qu'Ollama tourne sur <code style={{color:'var(--accent)'}}>localhost:11434</code>
          </div>
          <button style={S.btn} onClick={fetchModels}>
            <RefreshCw size={14}/> Réessayer
          </button>
        </div>
      )}

      {connected && (
        <>
          <div style={S.messages}>
            {messages.length === 0 && (
              <div style={S.welcome}>
                <div style={{width:64,height:64,borderRadius:18,background:'rgba(45,138,78,.15)',
                  display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
                  <Bot size={32} color="var(--accent2)" strokeWidth={1.5}/>
                </div>
                <div style={{fontFamily:'var(--font-display)', fontWeight:700, fontSize:18, marginBottom:8}}>
                  Bonjour {user.first_name} !
                </div>
                <div style={{fontSize:13, color:'var(--text2)', marginBottom:20}}>
                  Je suis votre assistant IA. Posez-moi vos questions sur vos cours, examens ou tout autre sujet.
                </div>
                <div style={S.suggestions}>
                  {['Explique-moi les pointeurs en C', 'Comment préparer un examen ?', 'Résume le principe SOLID'].map(s => (
                    <div key={s} style={S.suggestion} onClick={() => setInput(s)}
                      onMouseEnter={e=>e.currentTarget.style.borderColor='var(--accent)'}
                      onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} style={{...S.msgWrap, justifyContent: m.role==='user' ? 'flex-end' : 'flex-start'}}>
                {m.role === 'assistant' && (
                  <div style={S.botAvatar}>
                    <Bot size={16} color="var(--accent2)"/>
                  </div>
                )}
                <div style={{...S.bubble, ...(m.role==='user' ? S.userBubble : S.botBubble)}}>
                  <div style={{fontSize:13.5, lineHeight:1.7, whiteSpace:'pre-wrap'}}>{m.content}</div>
                </div>
                {m.role === 'user' && (
                  <div style={S.userAvatar}>{(user.first_name||'?')[0].toUpperCase()}</div>
                )}
              </div>
            ))}

            {loading && (
              <div style={{...S.msgWrap, justifyContent:'flex-start'}}>
                <div style={S.botAvatar}><Bot size={16} color="var(--accent2)"/></div>
                <div style={{...S.bubble, ...S.botBubble}}>
                  <div style={{display:'flex',gap:4,alignItems:'center',padding:'2px 0'}}>
                    <span style={S.typingDot}/>
                    <span style={{...S.typingDot,animationDelay:'.2s'}}/>
                    <span style={{...S.typingDot,animationDelay:'.4s'}}/>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          <div style={S.inputArea}>
            <textarea style={S.textarea}
              placeholder="Posez votre question... (Entrée pour envoyer)"
              value={input} rows={1}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()} }}/>
            <button style={{...S.sendBtn, opacity:(!input.trim()||loading)?.4:1}}
              onClick={send} disabled={!input.trim()||loading}>
              {loading ? <Loader size={16} style={{animation:'spin 1s linear infinite'}}/> : <Send size={16}/>}
            </button>
          </div>
        </>
      )}

      <style>{`
        @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  )
}

const S = {
  page:{ display:'flex', flexDirection:'column', height:'calc(100vh - 104px)' },
  header:{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexShrink:0 },
  title:{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:800, marginBottom:2 },
  sub:{ color:'var(--text2)', fontSize:12 },
  headerRight:{ display:'flex', alignItems:'center', gap:10 },
  dot:{ width:8, height:8, borderRadius:'50%' },
  modelSelect:{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)', padding:'6px 10px', fontSize:12, outline:'none' },
  resetBtn:{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text2)', padding:'6px 12px', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:5 },
  offlineBox:{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:40 },
  btn:{ background:'linear-gradient(135deg,#2d8a4e,#1a5c32)', border:'none', borderRadius:9, color:'#fff', padding:'10px 20px', fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6 },
  messages:{ flex:1, overflow:'auto', padding:'8px 0', display:'flex', flexDirection:'column', gap:12 },
  welcome:{ textAlign:'center', padding:'40px 20px', color:'var(--text2)' },
  suggestions:{ display:'flex', flexDirection:'column', gap:8, maxWidth:360, margin:'0 auto' },
  suggestion:{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 14px', fontSize:13, cursor:'pointer', textAlign:'left', color:'var(--text2)', transition:'border-color .15s' },
  msgWrap:{ display:'flex', gap:10, alignItems:'flex-end' },
  botAvatar:{ width:32, height:32, borderRadius:10, background:'var(--surface2)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  userAvatar:{ width:32, height:32, borderRadius:10, background:'linear-gradient(135deg,#2d8a4e,#1a5c32)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#fff', flexShrink:0 },
  bubble:{ maxWidth:'75%', borderRadius:14, padding:'12px 16px' },
  userBubble:{ background:'linear-gradient(135deg,#2d8a4e,#1a5c32)', color:'#fff', borderBottomRightRadius:4 },
  botBubble:{ background:'var(--surface)', border:'1px solid var(--border)', borderBottomLeftRadius:4 },
  typingDot:{ display:'inline-block', width:7, height:7, borderRadius:'50%', background:'var(--text3)', animation:'bounce 1.2s infinite' },
  inputArea:{ display:'flex', gap:10, paddingTop:12, borderTop:'1px solid var(--border)', flexShrink:0 },
  textarea:{ flex:1, background:'var(--surface2)', border:'1.5px solid var(--border)', borderRadius:10, padding:'12px 14px', color:'var(--text)', fontSize:14, outline:'none', resize:'none', lineHeight:1.5, fontFamily:'var(--font-body)' },
  sendBtn:{ width:46, height:46, background:'linear-gradient(135deg,#2d8a4e,#1a5c32)', border:'none', borderRadius:10, color:'#fff', cursor:'pointer', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }
}
