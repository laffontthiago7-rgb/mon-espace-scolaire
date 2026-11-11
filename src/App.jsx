import { useEffect, useState } from "react";
import {
  BookOpen, CalendarDays, CheckCircle2, ClipboardList, GraduationCap,
  LayoutDashboard, LogOut, Mail, Menu, ShieldCheck, Users, X
} from "lucide-react";
import { supabase, supabaseConfigured } from "./supabase";

const roleLabels = {
  directeur: "Directeur principal",
  directrice: "Directrice",
  vice_directeur: "Vice-directeur",
  cpe: "CPE",
  vie_scolaire: "Vie scolaire",
  enseignant: "Enseignant",
  secretariat: "Secrétariat"
};

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [busy, setBusy] = useState(true);
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) {
      setBusy(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) loadProfile(data.session.user.id);
      else setBusy(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next?.user) loadProfile(next.user.id);
      else { setProfile(null); setBusy(false); }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadProfile(userId) {
    setBusy(true);
    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("id,email,full_name,role,status")
      .eq("id", userId)
      .maybeSingle();
    if (profileError) setError("Impossible de charger le profil : " + profileError.message);
    setProfile(data);
    setBusy(false);
  }

  async function submitAuth(e) {
    e.preventDefault();
    setError(""); setMessage(""); setBusy(true);
    try {
      if (mode === "signup") {
        const { error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim() } }
        });
        if (authError) throw authError;
        setMessage("Demande de création envoyée. Vérifie ta boîte mail si une confirmation est demandée. Ton accès restera en attente de validation.");
        setMode("login");
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(), password
        });
        if (authError) throw authError;
      }
    } catch (err) {
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null); setProfile(null);
  }

  if (!supabaseConfigured) return <SetupNotice />;
  if (busy) return <div className="loading-screen"><div className="loader" />Chargement de votre espace…</div>;
  if (!session) return (
    <AuthScreen mode={mode} setMode={setMode} email={email} setEmail={setEmail}
      password={password} setPassword={setPassword} fullName={fullName}
      setFullName={setFullName} submitAuth={submitAuth} busy={busy}
      message={message} error={error} />
  );

  if (!profile) return <StateScreen title="Profil introuvable"
    text="La session existe, mais aucun profil scolaire n'a été trouvé. Contacte l'administrateur de l'établissement."
    action={signOut} />;
  if (profile.status !== "actif") return <StateScreen
    title={profile.status === "refuse" ? "Demande refusée" : "Compte en attente de validation"}
    text={profile.status === "refuse"
      ? "L'accès à cet espace n'est pas autorisé. Contacte la direction si tu penses qu'il s'agit d'une erreur."
      : "Ton compte a bien été créé. La direction doit valider ton accès avant que tu puisses utiliser les services de l'établissement."}
    action={signOut} />;

  return <Dashboard profile={profile} signOut={signOut} mobileNav={mobileNav}
    setMobileNav={setMobileNav} />;
}

function SetupNotice() {
  return <main className="setup-wrap"><section className="setup-card">
    <div className="brand-mark"><GraduationCap size={28}/></div>
    <p className="eyebrow">MON ESPACE SCOLAIRE PRO</p>
    <h1>Configuration à terminer</h1>
    <p>Le site est prêt à être relié à Supabase. Les variables d'environnement ne sont pas encore disponibles dans cette version déployée.</p>
    <div className="setup-code"><b>VITE_SUPABASE_URL</b><br/><b>VITE_SUPABASE_ANON_KEY</b></div>
    <p className="muted">Ajoute ces deux variables dans Vercel, puis redéploie le projet. N'ajoute jamais une clé <code>sb_secret_…</code> au site.</p>
  </section></main>;
}

