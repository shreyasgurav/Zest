import { db } from '../components/firebase';
import { collection, getDocs } from 'firebase/firestore';

export const generateSitemap = async () => {
  try {
    // Fetch all guides from Firestore
    const guidesSnapshot = await getDocs(collection(db, 'guides'));
    const guides = [];
    
    guidesSnapshot.forEach((doc) => {
      const data = doc.data();
      guides.push({
        id: doc.id,
        slug: data.slug || doc.id,
        name: data.name
      });
    });
    
    // Generate sitemap XML
    const baseUrl = 'https://zestlive.in';
    
    const staticUrls = [
      { loc: '/', changefreq: 'daily', priority: '1.0' },
      { loc: '/guides', changefreq: 'weekly', priority: '0.9' },
      { loc: '/about', changefreq: 'monthly', priority: '0.5' },
      { loc: '/contact', changefreq: 'monthly', priority: '0.5' },
      { loc: '/our-services', changefreq: 'monthly', priority: '0.6' },
      { loc: '/blogs', changefreq: 'weekly', priority: '0.7' }
    ];
    
    const guideUrls = guides.map(guide => ({
      loc: `/guides/${guide.slug}`,
      changefreq: 'weekly',
      priority: '0.8'
    }));
    
    const allUrls = [...staticUrls, ...guideUrls];
    
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(url => `  <url>
    <loc>${baseUrl}${url.loc}</loc>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
    
    return sitemap;
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return null;
  }
};

// Function to update sitemap file
export const updateSitemapFile = async () => {
  const sitemap = await generateSitemap();
  if (sitemap) {
    // In a real application, you would save this to public/sitemap.xml
    // For now, log it
    console.log('Generated sitemap:', sitemap);
    return sitemap;
  }
  return null;
}; 