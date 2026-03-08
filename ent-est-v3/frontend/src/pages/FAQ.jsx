import { useState } from 'react'
import { HelpCircle, ChevronDown, ChevronUp, Search } from 'lucide-react'

const faqData = [
  {
    category: 'Compte & Connexion',
    color: '#3db368',
    questions: [
      { q: "Comment me connecter à l'ENT ?", a: "Rendez-vous sur la page de connexion et entrez votre email universitaire (@est.ac.ma) et mot de passe fournis par l'administration." },
      { q: "J'ai oublié mon mot de passe, que faire ?", a: "Contactez l'administration ou le service informatique. Un administrateur peut réinitialiser votre mot de passe depuis le panel d'administration." },
      { q: "Mon compte est bloqué, comment le débloquer ?", a: "Après plusieurs tentatives échouées, votre compte peut être suspendu. Contactez un administrateur ENT pour le réactiver." },
    ]
  },
  {
    category: 'Cours & Fichiers',
    color: '#c8a84b',
    questions: [
      { q: "Comment télécharger un cours ?", a: "Accédez à la section 'Cours', trouvez le cours souhaité, cliquez dessus et utilisez le bouton de téléchargement sur chaque fichier." },
      { q: "Quels formats de fichiers sont acceptés ?", a: "L'ENT accepte : PDF, DOCX, PPTX, XLSX, ZIP et la plupart des formats courants. La taille maximale par fichier est de 50 Mo." },
      { q: "Comment ajouter un cours en tant qu'enseignant ?", a: "Connectez-vous avec votre compte enseignant, accédez à 'Cours', cliquez sur 'Nouveau cours', remplissez le titre et uploadez vos fichiers." },
    ]
  },
  {
    category: 'Messagerie',
    color: '#52cc7a',
    questions: [
      { q: "Comment envoyer un message ?", a: "Dans la section 'Messages', sélectionnez un contact depuis l'annuaire et tapez votre message." },
      { q: "Les messages sont-ils privés ?", a: "Oui, les messages sont strictement privés entre l'expéditeur et le destinataire." },
      { q: "Comment savoir si j'ai un nouveau message ?", a: "Une notification apparaît dans la cloche en haut à droite du tableau de bord." },
    ]
  },
  {
    category: 'Examens & Devoirs',
    color: '#ef4444',
    questions: [
      { q: "Comment soumettre un devoir ?", a: "Allez dans 'Examens', trouvez l'évaluation correspondante, cliquez dessus et utilisez le bouton 'Soumettre mon devoir'." },
      { q: "Puis-je resoumettre un devoir ?", a: "La politique de resoumission dépend de votre enseignant. Contactez-le via la messagerie." },
      { q: "Comment consulter ma note ?", a: "Les notes sont visibles dans la section 'Examens' une fois publiées. Vous serez notifié quand votre copie sera corrigée." },
    ]
  },
  {
    category: 'Assistant IA',
    color: '#7c3aed',
    questions: [
      { q: "Qu'est-ce que l'assistant IA de l'ENT ?", a: "L'assistant IA est un chatbot basé sur Ollama, déployé localement sur les serveurs de l'EST Salé. Il peut répondre à vos questions académiques." },
      { q: "Mes conversations avec l'IA sont-elles confidentielles ?", a: "L'assistant IA fonctionne entièrement sur les serveurs internes de l'EST Salé. Vos données ne quittent pas l'infrastructure de l'école." },
      { q: "L'assistant IA peut-il m'aider pour mes devoirs ?", a: "L'IA est conçue pour vous aider à comprendre des concepts. Son utilisation doit respecter la charte académique de l'EST Salé." },
    ]
  },
]

export default function FAQ() {
  const [openItems, setOpenItems] = useState({})
  const [search, setSearch] = useState('')

  const toggle = key => setOpenItems(p => ({...p, [key]: !p[key]}))

  const filtered = faqData.map(cat => ({
    ...cat,
    questions: cat.questions.filter(q =>
      q.q.toLowerCase().includes(search.toLowerCase()) ||
      q.a.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(cat => cat.questions.length > 0)

  return (
    <div className="fade-in">
      <div style={{marginBottom:28}}>
        <h2 style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:800,marginBottom:4}}>❓ Aide & FAQ</h2>
        <p style={{color:'var(--text2)',fontSize:13}}>Foire aux questions sur votre Espace Numérique de Travail</p>
      </div>

      {/* Search */}
      <div style={{position:'relative',marginBottom:28,maxWidth:480}}>
        <Search size={15} style={{position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',color:'var(--text3)'}}/>
        <input style={{...S.input,paddingLeft:38}} placeholder="Rechercher une question..."
          value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:24,maxWidth:800}}>
        {filtered.map((cat,ci) => (
          <div key={cat.category}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:cat.color,flexShrink:0}}/>
              <h3 style={{fontSize:11,fontWeight:700,color:cat.color,letterSpacing:1.2,textTransform:'uppercase'}}>{cat.category}</h3>
              <div style={{flex:1,height:1,background:`linear-gradient(to right, ${cat.color}33, transparent)`}}/>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {cat.questions.map((item,qi) => {
                const key = `${ci}-${qi}`
                const isOpen = openItems[key]
                return (
                  <div key={qi} style={{...S.card,border:`1px solid ${isOpen ? cat.color+'44' : 'var(--border)'}`}}>
                    <button onClick={()=>toggle(key)} style={S.qBtn}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <HelpCircle size={14} color={isOpen ? cat.color : 'var(--text3)'} style={{flexShrink:0}}/>
                        <span style={{fontSize:13,fontWeight:500,color:isOpen?'var(--text)':'var(--text2)',textAlign:'left'}}>{item.q}</span>
                      </div>
                      {isOpen
                        ? <ChevronUp size={15} color={cat.color} style={{flexShrink:0}}/>
                        : <ChevronDown size={15} color="var(--text3)" style={{flexShrink:0}}/>
                      }
                    </button>
                    {isOpen && (
                      <div style={{padding:'0 18px 16px 42px',animation:'fadeIn .2s ease'}}>
                        <div style={{height:1,background:'var(--border)',marginBottom:12}}/>
                        <p style={{fontSize:13,color:'var(--text2)',lineHeight:1.75}}>{item.a}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{textAlign:'center',padding:'48px 20px',color:'var(--text3)'}}>
            <Search size={32} style={{marginBottom:12,opacity:.4}}/>
            <p style={{fontSize:13}}>Aucune question ne correspond à votre recherche.</p>
          </div>
        )}
      </div>
    </div>
  )
}

const S = {
  input:{width:'100%',background:'var(--surface2)',border:'1.5px solid var(--border)',borderRadius:10,padding:'10px 14px',color:'var(--text)',fontSize:13,outline:'none'},
  card:{background:'var(--surface)',borderRadius:12,overflow:'hidden',transition:'border-color .2s'},
  qBtn:{width:'100%',padding:'14px 18px',background:'none',border:'none',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}
}
