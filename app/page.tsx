import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ExternalLink, Users, Trophy } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section with Banner */}
      <div className="relative w-full h-[300px] md:h-[400px]">
        <Image
          src="https://www.albi24h.fr/wp-content/uploads/2025/04/ALBI24H2025-EN.jpg"
          alt="IAU 24h World Championships 2025 - Albi, France"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/70" />

        {/* Hero Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white px-4">
          <h1 className="text-3xl md:text-5xl font-bold text-center mb-3 drop-shadow-lg">
            IAU 24h World Championships 2025
          </h1>
          <p className="text-lg md:text-2xl text-center mb-6 drop-shadow-md">
            Albi, France • October 17-19, 2025
          </p>

          {/* Official Links */}
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <a
              href="https://iau-ultramarathon.org/2025-iau-24h-world-championships/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-white/90 hover:text-white transition-colors underline"
            >
              Official IAU Page <ExternalLink className="h-4 w-4" />
            </a>
            <span className="text-white/50">•</span>
            <a
              href="https://www.albi24h.fr/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-white/90 hover:text-white transition-colors underline"
            >
              Organizer Website <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Individual Runners Card */}
          <Link href="/runners" className="group">
            <div className="h-full rounded-lg border-2 border-border bg-card hover:border-primary hover:shadow-lg transition-all p-8">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-3">Individual Runners</h2>
                <p className="text-muted-foreground mb-6">
                  Browse all registered runners, view personal bests, DUV profiles, and performance history
                </p>
                <Button size="lg" className="w-full">
                  View Runners
                </Button>
              </div>
            </div>
          </Link>

          {/* Team Predictions Card */}
          <Link href="/teams" className="group">
            <div className="h-full rounded-lg border-2 border-border bg-card hover:border-primary hover:shadow-lg transition-all p-8">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Trophy className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-3">Team Predictions</h2>
                <p className="text-muted-foreground mb-6">
                  Predicted team rankings based on top 3 runners per country using recent personal bests
                </p>
                <Button size="lg" className="w-full">
                  View Predictions
                </Button>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </main>
  )
}
