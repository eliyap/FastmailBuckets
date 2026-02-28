const JMAP_SESSION_URL = 'https://api.fastmail.com/jmap/session';

let sessionCache = null;

function getToken() {
  return localStorage.getItem('fastmail_token');
}

export function setToken(token) {
  localStorage.setItem('fastmail_token', token);
  sessionCache = null;
}

export function clearToken() {
  localStorage.removeItem('fastmail_token');
  sessionCache = null;
}

export function hasToken() {
  return !!getToken();
}

async function getSession() {
  if (sessionCache) return sessionCache;
  const res = await fetch(JMAP_SESSION_URL, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
  if (!res.ok) throw new Error('Invalid token or session request failed');
  sessionCache = await res.json();
  return sessionCache;
}

async function jmapRequest(methodCalls) {
  const session = await getSession();
  const accountId = Object.keys(session.accounts)[0];
  const res = await fetch(session.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`
    },
    body: JSON.stringify({
      using: ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
      methodCalls: methodCalls.map(([method, args, id]) =>
        [method, { accountId, ...args }, id]
      )
    })
  });
  return res.json();
}

async function getMailboxByRole(role) {
  const result = await jmapRequest([
    ['Mailbox/get', { properties: ['id', 'role'] }, '0']
  ]);
  return result.methodResponses[0][1].list.find(m => m.role === role);
}

export async function fetchUnreadEmails() {
  const inbox = await getMailboxByRole('inbox');
  const result = await jmapRequest([
    ['Email/query', {
      filter: { inMailbox: inbox.id, notKeyword: '$seen' },
      sort: [{ property: 'receivedAt', isAscending: false }],
      limit: 500
    }, '0'],
    ['Email/get', {
      '#ids': { resultOf: '0', name: 'Email/query', path: '/ids' },
      properties: ['id', 'from', 'subject', 'receivedAt', 'preview']
    }, '1']
  ]);
  return result.methodResponses[1]?.[1]?.list || [];
}
