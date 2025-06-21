import { Event } from 'nostr-tools'

declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>
      signEvent(event: Omit<Event, 'id' | 'sig'>): Promise<Event>
    }
  }
} 