// types/race.ts
export interface RaceInfo {
  id: number
  raceNameEn: string
  raceNameSv: string
  descriptionEn?: string | null
  descriptionSv?: string | null
  startDate: string // ISO timestamp
  endDate?: string | null
  locationName?: string | null
  locationAddress?: string | null
  locationLatitude?: number | null
  locationLongitude?: number | null
  liveResultsUrl?: string | null
  registrationUrl?: string | null
  officialWebsiteUrl?: string | null
  courseMapUrl?: string | null
  heroImageUrl?: string | null
  rulesEn?: string | null
  rulesSv?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  metaDescriptionEn?: string | null
  metaDescriptionSv?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface RaceInfoCreate {
  raceNameEn: string
  raceNameSv: string
  descriptionEn?: string
  descriptionSv?: string
  startDate: string
  endDate?: string
  locationName?: string
  locationAddress?: string
  locationLatitude?: number
  locationLongitude?: number
  liveResultsUrl?: string
  registrationUrl?: string
  officialWebsiteUrl?: string
  courseMapUrl?: string
  heroImageUrl?: string
  rulesEn?: string
  rulesSv?: string
  contactEmail?: string
  contactPhone?: string
  metaDescriptionEn?: string
  metaDescriptionSv?: string
}

export interface RaceInfoUpdate {
  raceNameEn?: string
  raceNameSv?: string
  descriptionEn?: string
  descriptionSv?: string
  startDate?: string
  endDate?: string
  locationName?: string
  locationAddress?: string
  locationLatitude?: number
  locationLongitude?: number
  liveResultsUrl?: string
  registrationUrl?: string
  officialWebsiteUrl?: string
  courseMapUrl?: string
  heroImageUrl?: string
  rulesEn?: string
  rulesSv?: string
  contactEmail?: string
  contactPhone?: string
  metaDescriptionEn?: string
  metaDescriptionSv?: string
  isActive?: boolean
}

export interface RaceDocument {
  id: number
  raceId: number
  titleEn: string
  titleSv: string
  descriptionEn?: string | null
  descriptionSv?: string | null
  documentUrl: string
  documentType?: string | null
  fileSizeBytes?: number | null
  displayOrder: number
  createdAt: string
}

export interface RaceDocumentCreate {
  raceId: number
  titleEn: string
  titleSv: string
  descriptionEn?: string
  descriptionSv?: string
  documentUrl: string
  documentType?: string
  fileSizeBytes?: number
  displayOrder?: number
}
