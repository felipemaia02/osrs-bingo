import { apiClient } from '../../lib/api'

export interface SiteStatus {
  maintenance: boolean
  message: string | null
}

export async function fetchSiteStatus(): Promise<SiteStatus> {
  return (await apiClient.get<SiteStatus>('/status')).data
}
