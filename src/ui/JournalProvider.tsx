import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Journal } from '../core/journal';
import type { Observation } from '../core/model';
import type { Draft } from '../platform/capture';
import { cleanStaleDrafts, openJournal } from '../platform/storage';

type Context = { journal: Journal | null; observations: Observation[]; ready: boolean; error: string | null; warnings: string[]; draft: Draft | null; setDraft: (draft: Draft | null) => void; refresh: () => Promise<void>; retry: () => void; cleanup: () => Promise<void> };
const JournalContext = createContext<Context | null>(null);
export function JournalProvider({ children }: { children: ReactNode }) {
  const [journal, setJournal] = useState<Journal | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const cleanedDrafts = useRef(false);
  useEffect(() => {
    let live = true;
    (async () => {
      const j = await openJournal();
      const messages = await j.recover();
      if (!cleanedDrafts.current) {
        try { await cleanStaleDrafts(); cleanedDrafts.current = true; } catch { messages.push('Unfinished drafts could not be cleaned. Saved sightings are unaffected.'); }
      }
      const items = await j.list();
      if (live) { setJournal(j); setWarnings(messages); setObservations(items); setReady(true); }
    })().catch(e => { if (live) setError(messageOf(e)); });
    return () => { live = false; };
  }, [attempt]);
  const refresh = useCallback(async () => {
    if (!journal) return;
    try { setObservations(await journal.list()); setError(null); }
    catch (e) { setError(`Collection could not refresh. ${messageOf(e)}`); }
  }, [journal]);
  const cleanup = async () => { if (journal) setWarnings(await journal.recover()); };
  return <JournalContext.Provider value={{ journal, observations, ready, error, warnings, draft, setDraft, refresh, retry: () => { setReady(false); setError(null); setAttempt(a => a + 1); }, cleanup }}>{children}</JournalContext.Provider>;
}
export function useJournal() {
  const value = useContext(JournalContext);
  if (!value) throw new Error('Journal provider is missing.');
  return value;
}
export function messageOf(e: unknown) { return e instanceof Error ? e.message : 'Something went wrong. Please try again.'; }
