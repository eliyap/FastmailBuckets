import { useState, useEffect, useCallback } from 'react';
import { fetchUnreadEmails, setToken, clearToken, hasToken } from './fastmail';

function bucketEmails(emails) {
  const buckets = {};
  for (const email of emails) {
    const sender = email.from?.[0]?.email || 'unknown';
    if (!buckets[sender]) {
      buckets[sender] = { sender, name: email.from?.[0]?.name || sender, emails: [] };
    }
    buckets[sender].emails.push(email);
  }
  return Object.values(buckets).sort((a, b) => b.emails.length - a.emails.length);
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const diff = Date.now() - date;
  if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800000) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function openFastmailSearch(sender) {
  const query = encodeURIComponent(`in:inbox is:unread from:${sender}`);
  window.open(`https://app.fastmail.com/mail/search:${query}`, '_blank');
}

function Bucket({ bucket, expanded, onExpand }) {
  return (
    <div className="bucket">
      <div className="bucket-header" onClick={onExpand}>
        <span className="bucket-sender">{bucket.name}</span>
        <span className="bucket-count">{bucket.emails.length}</span>
        <button
          className="bucket-open"
          onClick={e => { e.stopPropagation(); openFastmailSearch(bucket.sender); }}
        >
          Open in Fastmail
        </button>
        <span className="bucket-toggle">{expanded ? '▼' : '▶'}</span>
      </div>
      {expanded && (
        <div className="bucket-emails">
          {bucket.emails.map(email => (
            <div key={email.id} className="email-item">
              <div className="email-content">
                <div className="email-subject">{email.subject || '(no subject)'}</div>
                <div className="email-preview">{email.preview}</div>
              </div>
              <span className="email-date">{formatDate(email.receivedAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Login({ onLogin }) {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = e.target.elements.token.value.trim();
    if (!token) return;
    setLoading(true);
    setError(null);
    setToken(token);
    try {
      await fetchUnreadEmails();
      onLogin();
    } catch {
      clearToken();
      setError('Invalid token. Please check and try again.');
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header>
        <h1>Email Buckets</h1>
      </header>
      <form className="login-form" onSubmit={handleSubmit} autoComplete="on">
        <p>Enter your Fastmail API token to view unread emails.</p>
        <input type="text" name="username" defaultValue="fastmail" autoComplete="username" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} tabIndex={-1} />
        <input
          type="password"
          name="token"
          placeholder="Fastmail API token"
          autoComplete="current-password"
          autoFocus
        />
        {error && <p className="login-error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Connecting...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(hasToken());
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(new Set());
  const [activeTab, setActiveTab] = useState('large');

  const loadEmails = useCallback(() => {
    if (!authed) return;
    setLoading(true);
    fetchUnreadEmails()
      .then(data => {
        setEmails(data);
        setLoading(false);
      })
      .catch(() => {
        clearToken();
        setAuthed(false);
        setLoading(false);
      });
  }, [authed]);

  useEffect(() => { loadEmails(); }, [loadEmails]);

  useEffect(() => {
    if (!authed) return;
    const onFocus = () => { if (document.visibilityState === 'visible') loadEmails(); };
    document.addEventListener('visibilitychange', onFocus);
    return () => document.removeEventListener('visibilitychange', onFocus);
  }, [authed, loadEmails]);

  const handleSignOut = () => {
    clearToken();
    setAuthed(false);
    setEmails([]);
    setExpanded(new Set());
  };

  if (!authed) return <Login onLogin={() => setAuthed(true)} />;

  const buckets = bucketEmails(emails);
  const largeBuckets = buckets.filter(b => b.emails.length > 3);
  const smallBuckets = buckets.filter(b => b.emails.length <= 3);

  const toggleExpand = sender => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(sender) ? next.delete(sender) : next.add(sender);
      return next;
    });
  };

  if (loading) return <div className="app"><div className="loading">Loading emails...</div></div>;

  const activeBuckets = activeTab === 'large' ? largeBuckets : smallBuckets;

  return (
    <div className="app">
      <header>
        <h1>Email Buckets</h1>
        <span className="stats">{emails.length} unread from {buckets.length} senders</span>
        <button className="sign-out" onClick={handleSignOut}>Sign out</button>
      </header>

      <div className="tabs">
        <button className={`tab ${activeTab === 'large' ? 'active' : ''}`} onClick={() => setActiveTab('large')}>
          Large ({largeBuckets.length})
        </button>
        <button className={`tab ${activeTab === 'small' ? 'active' : ''}`} onClick={() => setActiveTab('small')}>
          Small ({smallBuckets.length})
        </button>
      </div>

      <div className="buckets">
        {activeBuckets.map(bucket => (
          <Bucket
            key={bucket.sender}
            bucket={bucket}
            expanded={expanded.has(bucket.sender)}
            onExpand={() => toggleExpand(bucket.sender)}
          />
        ))}
      </div>
    </div>
  );
}
