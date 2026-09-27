"use client";

// Thin FriendSDK adapter for Rare Heist. The SDK runtime owns the wallet, Friend selection and
// the fresh ownership check; this component only starts the session, reads the selected Friend's
// public artwork and mounts the existing canvas game (generated from ../../../src by build-sdk.mjs).
import { useEffect, useRef, useState } from "react";
import type { GameComponentProps } from "@rarefriends/friendsdk/runtime";
import { boot, readFriend } from "./heist.generated.js";
import "./heist.generated.css";
import "./sdk.css";

type Phase = "session" | "artwork" | "ready" | "error";

export default function RareHeist({ friendId, client, paused }: GameComponentProps) {
  const host = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const [phase, setPhase] = useState<Phase>("session");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setPhase("session");
    setError("");
    (async () => {
      // The first read finishes the runtime's loading state, even though this game has no economy actions.
      const snapshot = await client.read();
      if (snapshot.friendId !== friendId) throw new Error("This game session does not match the selected Friend.");
      if (cancelled) return;
      setPhase("artwork");
      const hero = await readFriend(friendId);
      if (cancelled || !host.current) return;
      boot(host.current, { friendId: friendId.toString(), hero, mode: client.mode, paused: () => pausedRef.current });
      setPhase("ready");
    })().catch((cause: unknown) => {
      if (cancelled) return;
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(/fetch|network|timed out|reach|rpc/i.test(message)
        ? "Robinhood Chain did not answer while reading your Friend's artwork. Check the connection and retry."
        : message);
      setPhase("error");
    });
    return () => { cancelled = true; };
  }, [friendId, client, attempt]);

  return (
    <div className="rh-frame">
      <div ref={host} className="rh-mount" hidden={phase !== "ready"} />
      {phase !== "ready" && (
        <div className="rh-status" role={phase === "error" ? "alert" : "status"}>
          <p className="rh-status-title">RARE <span>HEIST</span> / FRIEND EDITION</p>
          {phase === "error" ? (
            <>
              <p>{error || "The game could not start."}</p>
              <button type="button" onClick={() => setAttempt(value => value + 1)}>RETRY</button>
            </>
          ) : (
            <p>{phase === "session" ? "Opening the game session…" : `Reading Friend #${friendId} from Robinhood Chain…`}</p>
          )}
        </div>
      )}
    </div>
  );
}
