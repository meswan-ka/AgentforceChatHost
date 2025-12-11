/**
 * @description Controller for AgentforceChatHost LWC
 * Handles fetching background images from ContentDocument or CMS
 * Uses 'without sharing' to allow guest user access in Experience Cloud
 */
public without sharing class AgentforceChatHostController {

    /**
     * @description Get image URL from ContentDocumentId or CMS Reference ID
     * @param imageId The ContentDocumentId or CMS Reference ID
     * @return String The public URL to the image, or null if not found
     */
    @AuraEnabled(cacheable=true)
    public static String getBackgroundImageUrl(String imageId) {
        if (String.isBlank(imageId)) {
            return null;
        }

        // Try ContentDocument first (starts with '069' for ContentDocumentId)
        if (imageId.startsWith('069')) {
            return getContentDocumentUrl(imageId);
        }

        // Fallback: try as ContentDocumentId
        return getContentDocumentUrl(imageId);
    }

    /**
     * @description Get URL for a ContentDocument
     * @param contentDocumentId The ContentDocumentId
     * @return String The download URL
     */
    @TestVisible
    private static String getContentDocumentUrl(String contentDocumentId) {
        List<ContentVersion> versions = [
            SELECT Id, ContentDocumentId
            FROM ContentVersion
            WHERE ContentDocumentId = :contentDocumentId
            AND IsLatest = true
            LIMIT 1
        ];

        if (!versions.isEmpty()) {
            // Use ContentDistribution for public access if available
            List<ContentDistribution> distributions = [
                SELECT Id, ContentDownloadUrl, DistributionPublicUrl
                FROM ContentDistribution
                WHERE ContentVersionId = :versions[0].Id
                AND IsDeleted = false
                LIMIT 1
            ];

            if (!distributions.isEmpty() && distributions[0].DistributionPublicUrl != null) {
                return distributions[0].DistributionPublicUrl;
            }

            // Fallback to standard download URL (requires user to be authenticated or file to be shared)
            return '/sfc/servlet.shepherd/version/download/' + versions[0].Id;
        }
        return null;
    }
}
