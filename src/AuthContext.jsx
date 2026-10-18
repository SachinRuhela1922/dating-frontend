import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api.js';
import { readCache, writeCache, clearCache } from './cache.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

// user: undefined = checking session, null = signed out, object = signed in.
// The session itself lives in an HTTP-only cookie; nothing sensitive is kept in JS storage.
export function AuthProvider({ children }) {
  const [user, setUserState] = useState(() => readCache('user') ?? undefined); // cached user => app turant khulta hai, splash nahi

  // login/verify se aaye user ko bhi cache karo
  const setUser = useCallback(u => {
    setUserState(u);
    if (u && typeof u === 'object') writeCache('user', u);
  }, []);

  const refresh = useCallback(async () => {
    try { const u = (await api('/auth/me')).user; setUser(u); u ? writeCache('user', u) : clearCache(); }
    catch (e) {
      if (e.status === 401) clearCache(); // session khatam: private data hatao
      setUser(u => (e.status === 401 || u === undefined ? null : u)); // offline/server down: cached user rakho
    }
  }, [setUser]);

  useEffect(() => {
    refresh();
    window.addEventListener('focus', refresh); // detect expiry when the tab regains focus
    return () => window.removeEventListener('focus', refresh);
  }, [refresh]);

  const logout = async () => { try { await api('/auth/logout', { method: 'POST' }); } finally { clearCache(); setUser(null); } };
  return <Ctx.Provider value={{ user, setUser, logout, refresh }}>{children}</Ctx.Provider>;
}
