'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Upload, TrendingUp, TrendingDown, ExternalLink, Loader2, Sparkles, Shield, Zap, LogOut, User, ChevronDown } from 'lucide-react'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { SpendingChart } from '@/components/spending-chart'
import { SmartShoppingTable } from '@/components/smart-shopping-table'
import { getUserTransactions, analyzeTransactions, type AnalysisResult, type OnchainTransaction } from '@/lib/api-mocks'

export default function DashboardPage() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [manualWalletAddress, setManualWalletAddress] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [isMinting, setIsMinting] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [rawTransactions, setRawTransactions] = useState<OnchainTransaction[]>([])
  const [mintResult, setMintResult] = useState<{ explorerUrl: string; nftObjectId: string } | null>(null)
  const [error, setError] = useState<string>('')
  const [isTransactionsOpen, setIsTransactionsOpen] = useState(false)

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated')
    if (!isAuthenticated) {
      router.push('/login')
    } else {
      setUserEmail(localStorage.getItem('userEmail') || '')
      setUserName(localStorage.getItem('userName') || '')
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('userName')
    router.push('/')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      setError('')
    }
  }

  const parseCSV = async (file: File): Promise<OnchainTransaction[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          const lines = text.split('\n').filter(line => line.trim())
          
          const dataLines = lines.slice(1)
          
          const transactions: OnchainTransaction[] = dataLines.map((line, index) => {
            const [date, description, amount, category] = line.split(',').map(v => v.trim())
            
            const parsedAmount = parseFloat(amount)
            const isOutgoing = parsedAmount < 0
            
            return {
              txHash: `csv-${Date.now()}-${index}`,
              timestamp: date || new Date().toISOString(),
              from: isOutgoing ? 'user' : 'external',
              to: isOutgoing ? 'external' : 'user',
              amount: Math.abs(parsedAmount),
              tokenSymbol: 'USD',
              direction: isOutgoing ? 'OUT' : 'IN',
              category: category || 'Other'
            }
          }).filter(tx => !isNaN(tx.amount))
          
          resolve(transactions)
        } catch (err) {
          reject(new Error('Failed to parse CSV file. Please check the format.'))
        }
      }
      
      reader.onerror = () => reject(new Error('Failed to read CSV file'))
      reader.readAsText(file)
    })
  }

  const handleAnalyzeCSV = async () => {
    if (!selectedFile) {
      setError('Please select a CSV file first')
      return
    }

    setIsAnalyzing(true)
    setError('')

    try {
      const transactions = await parseCSV(selectedFile)
      setRawTransactions(transactions)
      
      const result = await analyzeTransactions(transactions)
      setAnalysisResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze CSV. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleFetchTransactions = async () => {
    const walletAddress = manualWalletAddress
    
    if (!walletAddress) {
      setError('Please enter a wallet address')
      return
    }

    setIsFetching(true)
    setError('')

    try {
      const transactions = await getUserTransactions(walletAddress)
      setRawTransactions(transactions)
      
      const result = await analyzeTransactions(transactions)
      setAnalysisResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions. Please try again.')
    } finally {
      setIsFetching(false)
    }
  }

  const handleMintReport = async () => {
    if (!analysisResult) return

    setIsMinting(true)
    setError('')
    
    try {
      const response = await fetch('/api/mint-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: analysisResult.score,
          hash: analysisResult.reportHash
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to mint NFT')
      }

      const data = await response.json()
      setMintResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mint report. Please try again.')
    } finally {
      setIsMinting(false)
    }
  }

  const displayTransactions = isTransactionsOpen ? rawTransactions : rawTransactions.slice(0, 3)
  const hasMoreTransactions = rawTransactions.length > 3

  return (
    <div className="min-h-screen bg-background">
      {/* Dashboard Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">AICashflow</span>
            </Link>
            
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{userEmail || userName}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 md:py-12 space-y-8 md:space-y-12">
        {/* Welcome Section */}
        <div className="animate-fade-in">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Welcome back{userName ? `, ${userName}` : ''}
            </h1>
            <p className="text-lg text-muted-foreground">
              Upload your transactions or connect your wallet to get AI-powered financial insights
            </p>
          </div>
        </div>

        {/* Upload Section */}
        <div className="animate-fade-in">
          <Card className="gradient-card border-border/50 shadow-xl">
            <CardHeader className="space-y-3 pb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-2xl">Analyze Your Finances</CardTitle>
              </div>
              <CardDescription className="text-base leading-relaxed">
                Upload your transaction CSV or connect your Sui wallet for intelligent analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="csv" className="w-full">
                <TabsList className="grid w-full grid-cols-2 p-1 bg-muted/50">
                  <TabsTrigger value="csv" className="data-[state=active]:bg-card data-[state=active]:shadow-sm">
                    Upload CSV
                  </TabsTrigger>
                  <TabsTrigger value="wallet" className="data-[state=active]:bg-card data-[state=active]:shadow-sm">
                    Connect Wallet
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="csv" className="space-y-5 mt-6">
                  <div className="space-y-3">
                    <label htmlFor="csv-upload" className="text-sm font-semibold text-foreground">
                      Transaction CSV File
                    </label>
                    <div className="flex gap-3">
                      <Input
                        id="csv-upload"
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="flex-1 h-11 bg-background"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Upload a CSV with columns: date, description, amount, category
                    </p>
                  </div>
                  
                  <Button 
                    onClick={handleAnalyzeCSV} 
                    disabled={!selectedFile || isAnalyzing}
                    className="gap-2 h-11 px-6 gradient-primary hover:opacity-90 transition-opacity"
                    size="lg"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing with AI...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4" />
                        Analyze CSV
                      </>
                    )}
                  </Button>
                </TabsContent>
                
                <TabsContent value="wallet" className="space-y-5 mt-6">
                  <div className="space-y-3">
                    <label htmlFor="wallet-address" className="text-sm font-semibold text-foreground">
                      Sui Wallet Address
                    </label>
                    <Input
                      id="wallet-address"
                      type="text"
                      placeholder="0x..."
                      value={manualWalletAddress}
                      onChange={(e) => setManualWalletAddress(e.target.value)}
                      className="h-11 bg-background font-mono"
                    />
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      We'll fetch real on-chain transactions from Sui testnet for analysis
                    </p>
                  </div>
                  
                  <Button 
                    onClick={handleFetchTransactions} 
                    disabled={!manualWalletAddress || isFetching}
                    className="gap-2 h-11 px-6 gradient-primary hover:opacity-90 transition-opacity"
                    size="lg"
                  >
                    {isFetching ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Fetching from Sui...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Fetch Transactions
                      </>
                    )}
                  </Button>
                </TabsContent>
              </Tabs>

              {error && (
                <div className="mt-5 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm leading-relaxed">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Transactions Display */}
        {rawTransactions.length > 0 && (
          <div className="animate-slide-up">
            <Card className="border-border/50 shadow-lg">
              <CardHeader className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <TrendingUp className="h-5 w-5 text-accent" />
                  </div>
                  <CardTitle className="text-xl">Your Transactions</CardTitle>
                </div>
                <CardDescription className="text-base">
                  Fetched {rawTransactions.length} transaction{rawTransactions.length !== 1 ? 's' : ''} for analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                {hasMoreTransactions ? (
                  <Collapsible open={isTransactionsOpen} onOpenChange={setIsTransactionsOpen} className="space-y-3">
                    <div className="space-y-3">
                      {displayTransactions.map((tx) => (
                        <div key={tx.txHash} className="p-5 rounded-xl border border-border/50 bg-card hover:shadow-md transition-shadow space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge 
                                variant={tx.direction === 'OUT' ? 'destructive' : 'default'}
                                className="px-3 py-1"
                              >
                                {tx.direction === 'OUT' ? 'Sent' : 'Received'}
                              </Badge>
                              <span className="text-sm font-medium text-muted-foreground">{tx.category}</span>
                            </div>
                            <span className="text-xl font-bold text-foreground">
                              {tx.direction === 'OUT' ? '-' : '+'}{tx.amount.toFixed(4)} {tx.tokenSymbol}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-2 pt-2 border-t border-border/50">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">Date:</span>
                              <span className="font-mono">{new Date(tx.timestamp).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">Tx Hash:</span>
                              <a 
                                href={`https://suiscan.xyz/testnet/tx/${tx.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono hover:text-primary transition-colors flex items-center gap-1.5"
                              >
                                {tx.txHash.substring(0, 8)}...{tx.txHash.substring(tx.txHash.length - 6)}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <CollapsibleContent className="space-y-3">
                      {rawTransactions.slice(3).map((tx) => (
                        <div key={tx.txHash} className="p-5 rounded-xl border border-border/50 bg-card hover:shadow-md transition-shadow space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge 
                                variant={tx.direction === 'OUT' ? 'destructive' : 'default'}
                                className="px-3 py-1"
                              >
                                {tx.direction === 'OUT' ? 'Sent' : 'Received'}
                              </Badge>
                              <span className="text-sm font-medium text-muted-foreground">{tx.category}</span>
                            </div>
                            <span className="text-xl font-bold text-foreground">
                              {tx.direction === 'OUT' ? '-' : '+'}{tx.amount.toFixed(4)} {tx.tokenSymbol}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-2 pt-2 border-t border-border/50">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">Date:</span>
                              <span className="font-mono">{new Date(tx.timestamp).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">Tx Hash:</span>
                              <a 
                                href={`https://suiscan.xyz/testnet/tx/${tx.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono hover:text-primary transition-colors flex items-center gap-1.5"
                              >
                                {tx.txHash.substring(0, 8)}...{tx.txHash.substring(tx.txHash.length - 6)}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </CollapsibleContent>

                    <CollapsibleTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full gap-2 mt-2"
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform ${isTransactionsOpen ? 'rotate-180' : ''}`} />
                        {isTransactionsOpen ? 'Show Less' : `Show More (${rawTransactions.length - 3} more)`}
                      </Button>
                    </CollapsibleTrigger>
                  </Collapsible>
                ) : (
                  <div className="space-y-3">
                    {rawTransactions.map((tx) => (
                      <div key={tx.txHash} className="p-5 rounded-xl border border-border/50 bg-card hover:shadow-md transition-shadow space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge 
                              variant={tx.direction === 'OUT' ? 'destructive' : 'default'}
                              className="px-3 py-1"
                            >
                              {tx.direction === 'OUT' ? 'Sent' : 'Received'}
                            </Badge>
                            <span className="text-sm font-medium text-muted-foreground">{tx.category}</span>
                          </div>
                          <span className="text-xl font-bold text-foreground">
                            {tx.direction === 'OUT' ? '-' : '+'}{tx.amount.toFixed(4)} {tx.tokenSymbol}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-2 pt-2 border-t border-border/50">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Date:</span>
                            <span className="font-mono">{new Date(tx.timestamp).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">Tx Hash:</span>
                            <a 
                              href={`https://suiscan.xyz/testnet/tx/${tx.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono hover:text-primary transition-colors flex items-center gap-1.5"
                            >
                              {tx.txHash.substring(0, 8)}...{tx.txHash.substring(tx.txHash.length - 6)}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Analysis Results */}
        {analysisResult && (
          <>
            <div className="grid md:grid-cols-2 gap-6 md:gap-8 animate-slide-up">
              <Card className="border-border/50 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="space-y-3">
                  <CardTitle className="text-xl">Spending by Category</CardTitle>
                  <CardDescription className="text-base">Your transaction breakdown</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <SpendingChart data={analysisResult.spendingByCategory} />
                  
                  <div className="space-y-3 pt-4 border-t border-border">
                    {analysisResult.spendingByCategory.map((item) => (
                      <div key={item.category} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <span className="font-medium text-foreground">{item.category}</span>
                        <span className="font-bold text-foreground text-lg">${item.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="gradient-card border-border/50 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-xl">Financial Score</CardTitle>
                  </div>
                  <CardDescription className="text-base">AI-powered financial health analysis</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="text-center space-y-4 py-4">
                    <div className="relative inline-block">
                      <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
                      <div className="relative text-7xl md:text-8xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
                        {analysisResult.score.toFixed(1)}
                        <span className="text-4xl text-muted-foreground">/10</span>
                      </div>
                    </div>
                    <p className="text-base text-foreground/80 leading-relaxed text-balance max-w-md mx-auto">
                      {analysisResult.recommendation}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-center pt-6 border-t border-border">
                    {analysisResult.badges.map((badge) => (
                      <Badge 
                        key={badge.label} 
                        variant={badge.status === 'good' ? 'default' : badge.status === 'average' ? 'secondary' : 'outline'}
                        className="gap-1.5 px-3 py-1.5 text-xs"
                      >
                        {badge.status === 'good' && <TrendingUp className="h-3.5 w-3.5" />}
                        {badge.status === 'needs-improvement' && <TrendingDown className="h-3.5 w-3.5" />}
                        {badge.label}: {badge.value}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border/50 shadow-lg animate-slide-up">
              <CardHeader className="space-y-3">
                <CardTitle className="text-xl">Smart Shopping Suggestions</CardTitle>
                <CardDescription className="text-base">
                  Based on your recurring expenses, here are some smart shopping suggestions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SmartShoppingTable suggestions={analysisResult.shoppingSuggestions} />
              </CardContent>
            </Card>

            <Card className="gradient-card border-border/50 shadow-lg animate-slide-up">
              <CardHeader className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Save Report on Sui Blockchain</CardTitle>
                </div>
                <CardDescription className="text-base">
                  Mint an on-chain proof of your financial score. We only store the hash and score, not your raw data.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6 p-6 rounded-xl bg-muted/50 border border-border">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Score</p>
                    <p className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      {analysisResult.score.toFixed(1)}/10
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Report Hash</p>
                    <p className="text-sm font-mono text-foreground break-all leading-relaxed">
                      {analysisResult.reportHash}
                    </p>
                  </div>
                </div>

                {!mintResult ? (
                  <Button 
                    onClick={handleMintReport} 
                    disabled={isMinting}
                    className="w-full gap-2 h-12 gradient-primary hover:opacity-90 transition-opacity text-base"
                    size="lg"
                  >
                    {isMinting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Minting NFT on Sui...
                      </>
                    ) : (
                      <>
                        <Shield className="h-5 w-5" />
                        Mint Report NFT on Sui
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-primary text-base font-semibold text-center">
                      NFT minted successfully!
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                        <span className="font-medium text-muted-foreground">Object ID:</span>
                        <span className="font-mono text-xs">{mintResult.nftObjectId.substring(0, 20)}...</span>
                      </div>
                    </div>
                    <a
                      href={mintResult.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 text-base text-primary hover:underline font-medium"
                    >
                      View on Sui Explorer
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
