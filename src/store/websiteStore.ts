import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ensureHttps } from '../utils/url'
import { auth } from '../config/firebase'

export interface Website {
  preview: any
  id: string
  title: string
  url: string
  frecency: number
  lastVisited: number
  visits: number
  totalVisits: number
  createdAt: number
  favicon?: string
  tags: string[]
  description?: string
  category?: string
  userId: string
}

interface WebsiteStats {
  totalVisits: number
  lastVisited: number
  averageVisitsPerDay: number
}

interface WebsiteStore {
  currentUser: string | null
  websites: Website[]
  categories: string[]
  loadWebsites: () => Website[]
  setCurrentUser: (userId: string | null) => void
  addVisit: (websiteId: string) => void
  addWebsite: (website: Omit<Website, 'id' | 'frecency' | 'lastVisited' | 'visits' | 'totalVisits' | 'createdAt'>) => void
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
      currentUser: null,
      websites: [],
      categories: [],

      loadWebsites: () => {
        const { websites, currentUser } = get();
        return currentUser ? websites.filter(w => w.userId === currentUser) : [];
      },

      setCurrentUser: (userId: string | null) => {
        set({ currentUser: userId });
      },

      addVisit: (websiteId: string) => {
        set(state => ({
          websites: state.websites.map(website =>
            website.id === websiteId
              ? {
                  ...website,
                  visits: website.visits + 1,
                  totalVisits: (website.totalVisits || 0) + 1,
                  lastVisited: Date.now(),
                  frecency: calculateFrecency(Date.now(), website.visits + 1)
                }
              : website
          )
        }))
      },

      addWebsite: (website) => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const now = Date.now();
        const newWebsite: Website = {
          ...website,
          id: crypto.randomUUID(),
          frecency: 0,
          visits: 0,
          totalVisits: 0,
          lastVisited: now,
          createdAt: now,
          tags: website.tags || [],
          userId: currentUser.uid,
          url: ensureHttps(website.url)
        };

        set(state => ({
          websites: [...state.websites, newWebsite]
        }));
      },

      removeWebsite: (websiteId: string) => {
        set(state => ({
          websites: state.websites.filter(w => w.id !== websiteId)
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
          totalVisits: website.totalVisits || 0,
          lastVisited: website.lastVisited,
          averageVisitsPerDay: daysSinceCreation > 0 ? website.totalVisits / daysSinceCreation : 0
        }
      },

      getMostVisitedWebsites: (limit = 10) => {
        const { websites, currentUser } = get();
        return websites
          .filter(w => w.userId === currentUser)
          .sort((a, b) => (b.totalVisits || 0) - (a.totalVisits || 0))
          .slice(0, limit);
      },

      getRecentWebsites: (limit = 10) => {
        const { websites, currentUser } = get();
        return websites
          .filter(w => w.userId === currentUser)
          .sort((a, b) => b.lastVisited - a.lastVisited)
          .slice(0, limit);
      },

      addCategory: (category: string) => {
        set(state => ({
          categories: [...new Set([...state.categories, category])]
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
