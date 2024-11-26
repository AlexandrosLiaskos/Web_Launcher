import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Website {
  id: string
  title: string
  url: string
  frecency: number
  lastVisited: number
  totalVisits: number
  createdAt: number
  favicon?: string
  tags: string[]
  description?: string
  category?: string
}

interface WebsiteStats {
  totalVisits: number
  lastVisited: number
  averageVisitsPerDay: number
}

interface WebsiteStore {
  websites: Website[]
  categories: string[]
  loadWebsites: () => void
  addVisit: (websiteId: string) => void
  addWebsite: (website: Omit<Website, 'id' | 'frecency' | 'lastVisited' | 'totalVisits' | 'createdAt'>) => void
  removeWebsite: (websiteId: string) => void
  editWebsite: (websiteId: string, updates: Partial<Website>) => void
  getWebsiteStats: (websiteId: string) => WebsiteStats | null
  getMostVisitedWebsites: (limit?: number) => Website[]
  getRecentWebsites: (limit?: number) => Website[]
  addCategory: (category: string) => void
  removeCategory: (category: string) => void
}

const calculateFrecency = (lastVisited: number, visits: number) => {
  const hoursSinceLastVisit = (Date.now() - lastVisited) / (1000 * 60 * 60)
  const decayFactor = Math.pow(0.9, hoursSinceLastVisit)
  return visits * decayFactor
}

export const useWebsiteStore = create<WebsiteStore>()(
  persist(
    (set, get) => ({
      websites: [],
      categories: ['Work', 'Personal', 'Development', 'Social', 'Entertainment'],

      loadWebsites: () => {
        const savedWebsites = get().websites
        if (savedWebsites.length === 0) {
          // Default websites
          const defaultWebsites: Website[] = [
            {
              id: '1',
              title: 'GitHub',
              url: 'https://github.com',
              frecency: 0,
              lastVisited: Date.now(),
              totalVisits: 0,
              createdAt: Date.now(),
              tags: ['dev', 'code'],
              category: 'Development',
              description: 'Code hosting platform for version control and collaboration'
            },
            {
              id: '2',
              title: 'Stack Overflow',
              url: 'https://stackoverflow.com',
              frecency: 0,
              lastVisited: Date.now(),
              totalVisits: 0,
              createdAt: Date.now(),
              tags: ['dev', 'help'],
              category: 'Development',
              description: 'Developer community for solving programming problems'
            }
          ]
          set({ websites: defaultWebsites })
        }
      },

      addVisit: (websiteId: string) => {
        const websites = get().websites.map(website => {
          if (website.id === websiteId) {
            const newLastVisited = Date.now()
            const newTotalVisits = website.totalVisits + 1
            return {
              ...website,
              lastVisited: newLastVisited,
              totalVisits: newTotalVisits,
              frecency: calculateFrecency(newLastVisited, newTotalVisits)
            }
          }
          return website
        })
        set({ websites })
      },

      addWebsite: (website) => {
        const newWebsite: Website = {
          ...website,
          id: Date.now().toString(),
          frecency: 0,
          lastVisited: Date.now(),
          totalVisits: 0,
          createdAt: Date.now(),
          tags: website.tags || []
        }
        set(state => ({ websites: [...state.websites, newWebsite] }))
      },

      removeWebsite: (websiteId: string) => {
        set(state => ({
          websites: state.websites.filter(website => website.id !== websiteId)
        }))
      },

      editWebsite: (websiteId: string, updates: Partial<Website>) => {
        set(state => ({
          websites: state.websites.map(website =>
            website.id === websiteId
              ? { ...website, ...updates }
              : website
          )
        }))
      },

      getWebsiteStats: (websiteId: string) => {
        const website = get().websites.find(w => w.id === websiteId)
        if (!website) return null

        const daysSinceCreation = (Date.now() - website.createdAt) / (1000 * 60 * 60 * 24)
        return {
          totalVisits: website.totalVisits,
          lastVisited: website.lastVisited,
          averageVisitsPerDay: website.totalVisits / Math.max(1, daysSinceCreation)
        }
      },

      getMostVisitedWebsites: (limit = 10) => {
        return [...get().websites]
          .sort((a, b) => b.totalVisits - a.totalVisits)
          .slice(0, limit)
      },

      getRecentWebsites: (limit = 10) => {
        return [...get().websites]
          .sort((a, b) => b.lastVisited - a.lastVisited)
          .slice(0, limit)
      },

      addCategory: (category: string) => {
        set(state => ({
          categories: [...state.categories, category]
        }))
      },

      removeCategory: (category: string) => {
        set(state => ({
          categories: state.categories.filter(c => c !== category)
        }))
      }
    }),
    {
      name: 'website-store',
      version: 1
    }
  )
)
