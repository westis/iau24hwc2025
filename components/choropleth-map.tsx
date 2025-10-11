'use client'

import { useState } from 'react'

interface CountryData {
  country: string
  men: number
  women: number
  total: number
}

interface ChoroplethMapProps {
  countries: CountryData[]
}

// Simplified world map with approximate country positions
// Using rectangles positioned geographically for simplicity
const COUNTRY_POSITIONS: { [key: string]: { x: number; y: number; width: number; height: number } } = {
  // North America
  'USA': { x: 150, y: 180, width: 100, height: 80 },
  'CAN': { x: 120, y: 80, width: 180, height: 100 },
  'MEX': { x: 140, y: 260, width: 70, height: 50 },

  // South America
  'ARG': { x: 240, y: 450, width: 50, height: 80 },
  'BRA': { x: 260, y: 340, width: 100, height: 110 },
  'URU': { x: 270, y: 440, width: 30, height: 30 },
  'VEN': { x: 230, y: 300, width: 50, height: 40 },

  // Europe
  'GBR': { x: 470, y: 140, width: 35, height: 45 },
  'IRL': { x: 445, y: 150, width: 25, height: 35 },
  'FRA': { x: 495, y: 180, width: 45, height: 50 },
  'ESP': { x: 470, y: 220, width: 60, height: 45 },
  'POR': { x: 450, y: 230, width: 25, height: 40 },
  'BEL': { x: 505, y: 165, width: 20, height: 20 },
  'NED': { x: 510, y: 150, width: 25, height: 25 },
  'GER': { x: 530, y: 155, width: 45, height: 50 },
  'SUI': { x: 525, y: 195, width: 25, height: 25 },
  'AUT': { x: 550, y: 190, width: 35, height: 25 },
  'ITA': { x: 540, y: 210, width: 35, height: 60 },
  'DEN': { x: 530, y: 130, width: 30, height: 25 },
  'NOR': { x: 535, y: 80, width: 35, height: 60 },
  'SWE': { x: 550, y: 90, width: 35, height: 70 },
  'FIN': { x: 575, y: 85, width: 40, height: 60 },
  'POL': { x: 560, y: 155, width: 40, height: 40 },
  'CZE': { x: 550, y: 175, width: 30, height: 25 },
  'SVK': { x: 560, y: 190, width: 30, height: 20 },
  'HUN': { x: 565, y: 200, width: 35, height: 25 },
  'ROU': { x: 590, y: 195, width: 40, height: 35 },
  'SLO': { x: 550, y: 205, width: 25, height: 20 },
  'CRO': { x: 550, y: 215, width: 30, height: 30 },
  'SRB': { x: 570, y: 220, width: 25, height: 30 },
  'GRE': { x: 570, y: 235, width: 35, height: 35 },
  'EST': { x: 585, y: 120, width: 30, height: 20 },
  'LAT': { x: 585, y: 135, width: 30, height: 20 },
  'LTU': { x: 580, y: 145, width: 35, height: 20 },
  'UKR': { x: 600, y: 165, width: 60, height: 45 },
  'AZE': { x: 680, y: 215, width: 40, height: 30 },
  'AND': { x: 490, y: 215, width: 8, height: 8 },

  // Asia
  'JPN': { x: 880, y: 200, width: 45, height: 70 },
  'TPE': { x: 815, y: 280, width: 25, height: 20 },
  'IND': { x: 720, y: 270, width: 70, height: 80 },
  'MGL': { x: 750, y: 180, width: 80, height: 50 },
  'JOR': { x: 650, y: 240, width: 25, height: 25 },

  // Africa
  'ALG': { x: 490, y: 250, width: 80, height: 70 },
  'RSA': { x: 560, y: 450, width: 50, height: 60 },
  'SLE': { x: 455, y: 310, width: 20, height: 20 },

  // Oceania
  'AUS': { x: 820, y: 430, width: 100, height: 80 },
  'NZL': { x: 920, y: 490, width: 35, height: 50 },
}

