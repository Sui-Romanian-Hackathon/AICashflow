'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Upload, TrendingUp, TrendingDown, ExternalLink, Loader2, Sparkles, Shield, Zap, FileText, Wallet, Lock, CheckCircle, ArrowRight, ChevronDown } from 'lucide-react'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { SpendingChart } from '@/components/spending-chart'
import { SmartShoppingTable } from '@/components/smart-shopping-table'
import { getUserTransactions, analyzeTransactions, type AnalysisResult, type OnchainTransaction } from '@/lib/api-mocks'

export default function AICashflowPage() {
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
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">AICashflow</span>
            </div>
            <nav className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" className="h-9">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="h-9 gap-2 gradient-primary hover:opacity-90 transition-opacity">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Hero Section */}
        <section className="py-12 sm:py-16 md:py-20 lg:py-24 text-center space-y-6 sm:space-y-8 animate-fade-in">
          <div className="space-y-3 sm:space-y-4 max-w-3xl mx-auto px-4">
            <Badge className="px-3 sm:px-4 py-1.5 gap-1.5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10 justify-center text-xs sm:text-sm">
              <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              AI-Powered Financial Intelligence
            </Badge>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance">
              Understand Your Finances with{' '}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                AI Analysis
              </span>
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground text-balance max-w-2xl mx-auto leading-relaxed">
              Upload your transactions or connect your Sui wallet to get instant AI-powered insights about your spending habits and financial health.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-4">
            <Link href="/signup">
              <Button size="lg" className="h-10 sm:h-11 md:h-12 px-6 sm:px-8 gap-2 gradient-primary hover:opacity-90 transition-opacity text-sm sm:text-base w-full sm:w-auto">
                Start Free Analysis
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="h-10 sm:h-11 md:h-12 px-6 sm:px-8 text-sm sm:text-base w-full sm:w-auto">
                Sign In
              </Button>
            </Link>
          </div>

          <div className="pt-6 sm:pt-8">
            <div className="relative rounded-xl sm:rounded-2xl border border-border/50 shadow-lg sm:shadow-2xl overflow-hidden bg-card max-w-4xl mx-auto mx-3 sm:mx-auto">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10"></div>
              <div className="relative p-6 sm:p-8 md:p-12">
                <div className="grid sm:grid-cols-3 gap-4 sm:gap-6 text-center">
                  <div className="space-y-2">
                    <div className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      8.5/10
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Average Score</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      50k+
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Transactions Analyzed</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      2.5k+
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Reports Minted</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-12 sm:py-16 md:py-20 lg:py-24 space-y-8 sm:space-y-12">
          <div className="text-center space-y-3 sm:space-y-4 max-w-2xl mx-auto px-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
              Powerful Features for Financial Clarity
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground text-balance">
              Everything you need to understand and improve your financial health
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-slide-up">
            <Card className="border-border/50 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="space-y-3">
                <div className="p-2 sm:p-3 rounded-xl bg-primary/10 w-fit">
                  <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <CardTitle className="text-lg sm:text-xl">AI-Powered Analysis</CardTitle>
                <CardDescription className="text-sm sm:text-base leading-relaxed">
                  Advanced machine learning algorithms analyze your spending patterns and provide personalized insights
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border/50 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="space-y-3">
                <div className="p-2 sm:p-3 rounded-xl bg-accent/10 w-fit">
                  <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
                </div>
                <CardTitle className="text-lg sm:text-xl">Financial Score</CardTitle>
                <CardDescription className="text-sm sm:text-base leading-relaxed">
                  Get a comprehensive financial health score based on your transaction history and spending habits
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border/50 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="space-y-3">
                <div className="p-2 sm:p-3 rounded-xl bg-primary/10 w-fit">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <CardTitle className="text-lg sm:text-xl">CSV Upload</CardTitle>
                <CardDescription className="text-sm sm:text-base leading-relaxed">
                  Easily upload your bank statements in CSV format for instant analysis and insights
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border/50 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="space-y-3">
                <div className="p-2 sm:p-3 rounded-xl bg-accent/10 w-fit">
                  <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
                </div>
                <CardTitle className="text-lg sm:text-xl">Sui Wallet Integration</CardTitle>
                <CardDescription className="text-sm sm:text-base leading-relaxed">
                  Connect your Sui wallet to analyze on-chain transactions directly from the blockchain
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border/50 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="space-y-3">
                <div className="p-2 sm:p-3 rounded-xl bg-primary/10 w-fit">
                  <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <CardTitle className="text-lg sm:text-xl">Blockchain Verified</CardTitle>
                <CardDescription className="text-sm sm:text-base leading-relaxed">
                  Mint your financial report as an NFT on Sui blockchain for permanent, verifiable proof
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border/50 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="space-y-3">
                <div className="p-2 sm:p-3 rounded-xl bg-accent/10 w-fit">
                  <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
                </div>
                <CardTitle className="text-lg sm:text-xl">Smart Recommendations</CardTitle>
                <CardDescription className="text-sm sm:text-base leading-relaxed">
                  Receive actionable suggestions to optimize your spending and improve your financial wellness
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* How It Works - Enhanced Responsive */}
        <section className="py-12 sm:py-16 md:py-20 lg:py-24 space-y-8 sm:space-y-12">
          <div className="text-center space-y-3 sm:space-y-4 max-w-2xl mx-auto px-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
              How It Works
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground text-balance">
              Get started in three simple steps
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto px-4">
            <div className="text-center space-y-3 sm:space-y-4 animate-slide-up">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary to-accent text-white text-lg sm:text-xl md:text-2xl font-bold">
                1
              </div>
              <h3 className="text-lg sm:text-xl font-semibold">Upload or Connect</h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Upload your transaction CSV or connect your Sui wallet to get started
              </p>
            </div>

            <div className="text-center space-y-3 sm:space-y-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary to-accent text-white text-lg sm:text-xl md:text-2xl font-bold">
                2
              </div>
              <h3 className="text-lg sm:text-xl font-semibold">AI Analysis</h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Our AI analyzes your transactions and generates comprehensive insights
              </p>
            </div>

            <div className="text-center space-y-3 sm:space-y-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary to-accent text-white text-lg sm:text-xl md:text-2xl font-bold">
                3
              </div>
              <h3 className="text-lg sm:text-xl font-semibold">Get Results</h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                View your financial score, insights, and mint your report on blockchain
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section - Enhanced Responsive */}
        <section className="py-12 sm:py-16 md:py-20 lg:py-24 px-4">
          <Card className="gradient-card border-border/50 shadow-2xl">
            <CardContent className="p-6 sm:p-8 md:p-12 text-center space-y-6">
              <div className="space-y-3 sm:space-y-4 max-w-2xl mx-auto">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                  Ready to Take Control of Your Finances?
                </h2>
                <p className="text-base sm:text-lg text-muted-foreground text-balance">
                  Join thousands of users who trust AICashflow for smart financial insights
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2 sm:pt-4">
                <Link href="/signup">
                  <Button size="lg" className="h-10 sm:h-11 md:h-12 px-6 sm:px-8 gap-2 gradient-primary hover:opacity-90 transition-opacity text-sm sm:text-base w-full sm:w-auto">
                    Get Started Free
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

              <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4 sm:gap-6 pt-4 sm:pt-6 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  <span>Secure & Private</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  <span>Blockchain Verified</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Analysis Cards - Enhanced Responsive */}
        <div className="animate-fade-in px-4">
          <Card className="gradient-card border-border/50 shadow-xl">
            <CardHeader className="space-y-3 pb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-xl sm:text-2xl">Get Started</CardTitle>
              </div>
              <CardDescription className="text-sm sm:text-base leading-relaxed">
                Upload your transaction data or connect your Sui wallet for intelligent financial analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="csv" className="w-full">
                <TabsList className="grid w-full grid-cols-2 p-1 bg-muted/50">
                  <TabsTrigger value="csv" className="data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs sm:text-sm">
                    Upload CSV
                  </TabsTrigger>
                  <TabsTrigger value="wallet" className="data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs sm:text-sm">
                    Use Wallet
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="csv" className="space-y-5 mt-6">
                  <div className="space-y-3">
                    <label htmlFor="csv-upload" className="text-xs sm:text-sm font-semibold text-foreground">
                      Transaction CSV File
                    </label>
                    <div className="flex gap-3">
                      <Input
                        id="csv-upload"
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="flex-1 h-10 sm:h-11 bg-background text-xs sm:text-sm"
                      />
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      Upload a CSV with your transactions (date, description, amount, category).
                    </p>
                  </div>
                  
                  <Button 
                    onClick={handleAnalyzeCSV} 
                    disabled={!selectedFile || isAnalyzing}
                    className="gap-2 h-10 sm:h-11 px-4 sm:px-6 gradient-primary hover:opacity-90 transition-opacity text-xs sm:text-base w-full sm:w-auto"
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
                    <label htmlFor="wallet-address" className="text-xs sm:text-sm font-semibold text-foreground">
                      Sui Wallet Address
                    </label>
                    <Input
                      id="wallet-address"
                      type="text"
                      placeholder="0x..."
                      value={manualWalletAddress}
                      onChange={(e) => setManualWalletAddress(e.target.value)}
                      className="h-10 sm:h-11 bg-background font-mono text-xs sm:text-sm"
                    />
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      We will fetch real on-chain transactions from Sui testnet.
                    </p>
                  </div>
                  
                  <Button 
                    onClick={handleFetchTransactions} 
                    disabled={!manualWalletAddress || isFetching}
                    className="gap-2 h-10 sm:h-11 px-4 sm:px-6 gradient-primary hover:opacity-90 transition-opacity text-xs sm:text-base w-full sm:w-auto"
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
                <div className="mt-5 p-3 sm:p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs sm:text-sm leading-relaxed">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Transactions Display - Enhanced Responsive */}
        {rawTransactions.length > 0 && (
          <div className="animate-slide-up px-4">
            <Card className="border-border/50 shadow-lg">
              <CardHeader className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <TrendingUp className="h-5 w-5 text-accent" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl">Your On-Chain Transactions</CardTitle>
                </div>
                <CardDescription className="text-xs sm:text-sm md:text-base">
                  Fetched {rawTransactions.length} real transaction{rawTransactions.length !== 1 ? 's' : ''} from Sui {rawTransactions.length === 1 && '(limited data for analysis)'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {hasMoreTransactions ? (
                  <Collapsible open={isTransactionsOpen} onOpenChange={setIsTransactionsOpen} className="space-y-3">
                    <div className="space-y-2 sm:space-y-3">
                      {displayTransactions.map((tx) => (
                        <div key={tx.txHash} className="p-3 sm:p-5 rounded-lg sm:rounded-xl border border-border/50 bg-card hover:shadow-md transition-shadow space-y-2 sm:space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <Badge 
                                variant={tx.direction === 'OUT' ? 'destructive' : 'default'}
                                className="px-2 py-0.5 sm:px-3 sm:py-1 text-xs sm:text-sm"
                              >
                                {tx.direction === 'OUT' ? 'Sent' : 'Received'}
                              </Badge>
                              <span className="text-xs sm:text-sm font-medium text-muted-foreground">{tx.category}</span>
                            </div>
                            <span className="text-lg sm:text-xl font-bold text-foreground">
                              {tx.direction === 'OUT' ? '-' : '+'}{tx.amount.toFixed(4)} {tx.tokenSymbol}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1.5 sm:space-y-2 pt-2 border-t border-border/50">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                              <span className="font-medium">Date:</span>
                              <span className="font-mono text-xs">{new Date(tx.timestamp).toLocaleString()}</span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                              <span className="font-medium">Tx Hash:</span>
                              <a 
                                href={`https://suiscan.xyz/testnet/tx/${tx.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-xs hover:text-primary transition-colors flex items-center gap-1"
                              >
                                {tx.txHash.substring(0, 8)}...{tx.txHash.substring(tx.txHash.length - 6)}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <CollapsibleContent className="space-y-2 sm:space-y-3">
                      {rawTransactions.slice(3).map((tx) => (
                        <div key={tx.txHash} className="p-3 sm:p-5 rounded-lg sm:rounded-xl border border-border/50 bg-card hover:shadow-md transition-shadow space-y-2 sm:space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <Badge 
                                variant={tx.direction === 'OUT' ? 'destructive' : 'default'}
                                className="px-2 py-0.5 sm:px-3 sm:py-1 text-xs sm:text-sm"
                              >
                                {tx.direction === 'OUT' ? 'Sent' : 'Received'}
                              </Badge>
                              <span className="text-xs sm:text-sm font-medium text-muted-foreground">{tx.category}</span>
                            </div>
                            <span className="text-lg sm:text-xl font-bold text-foreground">
                              {tx.direction === 'OUT' ? '-' : '+'}{tx.amount.toFixed(4)} {tx.tokenSymbol}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1.5 sm:space-y-2 pt-2 border-t border-border/50">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                              <span className="font-medium">Date:</span>
                              <span className="font-mono text-xs">{new Date(tx.timestamp).toLocaleString()}</span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                              <span className="font-medium">Tx Hash:</span>
                              <a 
                                href={`https://suiscan.xyz/testnet/tx/${tx.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-xs hover:text-primary transition-colors flex items-center gap-1"
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
                        className="w-full gap-2 mt-2 text-xs sm:text-sm"
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform ${isTransactionsOpen ? 'rotate-180' : ''}`} />
                        {isTransactionsOpen ? 'Show Less' : `Show More (${rawTransactions.length - 3} more)`}
                      </Button>
                    </CollapsibleTrigger>
                  </Collapsible>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {rawTransactions.map((tx) => (
                      <div key={tx.txHash} className="p-3 sm:p-5 rounded-lg sm:rounded-xl border border-border/50 bg-card hover:shadow-md transition-shadow space-y-2 sm:space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <Badge 
                              variant={tx.direction === 'OUT' ? 'destructive' : 'default'}
                              className="px-2 py-0.5 sm:px-3 sm:py-1 text-xs sm:text-sm"
                            >
                              {tx.direction === 'OUT' ? 'Sent' : 'Received'}
                            </Badge>
                            <span className="text-xs sm:text-sm font-medium text-muted-foreground">{tx.category}</span>
                          </div>
                          <span className="text-lg sm:text-xl font-bold text-foreground">
                            {tx.direction === 'OUT' ? '-' : '+'}{tx.amount.toFixed(4)} {tx.tokenSymbol}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1.5 sm:space-y-2 pt-2 border-t border-border/50">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                            <span className="font-medium">Date:</span>
                            <span className="font-mono text-xs">{new Date(tx.timestamp).toLocaleString()}</span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                            <span className="font-medium">Tx Hash:</span>
                            <a 
                              href={`https://suiscan.xyz/testnet/tx/${tx.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-xs hover:text-primary transition-colors flex items-center gap-1"
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
                
                {rawTransactions.length === 1 && (
                  <div className="mt-4 sm:mt-5 p-3 sm:p-4 rounded-lg bg-accent/10 border border-accent/20 text-xs sm:text-sm text-foreground leading-relaxed">
                    <span className="font-semibold">Tip:</span> Your wallet has limited transaction history on Sui testnet. For a more comprehensive analysis, you can upload a CSV with your complete transaction history.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Analysis Results - Enhanced Responsive */}
        {analysisResult && (
          <>
            <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8 animate-slide-up px-4">
              <Card className="border-border/50 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="space-y-3">
                  <CardTitle className="text-lg sm:text-xl">Spending by Category</CardTitle>
                  <CardDescription className="text-xs sm:text-sm md:text-base">Your transaction breakdown</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6">
                  <SpendingChart data={analysisResult.spendingByCategory} />
                  
                  <div className="space-y-2 sm:space-y-3 pt-3 sm:pt-4 border-t border-border">
                    {analysisResult.spendingByCategory.map((item) => (
                      <div key={item.category} className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <span className="text-xs sm:text-sm font-medium text-foreground truncate">{item.category}</span>
                        <span className="font-bold text-foreground text-sm sm:text-lg ml-2 flex-shrink-0">${item.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="gradient-card border-border/50 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg sm:text-xl">Financial Score</CardTitle>
                  </div>
                  <CardDescription className="text-xs sm:text-sm md:text-base">AI-powered financial health analysis</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 sm:space-y-8">
                  <div className="text-center space-y-3 sm:space-y-4 py-3 sm:py-4">
                    <div className="relative inline-block">
                      <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
                      <div className="relative text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
                        {analysisResult.score.toFixed(1)}
                        <span className="text-2xl sm:text-3xl md:text-4xl text-muted-foreground">/10</span>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm md:text-base text-foreground/80 leading-relaxed text-balance max-w-md mx-auto">
                      {analysisResult.recommendation}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center pt-4 sm:pt-6 border-t border-border">
                    {analysisResult.badges.map((badge) => (
                      <Badge 
                        key={badge.label} 
                        variant={badge.status === 'good' ? 'default' : badge.status === 'average' ? 'secondary' : 'outline'}
                        className="gap-1 px-2 sm:px-3 py-1 sm:py-1.5 text-xs"
                      >
                        {badge.status === 'good' && <TrendingUp className="h-3 w-3" />}
                        {badge.status === 'needs-improvement' && <TrendingDown className="h-3 w-3" />}
                        <span className="line-clamp-1">{badge.label}: {badge.value}</span>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border/50 shadow-lg animate-slide-up px-4">
              <CardHeader className="space-y-3">
                <CardTitle className="text-lg sm:text-xl">Smart Shopping Suggestions</CardTitle>
                <CardDescription className="text-xs sm:text-sm md:text-base">
                  Based on your spending data, here are smart shopping suggestions to save more
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <SmartShoppingTable suggestions={analysisResult.shoppingSuggestions} />
              </CardContent>
            </Card>

            <Card className="gradient-card border-border/50 shadow-lg animate-slide-up px-4">
              <CardHeader className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl">Save this report on Sui</CardTitle>
                </div>
                <CardDescription className="text-xs sm:text-sm md:text-base">
                  Mint an on-chain proof of your financial score. We only store the hash and the score, not your raw data.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-6 rounded-lg sm:rounded-xl bg-muted/50 border border-border">
                  <div className="space-y-2">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Score</p>
                    <p className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      {analysisResult.score.toFixed(1)}/10
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Report Hash</p>
                    <p className="text-xs sm:text-sm font-mono text-foreground break-all leading-relaxed">
                      {analysisResult.reportHash}
                    </p>
                  </div>
                </div>

                {!mintResult ? (
                  <Button 
                    onClick={handleMintReport} 
                    disabled={isMinting}
                    className="w-full gap-2 h-10 sm:h-11 md:h-12 gradient-primary hover:opacity-90 transition-opacity text-xs sm:text-base"
                    size="lg"
                  >
                    {isMinting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Minting NFT on Sui...
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4" />
                        Mint Report NFT on Sui
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    <div className="p-3 sm:p-4 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs sm:text-base font-semibold text-center">
                      NFT minted successfully!
                    </div>
                    <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                      <div className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted">
                        <span className="font-medium text-muted-foreground">Object ID:</span>
                        <span className="font-mono text-xs">{mintResult.nftObjectId.substring(0, 20)}...</span>
                      </div>
                    </div>
                    <a
                      href={mintResult.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 text-xs sm:text-base text-primary hover:underline font-medium"
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

      {/* Footer */}
      <footer className="border-t border-border/50 mt-12 bg-card/50">
        <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8">
          <div className="text-center space-y-2 sm:space-y-3">
            <div className="flex items-center justify-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <span className="text-base sm:text-lg font-bold">AICashflow</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              AI-powered financial insights with blockchain verification
            </p>
            <p className="text-xs text-muted-foreground">
              © 2025 AICashflow. Built on Sui Network.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
