'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

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

// Create custom marker icon based on participant count
const createCustomIcon = (total: number, code: string) => {
  const size = total <= 3 ? 30 : total <= 8 ? 40 : 50
  const color = total <= 3 ? '#93c5fd' : total <= 8 ? '#60a5fa' : '#3b82f6'
  const borderColor = total <= 3 ? '#2563eb' : total <= 8 ? '#1d4ed8' : '#1e40af'

  return L.divIcon({
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${color};
        border: 2px solid ${borderColor};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${size > 40 ? '12px' : '10px'};
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      ">
        ${code}
      </div>
    `,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
}

// Custom cluster icon that shows total participants
const createClusterCustomIcon = (cluster: any) => {
  const count = cluster.getChildCount()
  const size = count < 10 ? 40 : count < 50 ? 50 : 60

  return L.divIcon({
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background-color: #f59e0b;
        border: 3px solid #d97706;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${size > 50 ? '16px' : '14px'};
        box-shadow: 0 3px 8px rgba(0,0,0,0.4);
      ">
        ${count}
      </div>
    `,
    className: '',
    iconSize: [size, size],
  })
}

export function ChoroplethMap({ countries }: ChoroplethMapProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="w-full h-[600px] bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    )
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
        <div className="flex items-center gap-2 ml-4">
          <div className="h-8 w-8 bg-orange-500 rounded-full border-3 border-orange-600 flex items-center justify-center text-white text-xs font-bold">
            #
          </div>
          <span>Cluster</span>
        </div>
      </div>

      {/* Map */}
      <div className="w-full h-[600px] rounded-lg overflow-hidden border border-border">
        <MapContainer
          center={[30, 0]}
          zoom={2}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
          maxBounds={[[-90, -180], [90, 180]]}
          maxBoundsViscosity={1.0}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            noWrap={false}
          />

          <MarkerClusterGroup
            iconCreateFunction={createClusterCustomIcon}
            maxClusterRadius={50}
            spiderfyOnMaxZoom={true}
            showCoverageOnHover={false}
            zoomToBoundsOnClick={true}
          >
            {countries.map((countryData) => {
              const coords = COUNTRY_COORDS[countryData.country]
              if (!coords) return null

              return (
                <Marker
                  key={countryData.country}
                  position={[coords.lat, coords.lon]}
                  icon={createCustomIcon(countryData.total, countryData.country)}
                >
                  <Popup>
                    <div className="p-2">
                      <div className="font-semibold text-lg mb-1">{countryData.country}</div>
                      <div className="text-sm">
                        <div className="font-medium">Total: {countryData.total}</div>
                        <div className="flex gap-3 mt-1">
                          <span className="text-blue-600">♂ {countryData.men}</span>
                          <span className="text-pink-600">♀ {countryData.women}</span>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </MarkerClusterGroup>
        </MapContainer>
      </div>

      {/* Country list below map */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
        {countries
          .sort((a, b) => b.total - a.total)
          .map((country) => (
            <div
              key={country.country}
              className="flex items-center justify-between p-2 rounded border border-border hover:bg-accent transition-colors"
            >
              <span className="font-medium">{country.country}</span>
              <span className="text-muted-foreground">{country.total}</span>
            </div>
          ))}
      </div>
    </div>
  )
}
