import { getFirebaseDb } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import GuideItemClient from "./GuideItemClient";

interface GuideItem {
  id: string;
  name: string;
  description: string;
  image_url: string;
  location: string;
  price: string;
}

interface Guide {
  id: string;
  name: string;
  slug: string;
  items: GuideItem[];
}

// This function will be used to generate static paths at build time
export async function generateStaticParams() {
  try {
    const db = getFirebaseDb();
    const guidesSnapshot = await getDocs(collection(db, "guides"));
    const guides: Guide[] = [];

    guidesSnapshot.forEach((doc) => {
      const guideData = doc.data() as Guide;
      guides.push({
        ...guideData,
        id: doc.id,
      });
    });

    // Generate all possible combinations of slug and index
    const paths = guides.flatMap((guide) => 
      guide.items.map((_, index) => ({
        slug: guide.slug,
        index: index.toString(),
      }))
    );

    return paths;
  } catch (error) {
    console.error("Error generating static params:", error);
    return [];
  }
}

export default function GuideItemPage({ params }: { params: { slug: string; index: string } }) {
  return <GuideItemClient params={params} />;
} 