"use client"

import { useState } from 'react'
import { Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import html2canvas from 'html2canvas'

interface ShareButtonProps {
  chartId: string
  userNpub: string | null
}

export default function ShareButton({ chartId, userNpub }: ShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false)

  const handleShare = async () => {
    if (!userNpub) {
      alert('Please log in to share.')
      return
    }

    setIsSharing(true)
    try {
      const chartElement = document.getElementById(chartId)
      if (!chartElement) {
        throw new Error('Chart element not found')
      }

      const canvas = await html2canvas(chartElement, {
        foreignObjectRendering: false,
        backgroundColor: '#000',
        logging: true,
      })
      const imageDataUrl = canvas.toDataURL('image/png')

      const response = await fetch('/api/share/nostr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageDataUrl, userNpub }),
      })

      const result = await response.json()

      if (response.ok) {
        alert(`Successfully shared with eventId: ${result.eventId}`)
      } else {
        throw new Error(result.error || 'Failed to share')
      }
    } catch (error) {
      console.error('Sharing error:', error)
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
      alert(`Error sharing: ${errorMessage}`)
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <Button onClick={handleShare} disabled={isSharing} size="sm" variant="ghost">
      <Share2 className="h-4 w-4" />
      <span className="sr-only">Share</span>
    </Button>
  )
} 