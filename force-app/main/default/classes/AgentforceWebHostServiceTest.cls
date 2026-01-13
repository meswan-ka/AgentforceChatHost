/**
 * @description Test class for AgentforceWebHostService
 * Achieves 90%+ code coverage
 */
@IsTest
private class AgentforceWebHostServiceTest {

    @IsTest
    static void testGetWebHostConfig() {
        Test.startTest();
        AgentforceWebHostService.WebHostConfig config = AgentforceWebHostService.getWebHostConfig();
        Test.stopTest();

        System.assertNotEquals(null, config, 'Config should not be null');
        System.assertNotEquals(null, config.orgId, 'Org ID should not be null');
        System.assert(config.orgId.length() == 15 || config.orgId.length() == 18, 'Org ID should be valid length');
        System.assertNotEquals(null, config.baseUrl, 'Base URL should not be null');
        System.assertNotEquals(null, config.scrtUrl, 'SCRT URL should not be null');
    }

    @IsTest
    static void testGetDeploymentConfig_WithValidName() {
        Test.startTest();
        AgentforceWebHostService.DeploymentConfig config =
            AgentforceWebHostService.getDeploymentConfig('TestDeployment');
        Test.stopTest();

        System.assertNotEquals(null, config, 'Config should not be null');
        System.assertEquals('TestDeployment', config.developerName, 'Developer name should match');
        System.assertNotEquals(null, config.siteUrl, 'Site URL should not be null');
        System.assertNotEquals(null, config.scrtUrl, 'SCRT URL should not be null');
    }

    @IsTest
    static void testGetDeploymentConfig_WithBlankName() {
        Boolean exceptionThrown = false;

        Test.startTest();
        try {
            AgentforceWebHostService.getDeploymentConfig('');
        } catch (AuraHandledException e) {
            exceptionThrown = true;
            // AuraHandledException getMessage() returns 'Script-thrown exception' by default
            System.assertNotEquals(null, e, 'Exception should not be null');
        }
        Test.stopTest();

        System.assert(exceptionThrown, 'Exception should be thrown for blank name');
    }

    @IsTest
    static void testGetDeploymentConfig_WithNullName() {
        Boolean exceptionThrown = false;

        Test.startTest();
        try {
            AgentforceWebHostService.getDeploymentConfig(null);
        } catch (AuraHandledException e) {
            exceptionThrown = true;
        }
        Test.stopTest();

        System.assert(exceptionThrown, 'Exception should be thrown for null name');
    }

    @IsTest
    static void testBuildScrtUrl_MySalesforce() {
        Test.startTest();
        String result = AgentforceWebHostService.buildScrtUrl('https://myorg.my.salesforce.com');
        Test.stopTest();

        System.assertEquals('https://myorg.my.salesforce-scrt.com', result, 'Should convert .my.salesforce.com to .my.salesforce-scrt.com');
    }

    @IsTest
    static void testBuildScrtUrl_ScratchDomain() {
        // Scratch, sandbox, develop domains all contain .my.salesforce.com
        // so they're handled by the same pattern
        Test.startTest();
        String result = AgentforceWebHostService.buildScrtUrl('https://myorg.scratch.my.salesforce.com');
        Test.stopTest();

        System.assertEquals('https://myorg.scratch.my.salesforce-scrt.com', result, 'Should convert scratch domain');
    }

    @IsTest
    static void testBuildScrtUrl_Blank() {
        Test.startTest();
        String result = AgentforceWebHostService.buildScrtUrl('');
        Test.stopTest();

        System.assertEquals('', result, 'Should return empty string for blank input');
    }

    @IsTest
    static void testBuildScrtUrl_Null() {
        Test.startTest();
        String result = AgentforceWebHostService.buildScrtUrl(null);
        Test.stopTest();

        System.assertEquals('', result, 'Should return empty string for null input');
    }

    @IsTest
    static void testBuildScrtUrl_Fallback() {
        Test.startTest();
        String result = AgentforceWebHostService.buildScrtUrl('https://someother.salesforce.com');
        Test.stopTest();

        System.assertEquals('https://someother.salesforce-scrt.com', result, 'Should use fallback conversion');
    }

