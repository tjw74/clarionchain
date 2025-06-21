import { NextRequest, NextResponse } from 'next/server'
import { getPublicKey, nip19, SimplePool, Event, getEventHash, signEvent } from 'nostr-tools'

// A simple, public relay for the app to publish to.
const APP_RELAY = 'wss://relay.damus.io'

const RELAYS = ['wss://relay.damus.io', 'wss://relay.primal.net', 'wss://nos.lol']

// This function uploads an image to nostr.build and returns the URL.
async function uploadImage(imageDataUrl: string): Promise<string> {
  const blob = await (await fetch(imageDataUrl)).blob()
  const formData = new FormData()
  formData.append('file', blob, 'chart.png')

  const response = await fetch('https://nostr.build/api/v2/upload/files', {
    method: 'POST',
    body: formData,
  })

  const json = await response.json()
  if (json.status !== 'success' || !json.data || !json.data[0]) {
    throw new Error('Failed to upload image to nostr.build')
  }

  return json.data[0].url
}

export async function POST(req: NextRequest) {
  const { imageDataUrl, userNpub } = await req.json()

  const appNostrPrivateKeyHex = process.env.NOSTR_PRIVATE_KEY
  if (!appNostrPrivateKeyHex) {
    console.error('NOSTR_PRIVATE_KEY environment variable not set.')
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 })
  }

  try {
    const imageUrl = await uploadImage(imageDataUrl)

    // Decode user's npub to a hex public key
    const { data: userPublicKeyHex } = nip19.decode(userNpub)

    // Private key must be a Uint8Array for signing
    const privateKeyBytes = new Uint8Array(Buffer.from(appNostrPrivateKeyHex, 'hex'))
    const appPublicKeyHex = getPublicKey(privateKeyBytes)

    const unsignedEvent: Omit<Event, 'id' | 'sig'> = {
      kind: 1,
      pubkey: appPublicKeyHex,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['p', userPublicKeyHex as string]],
      content: `Check out this Bitcoin metric analysis from ClarionChain!\n\n${imageUrl}`,
    }
    
    // Manually create the signed event using fundamental functions
    const id = getEventHash(unsignedEvent)
    const sig = signEvent(unsignedEvent, privateKeyBytes)

    const signedEvent: Event = {
      ...unsignedEvent,
      id,
      sig,
    }
    
    // Use SimplePool to publish the event
    const pool = new SimplePool()
    await pool.publish(RELAYS, signedEvent)
    pool.close(RELAYS)

    return NextResponse.json({ success: true, eventId: signedEvent.id })
  } catch (error) {
    console.error('Error creating Nostr event:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return NextResponse.json({ error: `Failed to share to Nostr: ${errorMessage}` }, { status: 500 })
  }
} 