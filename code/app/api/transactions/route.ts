import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'
import { NextRequest, NextResponse } from 'next/server'

const MIST_PER_SUI = 1_000_000_000

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const walletAddress = searchParams.get('walletAddress')

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'walletAddress query parameter is required' },
        { status: 400 }
      )
    }

    console.log('[v0] Fetching transactions for wallet:', walletAddress)

    // Create Sui client for testnet
    const client = new SuiClient({ url: getFullnodeUrl('testnet') })

    // Fetch transactions from the wallet
    const transactions = await client.queryTransactionBlocks({
      filter: {
        FromAddress: walletAddress,
      },
      options: {
        showInput: true,
        showEffects: true,
        showBalanceChanges: true,
      },
      limit: 50,
    })

    console.log('[v0] Found transactions:', transactions.data.length)

    // Transform Sui transactions to our OnchainTransaction format
    const formattedTransactions = transactions.data.map((tx) => {
      // Get balance changes to determine amount and direction
      const balanceChanges = tx.balanceChanges || []
      const suiBalanceChange = balanceChanges.find(
        (change) => change.coinType === '0x2::sui::SUI'
      )

      const amount = suiBalanceChange
        ? Math.abs(parseInt(suiBalanceChange.amount)) / MIST_PER_SUI
        : 0

      const direction = suiBalanceChange && parseInt(suiBalanceChange.amount) < 0 ? 'OUT' : 'IN'

      // Categorize based on amount (simple heuristic)
      let category = 'Other'
      if (direction === 'OUT') {
        if (amount > 100) category = 'Housing'
        else if (amount > 50) category = 'Food'
        else if (amount > 20) category = 'Transport'
        else if (amount > 10) category = 'Subscriptions'
      } else {
        category = 'Income'
      }

      return {
        txHash: tx.digest,
        timestamp: new Date(parseInt(tx.timestampMs || '0')).toISOString(),
        from: tx.transaction?.data.sender || walletAddress,
        to: balanceChanges[0]?.owner?.AddressOwner || 'unknown',
        amount,
        tokenSymbol: 'SUI',
        direction,
        category,
      }
    })

    console.log('[v0] Formatted transactions:', formattedTransactions.length)

    return NextResponse.json(formattedTransactions)
  } catch (error) {
    console.error('[v0] Error fetching transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions from Sui network', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
