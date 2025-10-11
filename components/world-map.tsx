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

// IOC country code to region mapping
const REGION_MAP: { [key: string]: string } = {
  // North America
  'USA': 'north-america',
  'CAN': 'north-america',
  'MEX': 'north-america',

  // South America
  'ARG': 'south-america',
  'BRA': 'south-america',
  'URU': 'south-america',
  'VEN': 'south-america',

  // Europe
  'AND': 'europe', // Andorra
  'AUT': 'europe', // Austria
  'AZE': 'europe', // Azerbaijan
  'BEL': 'europe', // Belgium
  'CRO': 'europe', // Croatia
  'CZE': 'europe', // Czech Republic
  'DEN': 'europe', // Denmark
  'ESP': 'europe', // Spain
  'EST': 'europe', // Estonia
  'FIN': 'europe', // Finland
  'FRA': 'europe', // France
  'GBR': 'europe', // Great Britain
  'GER': 'europe', // Germany
  'GRE': 'europe', // Greece
  'HUN': 'europe', // Hungary
  'IRL': 'europe', // Ireland
  'ITA': 'europe', // Italy
  'LAT': 'europe', // Latvia
  'LTU': 'europe', // Lithuania
  'NED': 'europe', // Netherlands
  'NOR': 'europe', // Norway
  'POL': 'europe', // Poland
  'POR': 'europe', // Portugal
  'ROU': 'europe', // Romania
  'SLO': 'europe', // Slovenia
  'SRB': 'europe', // Serbia
  'SUI': 'europe', // Switzerland
  'SVK': 'europe', // Slovakia
  'SWE': 'europe', // Sweden
  'UKR': 'europe', // Ukraine

  // Asia
  'IND': 'asia', // India
  'JOR': 'asia', // Jordan
  'JPN': 'asia', // Japan
  'MGL': 'asia', // Mongolia
  'TPE': 'asia', // Chinese Taipei

  // Africa
  'ALG': 'africa', // Algeria
  'RSA': 'africa', // South Africa
  'SLE': 'africa', // Sierra Leone

  // Oceania
  'AUS': 'oceania', // Australia
  'NZL': 'oceania', // New Zealand
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

      {/* Visual World Map Layout */}
      <div className="relative w-full min-h-96 border border-border rounded-lg p-4 bg-gradient-to-b from-blue-50 to-green-50 dark:from-blue-950 dark:to-green-950">
        {/* Map grid with geographical positioning */}
        <div className="grid grid-rows-3 grid-cols-12 gap-2 h-full">
          {/* Row 1 - Northern regions */}
          <div className="col-start-1 col-span-3 row-start-1">
            {regionGroups['north-america'] && (
              <MapRegionCard
                region="north-america"
                label={getRegionLabel('north-america')}
                color={getRegionColor('north-america')}
                countries={regionGroups['north-america']}
                maxParticipants={maxParticipants}
              />
            )}
          </div>

          <div className="col-start-4 col-span-6 row-start-1">
            {regionGroups['europe'] && (
              <MapRegionCard
                region="europe"
                label={getRegionLabel('europe')}
                color={getRegionColor('europe')}
                countries={regionGroups['europe']}
                maxParticipants={maxParticipants}
              />
            )}
          </div>

          <div className="col-start-10 col-span-3 row-start-1">
            {regionGroups['asia'] && (
              <MapRegionCard
                region="asia"
                label={getRegionLabel('asia')}
                color={getRegionColor('asia')}
                countries={regionGroups['asia']}
                maxParticipants={maxParticipants}
              />
            )}
          </div>

          {/* Row 2 - Middle regions */}
          <div className="col-start-2 col-span-3 row-start-2">
            {regionGroups['south-america'] && (
              <MapRegionCard
                region="south-america"
                label={getRegionLabel('south-america')}
                color={getRegionColor('south-america')}
                countries={regionGroups['south-america']}
                maxParticipants={maxParticipants}
              />
            )}
          </div>

          <div className="col-start-5 col-span-3 row-start-2">
            {regionGroups['africa'] && (
              <MapRegionCard
                region="africa"
                label={getRegionLabel('africa')}
                color={getRegionColor('africa')}
                countries={regionGroups['africa']}
                maxParticipants={maxParticipants}
              />
            )}
          </div>

          {/* Row 3 - Southern regions */}
          <div className="col-start-10 col-span-3 row-start-3">
            {regionGroups['oceania'] && (
              <MapRegionCard
                region="oceania"
                label={getRegionLabel('oceania')}
                color={getRegionColor('oceania')}
                countries={regionGroups['oceania']}
                maxParticipants={maxParticipants}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface MapRegionCardProps {
  region: string
  label: string
  color: string
  countries: CountryData[]
  maxParticipants: number
}

function MapRegionCard({ region, label, color, countries, maxParticipants }: MapRegionCardProps) {
  return (
    <div className="border border-border rounded-lg p-3 bg-background/80 backdrop-blur h-full">
      <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm">
        <div className={`w-2 h-2 rounded-full ${color}`}></div>
        {label}
      </h3>
      <div className="space-y-1 text-xs max-h-32 overflow-y-auto">
        {countries
          .sort((a, b) => b.total - a.total)
          .map((country) => (
            <div
              key={country.country}
              className="flex items-center justify-between p-1 rounded hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-1">
                <span className="font-medium">{country.country}</span>
                <span className="text-muted-foreground">({country.total})</span>
              </div>
              <div className="flex gap-1">
                <span className="text-blue-500">♂{country.men}</span>
                <span className="text-pink-500">♀{country.women}</span>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
