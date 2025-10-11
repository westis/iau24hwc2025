'use client'

interface CountryData {
  country: string
  men: number
  women: number
  total: number
}

interface WorldMapProps {
  countries: CountryData[]
}

// Simplified country to region mapping for visual layout
const REGION_MAP: { [key: string]: string } = {
  // North America
  'USA': 'north-america',
  'CAN': 'north-america',
  'MEX': 'north-america',

  // South America
  'BRA': 'south-america',
  'ARG': 'south-america',
  'CHI': 'south-america',
  'COL': 'south-america',
  'PER': 'south-america',

  // Europe
  'GBR': 'europe',
  'FRA': 'europe',
  'GER': 'europe',
  'ITA': 'europe',
  'ESP': 'europe',
  'NED': 'europe',
  'BEL': 'europe',
  'POL': 'europe',
  'CZE': 'europe',
  'AUT': 'europe',
  'SUI': 'europe',
  'NOR': 'europe',
  'SWE': 'europe',
  'DEN': 'europe',
  'FIN': 'europe',
  'IRL': 'europe',
  'POR': 'europe',
  'GRE': 'europe',
  'HUN': 'europe',
  'ROU': 'europe',
  'UKR': 'europe',
  'RUS': 'europe',

  // Asia
  'CHN': 'asia',
  'JPN': 'asia',
  'IND': 'asia',
  'KOR': 'asia',
  'TPE': 'asia',
  'HKG': 'asia',
  'SIN': 'asia',
  'THA': 'asia',
  'MAS': 'asia',
  'PHI': 'asia',
  'ISR': 'asia',

  // Africa
  'RSA': 'africa',
  'KEN': 'africa',
  'ETH': 'africa',
  'MAR': 'africa',
  'EGY': 'africa',
  'ZIM': 'africa',

  // Oceania
  'AUS': 'oceania',
  'NZL': 'oceania',
}

export function WorldMap({ countries }: WorldMapProps) {
  // Group countries by region
  const regionGroups = countries.reduce((acc, country) => {
    const region = REGION_MAP[country.country] || 'other'
    if (!acc[region]) {
      acc[region] = []
    }
    acc[region].push(country)
    return acc
  }, {} as { [key: string]: CountryData[] })

  // Calculate max participants for sizing
  const maxParticipants = Math.max(...countries.map(c => c.total))

  const getRegionColor = (region: string) => {
    switch (region) {
      case 'north-america': return 'bg-blue-500'
      case 'south-america': return 'bg-green-500'
      case 'europe': return 'bg-purple-500'
      case 'asia': return 'bg-orange-500'
      case 'africa': return 'bg-yellow-500'
      case 'oceania': return 'bg-cyan-500'
      default: return 'bg-gray-500'
    }
  }

  const getRegionLabel = (region: string) => {
    switch (region) {
      case 'north-america': return 'North America'
      case 'south-america': return 'South America'
      case 'europe': return 'Europe'
      case 'asia': return 'Asia'
      case 'africa': return 'Africa'
      case 'oceania': return 'Oceania'
      default: return 'Other'
    }
  }

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center text-sm">
        {Object.keys(regionGroups).map((region) => (
          <div key={region} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getRegionColor(region)}`}></div>
            <span>{getRegionLabel(region)}</span>
          </div>
        ))}
      </div>

      {/* Map Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(regionGroups).map(([region, regionCountries]) => (
          <div key={region} className="border border-border rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getRegionColor(region)}`}></div>
              {getRegionLabel(region)}
            </h3>
            <div className="space-y-2">
              {regionCountries
                .sort((a, b) => b.total - a.total)
                .map((country) => (
                  <div
                    key={country.country}
                    className="flex items-center justify-between p-2 rounded hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{country.country}</span>
                      <div className="flex gap-1 text-xs text-muted-foreground">
                        <span className="text-blue-500">M:{country.men}</span>
                        <span className="text-pink-500">W:{country.women}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{country.total}</span>
                      {/* Size indicator */}
                      <div
                        className={`h-2 rounded-full ${getRegionColor(region)}`}
                        style={{
                          width: `${Math.max(20, (country.total / maxParticipants) * 60)}px`
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
