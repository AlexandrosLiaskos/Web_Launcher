import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { db } from '../config/firebase'
import { collection, doc, setDoc, getDocs, onSnapshot, query, where } from 'firebase/firestore'
import { ensureHttps } from '../utils/url'
import { auth } from '../config/firebase'

export interface Website {
  id: string
  title: string
  url: string
  description?: string
  preview?: string
  favicon?: string
  tags: string[]
  visits: number
  lastVisit?: Date
  createdAt: Date
  userId: string
}

export interface WebsiteGroup {
  id: string
  name: string
  description?: string
  isExpanded?: boolean
  createdAt: Date
  userId: string
}

interface WebsiteState {
  websites: Website[]
  groups: WebsiteGroup[]
  visits: { [key: string]: number }
  currentUser: string | null
}

interface WebsiteStore extends WebsiteState {
  setCurrentUser: (userId: string | null) => void
  loadWebsites: () => Website[]
  addVisit: (websiteId: string) => void
  addWebsite: (website: Omit<Website, 'id' | 'visits' | 'createdAt' | 'userId'>) => void
  removeWebsite: (websiteId: string) => void
  editWebsite: (websiteId: string, updates: Partial<Website>) => void
  getWebsiteStats: (websiteId: string) => { totalVisits: number, lastVisited: number, averageVisitsPerDay: number } | null
  getMostVisitedWebsites: (limit?: number) => Website[]
  getRecentWebsites: (limit?: number) => Website[]
  addGroup: (name: string, description?: string) => void
  updateGroup: (id: string, updates: Partial<WebsiteGroup>) => void
  deleteGroup: (id: string) => void
  toggleGroupExpansion: (id: string) => void
  getTags: () => string[]
  getWebsitesByTag: (tag: string) => Website[]
}

const calculateFrecency = (lastVisited: number, visits: number) => {
  const hoursSinceLastVisit = (Date.now() - lastVisited) / (1000 * 60 * 60)
  const decayFactor = Math.pow(0.9, hoursSinceLastVisit)
  return visits * decayFactor
}

const syncWithFirestore = async (userId: string, websites: Website[], groups: WebsiteGroup[]) => {
  try {
    // Create a batch of website documents
    const websitesPromises = websites.map(website => 
      setDoc(doc(db, `users/${userId}/websites/${website.id}`), website)
    );

    // Create a batch of group documents
    const groupsPromises = groups.map(group => 
      setDoc(doc(db, `users/${userId}/groups/${group.id}`), group)
    );

    // Wait for all operations to complete
    await Promise.all([...websitesPromises, ...groupsPromises]);
  } catch (error) {
    console.error('Error syncing with Firestore:', error);
  }
};

const loadFromFirestore = async (userId: string) => {
  try {
    // Get websites
    const websitesSnapshot = await getDocs(collection(db, `users/${userId}/websites`));
    const websites = websitesSnapshot.docs.map(doc => doc.data() as Website);

    // Get groups
    const groupsSnapshot = await getDocs(collection(db, `users/${userId}/groups`));
    const groups = groupsSnapshot.docs.map(doc => doc.data() as WebsiteGroup);

    return { websites, groups };
  } catch (error) {
    console.error('Error loading from Firestore:', error);
    return { websites: [], groups: [] };
  }
};

