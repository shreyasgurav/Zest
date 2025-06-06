import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy } from "firebase/firestore"

export interface Guide {
  id: string
  name: string
  cover_image?: string
  slug?: string
  createdBy?: string
  createdAt?: any
}

export async function getAllGuides(): Promise<Guide[]> {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return []
    }

    const guidesCollectionRef = collection(db, "guides")
    const q = query(guidesCollectionRef, orderBy("createdAt", "desc"))
    const querySnapshot = await getDocs(q)
    
    const guides = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Guide[]
    
    return guides
  } catch (error) {
    console.error('Error fetching guides:', error)
    // Return empty array instead of throwing error
    return []
  }
} 