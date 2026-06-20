import { useState, useMemo, useEffect } from 'react';
import {
  Search, SlidersHorizontal, MessageSquare, ArrowLeft, Send, CheckCircle2, X, RotateCcw,
  Inbox, FilterX, ArrowDownUp, Globe, Lock, Users, ChevronLeft, ThumbsUp,
} from 'lucide-react';
import { getSettings } from '../../services/mockSettings';
import {
  useReports,
  useAdminReadVersion,
  addMessage,
  setStatus,
  markReportRead,
  hasUnreadForAdmin,
  needsAdminAttention,
  displayAuthor,
  getTypeBadgeClass,
  getTypeLabel,
  STATUS,
  STATUS_LABEL,
  STATUS_BADGE_CLASS,
  TYPE_LABEL,
} from '../../services/mockStore';

const STATUS_TABS = [
  { value: 'all', label: 'Tutte' },
  { value: STATUS.new, label: 'Aperta / Nuove' },
  { value: STATUS.in_review, label: STATUS_LABEL[STATUS.in_review] },
  { value: STATUS.resolved, label: STATUS_LABEL[STATUS.resolved] },
  { value: STATUS.closed, label: STATUS_LABEL[STATUS.closed] },
];

const STATUS_FILTERS = [
  { value: 'all', label: 'Tutte' },
  { value: STATUS.new, label: STATUS_LABEL[STATUS.new] },
  { value: STATUS.in_review, label: STATUS_LABEL[STATUS.in_review] },
  { value: STATUS.resolved, label: STATUS_LABEL[STATUS.resolved] },
  { value: STATUS.closed, label: STATUS_LABEL[STATUS.closed] },
];

const VISIBILITY_FILTERS = [
  { value: 'all', label: 'Tutte' },
  { value: 'public', label: 'Pubblica' },
  { value: 'private', label: 'Privata' },
];

const SORT_OPTIONS = [
  { value: 'recent', label: 'Più recenti' },
  { value: 'oldest', label: 'Più vecchie' },
  { value: 'likes', label: 'Più votate' },
];

const FILTERS_OPEN_KEY = 'dq_admin_reports_filters_open';

function readDesktopFiltersOpen() {
  try {
    const stored = localStorage.getItem(FILTERS_OPEN_KEY);
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
}

function matchesType(report, typeFilter) {
  if (typeFilter === 'all') return true;
  const filterKey = String(typeFilter).toLowerCase();
  const reportType = String(report.type).toLowerCase();
  if (reportType === filterKey) return true;
  if (getTypeLabel(report.type).toLowerCase() === filterKey) return true;
  const settingsMatch = getSettings().categories.find((c) => c.toLowerCase() === filterKey);
  if (settingsMatch && getTypeLabel(report.type).toLowerCase() === settingsMatch.toLowerCase()) return true;
  return false;
}

function buildCategoryFilters(reports) {
  const chips = [{ value: 'all', label: 'Tutte' }];
  const seen = new Set(['all']);

  for (const [value, label] of Object.entries(TYPE_LABEL)) {
    chips.push({ value, label });
    seen.add(value);
  }

  const settingsCategories = getSettings().categories;
  for (const category of settingsCategories) {
    const key = category.toLowerCase();
    if (seen.has(key)) continue;
    const appearsInReports = reports.some(
      (r) => String(r.type).toLowerCase() === key || getTypeLabel(r.type).toLowerCase() === key,
    );
    if (appearsInReports) {
      chips.push({ value: key, label: category });
      seen.add(key);
    }
  }

  for (const report of reports) {
    const key = String(report.type).toLowerCase();
    if (!key || seen.has(key) || TYPE_LABEL[key]) continue;
    chips.push({ value: key, label: getTypeLabel(report.type) });
    seen.add(key);
  }

  return chips;
}

function applySharedFilters(report, typeFilter, visibilityFilter, soloNonGestite, readTick = 0) {
  void readTick;
  const matchType = matchesType(report, typeFilter);
  const matchVisibility =
    visibilityFilter === 'all' ||
    (visibilityFilter === 'public' ? !!report.isPublic : !report.isPublic);
  const matchAttention = !soloNonGestite || needsAdminAttention(report);
  return matchType && matchVisibility && matchAttention;
}

function sortReports(list, sortBy) {
  const sorted = [...list];
  if (sortBy === 'oldest') {
    sorted.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  } else if (sortBy === 'likes') {
    sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0));
  } else {
    sorted.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }
  return sorted;
}

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mq.addEventListener('change', handler);
    setMatches(mq.matches);
    return () => mq.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

