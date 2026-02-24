export const SITE_ORIGIN = "https://www.agoracitizen.network";
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/thumbnail_2_1.png`;

export interface SeoData {
  title: string;
  description: string;
  ogType: "website" | "article";
  ogImage?: string;
  ogImageType?: string;
  articleAuthor?: string;
}
