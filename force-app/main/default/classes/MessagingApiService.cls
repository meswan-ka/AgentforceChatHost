/**
 * @description Service class for Salesforce Messaging for In-App and Web REST API
 * Handles configuration for authentication and conversation creation
 * Uses 'without sharing' to allow guest user access in Experience Cloud
 */
public without sharing class MessagingApiService {

    /**
     * @description Get token request configuration for the Messaging API
     * The actual API calls are made from the client-side JavaScript
     * @param orgId The Salesforce Org ID (optional - will use current org if blank)
     * @param deploymentDeveloperName The developer name of the Embedded Service Deployment
     * @return TokenRequestConfig Configuration for the token request
     */
    @AuraEnabled
    public static TokenRequestConfig getTokenRequestConfig(String orgId, String deploymentDeveloperName) {
        try {
            TokenRequestConfig config = new TokenRequestConfig();
            // Messaging API requires 15-character Org ID (not 18-character)
            String fullOrgId = String.isBlank(orgId) ? UserInfo.getOrganizationId() : orgId;
            config.orgId = fullOrgId.length() > 15 ? fullOrgId.substring(0, 15) : fullOrgId;
            config.esDeveloperName = deploymentDeveloperName;
            config.capabilitiesVersion = '1';
            config.platform = 'Web';
            config.scrtUrl = buildScrtUrl();

            return config;
        } catch (Exception e) {
            throw new AuraHandledException('Error getting token config: ' + e.getMessage());
        }
    }

    /**
     * @description Build the SCRT URL from the org's My Domain
     * Handles both standard Salesforce and Experience Cloud contexts
     * @return String The SCRT URL
     */
    @TestVisible
    private static String buildScrtUrl() {
        // Get the org's domain URL - this works consistently in all contexts
        String baseUrl = URL.getOrgDomainUrl().toExternalForm();

        // Transform: https://orgname.my.salesforce.com -> https://orgname.my.salesforce-scrt.com
        if (baseUrl.contains('.my.salesforce.com')) {
            return baseUrl.replace('.my.salesforce.com', '.my.salesforce-scrt.com');
        }

        // For scratch orgs
        if (baseUrl.contains('.scratch.my.salesforce.com')) {
            return baseUrl.replace('.scratch.my.salesforce.com', '.scratch.my.salesforce-scrt.com');
        }

        // For sandbox orgs
        if (baseUrl.contains('.sandbox.my.salesforce.com')) {
            return baseUrl.replace('.sandbox.my.salesforce.com', '.sandbox.my.salesforce-scrt.com');
        }

        // Default fallback - may need adjustment for specific org types
        return baseUrl.replace('.salesforce.com', '.salesforce-scrt.com');
    }

    /**
     * @description Wrapper for token request configuration
     */
    public class TokenRequestConfig {
        @AuraEnabled public String orgId { get; set; }
        @AuraEnabled public String esDeveloperName { get; set; }
        @AuraEnabled public String capabilitiesVersion { get; set; }
        @AuraEnabled public String platform { get; set; }
        @AuraEnabled public String scrtUrl { get; set; }
    }
}