function AuthScreen(props) {
  const { mode, setMode, email, setEmail, password, setPassword, fullName,
    setFullName, submitAuth, busy, message, error } = props;
  return <main className="auth-shell">
    <aside className="auth-aside">
      <div className="brand-lockup"><div className="brand-mark"><GraduationCap size={28}/></div><span>Mon Espace<br/><b>Scolaire Pro</b></span></div>
      <div className="aside-copy"><span className="eyebrow">LE PORTAIL DE L'ÉTABLISSEMENT</span>
        <h1>Une école mieux organisée, au même endroit.</h1>
        <p>Un espace numérique pour coordonner la vie scolaire, les équipes et les informations de l'établissement.</p>
      </div>
      <div className="aside-footer"><ShieldCheck size={16}/> Accès personnel et sécurisé</div>
    </aside>
    <section className="auth-main"><div className="auth-card">
      <div className="mobile-brand"><div className="brand-mark"><GraduationCap/></div><b>Mon Espace Scolaire Pro</b></div>
      <span className="eyebrow">{mode === "login" ? "BON RETOUR" : "REJOINDRE L'ÉTABLISSEMENT"}</span>
      <h2>{mode === "login" ? "Connexion" : "Créer un compte"}</h2>
      <p className="muted">{mode === "login" ? "Connectez-vous avec vos identifiants personnels." : "Créez votre compte. La direction devra valider votre accès."}</p>
      <form onSubmit={submitAuth} className="auth-form">
        {mode === "signup" && <label>Nom complet<input required value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Prénom et nom"/></label>}
        <label>Adresse e-mail<div className="input-icon"><Mail size={17}/><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="nom@exemple.fr"/></div></label>
        <label>Mot de passe<input required type="password" minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Votre mot de passe"/></label>
        {error && <div className="alert error">{error}</div>}
        {message && <div className="alert success">{message}</div>}
        <button className="primary-btn" disabled={busy}>{busy ? "Veuillez patienter…" : mode === "login" ? "Se connecter" : "Créer mon compte"}</button>
      </form>
      <p className="switch-mode">{mode === "login" ? "Vous n'avez pas encore de compte ?" : "Vous avez déjà un compte ?"} <button onClick={()=>{setMode(mode==="login"?"signup":"login");}}>{mode==="login"?"Créer un compte":"Se connecter"}</button></p>
      <div className="auth-note"><ShieldCheck size={16}/> Les comptes nouvellement créés restent en attente de validation.</div>
    </div></section>
  </main>;
}

function StateScreen({title,text,action}) {
  return <main className="state-wrap"><section className="state-card"><div className="state-icon"><ShieldCheck/></div><h1>{title}</h1><p>{text}</p><button className="secondary-btn" onClick={action}><LogOut size={16}/> Se déconnecter</button></section></main>;
}

function Dashboard({profile,signOut,mobileNav,setMobileNav}) {
  const name = profile.full_name || profile.email || "Membre";
  const role = roleLabels[profile.role] || "Membre de l'établissement";
  const nav = [
    [LayoutDashboard,"Tableau de bord",true],
    [Users,"Équipe",false],
    [GraduationCap,"Élèves",false],
    [CalendarDays,"Emploi du temps",false],
    [ClipboardList,"Vie scolaire",false],
    [BookOpen,"Ressources",false]
  ];
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav?"open":""}`}>
      <div className="side-brand"><div className="brand-mark"><GraduationCap/></div><div><b>Mon Espace</b><span>Scolaire Pro</span></div><button className="close-nav" onClick={()=>setMobileNav(false)}><X/></button></div>
      <div className="school-label">ÉTABLISSEMENT</div>
      <nav>{nav.map(([Icon,label,active])=><button key={label} className={`nav-link ${active?"active":""}`}><Icon size={18}/>{label}</button>)}</nav>
      <div className="sidebar-bottom"><div className="secure-label"><ShieldCheck size={16}/> Espace sécurisé</div><button className="nav-link" onClick={signOut}><LogOut size={18}/> Déconnexion</button></div>
    </aside>
    {mobileNav && <button className="nav-scrim" onClick={()=>setMobileNav(false)} aria-label="Fermer le menu"/>}
    <main className="main-area">
      <header className="topbar"><button className="menu-btn" onClick={()=>setMobileNav(true)}><Menu/></button><div className="breadcrumb">Portail <span>/</span> Tableau de bord</div><div className="top-user"><div className="avatar">{name.slice(0,1).toUpperCase()}</div><div><b>{name}</b><small>{role}</small></div></div></header>
      <div className="page-content">
        <div className="welcome-row"><div><span className="eyebrow">VOTRE ESPACE DE TRAVAIL</span><h1>Bonjour, {name.split(" ")[0]}.</h1><p>Bienvenue sur le portail de votre établissement.</p></div><div className="date-chip"><CalendarDays size={17}/> Année scolaire en cours</div></div>
        <section className="welcome-banner"><div><span>MON ESPACE SCOLAIRE PRO</span><h2>Tout votre établissement,<br/>dans un seul espace.</h2><p>Les outils essentiels de la vie scolaire réunis dans une interface claire.</p></div><div className="banner-art"><GraduationCap size={92}/></div></section>
        <div className="section-heading"><div><h2>Vos services</h2><p>Les modules disponibles dans votre espace.</p></div></div>
        <div className="module-grid">
          <Module Icon={Users} title="Équipe" desc="Retrouvez les membres de l'établissement."/>
          <Module Icon={GraduationCap} title="Élèves" desc="Espace de gestion des élèves à configurer."/>
          <Module Icon={CalendarDays} title="Emploi du temps" desc="Organisation des cours et des horaires."/>
          <Module Icon={ClipboardList} title="Vie scolaire" desc="Suivi administratif et scolaire à configurer."/>
        </div>
        <div className="notice"><CheckCircle2 size={19}/><div><b>Connexion Supabase active</b><p>Votre session est ouverte. Les modules de gestion seront activés progressivement après vérification des droits et de la sécurité.</p></div></div>
        <footer>Mon Espace Scolaire Pro <span>•</span> Portail de l'établissement</footer>
      </div>
    </main>
  </div>;
}
function Module({Icon,title,desc}) { return <article className="module-card"><div className="module-icon"><Icon size={21}/></div><h3>{title}</h3><p>{desc}</p><span className="module-status">En préparation</span></article>; }