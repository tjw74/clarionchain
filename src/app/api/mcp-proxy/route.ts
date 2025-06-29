import { NextRequest, NextResponse } from 'next/server'

// Simple HTTP-based MCP client for BRK server
class SimpleMCPClient {
  private baseUrl = 'https://brk.openonchain.dev/mcp'

  async listTools() {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
      })
    })

    if (!response.ok) {
      throw new Error(`MCP request failed: ${response.statusText}`)
    }

    const result = await response.json()
    return result.result || { tools: [] }
  }

  async callTool(name: string, args: Record<string, any> = {}) {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name,
          arguments: args
        }
      })
    })

    if (!response.ok) {
      throw new Error(`MCP tool call failed: ${response.statusText}`)
    }

    const result = await response.json()
    if (result.error) {
      throw new Error(`MCP tool error: ${result.error.message}`)
    }

    return result.result
  }

  async listResources() {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'resources/list',
        params: {}
      })
    })

    if (!response.ok) {
      throw new Error(`MCP request failed: ${response.statusText}`)
    }

    const result = await response.json()
    return result.result || { resources: [] }
  }

  async readResource(uri: string) {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'resources/read',
        params: {
          uri
        }
      })
    })

    if (!response.ok) {
      throw new Error(`MCP request failed: ${response.statusText}`)
    }

    const result = await response.json()
    if (result.error) {
      throw new Error(`MCP resource error: ${result.error.message}`)
    }

    return result.result
  }
}

// Singleton MCP client
const mcpClient = new SimpleMCPClient()

export async function GET(request: NextRequest) {
  try {
    // List available tools and resources from BRK MCP server
    const [toolsResult, resourcesResult] = await Promise.all([
      mcpClient.listTools().catch(err => ({ tools: [], error: err.message })),
      mcpClient.listResources().catch(err => ({ resources: [], error: err.message }))
    ])

    return NextResponse.json({
      tools: toolsResult.tools || [],
      resources: resourcesResult.resources || [],
      status: 'connected',
      errors: [
        ...(toolsResult.error ? [`Tools: ${toolsResult.error}`] : []),
        ...(resourcesResult.error ? [`Resources: ${resourcesResult.error}`] : [])
      ]
    })

  } catch (error) {
    console.error('MCP GET error:', error)
    return NextResponse.json(
      { error: 'Failed to connect to BRK MCP server', details: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, toolName, arguments: toolArgs, resourceUri, prompt, apiKey, provider } = await request.json()

    let mcpResult: any = null

    // Handle different MCP actions
    switch (action) {
      case 'call_tool':
        if (!toolName) {
          return NextResponse.json(
            { error: 'Tool name is required for call_tool action' },
            { status: 400 }
          )
        }
        mcpResult = await mcpClient.callTool(toolName, toolArgs || {})
        break

      case 'read_resource':
        if (!resourceUri) {
          return NextResponse.json(
            { error: 'Resource URI is required for read_resource action' },
            { status: 400 }
          )
        }
        mcpResult = await mcpClient.readResource(resourceUri)
        break

      case 'ai_analyze_with_mcp':
        // Enhanced AI analysis using MCP data
        if (!prompt || !apiKey) {
          return NextResponse.json(
            { error: 'Prompt and API key are required for AI analysis' },
            { status: 400 }
          )
        }

        // First, gather relevant data using MCP tools
        const contextData = await gatherContextData(toolArgs)
        
        // Then send to LLM with enriched context
        const analysis = await callLLMWithMCPContext(prompt, contextData, apiKey, provider || 'openai')
        
        return NextResponse.json({
          analysis,
          contextData,
          provider: provider || 'openai'
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: call_tool, read_resource, ai_analyze_with_mcp' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      result: mcpResult,
      status: 'success'
    })

  } catch (error) {
    console.error('MCP POST error:', error)
    return NextResponse.json(
      { error: `MCP operation failed: ${(error as Error).message}` },
      { status: 500 }
    )
  }
}

async function gatherContextData(args: any = {}) {
  try {
    // Define what Bitcoin data to gather based on the request
    const dataQueries = [
      { tool: 'get_mvrv_data', args: { days: args.days || 365 } },
      { tool: 'get_price_metrics', args: { period: args.period || '1y' } },
      { tool: 'calculate_zscore', args: { metric: args.metric || 'mvrv', period: args.period || '1y' } },
      { tool: 'get_statistical_summary', args: { metric: args.metric || 'mvrv' } }
    ]

    const contextData: Record<string, any> = {}
    
    // Try each tool, but don't fail if some don't exist
    for (const query of dataQueries) {
      try {
        const result = await mcpClient.callTool(query.tool, query.args)
        contextData[query.tool] = result
      } catch (err) {
        console.log(`Tool ${query.tool} not available or failed:`, (err as Error).message)
        // Continue with other tools
      }
    }

    return contextData

  } catch (error) {
    console.error('Error gathering MCP context data:', error)
    return {}
  }
}

async function callLLMWithMCPContext(prompt: string, contextData: Record<string, any>, apiKey: string, provider: string) {
  // Format the context data for the LLM
  const contextString = Object.entries(contextData)
    .filter(([_, value]) => value !== null && value !== undefined)
    .map(([key, value]) => `${key}: ${JSON.stringify(value, null, 2)}`)
    .join('\n\n')

  const enhancedPrompt = `
ROLE: Bitcoin on-chain data analyst with access to real-time MCP data tools.

CONTEXT: You have access to the following Bitcoin on-chain data from the BRK MCP server:

${contextString}

USER QUESTION: ${prompt}

INSTRUCTIONS:
1. Use the provided MCP data to answer the user's question with specific numbers and calculations
2. If asking about z-scores, percentiles, or statistical analysis, use the actual data provided
3. For questions about time spent in ranges (e.g., "how much time between 1-2 standard deviations"), calculate percentages from the data
4. Provide specific numerical answers, not general statements
5. If the data doesn't contain what's needed, suggest what additional MCP tools could help

Please provide a detailed analysis based on the actual data provided above.
`

  if (provider === 'anthropic') {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const anthropic = new Anthropic({ apiKey })

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: enhancedPrompt
        }
      ]
    })

    return response.content[0]?.type === 'text' ? response.content[0].text : 'No response generated'

  } else {
    const OpenAI = (await import('openai')).default
    const openai = new OpenAI({ apiKey })

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: enhancedPrompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.3
    })

    return response.choices[0]?.message?.content || 'No response generated'
  }
} 