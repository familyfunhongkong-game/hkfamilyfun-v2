import * as cheerio from 'cheerio';

export interface ScrapedEventData {
  title?: string;
  description?: string;
  price?: string;
  date?: string;
  location?: string;
  image_url?: string;
  images?: string[];
  age_group?: string;
  duration?: string;
}

export async function scrapeEventFromUrl(url: string): Promise<ScrapedEventData> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!response.ok) throw new Error('Failed to fetch URL');
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const data: ScrapedEventData = {};
    
    // Extract title
    data.title = $('h1').first().text() || $('title').text();
    
    // Extract meta description
    data.description = $('meta[name="description"]').attr('content') ||
                       $('meta[property="og:description"]').attr('content');
    
    // Extract price (common patterns)
    const priceText = $('[class*="price"], [data-price]').first().text();
    if (priceText) data.price = priceText;
    
    // Extract date
    const dateText = $('[class*="date"], time').first().text();
    if (dateText) data.date = dateText;
    
    // Extract location
    const locationText = $('[class*="location"], [class*="venue"]').first().text();
    if (locationText) data.location = locationText;
    
    // Extract images
    const images: string[] = [];
    $('img').each((i, elem) => {
      const src = $(elem).attr('src') || $(elem).attr('data-src');
      if (src && images.length < 5) {
        images.push(src);
      }
    });
    if (images.length > 0) {
      data.image_url = images[0];
      data.images = images;
    }
    
    // Extract age group (common keywords)
    const fullText = $.text().toLowerCase();
    if (fullText.includes('age') || fullText.includes('years')) {
      data.age_group = 'varied';
    }
    
    return data;
  } catch (error) {
    console.error('Error scraping URL:', error);
    return {};
  }
}

export function suggestHeadline(data: ScrapedEventData): string[] {
  const suggestions: string[] = [];
  
  if (data.title) {
    suggestions.push(data.title);
  }
  
  // Generate alternative headlines based on data
  if (data.age_group && data.location) {
    suggestions.push(`Family Fun: ${data.location} (${data.age_group})`);
  }
  
  if (data.date && data.location) {
    suggestions.push(`${data.location} - ${data.date}`);
  }
  
  return suggestions.slice(0, 3);
}

export function suggestDescription(data: ScrapedEventData): string[] {
  const suggestions: string[] = [];
  
  if (data.description) {
    suggestions.push(data.description);
  }
  
  // Generate alternative descriptions
  if (data.price && data.age_group) {
    suggestions.push(`Great activity for families! Price: ${data.price}. Suitable for ${data.age_group} ages.`);
  }
  
  if (data.location && data.date) {
    suggestions.push(`Join us at ${data.location} on ${data.date} for a wonderful family experience!`);
  }
  
  return suggestions.slice(0, 3);
}
