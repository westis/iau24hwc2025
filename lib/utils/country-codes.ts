import { byIso } from 'country-code-lookup'

/**
 * Convert IOC (International Olympic Committee) or ISO-3 country code to ISO-2 code
 * Used for displaying country flags with react-country-flag library
 *
 * @param code - 3-letter country code (can be IOC or ISO-3)
 * @returns 2-letter ISO country code for flag display
 */
export function getCountryCodeForFlag(code: string): string {
  if (!code) return ''

  const upperCode = code.toUpperCase()

  // IOC to ISO-2 mapping (for codes that differ from ISO-3)
  // Comprehensive mapping for all IOC codes used in international athletics
  const iocToIso2: Record<string, string> = {
    // Europe
    'GER': 'DE', // Germany
    'NED': 'NL', // Netherlands
    'SUI': 'CH', // Switzerland
    'CRO': 'HR', // Croatia
    'SLO': 'SI', // Slovenia
    'LAT': 'LV', // Latvia
    'POR': 'PT', // Portugal
    'GRE': 'GR', // Greece
    'DEN': 'DK', // Denmark
    'SWE': 'SE', // Sweden
    'NOR': 'NO', // Norway
    'FIN': 'FI', // Finland
    'AUT': 'AT', // Austria
    'BEL': 'BE', // Belgium
    'CZE': 'CZ', // Czech Republic
    'POL': 'PL', // Poland
    'HUN': 'HU', // Hungary
    'ROU': 'RO', // Romania
    'BUL': 'BG', // Bulgaria
    'SVK': 'SK', // Slovakia
    'SRB': 'RS', // Serbia
    'UKR': 'UA', // Ukraine
    'BLR': 'BY', // Belarus
    'LTU': 'LT', // Lithuania
    'EST': 'EE', // Estonia
    'IRL': 'IE', // Ireland
    'ESP': 'ES', // Spain
    'ITA': 'IT', // Italy
    'FRA': 'FR', // France
    'GBR': 'GB', // Great Britain
    'ENG': 'GB', // England
    'SCO': 'GB', // Scotland
    'WAL': 'GB', // Wales
    'NIR': 'GB', // Northern Ireland
    'ISL': 'IS', // Iceland
    'LUX': 'LU', // Luxembourg
    'MLT': 'MT', // Malta
    'CYP': 'CY', // Cyprus
    'MNE': 'ME', // Montenegro
    'MKD': 'MK', // North Macedonia
    'BIH': 'BA', // Bosnia and Herzegovina
    'ALB': 'AL', // Albania
    'MDA': 'MD', // Moldova
    'ARM': 'AM', // Armenia
    'GEO': 'GE', // Georgia
    'AZE': 'AZ', // Azerbaijan

    // Asia & Middle East
    'CHN': 'CN', // China
    'JPN': 'JP', // Japan
    'KOR': 'KR', // South Korea
    'TPE': 'TW', // Chinese Taipei (Taiwan)
    'HKG': 'HK', // Hong Kong
    'IND': 'IN', // India
    'THA': 'TH', // Thailand
    'MAS': 'MY', // Malaysia
    'SGP': 'SG', // Singapore
    'INA': 'ID', // Indonesia
    'PHI': 'PH', // Philippines
    'VIE': 'VN', // Vietnam
    'PAK': 'PK', // Pakistan
    'BAN': 'BD', // Bangladesh
    'SRI': 'LK', // Sri Lanka
    'NEP': 'NP', // Nepal
    'IRN': 'IR', // Iran
    'IRQ': 'IQ', // Iraq
    'ISR': 'IL', // Israel
    'JOR': 'JO', // Jordan
    'LIB': 'LB', // Lebanon
    'SYR': 'SY', // Syria
    'KSA': 'SA', // Saudi Arabia
    'UAE': 'AE', // United Arab Emirates
    'KUW': 'KW', // Kuwait
    'QAT': 'QA', // Qatar
    'BRN': 'BH', // Bahrain
    'OMA': 'OM', // Oman
    'YEM': 'YE', // Yemen
    'KAZ': 'KZ', // Kazakhstan
    'UZB': 'UZ', // Uzbekistan
    'TKM': 'TM', // Turkmenistan
    'KGZ': 'KG', // Kyrgyzstan
    'TJK': 'TJ', // Tajikistan
    'MGL': 'MN', // Mongolia

    // Americas
    'USA': 'US', // United States
    'CAN': 'CA', // Canada
    'MEX': 'MX', // Mexico
    'BRA': 'BR', // Brazil
    'ARG': 'AR', // Argentina
    'CHI': 'CL', // Chile
    'COL': 'CO', // Colombia
    'PER': 'PE', // Peru
    'VEN': 'VE', // Venezuela
    'ECU': 'EC', // Ecuador
    'URU': 'UY', // Uruguay
    'PAR': 'PY', // Paraguay
    'BOL': 'BO', // Bolivia
    'CRC': 'CR', // Costa Rica
    'PAN': 'PA', // Panama
    'GUA': 'GT', // Guatemala
    'HON': 'HN', // Honduras
    'ESA': 'SV', // El Salvador
    'NCA': 'NI', // Nicaragua
    'CUB': 'CU', // Cuba
    'DOM': 'DO', // Dominican Republic
    'PUR': 'PR', // Puerto Rico
    'JAM': 'JM', // Jamaica
    'TRI': 'TT', // Trinidad and Tobago
    'BAR': 'BB', // Barbados
    'BAH': 'BS', // Bahamas
    'HAI': 'HT', // Haiti
    'GUY': 'GY', // Guyana
    'SUR': 'SR', // Suriname

    // Africa
    'RSA': 'ZA', // South Africa
    'EGY': 'EG', // Egypt
    'ETH': 'ET', // Ethiopia
    'KEN': 'KE', // Kenya
    'NGR': 'NG', // Nigeria
    'GHA': 'GH', // Ghana
    'TAN': 'TZ', // Tanzania
    'UGA': 'UG', // Uganda
    'ALG': 'DZ', // Algeria
    'MAR': 'MA', // Morocco
    'TUN': 'TN', // Tunisia
    'ZIM': 'ZW', // Zimbabwe
    'ZAM': 'ZM', // Zambia
    'BOT': 'BW', // Botswana
    'NAM': 'NA', // Namibia
    'CMR': 'CM', // Cameroon
    'CIV': 'CI', // Ivory Coast
    'SEN': 'SN', // Senegal
    'ANG': 'AO', // Angola
    'MOZ': 'MZ', // Mozambique
    'MRI': 'MU', // Mauritius
    'MAD': 'MG', // Madagascar
    'LBA': 'LY', // Libya
    'SUD': 'SD', // Sudan
    'SLE': 'SL', // Sierra Leone
    'LBR': 'LR', // Liberia
    'GAM': 'GM', // Gambia
    'GUI': 'GN', // Guinea
    'GBS': 'GW', // Guinea-Bissau
    'BUR': 'BF', // Burkina Faso
    'MLI': 'ML', // Mali
    'NIG': 'NE', // Niger
    'CHA': 'TD', // Chad
    'CAF': 'CF', // Central African Republic
    'CGO': 'CG', // Congo
    'COD': 'CD', // DR Congo
    'GAB': 'GA', // Gabon
    'GEQ': 'GQ', // Equatorial Guinea
    'RWA': 'RW', // Rwanda
    'BDI': 'BI', // Burundi
    'ERI': 'ER', // Eritrea
    'DJI': 'DJ', // Djibouti
    'SOM': 'SO', // Somalia
    'TOG': 'TG', // Togo
    'BEN': 'BJ', // Benin
    'LES': 'LS', // Lesotho
    'SWZ': 'SZ', // Eswatini (Swaziland)
    'MAW': 'MW', // Malawi

    // Oceania
    'AUS': 'AU', // Australia
    'NZL': 'NZ', // New Zealand
    'FIJ': 'FJ', // Fiji
    'PNG': 'PG', // Papua New Guinea
    'SAM': 'WS', // Samoa
    'TON': 'TO', // Tonga
    'COK': 'CK', // Cook Islands
    'SOL': 'SB', // Solomon Islands
    'VAN': 'VU', // Vanuatu
  }

  // First check IOC mapping
  if (iocToIso2[upperCode]) {
    return iocToIso2[upperCode]
  }

  // Try ISO-3 lookup (handles USA, GBR, FRA, etc.)
  try {
    const isoResult = byIso(upperCode)
    if (isoResult?.iso2) {
      return isoResult.iso2
    }
  } catch (e) {
    // Not found in ISO-3 either
  }

  // Fallback: return the original code (might still work for some flags)
  return upperCode
}
