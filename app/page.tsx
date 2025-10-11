import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ExternalLink } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Banner */}
        <div className="relative w-full h-48 md:h-64 mb-8 rounded-lg overflow-hidden shadow-lg">
          <Image
            src="https://www.albi24h.fr/wp-content/uploads/2025/04/ALBI24H2025-EN.jpg"
            alt="IAU 24h World Championships 2025 - Albi, France"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            IAU 24h World Championships 2025
          </h1>
          <p className="text-xl text-muted-foreground mb-2">Albi, France • October 17-19, 2025</p>
          <p className="text-lg text-muted-foreground mb-6">Runner Analytics & Team Predictions</p>

          {/* Official Links */}
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href="https://iau-ultramarathon.org/2025-iau-24h-world-championships/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Official IAU Page <ExternalLink className="h-3 w-3" />
            </a>
            <span className="text-muted-foreground">•</span>
            <a
              href="https://www.albi24h.fr/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Organizer Website <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Card>
            <CardHeader>
              <CardTitle>Individual Runners</CardTitle>
              <CardDescription>View all registered runners by gender</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
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
              <p className="text-sm text-muted-foreground mb-4">
                See predicted team rankings from top 3 runners per country (last 3 years PB).
              </p>
              <Link href="/teams">
                <Button className="w-full">View Predictions</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
