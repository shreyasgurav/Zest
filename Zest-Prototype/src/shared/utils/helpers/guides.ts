import { db } from "@/infrastructure/firebase"
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
    const guidesCollectionRef = collection(db(), "guides")
    const q = query(guidesCollectionRef, orderBy("createdAt", "desc"))
    const querySnapshot = await getDocs(q)
    
    const guides = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Guide[]
    
    return guides
  } catch (error) {
    console.error('Error fetching guides:', error)
    throw new Error('Failed to fetch guides')
  }
} 