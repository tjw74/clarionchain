"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { SimplePool, Event } from 'nostr-tools'

interface NostrProfile {
  name?: string
  picture?: string
  about?: string
  banner?: string
}

interface User {
  pubkey: string;
  profile: NostrProfile | null;
}

interface UserContextType {
  user: User | null;
  login: () => Promise<void>;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined)

const RELAYS = ['wss://relay.damus.io', 'wss://relay.primal.net', 'wss://nos.lol']

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check if user is already "logged in" from a previous session
    const storedPubkey = localStorage.getItem('nostr-pubkey')
    if (storedPubkey) {
      fetchProfile(storedPubkey)
    }
  }, [])

  const fetchProfile = async (pk: string) => {
    const pool = new SimplePool()
    try {
      const profileEvent = await pool.get(RELAYS, {
        authors: [pk],
        kinds: [0],
        limit: 1,
      })
      
      const userProfile = profileEvent ? JSON.parse(profileEvent.content) : null
      setUser({ pubkey: pk, profile: userProfile });
      
    } catch (error) {
      console.error("Failed to fetch Nostr profile:", error)
      // Set user even if profile fails to fetch
      setUser({ pubkey: pk, profile: null });
    } finally {
      pool.close(RELAYS)
    }
  }

  const login = async () => {
    if (window.nostr) {
      try {
        const userPubkey = await window.nostr.getPublicKey()
        localStorage.setItem('nostr-pubkey', userPubkey)
        await fetchProfile(userPubkey)
      } catch (error) {
        console.error("Failed to login with Nostr:", error)
        alert("Failed to login. Make sure you have a NIP-07 compatible extension (like Alby) and have granted permissions.")
      }
    } else {
      alert("Nostr extension (NIP-07) not found. Please install Alby or another compatible extension.")
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('nostr-pubkey')
  }

  const value = { user, login, logout }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
} 