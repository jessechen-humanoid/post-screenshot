const URL_PATTERNS = [
  '/login',
  'accounts/login',
  'checkpoint',
  'signup'
];

const TEXT_PATTERNS = [
  'log in',
  'login',
  'sign up',
  'create new account',
  'log in to continue',
  'continue with facebook',
  'continue with instagram'
];

export function isLikelyLoginWall({ url, title, text }) {
  const haystack = `${title || ''} ${text || ''}`.toLowerCase();
  const normalizedUrl = (url || '').toLowerCase();

  if (URL_PATTERNS.some((pattern) => normalizedUrl.includes(pattern))) {
    return true;
  }

  return TEXT_PATTERNS.some((pattern) => haystack.includes(pattern));
}
