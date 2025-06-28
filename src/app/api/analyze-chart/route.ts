import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: NextRequest) {
  try {
    const { imageData, apiKey, prompt, provider = 'openai' } = await request.json()

    if (!imageData || !apiKey) {
      return NextResponse.json(
        { error: 'Missing required fields: imageData and apiKey' },
        { status: 400 }
      )
    }

    // Default prompt if none provided
    const analysisPrompt = prompt || `
      You are an advanced Bitcoin on-chain analysis expert with deep knowledge and experience in utilizing on-chain metrics and market data to provide actionable insights to investors and traders.
      
      Analyze this Bitcoin on-chain chart and provide insights on:
      1. Current price trends and patterns
      2. Key support and resistance levels
      3. Market sentiment indicators (MVRV, Z-Score if visible)
      4. Potential trading opportunities or risks
      5. Overall market outlook based on the data shown
      
      Please provide a clear, actionable analysis in 2-3 paragraphs.
    `

    let analysis: string | null = null

    if (provider === 'anthropic') {
      // Initialize Anthropic client
      const anthropic = new Anthropic({
        apiKey: apiKey,
      })

      // Convert base64 data URL to just the base64 data
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '')

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: analysisPrompt
              },
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/png",
                  data: base64Data
                }
              }
            ]
          }
        ]
      })

      analysis = response.content[0]?.type === 'text' ? response.content[0].text : null

    } else {
      // Initialize OpenAI client
      const openai = new OpenAI({
        apiKey: apiKey,
      })

      // Send image to OpenAI GPT-4o Vision
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: analysisPrompt
              },
              {
                type: "image_url",
                image_url: {
                  url: imageData, // Base64 data URL
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })

      analysis = response.choices[0]?.message?.content
    }

    if (!analysis) {
      return NextResponse.json(
        { error: `No analysis received from ${provider === 'anthropic' ? 'Anthropic' : 'OpenAI'}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      analysis,
      provider
    })

  } catch (error: unknown) {
    console.error('Chart analysis error:', error)
    
    // Handle specific API errors
    const err = error as { status?: number; message?: string; code?: string }
    
    if (err.status === 401 || err.code === 'invalid_api_key') {
      return NextResponse.json(
        { error: 'Invalid API key. Please check your API key and try again.' },
        { status: 401 }
      )
    }
    
    if (err.status === 429 || err.code === 'rate_limit_exceeded') {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    // Handle Anthropic specific errors
    if (err.message?.includes('anthropic') || err.message?.includes('claude')) {
      return NextResponse.json(
        { error: 'Anthropic API error. Please check your API key and try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to analyze chart. Please try again.' },
      { status: 500 }
    )
  }
} 