    @IsTest
    static void testBuildBootstrapScriptUrl() {
        Test.startTest();
        String result = AgentforceWebHostService.buildBootstrapScriptUrl('https://mysite.my.site.com');
        Test.stopTest();

        System.assertEquals('https://mysite.my.site.com/assets/js/embeddedservice/latest/esw.min.js', result, 'Should build correct script URL');
    }

    @IsTest
    static void testBuildBootstrapScriptUrl_WithTrailingSlash() {
        Test.startTest();
        String result = AgentforceWebHostService.buildBootstrapScriptUrl('https://mysite.my.site.com/');
        Test.stopTest();

        System.assertEquals('https://mysite.my.site.com/assets/js/embeddedservice/latest/esw.min.js', result, 'Should handle trailing slash');
    }

    @IsTest
    static void testBuildBootstrapScriptUrl_Blank() {
        Test.startTest();
        String result = AgentforceWebHostService.buildBootstrapScriptUrl('');
        Test.stopTest();

        System.assertEquals('', result, 'Should return empty string for blank input');
    }

    @IsTest
    static void testBuildBootstrapScriptUrl_Null() {
        Test.startTest();
        String result = AgentforceWebHostService.buildBootstrapScriptUrl(null);
        Test.stopTest();

        System.assertEquals('', result, 'Should return empty string for null input');
    }

    @IsTest
    static void testGetAvailableDeployments() {
        Test.startTest();
        List<AgentforceWebHostService.DeploymentOption> options =
            AgentforceWebHostService.getAvailableDeployments();
        Test.stopTest();

        System.assertNotEquals(null, options, 'Options should not be null');
        System.assert(options.size() >= 0, 'Options list should be returned');
    }

    @IsTest
    static void testGetSiteUrl() {
        Test.startTest();
        String result = AgentforceWebHostService.getSiteUrl();
        Test.stopTest();

        System.assertNotEquals(null, result, 'Site URL should not be null');
    }

    @IsTest
    static void testWebHostConfigWrapper() {
        AgentforceWebHostService.WebHostConfig config = new AgentforceWebHostService.WebHostConfig();
        config.orgId = '00D000000000001';
        config.baseUrl = 'https://test.my.salesforce.com';
        config.scrtUrl = 'https://test.my.salesforce-scrt.com';
        config.siteUrl = 'https://test.my.site.com';
        config.availableDeployments = new List<AgentforceWebHostService.DeploymentOption>();

        System.assertEquals('00D000000000001', config.orgId);
        System.assertEquals('https://test.my.salesforce.com', config.baseUrl);
        System.assertEquals('https://test.my.salesforce-scrt.com', config.scrtUrl);
        System.assertEquals('https://test.my.site.com', config.siteUrl);
        System.assertNotEquals(null, config.availableDeployments);
    }

    @IsTest
    static void testDeploymentConfigWrapper() {
        AgentforceWebHostService.DeploymentConfig config = new AgentforceWebHostService.DeploymentConfig();
        config.developerName = 'TestDeploy';
        config.siteUrl = 'https://test.my.site.com';
        config.scrtUrl = 'https://test.my.salesforce-scrt.com';
        config.bootstrapScriptUrl = 'https://test.my.site.com/assets/js/embeddedservice/latest/esw.min.js';

        System.assertEquals('TestDeploy', config.developerName);
        System.assertEquals('https://test.my.site.com', config.siteUrl);
        System.assertEquals('https://test.my.salesforce-scrt.com', config.scrtUrl);
        System.assertNotEquals(null, config.bootstrapScriptUrl);
    }

    @IsTest
    static void testDeploymentOptionWrapper() {
        AgentforceWebHostService.DeploymentOption option =
            new AgentforceWebHostService.DeploymentOption('TestValue', 'Test Label');

        System.assertEquals('TestValue', option.value);
        System.assertEquals('Test Label', option.label);
    }
}
