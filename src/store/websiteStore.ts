import { create } from 'zustand';
// import { persist } from 'zustand/middleware'; // Removed persist
import { db } from '../config/firebase'; // Import auth
import { collection, doc, setDoc, getDocs, onSnapshot, query, where, updateDoc } from 'firebase/firestore'; // Import updateDoc, writeBatch, getDoc
// import { ensureHttps } from '../utils/url'; // Keep if used elsewhere, but not directly in store logic shown

export interface Website {
  id: string;
  title: string;
  url: string;
  description?: string;
  preview?: string;
  favicon?: string;
  tags: string[];
  // category?: string; // Removed unused category field
  visits: number;
  lastVisit?: Date; // Store as Timestamp or ISO string for Firestore, convert on read/write
  createdAt: Date; // Store as Timestamp or ISO string
  userId: string;
  deleted?: boolean;
  deletedAt?: Date; // Store as Timestamp or ISO string
}

export interface WebsiteGroup {
  id: string;
  name: string;
  description?: string;
  isExpanded?: boolean;
  createdAt: Date; // Store as Timestamp or ISO string
  userId: string;
  deleted?: boolean;
  deletedAt?: Date; // Store as Timestamp or ISO string
}

// Type for data stored in Firestore (using ISO strings for dates)
interface FirestoreWebsite extends Omit<Website, 'lastVisit' | 'createdAt' | 'deletedAt'> {
  lastVisit?: string;
  createdAt: string;
  deletedAt?: string;
}
interface FirestoreGroup extends Omit<WebsiteGroup, 'createdAt' | 'deletedAt'> {
  createdAt: string;
  deletedAt?: string;
}

// Helper to convert Firestore data to application state
const fromFirestoreWebsite = (data: FirestoreWebsite): Website => ({
  ...data,
  lastVisit: data.lastVisit ? new Date(data.lastVisit) : undefined,
  createdAt: new Date(data.createdAt),
  deletedAt: data.deletedAt ? new Date(data.deletedAt) : undefined,
});

// Helper to convert application state to Firestore data
const toFirestoreWebsite = (website: Website): FirestoreWebsite => ({
  ...website,
  lastVisit: website.lastVisit?.toISOString(),
  createdAt: website.createdAt.toISOString(),
  deletedAt: website.deletedAt?.toISOString(),
});
const toFirestoreGroup = (group: WebsiteGroup): FirestoreGroup => ({
    ...group,
    createdAt: group.createdAt.toISOString(),
    deletedAt: group.deletedAt?.toISOString(),
});


interface WebsiteState {
  websites: Website[];
  groups: WebsiteGroup[];
  currentUser: string | null;
  isLoading: boolean; // Add loading state
}

// Adjusted Omit type for addWebsite argument
export type AddWebsitePayload = Omit<Website, 'id' | 'visits' | 'createdAt' | 'userId' | 'deleted' | 'deletedAt' | 'lastVisit' | 'category'>; // Removed category

interface WebsiteStore extends WebsiteState {
  setCurrentUser: (userId: string | null) => Promise<void>; // Make async
  loadWebsitesAndGroups: (userId: string) => Promise<void>; // Renamed and specific user ID
  setupFirestoreListeners: (userId: string) => void; // Added helper for listeners
  addVisit: (websiteId: string) => Promise<void>; // Make async
  addWebsite: (website: AddWebsitePayload) => Promise<void>; // Make async, adjusted payload type
  removeWebsite: (websiteId: string) => Promise<void>; // Make async
  editWebsite: (websiteId: string, updates: Partial<Omit<Website, 'id' | 'userId' | 'createdAt'>>) => Promise<void>; // Make async, prevent editing certain fields
  getMostVisitedWebsites: (limit?: number) => Website[];
  getRecentWebsites: (limit?: number) => Website[];
  addGroup: (name: string, description?: string) => Promise<void>; // Make async
  updateGroup: (id: string, updates: Partial<Omit<WebsiteGroup, 'id' | 'userId' | 'createdAt'>>) => Promise<void>; // Make async
  deleteGroup: (id: string) => Promise<void>; // Make async
  toggleGroupExpansion: (id: string) => Promise<void>; // Make async
  getTags: () => string[];
  getWebsitesByTag: (tag: string) => Website[];
  unsubscribeWebsiteListener: (() => void) | null; // Store unsubscribe functions
  unsubscribeGroupListener: (() => void) | null;
}

// No need to sync *all* data on every change with Firestore listeners active
// const syncWithFirestore = ...

