import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    const { imageData, apiKey, prompt } = await request.json()

    if (!imageData || !apiKey) {
      return NextResponse.json(
        { error: 'Missing required fields: imageData and apiKey' },
        { status: 400 }
      )
    }

    // Initialize OpenAI client with user's API key
    const openai = new OpenAI({
      apiKey: apiKey,
    })

    // Default prompt if none provided
    const analysisPrompt = prompt || `
      Analyze this Bitcoin on-chain chart and provide insights on:
      1. Current price trends and patterns
      2. Key support and resistance levels
      3. Market sentiment indicators (MVRV, Z-Score if visible)
      4. Potential trading opportunities or risks
      5. Overall market outlook based on the data shown
      
      Please provide a clear, actionable analysis in 2-3 paragraphs.
    `

    // Send image to OpenAI GPT-4.1 Vision
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Using gpt-4o as it has vision capabilities
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

    const analysis = response.choices[0]?.message?.content

    if (!analysis) {
      return NextResponse.json(
        { error: 'No analysis received from OpenAI' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      analysis,
      usage: response.usage
    })

  } catch (error: unknown) {
    console.error('Chart analysis error:', error)
    
    // Handle specific OpenAI errors
    const err = error as { status?: number }
    if (err.status === 401) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      )
    }
    
    if (err.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to analyze chart. Please try again.' },
      { status: 500 }
    )
  }
} 