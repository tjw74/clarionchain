import { NextRequest, NextResponse } from 'next/server'
import { nip19, SimplePool, Event, finalizeEvent } from 'nostr-tools'

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
    const decoded = nip19.decode(userNpub)
    // @ts-ignore
    if (decoded.type !== 'npub') {
      throw new Error('A valid Nostr npub for the user was not provided.')
    }
    const userPublicKeyHex = decoded.data as any

    // Private key must be a Uint8Array for signing
    const privateKeyBytes = new Uint8Array(Buffer.from(appNostrPrivateKeyHex, 'hex'))

    const eventTemplate = {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['p', userPublicKeyHex]],
      content: `Check out this Bitcoin metric analysis from ClarionChain!\n\n${imageUrl}`,
    }

    const signedEvent: Event = finalizeEvent(eventTemplate, privateKeyBytes)

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