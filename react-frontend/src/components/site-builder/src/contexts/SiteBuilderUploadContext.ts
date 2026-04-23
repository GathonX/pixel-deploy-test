import { createContext, useContext } from 'react';

/**
 * Provides the current site ID to ImageUploader components anywhere in the
 * site-builder editor tree, without prop-drilling through the section registry.
 */
export const SiteBuilderUploadContext = createContext<string | null>(null);

/** Returns the current site ID for image uploads, or null if not in editor context. */
export const useSiteBuilderUpload = () => useContext(SiteBuilderUploadContext);
