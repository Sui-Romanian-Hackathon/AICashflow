import { Badge } from '@/components/ui/badge'
import type { ShoppingSuggestion } from '@/lib/api-mocks'

interface SmartShoppingTableProps {
  suggestions: ShoppingSuggestion[]
}

export function SmartShoppingTable({ suggestions }: SmartShoppingTableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm md:text-base">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-2 md:px-4 font-medium text-muted-foreground text-xs md:text-sm">Product</th>
            <th className="text-left py-3 px-2 md:px-4 font-medium text-muted-foreground text-xs md:text-sm">Category</th>
            <th className="text-right py-3 px-2 md:px-4 font-medium text-muted-foreground text-xs md:text-sm">Current</th>
            <th className="text-right py-3 px-2 md:px-4 font-medium text-muted-foreground text-xs md:text-sm">Optimized</th>
            <th className="text-right py-3 px-2 md:px-4 font-medium text-muted-foreground text-xs md:text-sm">Savings</th>
          </tr>
        </thead>
        <tbody>
          {suggestions.map((suggestion, index) => (
            <tr key={index} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
              <td className="py-3 px-2 md:px-4 font-medium text-foreground text-xs md:text-sm truncate">{suggestion.productName}</td>
              <td className="py-3 px-2 md:px-4 text-muted-foreground text-xs md:text-sm truncate">{suggestion.category}</td>
              <td className="py-3 px-2 md:px-4 text-right text-foreground text-xs md:text-sm font-semibold">${suggestion.currentSpend.toFixed(2)}</td>
              <td className="py-3 px-2 md:px-4 text-right text-foreground text-xs md:text-sm font-semibold">${suggestion.optimizedSpend.toFixed(2)}</td>
              <td className="py-3 px-2 md:px-4 text-right">
                <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 text-xs md:text-sm">
                  Save {suggestion.savingsPercentage}%
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
