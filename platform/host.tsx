// Trusted site adapter. All ownership gates, sandbox lifecycle and confirmations stay in SDK.
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { ConnectedGameHost } from '@rarefriends/friendsdk/runtime';
import { createFriendPublicClient, createFriendWalletSession } from '@rarefriends/friendsdk/wallet';
import { readOwnedFriends } from '@rarefriends/friendsdk/owned';
import { parseChanceGame } from '@rarefriends/friendsdk/game';
import { createWalletClient, custom, defineChain } from 'viem';
import '@rarefriends/friendsdk/runtime.css';
import '@rarefriends/friendsdk/frame.css';
import game from './game.json';
import server from './server.ts';
import config from './deployment.json';
const definition = parseChanceGame(game);
const publicClient = createFriendPublicClient();
const chain = defineChain({ id: 4663, name: 'Robinhood', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: ['https://rpc.mainnet.chain.robinhood.com'] } } });
function Host({ session }: { session: ReturnType<typeof createFriendWalletSession> }) {
  const wallet = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const [discovery, setDiscovery] = useState<any>(null), [selected, setSelected] = useState<bigint | null>(null), [retry, setRetry] = useState(0);
  const current = wallet.status === 'connected' && discovery?.revision === wallet.revision ? discovery : null;
  const provider = session.getProvider();
  const walletClient = useMemo(() => provider && wallet.account && config.backend ? createWalletClient({ account: wallet.account, chain, transport: custom(provider as any) }) : undefined, [provider, wallet.account, wallet.revision]);
  useEffect(() => {
    setSelected(null); setDiscovery(null);
    if (wallet.status !== 'connected' || !wallet.account) return;
    const abort = new AbortController();
    readOwnedFriends(publicClient, wallet.account, { signal: abort.signal }).then(result => {
      if (!abort.signal.aborted) setDiscovery({ ...result, revision: wallet.revision });
    }).catch(cause => { if (!abort.signal.aborted) setDiscovery({ revision: wallet.revision, friends: [], error: cause.message }); });
    return () => abort.abort();
  }, [wallet.status, wallet.account, wallet.revision, retry]);
  const friend = current?.friends.find((value: any) => value.id === selected) ?? null;
  return <main style={{ '--rf-game-max-width': '1200px' } as any}>
    {!friend && <div className="rf-runtime-connection">
      {wallet.wallets.map(choice => <button key={choice.id} onClick={() => { void session.connect(choice.id); }}>Connect {choice.name}</button>)}
      {wallet.status === 'unavailable' && <p>Enable a browser wallet to play.</p>}
      {wallet.status === 'wrong-network' && <button onClick={() => { void session.switchNetwork(); }}>Switch to Robinhood</button>}
      {(wallet.error || current?.error) && <p role="alert">{wallet.error || current?.error}</p>}
      {wallet.status === 'connected' && !current && <p>Loading Friends…</p>}
      {current && !current.error && !current.friends.length && <p>No eligible Friends found.</p>}
      {current?.friends.map((value: any) => <button key={String(value.id)} onClick={() => setSelected(value.id)}>Friend #{String(value.id)}</button>)}
      {current?.error && <button onClick={() => setRetry(value => value + 1)}>Retry loading Friends</button>}
    </div>}
    <ConnectedGameHost chrome="none" definition={definition} frameUrl="./game.html" selectedFriend={friend}
      account={wallet.account} chainId={wallet.chainId} publicClient={publicClient} revision={wallet.revision}
      server={server} backend={config.backend ?? undefined} walletClient={walletClient as any}
      assertActive={() => { if (session.getSnapshot().revision !== wallet.revision || session.getProvider() !== provider) throw Error('Game session changed.'); }} />
  </main>;
}
function App() {
  const [session, setSession] = useState<ReturnType<typeof createFriendWalletSession> | null>(null);
  useEffect(() => { const next = createFriendWalletSession(); setSession(next); return () => next.dispose(); }, []);
  return session ? <Host session={session} /> : <p>Loading wallet…</p>;
}
createRoot(document.getElementById('root')!).render(<App />);
