const SESSION_KEY = "world-guarana-session";

export function getSessionToken() {
  return sessionStorage.getItem(SESSION_KEY);
}

export function setSessionToken(token: string) {
  sessionStorage.setItem(SESSION_KEY, token);
}

export function clearSessionToken() {
  sessionStorage.removeItem(SESSION_KEY);
}