// Keep loadFromFirestore for initial load
const loadFromFirestore = async (userId: string): Promise<{ websites: Website[], groups: WebsiteGroup[] }> => {
  try {
    const websitesQuery = query(collection(db, `users/${userId}/websites`), where('deleted', '!=', true));
    const groupsQuery = query(collection(db, `users/${userId}/groups`), where('deleted', '!=', true));

    const [websitesSnapshot, groupsSnapshot] = await Promise.all([
        getDocs(websitesQuery),
        getDocs(groupsQuery)
    ]);

    const websites = websitesSnapshot.docs.map(doc => fromFirestoreWebsite(doc.data() as FirestoreWebsite));
    const groups = groupsSnapshot.docs.map(doc => doc.data() as WebsiteGroup); // Assuming groups don't need date conversion here, adjust if they do

    return { websites, groups };
  } catch (error) {
    console.error('Error loading from Firestore:', error);
    return { websites: [], groups: [] };
  }
};

export const useWebsiteStore = create<WebsiteStore>()(
  // Remove persist middleware if Firestore is the source of truth after initial load/login
  // persist(
    (set, get) => ({
      currentUser: null,
      websites: [],
      groups: [],
      isLoading: true, // Start in loading state
      unsubscribeWebsiteListener: null,
      unsubscribeGroupListener: null,

      setCurrentUser: async (userId: string | null) => {
          const { unsubscribeWebsiteListener, unsubscribeGroupListener } = get();
          // Unsubscribe from previous user's listeners
          if (unsubscribeWebsiteListener) unsubscribeWebsiteListener();
          if (unsubscribeGroupListener) unsubscribeGroupListener();

          set({ currentUser: userId, websites: [], groups: [], isLoading: !!userId, unsubscribeWebsiteListener: null, unsubscribeGroupListener: null }); // Reset state

          if (userId) {
              await get().loadWebsitesAndGroups(userId); // Load initial data
              get().setupFirestoreListeners(userId); // Setup new listeners
          }
      },

      loadWebsitesAndGroups: async (userId: string) => {
        set({ isLoading: true });
        try {
          const { websites, groups } = await loadFromFirestore(userId);
          set({ websites, groups, isLoading: false });
        } catch (error) {
          console.error("Failed to load data:", error);
          set({ isLoading: false }); // Ensure loading stops on error
        }
      },

      setupFirestoreListeners: (userId: string) => {
          const { unsubscribeWebsiteListener, unsubscribeGroupListener } = get();
          // Ensure previous listeners are cleared (safety check)
          if (unsubscribeWebsiteListener) unsubscribeWebsiteListener();
          if (unsubscribeGroupListener) unsubscribeGroupListener();

          const websitesQuery = query(
              collection(db, `users/${userId}/websites`),
              where('userId', '==', userId) // Ensure we only get the user's data
          );

          const groupsQuery = query(
              collection(db, `users/${userId}/groups`),
              where('userId', '==', userId)
          );

          const unsubWebsites = onSnapshot(websitesQuery, (snapshot) => {
              const currentWebsites = get().websites;
              const changes = snapshot.docChanges();
              let updatedWebsites = [...currentWebsites]; // Start with current state

              changes.forEach((change) => {
                  const websiteData = change.doc.data() as FirestoreWebsite;
                  const website = fromFirestoreWebsite(websiteData);
                  const index = updatedWebsites.findIndex(w => w.id === website.id);

                  if (website.deleted) { // Handle deletion/soft delete
                      if (index !== -1) {
                          updatedWebsites.splice(index, 1); // Remove from local state
                      }
                  } else if (change.type === 'added') {
                      if (index === -1) { // Add only if not already present
                          updatedWebsites.push(website);
                      } else { // If present (e.g., offline add synced), update it
                          updatedWebsites[index] = website;
                      }
                  } else if (change.type === 'modified') {
                      if (index !== -1) {
                          updatedWebsites[index] = website; // Update existing
                      } else {
                           // Should ideally not happen if 'added' is handled correctly, but maybe add as fallback
                           updatedWebsites.push(website);
                      }
                  } else if (change.type === 'removed') { // Handle hard delete (if ever implemented)
                      if (index !== -1) {
                          updatedWebsites.splice(index, 1);
                      }
                  }
              });
               // Sort websites once after processing all changes (optional)
               updatedWebsites.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
              set({ websites: updatedWebsites });
          }, (error) => {
              console.error("Website listener error:", error);
          });

          const unsubGroups = onSnapshot(groupsQuery, (snapshot) => {
              const currentGroups = get().groups;
              const changes = snapshot.docChanges();
              let updatedGroups = [...currentGroups];

              changes.forEach((change) => {
                  const groupData = change.doc.data() as FirestoreGroup;
                  // Assuming group data doesn't need complex conversion like dates for now
                  const group: WebsiteGroup = groupData as any; // Adjust if conversion needed
                  const index = updatedGroups.findIndex(g => g.id === group.id);

                  if (group.deleted) {
                      if (index !== -1) updatedGroups.splice(index, 1);
                  } else if (change.type === 'added') {
                      if (index === -1) updatedGroups.push(group);
                      else updatedGroups[index] = group; // Update if exists
                  } else if (change.type === 'modified') {
                      if (index !== -1) updatedGroups[index] = group;
                      else updatedGroups.push(group);
                  } else if (change.type === 'removed') {
                      if (index !== -1) updatedGroups.splice(index, 1);
                  }
              });
              // Sort groups (optional)
              updatedGroups.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
              set({ groups: updatedGroups });
          }, (error) => {
              console.error("Group listener error:", error);
          });

          set({ unsubscribeWebsiteListener: unsubWebsites, unsubscribeGroupListener: unsubGroups });
      },

      // loadWebsites: () => { // Replaced by loadWebsitesAndGroups
      //   const { websites, currentUser } = get();
      //   return currentUser ? websites.filter(w => w.userId === currentUser) : [];
      // },

      addVisit: async (websiteId: string) => {
        const { currentUser, websites } = get();
        if (!currentUser) return;

        const websiteIndex = websites.findIndex(w => w.id === websiteId && w.userId === currentUser);
        if (websiteIndex === -1) return;

        const websiteToUpdate = websites[websiteIndex];
        const updatedWebsite: Website = {
            ...websiteToUpdate,
            visits: (websiteToUpdate.visits || 0) + 1,
            lastVisit: new Date(),
        };

        // Optimistically update local state
        const updatedWebsites = [...websites];
        updatedWebsites[websiteIndex] = updatedWebsite;
        set({ websites: updatedWebsites });


        // Sync change to Firestore
        try {
            const websiteRef = doc(db, `users/${currentUser}/websites/${websiteId}`);
            await updateDoc(websiteRef, {
                visits: updatedWebsite.visits,
                lastVisit: updatedWebsite.lastVisit?.toISOString() // Send as ISO string
            });
        } catch (error) {
            console.error("Error updating visit count in Firestore:", error);
            // Optionally revert local state or show error
            set(state => ({ websites: state.websites.map(w => w.id === websiteId ? websiteToUpdate : w) })); // Revert optimistic update
        }
      },

      addWebsite: async (websiteData: AddWebsitePayload) => {
        const { currentUser } = get();
        if (!currentUser) {
             console.error("Cannot add website: No user logged in.");
             return; // Or throw error
        }

        const newWebsite: Website = {
          ...websiteData,
          id: crypto.randomUUID(),
          visits: 0,
          createdAt: new Date(),
          userId: currentUser,
          tags: websiteData.tags || [], // Ensure tags is an array
          // Ensure other optional fields are handled or defaulted if needed
          description: websiteData.description || '',
          preview: websiteData.preview || '',
          favicon: websiteData.favicon || '',
          // category: websiteData.category || '', // Removed category
        };

        // Optimistically update local state
        set(state => ({
          websites: [...state.websites, newWebsite]
        }));

        // Sync to Firestore
        try {
            const firestoreData = toFirestoreWebsite(newWebsite);
            await setDoc(doc(db, `users/${currentUser}/websites/${newWebsite.id}`), firestoreData);
        } catch (error) {
            console.error("Error adding website to Firestore:", error);
            // Revert local state on failure
            set(state => ({
                websites: state.websites.filter(w => w.id !== newWebsite.id)
            }));
            // Optionally re-throw or handle error
        }
      },

      removeWebsite: async (websiteId: string) => {
        const { currentUser, websites } = get();
        if (!currentUser) return;

        const websiteToRemove = websites.find(w => w.id === websiteId && w.userId === currentUser);
        if (!websiteToRemove) return; // Website not found

        // Optimistically update local state
        set(state => ({
          websites: state.websites.filter(w => w.id !== websiteId)
        }));

        // Perform soft delete in Firestore
        try {
            const websiteRef = doc(db, `users/${currentUser}/websites/${websiteId}`);
            await updateDoc(websiteRef, {
                deleted: true,
                deletedAt: new Date().toISOString() // Send as ISO string
            });
        } catch (error) {
            console.error("Error removing website from Firestore:", error);
            // Revert local state on failure
            set(state => ({
                websites: [...state.websites, websiteToRemove].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()) // Add back and sort
            }));
        }
      },

      editWebsite: async (websiteId: string, updates: Partial<Omit<Website, 'id' | 'userId' | 'createdAt'>>) => {
        const { currentUser, websites } = get();
        if (!currentUser) return;

        const websiteIndex = websites.findIndex(w => w.id === websiteId && w.userId === currentUser);
        if (websiteIndex === -1) return;

        const originalWebsite = websites[websiteIndex];
        const updatedWebsite: Website = { ...originalWebsite, ...updates };

         // Ensure tags is always an array
         if (updates.tags && !Array.isArray(updates.tags)) {
            console.warn("Tags update was not an array, converting.");
            updatedWebsite.tags = []; // Or handle conversion if possible
         } else if (!updatedWebsite.tags) {
             updatedWebsite.tags = [];
         }


        // Optimistically update local state
        const updatedWebsites = [...websites];
        updatedWebsites[websiteIndex] = updatedWebsite;
        set({ websites: updatedWebsites });

        // Sync to Firestore
        try {
            const websiteRef = doc(db, `users/${currentUser}/websites/${websiteId}`);
            // Prepare updates for Firestore, converting Date objects to ISO strings
            const firestoreUpdates: any = { ...updates }; // Use 'any' for flexibility here
            if (updates.lastVisit instanceof Date) {
                firestoreUpdates.lastVisit = updates.lastVisit.toISOString();
            } else if (updates.lastVisit === null || updates.lastVisit === undefined) {
                // If you want to explicitly set it to null in Firestore:
                // firestoreUpdates.lastVisit = null;
                // Otherwise, just don't include it in the update:
                delete firestoreUpdates.lastVisit;
            }
            if (updates.deletedAt instanceof Date) {
                firestoreUpdates.deletedAt = updates.deletedAt.toISOString();
            } else if (updates.deletedAt === null || updates.deletedAt === undefined) {
                 delete firestoreUpdates.deletedAt;
            }
            // Ensure fields managed elsewhere aren't accidentally updated
            delete firestoreUpdates.visits;
            delete firestoreUpdates.createdAt; // Cannot be updated
            delete firestoreUpdates.userId; // Cannot be updated
            delete firestoreUpdates.id; // Cannot be updated

            await updateDoc(websiteRef, firestoreUpdates);
        } catch (error) {
            console.error("Error editing website in Firestore:", error);
            // Revert local state on failure
            set(state => ({ websites: state.websites.map(w => w.id === websiteId ? originalWebsite : w) }));
        }
      },

      // getWebsiteStats: removed (derive from website object directly if needed)

      getMostVisitedWebsites: (limit = 10) => {
        const { websites, currentUser } = get();
        if (!currentUser) return [];

        return [...websites] // Create a copy before sorting
          .filter(w => w.userId === currentUser && !w.deleted) // Filter by user and not deleted
          .sort((a, b) => (b.visits || 0) - (a.visits || 0)) // Sort by visits
          .slice(0, limit);
      },

      getRecentWebsites: (limit = 10) => {
        const { websites, currentUser } = get();
        if (!currentUser) return [];

        return [...websites]
          .filter(w => w.userId === currentUser && !w.deleted)
          .sort((a, b) => {
            // Prioritize lastVisit, fallback to createdAt
            const timeA = a.lastVisit?.getTime() ?? a.createdAt?.getTime() ?? 0;
            const timeB = b.lastVisit?.getTime() ?? b.createdAt?.getTime() ?? 0;
            return timeB - timeA; // Sort descending (most recent first)
          })
          .slice(0, limit);
      },

      addGroup: async (name: string, description?: string) => {
        const { currentUser } = get();
        if (!currentUser) return;

        const newGroup: WebsiteGroup = {
          id: crypto.randomUUID(),
          name,
          description: description || '',
          isExpanded: true,
          createdAt: new Date(),
          userId: currentUser
        };

        // Optimistically update local state
        set(state => ({
          groups: [...state.groups, newGroup]
        }));

        // Sync to Firestore
        try {
            const firestoreData = toFirestoreGroup(newGroup);
            await setDoc(doc(db, `users/${currentUser}/groups/${newGroup.id}`), firestoreData);
        } catch (error) {
             console.error("Error adding group to Firestore:", error);
             // Revert
             set(state => ({ groups: state.groups.filter(g => g.id !== newGroup.id) }));
        }
      },

      updateGroup: async (id: string, updates: Partial<Omit<WebsiteGroup, 'id' | 'userId' | 'createdAt'>>) => {
        const { currentUser, groups } = get();
        if (!currentUser) return;

        const groupIndex = groups.findIndex(g => g.id === id && g.userId === currentUser);
        if (groupIndex === -1) return;

        const originalGroup = groups[groupIndex];
        const updatedGroup = { ...originalGroup, ...updates };

        // Optimistic update
        const updatedGroups = [...groups];
        updatedGroups[groupIndex] = updatedGroup;
        set({ groups: updatedGroups });

        // Sync to Firestore
        try {
            const groupRef = doc(db, `users/${currentUser}/groups/${id}`);
             // Prepare updates for Firestore, converting Date objects to ISO strings
             const firestoreUpdates: any = { ...updates };
             if (updates.deletedAt instanceof Date) {
                 firestoreUpdates.deletedAt = updates.deletedAt.toISOString();
             } else if (updates.deletedAt === null || updates.deletedAt === undefined) {
                 delete firestoreUpdates.deletedAt;
             }
             // Ensure fields managed elsewhere aren't accidentally updated
             delete firestoreUpdates.createdAt;
             delete firestoreUpdates.userId;
             delete firestoreUpdates.id;
            await updateDoc(groupRef, firestoreUpdates);
        } catch (error) {
            console.error("Error updating group in Firestore:", error);
            // Revert
            set(state => ({ groups: state.groups.map(g => g.id === id ? originalGroup : g) }));
        }
      },

      deleteGroup: async (id: string) => {
        const { currentUser, groups } = get();
        if (!currentUser) return;

        const groupToDelete = groups.find(g => g.id === id && g.userId === currentUser);
        if (!groupToDelete) return;

        // Optimistic update
        set(state => ({
          groups: state.groups.filter(g => g.id !== id)
        }));

        // Soft delete in Firestore
        try {
            const groupRef = doc(db, `users/${currentUser}/groups/${id}`);
            await updateDoc(groupRef, {
                deleted: true,
                deletedAt: new Date().toISOString()
            });
        } catch(error) {
            console.error("Error deleting group from Firestore:", error);
            // Revert
            set(state => ({ groups: [...state.groups, groupToDelete].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()) }));
        }
      },

      toggleGroupExpansion: async (id: string) => {
        const { currentUser, groups } = get(); // Fix: Get currentUser from state
        if (!currentUser) return; // Add check

        const groupIndex = groups.findIndex(g => g.id === id && g.userId === currentUser);
        if (groupIndex === -1) return;

        const originalGroup = groups[groupIndex];
        const updatedGroup = { ...originalGroup, isExpanded: !originalGroup.isExpanded };

        // Optimistic update
        const updatedGroups = [...groups];
        updatedGroups[groupIndex] = updatedGroup;
        set({ groups: updatedGroups });


        // Sync expansion state to Firestore
        try {
            const groupRef = doc(db, `users/${currentUser}/groups/${id}`);
            await updateDoc(groupRef, { isExpanded: updatedGroup.isExpanded });
        } catch (error) {
            console.error("Error toggling group expansion in Firestore:", error);
            // Revert
            set(state => ({ groups: state.groups.map(g => g.id === id ? originalGroup : g) }));
        }
      },

      getTags: () => {
        const { websites, currentUser } = get();
        if (!currentUser) return [];

        return [...new Set(
          websites
            .filter(w => w.userId === currentUser && !w.deleted) // Filter by user and not deleted
            .flatMap(website => website.tags || []) // Ensure tags exist
        )];
      },

      getWebsitesByTag: (tag: string) => {
        const { websites, currentUser } = get();
        if (!currentUser) return [];

        return websites
          .filter(w => w.userId === currentUser && !w.deleted && (w.tags || []).includes(tag)); // Check tags exist
      },
    }),
    // { // Removed persist wrapper
    //   name: 'website-store',
    //   version: 2, // Increment version if schema changes significantly
    //   storage: createJSONStorage(() => localStorage), // Or sessionStorage
    //   // Add migration logic if needed for version changes
    //   // serialize/deserialize for Date objects if not using Firestore timestamps directly
    //    serialize: (state) => JSON.stringify(state, (key, value) => {
    //      if (value instanceof Date) {
    //        return { __type: 'Date', value: value.toISOString() };
    //      }
    //      return value;
    //    }),
    //    deserialize: (str) => JSON.parse(str, (key, value) => {
    //      if (value && value.__type === 'Date') {
    //        return new Date(value.value);
    //      }
    //      return value;
    //    }),
    // }
  // )
);
