import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            IAU 24h World Championships 2025
          </h1>
          <p className="text-xl text-gray-600 mb-2">Albi, France</p>
          <p className="text-lg text-gray-500">Runner Analytics & Team Predictions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Card>
            <CardHeader>
              <CardTitle>Individual Runners</CardTitle>
              <CardDescription>View all registered runners by gender</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Browse the complete list of individual runners with personal bests and DUV profiles.
              </p>
              <Link href="/runners">
                <Button className="w-full">View Runners</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team Predictions</CardTitle>
              <CardDescription>Predicted rankings based on PBs</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                See predicted team rankings from top 3 runners per country (last 2 years PB).
              </p>
              <Link href="/teams">
                <Button className="w-full">View Predictions</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Data Management:</strong> Public viewing platform. Data managed via backend CLI tools.
          </p>
        </div>
      </div>
    </main>
  )
}
