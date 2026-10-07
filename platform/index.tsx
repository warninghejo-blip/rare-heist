import { useEffect, useRef, useState } from 'react';
import type { GameComponentProps } from '@rarefriends/friendsdk/runtime';
import { boot, readFriend } from './heist.generated.js';
import { plans, daily } from './rules.generated.js';
import deployment from './deployment.json';
import './heist.generated.css';
import './sdk.generated.css';

export default function RareHeist({ friendId, client, paused }: GameComponentProps) {
  const root = useRef<HTMLDivElement>(null), pause = useRef(paused);
  pause.current = paused;
  const [error, setError] = useState(''), [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false, queue = Promise.resolve();
    const enqueue = (action: () => Promise<any>) => {
      queue = queue.then(action).catch(cause => { if (!cancelled) setError(cause.message); });
    };
    (async () => {
      const snapshot = await client.read();
      if (snapshot.friendId !== friendId) throw Error('Friend identity changed. Reload the game.');
      const state: any = await client.rpc('load');
      const hero = await readFriend(friendId);
      if (cancelled || !root.current) return;
      let api: any;
      boot(root.current, {
        friendId: String(friendId), hero, mode: client.mode, progress: state.progress, items: state.items,
        paused: () => pause.current,
        settings: (value: any) => enqueue(() => client.rpc('settings', value)),
        record: (value: any) => enqueue(async () => {
          const result: any = await client.rpc('complete', value);
          if (!cancelled && api) Object.assign(api.save, result.progress);
        }),
        extendLobby: (page: HTMLElement, ui: any) => {
          api = ui;
          const controls = document.createElement('section'); controls.className = 'rh-lists';
          const button = (name: string, act: () => void) => {
            const b = document.createElement('button'); b.textContent = name;
            b.onclick = () => { if (!pause.current) act(); }; controls.appendChild(b);
          };
          // Use existing presentation. These calls refuse payment until the official bridge exists.
          for (const offer of deployment.shop.actions) button(offer.name + ' / ' + offer.priceRF + ' RF', () => enqueue(async () => { await client.rpc('purchase', { actionId: offer.actionId }); }));
          button('DAILY HEIST / 100 RF', () => enqueue(async () => { await client.rpc('enterDaily'); }));
          const archive = document.createElement('details'), summary = document.createElement('summary');
          summary.textContent = 'DAILY ARCHIVE / FREE PRACTICE'; archive.appendChild(summary);
          for (const level of daily) if (state.archiveIds.includes(level.id)) {
            const b = document.createElement('button'); b.textContent = 'PRACTICE / ' + level.name;
            b.onclick = () => { if (!pause.current) ui.start(level, { type: 'daily', practice: true }); };
            archive.appendChild(b);
          }
          if (!state.archiveIds.length) archive.appendChild(document.createTextNode('No past Daily levels yet. Starts 2026-10-08 UTC.'));
          controls.appendChild(archive);
          button('LAST HEIST / FREE FIXED-PLAN PRACTICE', () => ui.start(plans.find((l: any) => l.id === 'last-cutaway'), { type: 'solo', practice: true }));
          for (const price of [100, 1000]) button('LAST HEIST / ' + price + ' RF', () => enqueue(async () => { await client.rpc('enterLast', { price }); }));
          page.querySelector('.rh-lobbygrid .rh-lists')!.appendChild(controls);
        }
      });
      setReady(true);
    })().catch(cause => { if (!cancelled) setError(cause.message); });
    return () => { cancelled = true; };
  }, [friendId, client]);
  return <div className="rh-frame"><div ref={root} className="rh-mount" hidden={!ready} />
    {!ready && !error && <div className="rh-status" role="status">Loading Friend and server progress…</div>}
    {error && <div className="rh-status" role="alert"><p>{error}</p><button onClick={() => setError('')}>CLOSE</button></div>}
  </div>;
}
