import { defineFriendGameServer, FriendRpcError } from '@rarefriends/friendsdk/server';
import { engine as E, cutaway as C, plans, daily, feel as F } from './rules.generated.js';
type Progress = { v: number; done: string[]; mastery: Record<string, any>; best: Record<string, number>; sound: boolean; reduced: boolean; theme: string; trail: boolean };
const initial = (): Progress => ({ v: 1, done: [], mastery: {}, best: {}, sound: false, reduced: false, theme: 'plain', trail: true });
const official = new Map([...plans, ...daily].map((level: any) => [level.id, C.normalize(level)]));
const epoch = Date.parse('2026-10-08T00:00:00Z');
export function dailyId(now: number) { const index = Math.floor((now - epoch) / 86400000); return index < 0 ? null : daily[index % 30].id; }
// Storage grants no paid entitlement. These rules have neither chain receipts nor shared storage.
export default defineFriendGameServer({ id: 'rare-heist', rpcs: {
  load(ctx) {
    const today = dailyId(ctx.now), pastDays = Math.max(0, Math.floor((ctx.now - epoch) / 86400000));
    const archiveIds = daily.slice(0, Math.min(30, pastDays)).map((level: any) => level.id).filter((id: string) => id !== today);
    return { progress: ctx.storage.get<Progress>('progress')?.value ?? initial(), items: [], dailyId: today, archiveIds, economyAvailable: false };
  },
  settings(ctx, payload) {
    const p = payload as Partial<Progress>;
    if (!p || typeof p.sound !== 'boolean' || typeof p.reduced !== 'boolean' || typeof p.trail !== 'boolean' || !['plain', 'lilac', 'citrus'].includes(p.theme!)) throw new FriendRpcError('Invalid settings.');
    const record = ctx.storage.get<Progress>('progress'), state = record?.value ?? initial();
    // Do not trust a child to grant itself a purchased theme.
    ctx.storage.put('progress', { ...state, sound: p.sound, reduced: p.reduced, trail: p.trail, theme: 'plain' }, record?.version ?? '*');
    return true;
  },
  complete(ctx, payload) {
    const p = payload as { levelId: string; actions: string[]; mode: string; practice: boolean };
    if (!p || !['operative', 'ghost'].includes(p.mode) || typeof p.practice !== 'boolean' || !Array.isArray(p.actions) || p.actions.length > 3000) throw new FriendRpcError('Invalid run.');
    const level: any = official.get(p.levelId);
    if (!level || p.levelId.startsWith('archive-')) throw new FriendRpcError('This plan needs a verified GameItems entitlement.');
    const run = E.replay(level, p.actions, p.mode);
    if (!run.state || run.error || !['won', 'lost'].includes(run.state.status)) throw new FriendRpcError('Run did not finish under the official rules.');
    // Daily/Last are explicitly practice; no off-chain record may claim paid round entry.
    const practice = p.practice || p.levelId.startsWith('daily-') || p.levelId === 'last-cutaway';
    const record = ctx.storage.get<Progress>('progress'), progress = record?.value ?? initial();
    if (run.state.status === 'won' && !practice) {
      if (!progress.done.includes(level.id)) progress.done.push(level.id);
      progress.mastery[level.id] = F.mergeTarget(progress.mastery[level.id], level, run.state, false);
      const key = level.id + ':' + p.mode;
      progress.best[key] = Math.max(progress.best[key] ?? 0, E.score(level, run.state));
      ctx.storage.put('progress', progress, record?.version ?? '*');
    }
    return { progress, practice, turns: run.state.turn, status: run.state.status };
  },
  purchase() { throw new FriendRpcError('DrawModule actions and GameItems reads are not exposed by FriendSDK v0.2.3. No purchase was made.'); },
  enterDaily() { throw new FriendRpcError('RoundModule bridge and shared settler are required. No entry was charged.'); },
  enterLast() { throw new FriendRpcError('RoundModule bridge and shared settler are required. No stake was charged.'); }
} });