export const useWebsiteStore = create<WebsiteStore>()(
  persist(
    (set, get) => ({
      currentUser: null,
      websites: [],
      groups: [],
      visits: {},

      setCurrentUser: async (userId: string | null) => {
        set({ currentUser: userId });
        
        if (userId) {
          // Load data from Firestore when user logs in
          const { websites, groups } = await loadFromFirestore(userId);
          
          // If there's local data but no Firestore data, sync local to Firestore
          const state = get();
          if (websites.length === 0 && state.websites.length > 0) {
            await syncWithFirestore(userId, state.websites, state.groups);
          } 
          // If there's Firestore data, use it
          else if (websites.length > 0) {
            set({ websites, groups });
          }

          // Set up real-time sync
          const websitesQuery = query(
            collection(db, `users/${userId}/websites`),
            where('userId', '==', userId)
          );

          const groupsQuery = query(
            collection(db, `users/${userId}/groups`),
            where('userId', '==', userId)
          );

          // Listen for website changes
          onSnapshot(websitesQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              const website = change.doc.data() as Website;
              if (change.type === 'added' || change.type === 'modified') {
                set(state => ({
                  websites: state.websites.filter(w => w.id !== website.id).concat(website)
                }));
              } else if (change.type === 'removed') {
                set(state => ({
                  websites: state.websites.filter(w => w.id !== website.id)
                }));
              }
            });
          });

          // Listen for group changes
          onSnapshot(groupsQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              const group = change.doc.data() as WebsiteGroup;
              if (change.type === 'added' || change.type === 'modified') {
                set(state => ({
                  groups: state.groups.filter(g => g.id !== group.id).concat(group)
                }));
              } else if (change.type === 'removed') {
                set(state => ({
                  groups: state.groups.filter(g => g.id !== group.id)
                }));
              }
            });
          });
        }
      },

      loadWebsites: () => {
        const { websites, currentUser } = get();
        return currentUser ? websites.filter(w => w.userId === currentUser) : [];
      },

      addVisit: (websiteId: string) => {
        const { currentUser } = get();
        if (!currentUser) return;

        set(state => ({
          websites: state.websites.map(website =>
            website.id === websiteId && website.userId === currentUser
              ? {
                  ...website,
                  visits: website.visits + 1,
                  lastVisit: new Date(),
                }
              : website
          )
        }));

        // Sync to Firestore
        const website = get().websites.find(w => w.id === websiteId);
        if (website) {
          setDoc(doc(db, `users/${currentUser}/websites/${websiteId}`), website);
        }
      },

      addWebsite: (website) => {
        const { currentUser } = get();
        if (!currentUser) return;

        const newWebsite: Website = {
          ...website,
          id: crypto.randomUUID(),
          visits: 0,
          createdAt: new Date(),
          userId: currentUser
        };

        set(state => ({
          websites: [...state.websites, newWebsite]
        }));

        // Sync to Firestore
        setDoc(doc(db, `users/${currentUser}/websites/${newWebsite.id}`), newWebsite);
      },

      removeWebsite: (websiteId: string) => {
        const { currentUser } = get();
        if (!currentUser) return;

        set(state => ({
          websites: state.websites.filter(w => 
            !(w.id === websiteId && w.userId === currentUser)
          )
        }));

        // Remove from Firestore
        setDoc(doc(db, `users/${currentUser}/websites/${websiteId}`), { deleted: true });
      },

      editWebsite: (websiteId: string, updates: Partial<Website>) => {
        const { currentUser } = get();
        if (!currentUser) return;

        set(state => ({
          websites: state.websites.map(website =>
            website.id === websiteId && website.userId === currentUser
              ? { ...website, ...updates }
              : website
          )
        }));

        // Sync to Firestore
        const website = get().websites.find(w => w.id === websiteId);
        if (website) {
          setDoc(doc(db, `users/${currentUser}/websites/${websiteId}`), website);
        }
      },

      getWebsiteStats: (websiteId: string) => {
        const website = get().websites.find(w => w.id === websiteId)
        if (!website) return null

        const daysSinceCreation = (Date.now() - website.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        return {
          totalVisits: website.visits,
          lastVisited: website.lastVisit?.getTime(),
          averageVisitsPerDay: daysSinceCreation > 0 ? website.visits / daysSinceCreation : 0
        }
      },

      getMostVisitedWebsites: (limit = 10) => {
        const { websites, currentUser } = get();
        if (!currentUser) return [];
        
        return websites
          .filter(w => w.userId === currentUser)
          .sort((a, b) => b.visits - a.visits)
          .slice(0, limit);
      },

      getRecentWebsites: (limit = 10) => {
        const { websites, currentUser } = get();
        if (!currentUser) return [];

        return websites
          .filter(w => w.userId === currentUser)
          .sort((a, b) => {
            const dateA = a.lastVisit || a.createdAt;
            const dateB = b.lastVisit || b.createdAt;
            return dateB.getTime() - dateA.getTime();
          })
          .slice(0, limit);
      },

      addGroup: (name: string, description?: string) => {
        const { currentUser } = get();
        if (!currentUser) return;

        const newGroup: WebsiteGroup = {
          id: crypto.randomUUID(),
          name,
          description,
          isExpanded: true,
          createdAt: new Date(),
          userId: currentUser
        };

        set(state => ({
          groups: [...state.groups, newGroup]
        }));

        // Sync to Firestore
        setDoc(doc(db, `users/${currentUser}/groups/${newGroup.id}`), newGroup);
      },

      updateGroup: (id: string, updates: Partial<WebsiteGroup>) => {
        const { currentUser } = get();
        if (!currentUser) return;

        set(state => ({
          groups: state.groups.map(group =>
            group.id === id && group.userId === currentUser
              ? { ...group, ...updates }
              : group
          )
        }));

        // Sync to Firestore
        const group = get().groups.find(g => g.id === id);
        if (group) {
          setDoc(doc(db, `users/${currentUser}/groups/${id}`), group);
        }
      },

      deleteGroup: (id: string) => {
        const { currentUser } = get();
        if (!currentUser) return;

        set(state => ({
          groups: state.groups.filter(g => 
            !(g.id === id && g.userId === currentUser)
          )
        }));

        // Remove from Firestore
        setDoc(doc(db, `users/${currentUser}/groups/${id}`), { deleted: true });
      },

      toggleGroupExpansion: (id: string) => {
        set((state) => ({
          groups: state.groups.map(group =>
            group.id === id ? { ...group, isExpanded: !group.isExpanded } : group
          )
        }));

        // Sync to Firestore
        const group = get().groups.find(g => g.id === id);
        if (group) {
          setDoc(doc(db, `users/${currentUser}/groups/${id}`), group);
        }
      },

      getTags: () => {
        const { websites, currentUser } = get();
        if (!currentUser) return [];

        return [...new Set(
          websites
            .filter(w => w.userId === currentUser)
            .flatMap(website => website.tags)
        )];
      },

      getWebsitesByTag: (tag: string) => {
        const { websites, currentUser } = get();
        if (!currentUser) return [];

        return websites
          .filter(w => w.userId === currentUser && w.tags.includes(tag));
      },
    }),
    {
      name: 'website-store',
      version: 1
    }
  )
)
