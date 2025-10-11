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

// Country positions based on latitude/longitude coordinates
// For equirectangular projection: x = (lon + 180) * (2000/360), y = (90 - lat) * (1000/180)
const COUNTRY_COORDS: { [key: string]: { lat: number; lon: number } } = {
  // North America
  'USA': { lat: 38, lon: -97 },
  'CAN': { lat: 56, lon: -106 },
  'MEX': { lat: 23, lon: -102 },

  // South America
  'ARG': { lat: -38, lon: -63 },
  'BRA': { lat: -14, lon: -51 },
  'URU': { lat: -33, lon: -56 },
  'VEN': { lat: 6, lon: -66 },

  // Europe
  'GBR': { lat: 55, lon: -3 },
  'IRL': { lat: 53, lon: -8 },
  'FRA': { lat: 46, lon: 2 },
  'ESP': { lat: 40, lon: -3 },
  'POR': { lat: 39, lon: -8 },
  'BEL': { lat: 50, lon: 4 },
  'NED': { lat: 52, lon: 5 },
  'GER': { lat: 51, lon: 10 },
  'SUI': { lat: 47, lon: 8 },
  'AUT': { lat: 47, lon: 14 },
  'ITA': { lat: 43, lon: 12 },
  'DEN': { lat: 56, lon: 9 },
  'NOR': { lat: 60, lon: 8 },
  'SWE': { lat: 60, lon: 18 },
  'FIN': { lat: 61, lon: 25 },
  'POL': { lat: 52, lon: 19 },
  'CZE': { lat: 49, lon: 15 },
  'SVK': { lat: 48, lon: 19 },
  'HUN': { lat: 47, lon: 19 },
  'ROU': { lat: 46, lon: 25 },
  'SLO': { lat: 46, lon: 14 },
  'CRO': { lat: 45, lon: 15 },
  'SRB': { lat: 44, lon: 21 },
  'GRE': { lat: 39, lon: 22 },
  'EST': { lat: 58, lon: 25 },
  'LAT': { lat: 56, lon: 24 },
  'LTU': { lat: 55, lon: 24 },
  'UKR': { lat: 48, lon: 31 },
  'AZE': { lat: 40, lon: 47 },
  'AND': { lat: 42, lon: 1 },

  // Asia
  'JPN': { lat: 36, lon: 138 },
  'TPE': { lat: 24, lon: 121 },
  'IND': { lat: 20, lon: 77 },
  'MGL': { lat: 46, lon: 105 },
  'JOR': { lat: 31, lon: 36 },

  // Africa
  'ALG': { lat: 28, lon: 1 },
  'RSA': { lat: -30, lon: 22 },
  'SLE': { lat: 8, lon: -11 },

  // Oceania
  'AUS': { lat: -25, lon: 133 },
  'NZL': { lat: -40, lon: 174 },
}

// Convert lat/lon to SVG coordinates
function latLonToXY(lat: number, lon: number): { x: number; y: number } {
  const x = (lon + 180) * (2000 / 360)
  const y = (90 - lat) * (1000 / 180)
  return { x, y }
}

export function ChoroplethMap({ countries }: ChoroplethMapProps) {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

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

  // Zoom handlers
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.5, 5))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.5, 0.5))
  }

  const handleReset = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(prev => Math.min(Math.max(prev * delta, 0.5), 5))
  }

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  return (
    <div className="relative">
      {/* Legend */}
      <div className="mb-4 flex items-center gap-4 justify-center text-sm">
        <span>Participants:</span>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-blue-300 rounded-full border-2 border-blue-600"></div>
          <span>1-3</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 bg-blue-400 rounded-full border-2 border-blue-700"></div>
          <span>4-8</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-blue-500 rounded-full border-2 border-blue-800"></div>
          <span>9+</span>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="bg-background border border-border rounded-md p-2 hover:bg-accent transition-colors shadow-md"
          title="Zoom in"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <button
          onClick={handleZoomOut}
          className="bg-background border border-border rounded-md p-2 hover:bg-accent transition-colors shadow-md"
          title="Zoom out"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <button
          onClick={handleReset}
          className="bg-background border border-border rounded-md p-2 hover:bg-accent transition-colors shadow-md"
          title="Reset view"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* World Map with Overlay */}
      <div
        className="relative w-full border border-border rounded-lg overflow-hidden bg-gray-100"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div className="relative w-full" style={{ height: '600px' }}>
          {/* Wrapper for both map and markers with synchronized transform */}
          <div
            className="absolute inset-0 w-full h-full"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
            }}
          >
            {/* Real world map as background image */}
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/8/83/Equirectangular_projection_SW.jpg"
              alt="World Map"
              className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none"
            />

            {/* SVG overlay for country markers */}
            <svg
              viewBox="0 0 2000 1000"
              className="w-full h-full absolute inset-0 pointer-events-none"
            >
              <g className="pointer-events-auto">
            {/* Overlay country markers */}
            {Object.entries(COUNTRY_COORDS).map(([code, coords]) => {
              const countryData = getCountryData(code)
              if (!countryData) return null

              const { x, y } = latLonToXY(coords.lat, coords.lon)
              const size = countryData.total <= 3 ? 15 : countryData.total <= 8 ? 25 : 35
              const color = countryData.total <= 3 ? '#93c5fd' : countryData.total <= 8 ? '#60a5fa' : '#3b82f6'
              const borderColor = countryData.total <= 3 ? '#2563eb' : countryData.total <= 8 ? '#1d4ed8' : '#1e40af'

              return (
                <g key={code}>
                  <circle
                    cx={x}
                    cy={y}
                    r={size}
                    fill={color}
                    stroke={hoveredCountry === code ? '#000' : borderColor}
                    strokeWidth={hoveredCountry === code ? 3 : 2}
                    className="transition-all cursor-pointer"
                    onMouseEnter={(e) => handleMouseEnter(code, e)}
                    onMouseLeave={handleMouseLeave}
                  />
                  <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="10"
                    fill="#fff"
                    fontWeight="bold"
                    pointerEvents="none"
                  >
                    {code}
                  </text>
                </g>
              )
            })}
              </g>
            </svg>
          </div>
        </div>
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
