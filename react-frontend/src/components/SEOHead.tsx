
import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title: string;
  description: string;
  keywords?: string;
  canonicalUrl?: string;
  ogType?: string;
  ogImage?: string;
}

const SEOHead = ({
  title,
  description,
  keywords = "",
  canonicalUrl = "",
  ogType = "website",
  ogImage = "https://cdn.prod.website-files.com/68bfd06cf7cfc043aca469d7/68df7e4dd588f138f855d198_6221508.png"
}: SEOHeadProps) => {
  // 🔍 DEBUG LOGS
  console.log("🎯 SEOHead rendu avec:", {
    title,
    description,
    keywords,
    canonicalUrl,
    ogType,
    ogImage
  });

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
};

export default SEOHead;