export function ChoroplethMap({ countries }: ChoroplethMapProps) {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  // Get max participants for color scaling
  const maxParticipants = Math.max(...countries.map(c => c.total))

  // Get color intensity based on participant count
  const getColorIntensity = (total: number) => {
    const intensity = (total / maxParticipants) * 100
    return intensity
  }

  // Get country data by code
  const getCountryData = (code: string) => {
    return countries.find(c => c.country === code)
  }

  const handleMouseEnter = (code: string, event: React.MouseEvent<SVGRectElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setHoveredCountry(code)
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top })
  }

  const handleMouseLeave = () => {
    setHoveredCountry(null)
  }

  return (
    <div className="relative">
      {/* Legend */}
      <div className="mb-4 flex items-center gap-4 justify-center text-sm">
        <span>Participants:</span>
        <div className="flex items-center gap-2">
          <div className="h-4 w-8 bg-primary/20 rounded"></div>
          <span>Low</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-8 bg-primary/60 rounded"></div>
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-8 bg-primary rounded"></div>
          <span>High</span>
        </div>
      </div>

      {/* SVG World Map */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox="0 0 1000 600"
          className="w-full h-auto border border-border rounded-lg"
          style={{ minHeight: '400px', background: '#f0f9ff' }}
        >
          {/* Ocean background is set via style */}

          {/* Draw all countries */}
          {Object.entries(COUNTRY_POSITIONS).map(([code, pos]) => {
            const countryData = getCountryData(code)
            const hasData = !!countryData
            const intensity = countryData ? getColorIntensity(countryData.total) : 0

            return (
              <rect
                key={code}
                x={pos.x}
                y={pos.y}
                width={pos.width}
                height={pos.height}
                fill={hasData ? `hsl(var(--primary) / ${intensity}%)` : '#e5e7eb'}
                stroke={hoveredCountry === code ? '#000' : '#94a3b8'}
                strokeWidth={hoveredCountry === code ? 2 : 1}
                className="transition-all cursor-pointer"
                onMouseEnter={(e) => hasData && handleMouseEnter(code, e)}
                onMouseLeave={handleMouseLeave}
              />
            )
          })}

          {/* Country labels */}
          {Object.entries(COUNTRY_POSITIONS).map(([code, pos]) => (
            <text
              key={`label-${code}`}
              x={pos.x + pos.width / 2}
              y={pos.y + pos.height / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="10"
              fill={getCountryData(code) ? '#fff' : '#666'}
              pointerEvents="none"
              fontWeight="bold"
            >
              {code}
            </text>
          ))}
        </svg>
      </div>

      {/* Tooltip */}
      {hoveredCountry && getCountryData(hoveredCountry) && (
        <div
          className="fixed z-50 bg-popover text-popover-foreground px-3 py-2 rounded-md shadow-lg border text-sm pointer-events-none"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y - 60}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="font-semibold">{hoveredCountry}</div>
          <div className="text-xs">
            Total: {getCountryData(hoveredCountry)?.total}
          </div>
          <div className="text-xs flex gap-2">
            <span className="text-blue-500">♂ {getCountryData(hoveredCountry)?.men}</span>
            <span className="text-pink-500">♀ {getCountryData(hoveredCountry)?.women}</span>
          </div>
        </div>
      )}

      {/* Country list below map */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
        {countries
          .sort((a, b) => b.total - a.total)
          .map((country) => (
            <div
              key={country.country}
              className="flex items-center justify-between p-2 rounded border border-border hover:bg-accent transition-colors"
              onMouseEnter={() => setHoveredCountry(country.country)}
              onMouseLeave={() => setHoveredCountry(null)}
            >
              <span className="font-medium">{country.country}</span>
              <span className="text-muted-foreground">{country.total}</span>
            </div>
          ))}
      </div>
    </div>
  )
}
