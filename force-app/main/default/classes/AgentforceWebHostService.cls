/**
 * @description Service class for Agentforce Web Host component
 * Provides configuration helpers for Enhanced Chat v2 / Web deployments
 * Uses 'without sharing' to allow guest user access in Experience Cloud
 */
public without sharing class AgentforceWebHostService {

    /**
     * @description Get the base configuration for Enhanced Web deployment
     * Constructs URLs and provides defaults based on the current org context
     * @return WebHostConfig Configuration object for the component
     */
    @AuraEnabled(cacheable=true)
    public static WebHostConfig getWebHostConfig() {
        WebHostConfig config = new WebHostConfig();

        try {
            // Get org info
            String fullOrgId = UserInfo.getOrganizationId();
            config.orgId = fullOrgId.length() > 15 ? fullOrgId.substring(0, 15) : fullOrgId;

            // Build URLs
            config.baseUrl = URL.getOrgDomainUrl().toExternalForm();
            config.scrtUrl = buildScrtUrl(config.baseUrl);
            config.siteUrl = getSiteUrl();

            // Get available deployments
            config.availableDeployments = getAvailableDeployments();

        } catch (Exception e) {
            throw new AuraHandledException('Error getting configuration: ' + e.getMessage());
        }

        return config;
    }

    /**
     * @description Get configuration for a specific deployment
     * @param deploymentDeveloperName The developer name of the deployment
     * @return DeploymentConfig Configuration for the specific deployment
     */
    @AuraEnabled(cacheable=true)
    public static DeploymentConfig getDeploymentConfig(String deploymentDeveloperName) {
        if (String.isBlank(deploymentDeveloperName)) {
            throw new AuraHandledException('Deployment developer name is required');
        }

        DeploymentConfig config = new DeploymentConfig();

        try {
            // Query EmbeddedServiceConfig using Tooling API or standard query
            // Note: EmbeddedServiceConfig may not be directly queryable in all contexts
            // This provides the structure for the configuration

            config.developerName = deploymentDeveloperName;
            config.siteUrl = getSiteUrl();
            config.scrtUrl = buildScrtUrl(URL.getOrgDomainUrl().toExternalForm());

            // Build the bootstrap script URL
            config.bootstrapScriptUrl = buildBootstrapScriptUrl(config.siteUrl);

        } catch (Exception e) {
            throw new AuraHandledException('Error getting deployment config: ' + e.getMessage());
        }

        return config;
    }

    /**
     * @description Build the SCRT URL from the org's domain
     * @param baseUrl The org's base URL
     * @return String The SCRT URL
     */
    @TestVisible
    private static String buildScrtUrl(String baseUrl) {
        if (String.isBlank(baseUrl)) {
            return '';
        }

        // Transform Salesforce domain patterns to SCRT
        // The .my.salesforce.com pattern handles all variants:
        // - scratch.my.salesforce.com
        // - sandbox.my.salesforce.com
        // - develop.my.salesforce.com
        if (baseUrl.contains('.my.salesforce.com')) {
            return baseUrl.replace('.my.salesforce.com', '.my.salesforce-scrt.com');
        }

        // Default fallback for other patterns
        return baseUrl.replace('.salesforce.com', '.salesforce-scrt.com');
    }

    /**
     * @description Get the current Experience Cloud site URL
     * @return String The site URL or org domain URL if not in a site context
     */
    @TestVisible
    private static String getSiteUrl() {
        // Query for active Site with subdomain - fall back to org domain
        List<Site> sites = [
            SELECT Id, Name, Subdomain, UrlPathPrefix
            FROM Site
            WHERE Status = 'Active' AND Subdomain != null
            LIMIT 1
        ];

        if (!sites.isEmpty()) {
            return 'https://' + sites[0].Subdomain + '.my.site.com';
        }

        // Fallback to org domain
        return URL.getOrgDomainUrl().toExternalForm();
    }

    /**
     * @description Build the embedded service bootstrap script URL
     * @param siteUrl The site URL
     * @return String The bootstrap script URL
     */
    @TestVisible
    private static String buildBootstrapScriptUrl(String siteUrl) {
        if (String.isBlank(siteUrl)) {
            return '';
        }

        String baseUrl = siteUrl.removeEnd('/');
        return baseUrl + '/assets/js/embeddedservice/latest/esw.min.js';
    }

    /**
     * @description Get list of available Embedded Service deployments
     * @return List<DeploymentOption> Available deployments with manual entry option
     */
    @TestVisible
    private static List<DeploymentOption> getAvailableDeployments() {
        // Return a list with manual entry instruction
        // Note: Direct query to EmbeddedServiceConfig requires Tooling API
        List<DeploymentOption> deployments = new List<DeploymentOption>();
        deployments.add(new DeploymentOption('', '-- Enter deployment ID manually --'));
        return deployments;
    }

    /**
     * @description Wrapper class for Web Host configuration
     */
    public class WebHostConfig {
        @AuraEnabled public String orgId { get; set; }
        @AuraEnabled public String baseUrl { get; set; }
        @AuraEnabled public String scrtUrl { get; set; }
        @AuraEnabled public String siteUrl { get; set; }
        @AuraEnabled public List<DeploymentOption> availableDeployments { get; set; }
    }

    /**
     * @description Wrapper class for deployment configuration
     */
    public class DeploymentConfig {
        @AuraEnabled public String developerName { get; set; }
        @AuraEnabled public String siteUrl { get; set; }
        @AuraEnabled public String scrtUrl { get; set; }
        @AuraEnabled public String bootstrapScriptUrl { get; set; }
    }

    /**
     * @description Wrapper class for deployment options in picklist
     */
    public class DeploymentOption {
        @AuraEnabled public String value { get; set; }
        @AuraEnabled public String label { get; set; }

        public DeploymentOption(String value, String label) {
            this.value = value;
            this.label = label;
        }
    }
}
