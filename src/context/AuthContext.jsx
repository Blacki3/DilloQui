import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // Stato sessione Supabase reale
  const [session, setSession] = useState(null);       // sessione Supabase
  const [profile, setProfile] = useState(null);       // profilo da tabella profiles
  const [loading, setLoading] = useState(true);       // true mentre Supabase verifica la sessione
  // Soft flag: fetch profilo fallito (non lascia null silenzioso per sempre)
  const [profileError, setProfileError] = useState(null);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
  // Gestore della piattaforma (verifica gli sportelli), non della singola scuola.
  // Serve solo a decidere cosa mostrare: ogni azione ricontrolla il permesso lato server.
  // null finché la verifica non risponde, per non lampeggiare "area riservata".
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(null);

  // Stato mock per la Demo
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('adminToken') || '');
  const [studentToken, setStudentToken] = useState(() => localStorage.getItem('studentToken') || '');



  const updatePassword = async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) {
      setIsRecoveringPassword(false);
    }
    return { data, error };
  };

  // Persistenza token mock
  useEffect(() => {
    if (adminToken) localStorage.setItem('adminToken', adminToken);
    else localStorage.removeItem('adminToken');
  }, [adminToken]);

  useEffect(() => {
    if (studentToken) localStorage.setItem('studentToken', studentToken);
    else localStorage.removeItem('studentToken');
  }, [studentToken]);

  // Inizializzazione sessione Supabase
  useEffect(() => {
    // Legge la sessione attiva al primo caricamento.
    // ATTENZIONE: aspettiamo anche il profilo prima di togliere il loading,
    // altrimenti le route protette vedono per un attimo profile=null e
    // fanno redirect al login anche se la sessione è valida.
    let cancelled = false;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return;
      setSession(session);
      if (session?.user) await fetchProfile(session.user.id);
      if (!cancelled) setLoading(false);
    });

    // Ascolta i cambi di sessione (login, logout, token refresh).
    // Defer del fetch profilo: chiamare Supabase sync dentro onAuthStateChange
    // può deadlockare il client (pattern documentato da Supabase).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (_event === 'PASSWORD_RECOVERY') {
        setIsRecoveringPassword(true);
      }
      setSession(nextSession);
      if (nextSession?.user) {
        const userId = nextSession.user.id;
        setTimeout(() => {
          if (!cancelled) fetchProfile(userId);
        }, 0);
      } else {
        setProfile(null);
        setProfileError(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;
      if (data) {
        setProfile(data);
        setProfileError(null);
      } else {
        setProfile(null);
        setProfileError('Profilo non trovato');
      }
    } catch (err) {
      console.error('fetchProfile failed:', err);
      setProfileError(err?.message || 'Errore caricamento profilo');
      // Non azzerare un profilo già in memoria su errori transienti
    }
  }

  /**
   * Ricarica il profilo dal database (da chiamare dopo un updateMyProfile
   * per mantenere sincronizzato lo stato del context).
   */
  const refreshProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await fetchProfile(user.id);
  };

  const userId = session?.user?.id;
  useEffect(() => {
    if (!userId) {
      setIsPlatformAdmin(false);
      return;
    }
    let cancelled = false;
    supabase.rpc('am_i_platform_admin').then(({ data, error }) => {
      if (!cancelled) setIsPlatformAdmin(!error && data === true);
    });
    return () => { cancelled = true; };
  }, [userId]);

  // AUTH REALE: Studenti (OTP via email)

  /**
   * Passo 1: invia OTP all'email dello studente.
   * box_slug va nei metadata perché il trigger handle_new_user lo legge da lì
   * per agganciare il profilo allo sportello. box_name lo accompagna ma oggi
   * non lo usa nessuno: resta a disposizione di un template email che voglia
   * nominare lo sportello.
   */
  const sendStudentOtp = async (email, boxSlug, boxName = '') => {
    // Niente emailRedirectTo: con OTP a codice non serve, e se l'URL
    // (es. IP LAN) non è in whitelist può far fallire tutta la richiesta con 500.
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        data: {
          role: 'student',
          box_slug: boxSlug,
          box_name: boxName || boxSlug,
        },
      },
    });
    if (error) {
      console.error('signInWithOtp failed:', error.status, error.code, error.message, error);

      const code = error.code || '';
      const raw = (error.message || '').trim();

      if (code === 'over_email_send_rate_limit' || /rate limit|security purposes/i.test(raw)) {
        throw new Error('Hai richiesto troppi codici. Riprova tra un paio di minuti.');
      }

      throw new Error('Non siamo riusciti a inviarti il codice. Riprova più tardi o contattaci.');
    }
  };

  /**
   * Passo 2: verifica il codice OTP inserito dallo studente.
   */
  const verifyStudentOtp = async (email, otp) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });
    if (error) {
      console.error('verifyOtp failed:', error.code || error.status, error.message, error);
      const raw = (error.message || '').trim();
      if (/expired|invalid|otp/i.test(raw)) {
        throw new Error('Codice non valido o scaduto. Richiedine uno nuovo.');
      }
      throw new Error('Verifica non riuscita. Riprova più tardi o contattaci.');
    }
    // Profilo esplicito: non affidarsi solo a onAuthStateChange (deferred)
    if (data?.user?.id) await fetchProfile(data.user.id);
    else await refreshProfile();
    return data;
  };

  /**
   * Aggiorna il profilo studente dopo il login (Passo 3 di Verify.jsx).
   * Separato da verifyStudentOtp per chiarezza.
   */
  const completeStudentProfile = async ({ nome, cognome, classe, boxSlug }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Sessione non trovata');

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        role: 'student',
        nome,
        cognome,
        classe: classe || '',
        box_slug: boxSlug,
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;
    setProfile(data);
    setProfileError(null);
    return data;
  };

  // AUTH REALE: Admin (email + password)

  /**
   * Login admin con email e password.
   * Usato da /admin/login (NON dalla demo).
   */
  const loginAdminReal = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // Profilo esplicito: non affidarsi solo a onAuthStateChange (deferred)
    if (data?.user?.id) await fetchProfile(data.user.id);
    else await refreshProfile();
    return data;
  };

  /**
   * Registrazione nuovo Admin e creazione del relativo Sportello/Box su Supabase.
   * Il trigger crea sempre un profilo student; la promozione ad admin + box
   * avviene atomicamente via RPC become_admin_and_link_box (fail hard su slug duplicato).
   */
  const registerAdminReal = async ({ email, password, nome, cognome, nomeSportello }) => {
    const slug = nomeSportello.toLowerCase().trim().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || `scuola-${Date.now()}`;

    // 1. Controlla slug PRIMA del signup — fail hard, niente attach a box altrui
    //    boxes_public: tabella boxes non è più leggibile da anon (P1)
    const { data: existingBox, error: slugCheckError } = await supabase
      .from('boxes_public')
      .select('slug')
      .eq('slug', slug)
      .maybeSingle();
    if (slugCheckError) throw new Error(`Verifica dello sportello fallita: ${slugCheckError.message}`);
    if (existingBox) {
      throw new Error('Esiste già uno sportello con questo nome. Scegli un nome diverso.');
    }

    // 2. Signup senza role=admin nei metadata (il trigger ignora comunque role).
    //    Niente box_slug: la box non esiste ancora.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome, cognome },
      },
    });
    if (authError) throw authError;

    // 3. Sessione attiva obbligatoria per la RPC
    let currentSession = authData.session;
    if (!currentSession) {
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (!loginError && loginData?.session) {
        currentSession = loginData.session;
        setSession(loginData.session);
      }
    }
    if (!currentSession) {
      throw new Error('Registrazione creata ma sessione non attiva: se in Supabase è attiva la conferma email, disattivala o conferma l\'email prima di riprovare il login.');
    }

    // 4. Crea box + promuovi ad admin in un'unica RPC (atomica, anti-hijack slug).
    //    Lo stato di verifica della box lo decide il database dal dominio email.
    const { data: profileData, error: rpcError } = await supabase.rpc('become_admin_and_link_box', {
      p_slug: slug,
      p_name: nomeSportello,
      p_nome: nome,
      p_cognome: cognome,
    });
    if (rpcError) {
      const msg = rpcError.message || '';
      if (/unique_violation|already exists|Slug already exists/i.test(msg)) {
        throw new Error('Esiste già uno sportello con questo nome. Scegli un nome diverso.');
      }
      throw new Error(`Creazione dello sportello fallita: ${msg}`);
    }
    // Profilo aggiornato dalla RPC (role=admin + box_slug)
    if (profileData) {
      setProfile(Array.isArray(profileData) ? profileData[0] : profileData);
      setProfileError(null);
    } else {
      await refreshProfile();
    }

    return authData;
  };

  /**
   * Logout reale (sia studente che admin su Supabase).
   */
  const logoutReal = async () => {
    // Chiude lo sblocco del pannello prima di perdere il token, altrimenti
    // resterebbe valido fino alla scadenza dopo un nuovo accesso
    if (isPlatformAdmin) {
      try {
        await supabase.rpc('platform_lock');
      } catch {
        /* scade comunque da solo */
      }
    }
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setProfileError(null);
    setIsPlatformAdmin(false);
  };

  // AUTH MOCK: Demo (invariato rispetto all'Alpha 0.5)

  /** Login admin demo (token mock in localStorage) */
  const loginAdmin = (token) => setAdminToken(token);
  /** Logout admin demo */
  const logoutAdmin = () => setAdminToken('');
  /** Login studente demo (token mock in localStorage) */
  const loginStudent = (token) => setStudentToken(token);
  /** Logout studente demo */
  const logoutStudent = () => setStudentToken('');

  // Flag di autenticazione

  // Admin REALE: solo sessione Supabase con ruolo admin (mai il token mock)
  const isRealAdminAuthenticated = !!session && profile?.role === 'admin';
  // Combinato: reale OPPURE token mock — usare SOLO per /demo/admin/*
  const isAdminAuthenticated = isRealAdminAuthenticated || !!adminToken;
  // Studente: loggato se ha sessione Supabase con ruolo STUDENTE, OPPURE token mock (demo).
  // Il ruolo è obbligatorio: un account admin NON deve poter navigare la box
  // come studente (la registrazione della box è separata dall'accesso studente).
  const isStudentAuthenticated = (!!session && profile?.role === 'student') || !!studentToken;

  return (
    <AuthContext.Provider value={{
      // Sessione reale
      session,
      profile,
      loading,
      profileError,
      refreshProfile,
      sendStudentOtp,
      verifyStudentOtp,
      completeStudentProfile,
      loginAdminReal,
      registerAdminReal,
      logoutReal,
      updatePassword,
      isRecoveringPassword,
      setIsRecoveringPassword,
      // Mock demo (invariati)
      adminToken,
      studentToken,
      loginAdmin,
      logoutAdmin,
      loginStudent,
      logoutStudent,
      // Flag: isRealAdminAuthenticated per /admin/*; isAdminAuthenticated include mock solo per demo
      isRealAdminAuthenticated,
      isAdminAuthenticated,
      isStudentAuthenticated,
      isPlatformAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