function ReportsFiltersPanel({
  id,
  className = '',
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  visibilityFilter,
  setVisibilityFilter,
  soloNonGestite,
  setSoloNonGestite,
  sortBy,
  setSortBy,
  categoryFilters,
  filtersActive,
  resetFilters,
  showSort = true,
}) {
  return (
    <div className={`reports-filter-panel ${className}`.trim()} id={id}>
      <div className="reports-filter-group">
        <span className="reports-filter-label" id={`${id}-status-label`}>Stato</span>
        <div className="reports-filter-chips" role="group" aria-labelledby={`${id}-status-label`}>
          {STATUS_FILTERS.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`reports-filter-chip${statusFilter === opt.value ? ' active' : ''}`}
              aria-pressed={statusFilter === opt.value}
              onClick={() => setStatusFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="reports-filter-group">
        <span className="reports-filter-label" id={`${id}-type-label`}>Categoria</span>
        <div className="reports-filter-chips" role="group" aria-labelledby={`${id}-type-label`}>
          {categoryFilters.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`reports-filter-chip${typeFilter === opt.value ? ' active' : ''}`}
              aria-pressed={typeFilter === opt.value}
              onClick={() => setTypeFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="reports-filter-group">
        <span className="reports-filter-label" id={`${id}-visibility-label`}>Visibilità</span>
        <div className="reports-filter-chips" role="group" aria-labelledby={`${id}-visibility-label`}>
          {VISIBILITY_FILTERS.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`reports-filter-chip${visibilityFilter === opt.value ? ' active' : ''}`}
              aria-pressed={visibilityFilter === opt.value}
              onClick={() => setVisibilityFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="reports-filter-group">
        <span className="reports-filter-label" id={`${id}-attention-label`}>Attenzione</span>
        <div className="reports-filter-chips" role="group" aria-labelledby={`${id}-attention-label`}>
          <button
            type="button"
            className={`reports-filter-chip${soloNonGestite ? ' active' : ''}`}
            aria-pressed={soloNonGestite}
            onClick={() => setSoloNonGestite(v => !v)}
          >
            Solo non gestite
          </button>
        </div>
      </div>

      {showSort && (
        <div className="reports-filter-sort-group">
          <span className="reports-filter-label" id={`${id}-sort-label`}>Ordina</span>
          <div className="reports-filter-sort-row">
            <ArrowDownUp size={15} strokeWidth={2.5} aria-hidden="true" />
            <label htmlFor={`${id}-sort-select`} className="sr-only">Ordina segnalazioni</label>
            <select
              id={`${id}-sort-select`}
              className="reports-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-labelledby={`${id}-sort-label`}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="reports-filter-footer">
        <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--b-gray)' }}>
          {filtersActive ? 'Filtri attivi' : 'Nessun filtro attivo'}
        </span>
        <button
          type="button"
          className="reports-filter-reset"
          onClick={resetFilters}
          disabled={!filtersActive}
          style={{ opacity: filtersActive ? 1 : 0.45, cursor: filtersActive ? 'pointer' : 'not-allowed' }}
        >
          <X size={14} strokeWidth={3} /> Reset filtri
        </button>
      </div>
    </div>
  );
}

function ReportDetailView({
  report,
  chatInput,
  setChatInput,
  confirmAction,
  setConfirmAction,
  onBack,
  sendChatMsg,
  applyStatus,
}) {
  const statusClass = STATUS_BADGE_CLASS[report.status] || 'badge badge-status-new';
  const typeClass = getTypeBadgeClass(report.type);
  const statusLabel = STATUS_LABEL[report.status] || report.status;
  const typeLabel = getTypeLabel(report.type);
  const isPublic = !!report.isPublic;
  const communityComments = isPublic ? (report.comments || []) : [];

  return (
    <div className="report-detail-view">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--b-white)', border: 'var(--b-border)',
            cursor: 'pointer', fontWeight: 800, fontSize: '0.78rem',
            textTransform: 'uppercase', letterSpacing: '0.04em',
            padding: '8px 14px', boxShadow: 'var(--b-shadow-sm)',
            fontFamily: "'Space Grotesk', sans-serif",
          }}
          id="report-back-btn"
        >
          <ArrowLeft size={15} strokeWidth={3} /> Indietro
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span
            className={`report-visibility-badge ${isPublic ? 'report-visibility-badge--public' : 'report-visibility-badge--private'}`}
            aria-label={isPublic ? 'Segnalazione pubblica' : 'Chat privata'}
          >
            {isPublic ? <><Globe size={14} strokeWidth={2.5} /> Pubblica</> : <><Lock size={14} strokeWidth={2.5} /> Privata</>}
          </span>
          <div className={statusClass}>
            {statusLabel}
          </div>
        </div>
      </div>

      <div className="report-detail-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <span className={typeClass}>
            {typeLabel}
          </span>
        </div>
        <h2 style={{ marginBottom: 10, fontSize: '1.2rem', textTransform: 'uppercase', lineHeight: 1.3 }}>{report.title}</h2>
        <p style={{ color: 'var(--b-gray)', lineHeight: 1.6, fontSize: '0.9rem', marginBottom: 12 }}>{report.content}</p>
        <div style={{ fontSize: '0.75rem', color: 'var(--b-gray)', paddingTop: 12, borderTop: '2px solid var(--b-black)', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>
          {report.date} • {displayAuthor(report)}
        </div>
      </div>

      {!isPublic && (
        <div className="report-visibility-notice" role="note">
          <Lock size={18} strokeWidth={2.5} aria-hidden="true" />
          <span>Chat privata — la conversazione è visibile solo tra lo studente e l&apos;amministratore. I commenti del forum non sono inclusi.</span>
        </div>
      )}

      <div className="report-status-actions">
        {confirmAction && confirmAction.id === report.id ? (
          <>
            <span style={{ fontSize: '0.78rem', color: 'var(--b-gray)', display: 'flex', alignItems: 'center', flex: 1, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Segnare come {STATUS_LABEL[confirmAction.status]}?
            </span>
            <button
              className={`report-status-btn ${confirmAction.status === STATUS.resolved ? 'resolved' : 'closed'}`}
              onClick={() => applyStatus(report.id, confirmAction.status)}
              id="admin-confirm-status-btn"
            >
              {confirmAction.status === STATUS.resolved
                ? <><CheckCircle2 size={15} strokeWidth={3} /> Sì, risolta</>
                : <><X size={15} strokeWidth={3} /> Sì, chiudi</>}
            </button>
            <button
              className="report-status-btn"
              onClick={() => setConfirmAction(null)}
              id="admin-cancel-status-btn"
            >
              Annulla
            </button>
          </>
        ) : (
          <>
            {report.status !== STATUS.resolved && (
              <button
                className="report-status-btn resolved"
                onClick={() => setConfirmAction({ id: report.id, status: STATUS.resolved })}
                id="admin-mark-resolved-btn"
              >
                <CheckCircle2 size={15} strokeWidth={3} /> Segna Risolta
              </button>
            )}
            {report.status !== STATUS.closed && (
              <button
                className="report-status-btn closed"
                onClick={() => setConfirmAction({ id: report.id, status: STATUS.closed })}
                id="admin-mark-closed-btn"
              >
                <X size={15} strokeWidth={3} /> Chiudi
              </button>
            )}
            {(report.status === STATUS.resolved || report.status === STATUS.closed) && (
              <button
                className="report-status-btn review"
                onClick={() => applyStatus(report.id, STATUS.in_review)}
                id="admin-reopen-btn"
              >
                <RotateCcw size={15} strokeWidth={3} /> Riapri (In Revisione)
              </button>
            )}
          </>
        )}
      </div>

      <div className="flat-panel" style={{ padding: '16px', marginBottom: 12, minHeight: 80 }}>
        <div className="chat-section-title">
          {isPublic ? (
            <><MessageSquare size={15} strokeWidth={2.5} aria-hidden="true" /> Chat studente ↔ admin</>
          ) : (
            'Conversazione privata'
          )}
        </div>
        {report.chat.length === 0 && (
          <p style={{ color: 'var(--b-gray)', fontSize: '0.875rem' }}>Nessun messaggio.</p>
        )}
        {report.chat.map(msg => (
          <div key={msg.id} style={{ marginBottom: 14, display: 'flex', gap: 10 }}>
            {!msg.isAdmin ? (
              <div style={{ width: 34, height: 34, background: 'var(--b-cream)', border: '2px solid var(--b-black)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, fontFamily: "'IBM Plex Mono', monospace" }}>STU</span>
              </div>
            ) : (
              <div className="chat-admin-avatar" style={{ width: 34, height: 34, border: '2px solid var(--b-black)', flexShrink: 0 }}>
                <MessageSquare size={15} strokeWidth={2.5} />
              </div>
            )}
            <div style={{ flex: 1 }}>
              <div className="chat-comment-meta">
                <span style={{ color: 'var(--b-black)', fontWeight: 800 }}>{msg.author}</span>
                <span>•</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{msg.time}</span>
              </div>
              <div className="chat-comment-text">{msg.text}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="chat-input-bar report-detail-chat-input">
        <input
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          placeholder="Scrivi una risposta allo studente..."
          onKeyDown={e => e.key === 'Enter' && sendChatMsg(report.id)}
          id="admin-chat-input"
        />
        <button className="chat-send-btn" onClick={() => sendChatMsg(report.id)} aria-label="Invia messaggio allo studente" id="admin-chat-send">
          <Send size={16} strokeWidth={2.5} />
        </button>
      </div>

      {isPublic && (
        <div className="flat-panel report-community-section" style={{ padding: '16px', marginBottom: 12 }}>
          <div className="report-community-section-header">
            <div className="chat-section-title">
              <Users size={15} strokeWidth={2.5} aria-hidden="true" />
              Commenti community ({communityComments.length})
            </div>
            <div
              className="report-community-votes"
              aria-label={`${report.likes || 0} ${(report.likes || 0) === 1 ? 'voto' : 'voti'} dalla community`}
            >
              <ThumbsUp size={15} strokeWidth={2.5} aria-hidden="true" />
              <span className="report-community-votes-count">{report.likes || 0}</span>
              <span className="report-community-votes-label">
                {(report.likes || 0) === 1 ? 'voto community' : 'voti community'}
              </span>
            </div>
          </div>
          {communityComments.length === 0 ? (
            <p style={{ color: 'var(--b-gray)', fontSize: '0.875rem' }}>Nessun commento pubblico sul forum.</p>
          ) : (
            communityComments.map(comment => (
              <div key={comment.id} className="report-community-comment">
                <div className="chat-comment-meta">
                  <span style={{ color: 'var(--b-black)', fontWeight: 800 }}>{comment.author}</span>
                  <span>•</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{comment.time}</span>
                </div>
                <div className="chat-comment-text">{comment.text}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function ReportsList() {
  const reports = useReports();
  const readVersion = useAdminReadVersion();
  const [search, setSearch] = useState('');
  const [openChat, setOpenChat] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showDesktopFilters, setShowDesktopFilters] = useState(readDesktopFiltersOpen);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [soloNonGestite, setSoloNonGestite] = useState(false);
  const [sortBy, setSortBy] = useState('recent');
  const [confirmAction, setConfirmAction] = useState(null);

  const categoryFilters = useMemo(() => buildCategoryFilters(reports), [reports]);

  const unreadTabCounts = useMemo(() => {
    const base = reports.filter((r) => applySharedFilters(r, typeFilter, visibilityFilter, soloNonGestite, readVersion));
    const countUnread = (list) => list.filter(hasUnreadForAdmin).length;
    return {
      all: countUnread(base),
      [STATUS.new]: countUnread(base.filter((r) => r.status === STATUS.new)),
      [STATUS.in_review]: countUnread(base.filter((r) => r.status === STATUS.in_review)),
      [STATUS.resolved]: countUnread(base.filter((r) => r.status === STATUS.resolved)),
      [STATUS.closed]: countUnread(base.filter((r) => r.status === STATUS.closed)),
    };
  }, [reports, typeFilter, visibilityFilter, soloNonGestite, readVersion]);

  const filtersActive =
    statusFilter !== 'all' ||
    typeFilter !== 'all' ||
    visibilityFilter !== 'all' ||
    soloNonGestite;

  const hasSearch = search.trim().length > 0;

  const resetFilters = () => {
    setStatusFilter('all');
    setTypeFilter('all');
    setVisibilityFilter('all');
    setSoloNonGestite(false);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const list = reports.filter((r) => {
      const matchSearch =
        !q ||
        r.title.toLowerCase().includes(q) ||
        displayAuthor(r).toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchSearch && matchStatus && applySharedFilters(r, typeFilter, visibilityFilter, soloNonGestite, readVersion);
    });
    return sortReports(list, sortBy);
  }, [reports, search, statusFilter, typeFilter, visibilityFilter, soloNonGestite, sortBy, readVersion]);

  const openReport = reports.find((r) => r.id === openChat);
  const isWide = useMediaQuery('(min-width: 1280px)');
  const isDesktopFilters = useMediaQuery('(min-width: 1024px)');

  const filterPanelProps = {
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    visibilityFilter,
    setVisibilityFilter,
    soloNonGestite,
    setSoloNonGestite,
    sortBy,
    setSortBy,
    categoryFilters,
    filtersActive,
    resetFilters,
    showSort: true,
  };

  useEffect(() => {
    if (openChat) {
      markReportRead(openChat);
      setConfirmAction(null);
    }
  }, [openChat]);

  useEffect(() => {
    try {
      localStorage.setItem(FILTERS_OPEN_KEY, String(showDesktopFilters));
    } catch {
      /* ignore storage errors */
    }
  }, [showDesktopFilters]);

  const sendChatMsg = (reportId) => {
    if (!chatInput.trim()) return;
    addMessage(reportId, { text: chatInput.trim(), isAdmin: true, author: 'Admin' });
    setChatInput('');
  };

  const applyStatus = (reportId, status) => {
    setStatus(reportId, status);
    setConfirmAction(null);
  };

  const handleQuickStatus = (e, reportId, status) => {
    e.stopPropagation();
    e.preventDefault();
    setStatus(reportId, status);
  };

  const openReportDetail = (reportId) => {
    setConfirmAction(null);
    setOpenChat(reportId);
  };

  const detailProps = openReport ? {
    report: openReport,
    chatInput,
    setChatInput,
    confirmAction,
    setConfirmAction,
    onBack: () => setOpenChat(null),
    sendChatMsg,
    applyStatus,
  } : null;

  if (openChat && openReport && !isWide) {
    return (
      <div className="admin-page reports-page" style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 80 }}>
        <ReportDetailView {...detailProps} />
      </div>
    );
  }

  const emptyVariant = reports.length === 0
    ? 'none'
    : (filtersActive || hasSearch ? 'filtered' : 'none');

  const gridClassName = [
    'reports-page-grid',
    openReport && isWide ? 'has-detail' : '',
    isDesktopFilters && showDesktopFilters ? 'filters-open' : '',
    isDesktopFilters && !showDesktopFilters ? 'filters-closed' : '',
  ].filter(Boolean).join(' ');

  const statusTabsNav = (
    <div
      className="reports-page-tabs reports-status-tabs scrollbar-hidden"
      role="tablist"
      aria-label="Filtra per stato"
    >
      {STATUS_TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          id={`reports-tab-${tab.value}`}
          aria-selected={statusFilter === tab.value}
          aria-controls="reports-list-panel"
          className={`reports-status-tab${statusFilter === tab.value ? ' active' : ''}`}
          onClick={() => setStatusFilter(tab.value)}
        >
          <span>{tab.label}</span>
          {(unreadTabCounts[tab.value] ?? 0) > 0 && (
            <span
              className="notification-badge reports-tab-badge"
              aria-label={`${unreadTabCounts[tab.value]} non lette`}
            >
              {unreadTabCounts[tab.value]}
            </span>
          )}
        </button>
      ))}
    </div>
  );

  return (
    <div className="admin-page reports-page">
      <div className={gridClassName}>
        <header className="reports-page-title-row">
          <div className="reports-page-title-group">
            <div className="reports-page-title-accent" aria-hidden="true" />
            <h1 className="reports-page-title">Segnalazioni</h1>
          </div>

          {!isDesktopFilters && (
            <button
              type="button"
              className={`reports-filters-toggle${showFilters || filtersActive ? ' reports-filters-toggle--highlight' : ''}`}
              onClick={() => setShowFilters(v => !v)}
              aria-expanded={showFilters}
              aria-controls="reports-filter-panel"
              aria-label={showFilters ? 'Nascondi filtri' : 'Mostra filtri'}
              id="reports-filter-btn"
            >
              <SlidersHorizontal size={15} strokeWidth={2.5} aria-hidden="true" />
              Filtri
              {filtersActive && <span className="reports-filter-active-dot" aria-hidden="true" />}
            </button>
          )}
        </header>

        {statusTabsNav}

        <div className={`reports-list-column${openReport && isWide ? ' reports-list-column--with-detail' : ''}`}>

      {!isDesktopFilters && showFilters && (
        <ReportsFiltersPanel id="reports-filter-panel" {...filterPanelProps} showSort={false} />
      )}

      <div className={`reports-toolbar${isDesktopFilters ? ' reports-toolbar--no-sort' : ''}`}>
        <div className="reports-search-bar">
          <Search size={16} strokeWidth={2.5} color="var(--b-black)" />
          <div className="reports-search-divider" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca segnalazioni..."
            className="reports-search-input"
            id="reports-search-input"
          />
        </div>
        {!isDesktopFilters && (
          <div className="reports-sort-wrap">
            <ArrowDownUp size={15} strokeWidth={2.5} aria-hidden="true" />
            <label htmlFor="reports-sort-select" className="sr-only">Ordina segnalazioni</label>
            <select
              id="reports-sort-select"
              className="reports-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="reports-list-count">
        {filtered.length} segnalazioni trovate
      </div>

      <div className="reports-list-scroll scrollbar-hidden">
      {filtered.length === 0 && (
        <div className="reports-empty-state">
          <div className="reports-empty-icon" aria-hidden="true">
            {emptyVariant === 'filtered' ? <FilterX size={28} strokeWidth={2.5} /> : <Inbox size={28} strokeWidth={2.5} />}
          </div>
          <h2 className="reports-empty-title">
            {emptyVariant === 'filtered' ? 'Nessun risultato' : 'Nessuna segnalazione'}
          </h2>
          <p className="reports-empty-copy">
            {emptyVariant === 'filtered'
              ? 'Nessuna segnalazione corrisponde ai filtri o alla ricerca attuale. Prova a modificare i criteri.'
              : 'Non ci sono ancora segnalazioni da gestire. Quando gli studenti invieranno richieste, le troverai qui.'}
          </p>
          {emptyVariant === 'filtered' && filtersActive && (
            <button type="button" className="reports-empty-reset" onClick={resetFilters}>
              <X size={14} strokeWidth={3} /> Reset filtri
            </button>
          )}
        </div>
      )}

      <div id="reports-list-panel" role="tabpanel" aria-labelledby={`reports-tab-${statusFilter}`} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {filtered.map((report, idx) => {
          const statusClass = STATUS_BADGE_CLASS[report.status] || 'badge badge-status-new';
          const typeClass = getTypeBadgeClass(report.type);
          const statusLabel = STATUS_LABEL[report.status] || report.status;
          const typeLabel = getTypeLabel(report.type);
          const unread = hasUnreadForAdmin(report);
          const showResolve = report.status !== STATUS.resolved && report.status !== STATUS.closed;
          const showClose = report.status !== STATUS.closed;
          return (
            <div
              key={report.id}
              className={`admin-report-card ${unread ? 'admin-report-card--unread' : 'admin-report-card--read'}`}
              style={{
                cursor: 'pointer', touchAction: 'manipulation',
                borderBottom: idx < filtered.length - 1 ? '2px solid var(--b-black)' : '3px solid var(--b-black)',
                boxShadow: 'none',
              }}
              role="button"
              tabIndex={0}
              onClick={() => openReportDetail(report.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openReportDetail(report.id);
                }
              }}
              aria-label={`Apri segnalazione ${report.title}${unread ? ', non letta' : ', già letta'}`}
              id={`admin-report-${report.id}`}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  {unread && (
                    <span className="notification-dot" aria-hidden="true" title="Non letta" />
                  )}
                  <div className="admin-report-card-date">{report.date}</div>
                </div>
                <div className="admin-report-card-author">{displayAuthor(report)}</div>
                <div className="admin-report-card-title">{report.title}</div>
              </div>
              <div className="admin-report-card-aside">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                  <span className={typeClass}>
                    {typeLabel}
                  </span>
                  <span className={statusClass}>
                    {statusLabel}
                  </span>
                </div>
                {(showResolve || showClose) && (
                  <div className="admin-report-quick-actions">
                    {showResolve && (
                      <button
                        type="button"
                        className="admin-report-quick-btn resolved"
                        aria-label={`Segna risolta: ${report.title}`}
                        onClick={(e) => handleQuickStatus(e, report.id, STATUS.resolved)}
                      >
                        <CheckCircle2 size={14} strokeWidth={3} />
                      </button>
                    )}
                    {showClose && (
                      <button
                        type="button"
                        className="admin-report-quick-btn closed"
                        aria-label={`Chiudi segnalazione: ${report.title}`}
                        onClick={(e) => handleQuickStatus(e, report.id, STATUS.closed)}
                      >
                        <X size={14} strokeWidth={3} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      </div>
        </div>

        {openReport && isWide && detailProps && (
          <div className="reports-detail-column">
            <ReportDetailView {...detailProps} />
          </div>
        )}

        {isDesktopFilters && showDesktopFilters && (
          <aside className="reports-filters-sidebar" aria-label="Filtri e ordinamento" id="reports-filter-sidebar">
            <div className="reports-filters-sidebar-header">
              <button
                type="button"
                className="reports-filters-collapse-btn"
                onClick={() => setShowDesktopFilters(false)}
                aria-expanded={true}
                aria-controls="reports-filter-sidebar"
                aria-label="Chiudi pannello filtri"
                id="reports-filter-collapse-btn"
              >
                <ChevronLeft size={16} strokeWidth={3} aria-hidden="true" />
              </button>
              <h2 className="reports-filters-sidebar-heading">
                <SlidersHorizontal size={16} strokeWidth={2.5} aria-hidden="true" />
                Filtri
              </h2>
            </div>
            <ReportsFiltersPanel id="reports-filter-sidebar-panel" className="scrollbar-hidden" {...filterPanelProps} />
          </aside>
        )}

        {isDesktopFilters && !showDesktopFilters && (
          <button
            type="button"
            className="reports-filters-reopen-tab"
            onClick={() => setShowDesktopFilters(true)}
            aria-expanded={false}
            aria-controls="reports-filter-sidebar"
            aria-label={filtersActive ? 'Mostra pannello filtri (filtri attivi)' : 'Mostra pannello filtri'}
            id="reports-filter-reopen-tab"
          >
            <ChevronLeft size={16} strokeWidth={3} aria-hidden="true" />
            {filtersActive && <span className="reports-filter-active-dot" aria-hidden="true" />}
          </button>
        )}
      </div>
    </div>
  );
}
