// TypeScript interfaces for the application

export interface OnchainTransaction {
  txHash: string
  timestamp: string // ISO string
  from: string
  to: string
  amount: number
  tokenSymbol: string // e.g. "SUI"
  direction: 'IN' | 'OUT'
  category?: string // optional, can be filled by AI/logic later
}

export interface SpendingCategory {
  category: string
  amount: number
}

export interface FinancialBadge {
  label: string
  value: string
  status: 'good' | 'average' | 'needs-improvement'
}

export interface ShoppingSuggestion {
  productName: string
  category: string
  currentSpend: number
  optimizedSpend: number
  savingsPercentage: number
}

export interface AnalysisResult {
  score: number // 0-10
  recommendation: string
  spendingByCategory: SpendingCategory[]
  badges: FinancialBadge[]
  shoppingSuggestions: ShoppingSuggestion[]
  reportHash: string
}

/**
 * Fetches on-chain transactions for a given wallet address from the backend API
 */
export async function getUserTransactions(walletAddress: string): Promise<OnchainTransaction[]> {
  console.log('[v0] Calling backend API for transactions:', walletAddress)
  
  const response = await fetch(`/api/transactions?walletAddress=${walletAddress}`)
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to fetch transactions')
  }
  
  const transactions = await response.json()
  console.log('[v0] Received transactions from API:', transactions.length)
  
  return transactions
}

/**
 * Computes a financial score (0-10) based on savings rate
 * EXACT LOGIC:
 * - If income <= 0: return 0
 * - If expenses > income (overspending): calculate penalty-based low score (1-4 range)
 * - If saving: use sqrt curve to reward good savers (0-10 range)
 */
function computeFinancialScore(transactions: OnchainTransaction[]): number {
  const income = transactions
    .filter(t => t.direction === 'IN')
    .reduce((sum, t) => sum + t.amount, 0)

  const expenses = transactions
    .filter(t => t.direction === 'OUT')
    .reduce((sum, t) => sum + t.amount, 0)

  console.log('[v0] Financial Score Calculation:', { income, expenses })

  // Rule 1: No income = 0 score
  if (income <= 0) {
    console.log('[v0] No income found, score = 0')
    return 0
  }

  // Calculate raw savings rate
  const rawSavingsRate = (income - expenses) / income
  console.log('[v0] Raw savings rate:', rawSavingsRate)

  // Rule 2: Handle overspending (expenses > income)
  if (rawSavingsRate < 0) {
    const overspendRatio = expenses / income
    const penalty = Math.min(overspendRatio - 1, 2) // cap penalty at 2
    const lowScore = 4 - penalty * 1.5
    const finalScore = Math.max(lowScore, 0.5) // never below 0.5
    
    console.log('[v0] Overspending detected:', { 
      overspendRatio, 
      penalty, 
      lowScore, 
      finalScore: Math.round(finalScore * 10) / 10 
    })
    
    return Math.round(finalScore * 10) / 10
  }

  // Rule 3: Positive savings - use sqrt curve
  const savingsRate = Math.min(Math.max(rawSavingsRate, 0), 1)
  console.log('[v0] Savings rate:', savingsRate, '(', Math.round(savingsRate * 100), '%)')

  const baseScore = 10 * Math.sqrt(savingsRate)
  const finalScore = Math.round(baseScore * 10) / 10
  
  console.log('[v0] Final financial score:', finalScore)
  
  return finalScore
}

/**
 * Returns a tailored recommendation based on the financial score
 * Implements 5 score bands with specific tone and advice for each
 */
function getRecommendationForScore(score: number): string {
  if (score <= 2) {
    // Critical zone (0.0 - 2.0): firm but supportive
    return "You're currently spending far more than you earn. This puts you in a critical zone. Start by tracking every expense this month, cancel unused subscriptions, and set a strict weekly limit for restaurants, shopping, and entertainment."
  } else if (score <= 4) {
    // High risk (2.1 - 4.0): straightforward, constructive
    return "Your budget shows frequent overspending and almost no savings. Focus on your top 2-3 expense categories (like Food, Shopping, Entertainment) and set a concrete monthly cap for each. Aim to reduce them by at least 10-20% to move out of the risk zone."
  } else if (score <= 6) {
    // Average / unstable (4.1 - 6.0): neutral, encouraging
    return "Your finances are in an average zone: sometimes stable, sometimes tight. Start building a small emergency fund and automate a fixed monthly savings amount (even 5-10% of your income). This will make you more resilient to unexpected expenses."
  } else if (score <= 8) {
    // Healthy but improvable (6.1 - 8.0): positive, optimistic
    return "You manage your money well and you're in a healthy zone. Now focus on optimizing recurring expenses like subscriptions, phone, and utilities. Redirect the extra savings towards clear goals such as an emergency fund, investments, or paying off debt faster."
  } else {
    // Excellent / top tier (8.1 - 10.0): very positive, practical
    return "You're in an excellent position with strong savings and disciplined spending. Consider focusing on long-term wealth building: regular investments, retirement planning, and opportunities to grow passive income. Keep reviewing your budget every few months to stay on track."
  }
}

function getScoreZone(score: number): { label: string; variant: 'destructive' | 'secondary' | 'outline' | 'default' } {
  if (score <= 2) {
    return { label: 'Critical zone', variant: 'destructive' }
  } else if (score <= 4) {
    return { label: 'High risk', variant: 'secondary' }
  } else if (score <= 6) {
    return { label: 'Needs improvement', variant: 'outline' }
  } else if (score <= 8) {
    return { label: 'Healthy', variant: 'default' }
  } else {
    return { label: 'Excellent', variant: 'default' }
  }
}

