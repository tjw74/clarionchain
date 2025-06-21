"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { SimplePool, Event } from 'nostr-tools'

interface NostrProfile {
  name?: string
  picture?: string
  about?: string
  banner?: string
}

interface UserContextType {
  pubkey: string | null
  profile: NostrProfile | null
  login: () => Promise<void>
  logout: () => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

const RELAYS = ['wss://relay.damus.io', 'wss://relay.primal.net', 'wss://nos.lol']

export function UserProvider({ children }: { children: ReactNode }) {
  const [pubkey, setPubkey] = useState<string | null>(null)
  const [profile, setProfile] = useState<NostrProfile | null>(null)

  useEffect(() => {
    // Check if user is already "logged in" from a previous session
    const storedPubkey = localStorage.getItem('nostr-pubkey')
    if (storedPubkey) {
      setPubkey(storedPubkey)
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
      if (profileEvent) {
        setProfile(JSON.parse(profileEvent.content))
      }
    } catch (error) {
      console.error("Failed to fetch Nostr profile:", error)
    } finally {
      pool.close(RELAYS)
    }
  }

  const login = async () => {
    if (window.nostr) {
      try {
        const userPubkey = await window.nostr.getPublicKey()
        setPubkey(userPubkey)
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
    setPubkey(null)
    setProfile(null)
    localStorage.removeItem('nostr-pubkey')
  }

  const value = { pubkey, profile, login, logout }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
} 