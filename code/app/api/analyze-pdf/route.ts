import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables.' },
        { status: 500 }
      )
    }

    // Parse the multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No PDF file provided' },
        { status: 400 }
      )
    }

    if (!file.type.includes('pdf')) {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      )
    }

    console.log('[API] Processing PDF:', file.name, file.size, 'bytes')

    // Convert file to buffer and base64
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Pdf = buffer.toString('base64')

    // Create a prompt for transaction extraction
    const prompt = `You are a financial statement parser. Analyze this bank statement PDF and extract ALL transactions.

Return a JSON object with this EXACT structure:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD or original format",
      "description": "transaction description",
      "amount": number (positive for income/deposits, negative for expenses/withdrawals),
      "currency": "USD or detected currency"
    }
  ]
}

IMPORTANT RULES:
- Extract EVERY transaction from the statement
- Positive amounts = money IN (deposits, income, credits)
- Negative amounts = money OUT (withdrawals, expenses, debits)
- If amount shows as debit/withdrawal, make it negative
- If amount shows as credit/deposit, make it positive
- Include merchant/payee in description
- Return ONLY valid JSON, no markdown or extra text`

    console.log('[API] Calling OpenAI to extract transactions...')
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a financial data extraction expert. You analyze bank statements and return structured JSON data.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64Pdf}`
                }
              }
            ]
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`)
    }

    const completion = await response.json()
    const responseText = completion.choices[0]?.message?.content
    
    if (!responseText) {
      throw new Error('No response from OpenAI')
    }

    console.log('[API] OpenAI response:', responseText)

    // Parse the JSON response
    const parsed = JSON.parse(responseText)
    const pdfTransactions = parsed.transactions || []

    if (!Array.isArray(pdfTransactions) || pdfTransactions.length === 0) {
      return NextResponse.json(
        { error: 'No transactions found in the PDF. Please make sure it\'s a valid bank statement.' },
        { status: 400 }
      )
    }

    // Map to our internal Transaction format
    const transactions = pdfTransactions.map((tx: any, index: number) => {
      const amount = parseFloat(tx.amount) || 0
      const isOutgoing = amount < 0
      
      return {
        txHash: `pdf-${Date.now()}-${index}`,
        timestamp: normalizeDate(tx.date),
        from: isOutgoing ? 'user' : 'external',
        to: isOutgoing ? 'external' : 'user',
        amount: Math.abs(amount),
        tokenSymbol: tx.currency || 'USD',
        direction: isOutgoing ? 'OUT' : 'IN',
        category: categorizeTransaction(tx.description)
      }
    })

    console.log('[API] Extracted', transactions.length, 'transactions')

    return NextResponse.json(transactions)

  } catch (error: any) {
    console.error('[API] PDF analysis error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to analyze PDF. Please try again or use CSV upload instead.',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

// Helper function to normalize date formats
function normalizeDate(dateStr: string): string {
  try {
    // Try to parse the date
    const date = new Date(dateStr)
    if (!isNaN(date.getTime())) {
      return date.toISOString()
    }
  } catch (err) {
    // If parsing fails, return current date
  }
  return new Date().toISOString()
}

// Helper function to categorize transactions based on description
function categorizeTransaction(description: string): string {
  const desc = description.toLowerCase()
  
  if (desc.includes('grocery') || desc.includes('food') || desc.includes('restaurant') || desc.includes('cafe')) {
    return 'Food'
  }
  if (desc.includes('rent') || desc.includes('mortgage') || desc.includes('housing')) {
    return 'Housing'
  }
  if (desc.includes('uber') || desc.includes('lyft') || desc.includes('gas') || desc.includes('transport') || desc.includes('parking')) {
    return 'Transport'
  }
  if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('subscription') || desc.includes('hbo')) {
    return 'Subscriptions'
  }
  if (desc.includes('salary') || desc.includes('payroll') || desc.includes('deposit')) {
    return 'Income'
  }
  if (desc.includes('utility') || desc.includes('electric') || desc.includes('water') || desc.includes('internet')) {
    return 'Utilities'
  }
  if (desc.includes('amazon') || desc.includes('shopping') || desc.includes('retail')) {
    return 'Shopping'
  }
  
  return 'Other'
}