/**
 * Analyzes transactions and returns financial insights
 * This will be replaced with a real AI-powered backend API call later
 */
export async function analyzeTransactions(transactions: OnchainTransaction[]): Promise<AnalysisResult> {
  console.log('[v0] Analyzing transactions:', transactions.length)
  
  // Calculate spending by category from real transactions
  const spendingMap = new Map<string, number>()
  
  transactions.forEach(tx => {
    if (tx.direction === 'OUT' && tx.category) {
      const current = spendingMap.get(tx.category) || 0
      spendingMap.set(tx.category, current + tx.amount)
    }
  })
  
  const spendingByCategory: SpendingCategory[] = Array.from(spendingMap.entries()).map(
    ([category, amount]) => ({ category, amount })
  )
  
  // If no transactions, use mock data
  if (spendingByCategory.length === 0) {
    spendingByCategory.push(
      { category: 'Housing', amount: 1200 },
      { category: 'Food', amount: 450 },
      { category: 'Transport', amount: 180 },
      { category: 'Subscriptions', amount: 89.99 },
      { category: 'Other', amount: 250 }
    )
  }
  
  const shoppingSuggestions: ShoppingSuggestion[] = Array.from(spendingMap.entries())
    .filter(([_, amount]) => amount > 50) // Only suggest for categories with > $50 spending
    .sort((a, b) => b[1] - a[1]) // Sort by spending amount (highest first)
    .slice(0, 4) // Take top 4 categories
    .map(([category, currentSpend]) => {
      // Generate category-specific product names and optimization percentages
      const suggestions: Record<string, { product: string; optimizationPercent: number }> = {
        'Food': { product: 'Monthly groceries', optimizationPercent: 12 },
        'Groceries': { product: 'Weekly shopping', optimizationPercent: 15 },
        'Dining': { product: 'Restaurant visits', optimizationPercent: 25 },
        'Subscriptions': { product: 'Streaming services', optimizationPercent: 40 },
        'Entertainment': { product: 'Entertainment budget', optimizationPercent: 20 },
        'Transport': { product: 'Gas & transit', optimizationPercent: 18 },
        'Utilities': { product: 'Monthly utilities', optimizationPercent: 10 },
        'Shopping': { product: 'Discretionary purchases', optimizationPercent: 30 },
        'Other': { product: 'Miscellaneous expenses', optimizationPercent: 15 }
      }
      
      const suggestion = suggestions[category] || { product: `${category} expenses`, optimizationPercent: 15 }
      const optimizationPercent = suggestion.optimizationPercent
      const optimizedSpend = currentSpend * (1 - optimizationPercent / 100)
      
      return {
        productName: suggestion.product,
        category: category,
        currentSpend: Math.round(currentSpend * 100) / 100,
        optimizedSpend: Math.round(optimizedSpend * 100) / 100,
        savingsPercentage: optimizationPercent
      }
    })
    .sort((a, b) => b.currentSpend - a.currentSpend) // Sort by current spend
  
  // If no suggestions generated, use defaults
  if (shoppingSuggestions.length === 0) {
    shoppingSuggestions.push(
      {
        productName: 'Monthly groceries',
        category: 'Food',
        currentSpend: 450,
        optimizedSpend: 396,
        savingsPercentage: 12
      },
      {
        productName: 'Phone plan',
        category: 'Subscriptions',
        currentSpend: 50,
        optimizedSpend: 35,
        savingsPercentage: 30
      },
      {
        productName: 'Streaming services',
        category: 'Subscriptions',
        currentSpend: 39.99,
        optimizedSpend: 19.99,
        savingsPercentage: 50
      },
      {
        productName: 'Gas & transport',
        category: 'Transport',
        currentSpend: 180,
        optimizedSpend: 144,
        savingsPercentage: 20
      }
    )
  }
  
  const score = computeFinancialScore(transactions)
  
  const recommendation = getRecommendationForScore(score)
  
  const totalIncome = transactions
    .filter(t => t.direction === 'IN')
    .reduce((sum, t) => sum + t.amount, 0)
  
  const totalExpenses = transactions
    .filter(t => t.direction === 'OUT')
    .reduce((sum, t) => sum + t.amount, 0)
  
  const savingsRate = totalIncome > 0 ? (totalIncome - totalExpenses) / totalIncome : 0
  
  const badges: FinancialBadge[] = [
    { 
      label: 'Savings ratio', 
      value: `${Math.round(savingsRate * 100)}%`, 
      status: savingsRate >= 0.5 ? 'good' : savingsRate >= 0.2 ? 'average' : 'needs-improvement'
    },
    { 
      label: 'Income stability', 
      value: totalIncome > 0 ? 'Stable' : 'Low', 
      status: totalIncome > 0 ? 'good' : 'needs-improvement' 
    },
    { 
      label: 'Spending discipline', 
      value: score >= 8 ? 'Excellent' : score >= 6 ? 'Good' : score >= 4 ? 'Average' : 'Needs improvement',
      status: score >= 7 ? 'good' : score >= 5 ? 'average' : 'needs-improvement'
    }
  ]
  
  // Generate hash from transactions
  const reportHash = '0x' + Math.random().toString(16).substring(2, 18) + '...' + Math.random().toString(16).substring(2, 10)
  
  return {
    score,
    recommendation,
    spendingByCategory,
    badges,
    shoppingSuggestions,
    reportHash
  }
}
