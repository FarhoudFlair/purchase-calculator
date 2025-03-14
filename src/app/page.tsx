'use client'

import PurchaseCalculator from '@/components/PurchaseCalculator'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 md:p-8 max-w-7xl mx-auto">
      <PurchaseCalculator />
    </main>
  )
}