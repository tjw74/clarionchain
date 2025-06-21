"use client"

import { useState } from 'react'
import { SimplePool, Event } from 'nostr-tools'

const RELAYS = ['wss://relay.damus.io', 'wss://relay.primal.net', 'wss://nos.lol']

export function useNostr() {
  const [isPublishing, setIsPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const publish = async (noteContent: string): Promise<string | undefined> => {
    if (!window.nostr) {
      setError("Nostr extension (NIP-07) not found.")
      return
    }

    setIsPublishing(true)
    setError(null)

    try {
      const unsignedEvent: Omit<Event, 'id' | 'sig'> = {
        kind: 1,
        content: noteContent,
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: await window.nostr.getPublicKey(),
      }

      const signedEvent = await window.nostr.signEvent(unsignedEvent)

      const pool = new SimplePool()
      await pool.publish(RELAYS, signedEvent)
      pool.close(RELAYS)

      return signedEvent.id
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "An unknown error occurred during publishing.")
    } finally {
      setIsPublishing(false)
    }
  }

  return { publish, isPublishing, error }
} 