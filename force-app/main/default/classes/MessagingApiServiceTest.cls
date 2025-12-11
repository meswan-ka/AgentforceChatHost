/**
 * @description Test class for MessagingApiService
 */
@IsTest
private class MessagingApiServiceTest {

    @IsTest
    static void testGetTokenRequestConfig_WithProvidedOrgId() {
        String testOrgId = '00D000000000001';
        String testDeploymentName = 'Test_Deployment';

        Test.startTest();
        MessagingApiService.TokenRequestConfig config = MessagingApiService.getTokenRequestConfig(testOrgId, testDeploymentName);
        Test.stopTest();

        System.assertEquals(testOrgId, config.orgId, 'Org ID should match input');
        System.assertEquals(testDeploymentName, config.esDeveloperName, 'Deployment name should match');
        System.assertEquals('1', config.capabilitiesVersion, 'Capabilities version should be 1');
        System.assertEquals('Web', config.platform, 'Platform should be Web');
        System.assertNotEquals(null, config.scrtUrl, 'SCRT URL should not be null');
    }

    @IsTest
    static void testGetTokenRequestConfig_WithBlankOrgId() {
        String testDeploymentName = 'Test_Deployment';

        Test.startTest();
        MessagingApiService.TokenRequestConfig config = MessagingApiService.getTokenRequestConfig('', testDeploymentName);
        Test.stopTest();

        // Should use UserInfo.getOrganizationId() when orgId is blank (truncated to 15 chars)
        String expectedOrgId = UserInfo.getOrganizationId().substring(0, 15);
        System.assertEquals(expectedOrgId, config.orgId, 'Should use current org ID (15 char) when blank');
        System.assertEquals(testDeploymentName, config.esDeveloperName, 'Deployment name should match');
    }

    @IsTest
    static void testGetTokenRequestConfig_WithNullOrgId() {
        String testDeploymentName = 'Test_Deployment';

        Test.startTest();
        MessagingApiService.TokenRequestConfig config = MessagingApiService.getTokenRequestConfig(null, testDeploymentName);
        Test.stopTest();

        // Should use UserInfo.getOrganizationId() when orgId is null (truncated to 15 chars)
        String expectedOrgId = UserInfo.getOrganizationId().substring(0, 15);
        System.assertEquals(expectedOrgId, config.orgId, 'Should use current org ID (15 char) when null');
    }

    @IsTest
    static void testGetTokenRequestConfig_FullConfiguration() {
        // Test with various deployment names
        Test.startTest();
        MessagingApiService.TokenRequestConfig config1 = MessagingApiService.getTokenRequestConfig('00D000000000001', 'Deployment_1');
        MessagingApiService.TokenRequestConfig config2 = MessagingApiService.getTokenRequestConfig('00D000000000002', 'Deployment_2');
        Test.stopTest();

        System.assertNotEquals(null, config1, 'Config 1 should not be null');
        System.assertNotEquals(null, config2, 'Config 2 should not be null');
        System.assertEquals('Deployment_1', config1.esDeveloperName);
        System.assertEquals('Deployment_2', config2.esDeveloperName);
    }

    @IsTest
    static void testBuildScrtUrl_StandardOrg() {
        // Test the SCRT URL building logic
        Test.startTest();
        MessagingApiService.TokenRequestConfig config = MessagingApiService.getTokenRequestConfig(null, 'Test');
        Test.stopTest();

        // SCRT URL should contain salesforce-scrt.com
        System.assert(config.scrtUrl.contains('salesforce-scrt.com'),
            'SCRT URL should contain salesforce-scrt.com: ' + config.scrtUrl);
    }

    @IsTest
    static void testBuildScrtUrl_Transformation() {
        // Additional test to verify URL transformation
        Test.startTest();
        MessagingApiService.TokenRequestConfig config = MessagingApiService.getTokenRequestConfig('00Dtest', 'TestDeploy');
        Test.stopTest();

        String scrtUrl = config.scrtUrl;
        System.assertNotEquals(null, scrtUrl, 'SCRT URL should not be null');
        System.assert(scrtUrl.startsWith('https://'), 'SCRT URL should start with https://');
        // Should not contain just .salesforce.com (should be transformed)
        System.assert(!scrtUrl.contains('.salesforce.com') || scrtUrl.contains('salesforce-scrt.com'),
            'URL should be transformed to SCRT format');
    }

    @IsTest
    static void testBuildScrtUrl_VerifyFormat() {
        // Test that SCRT URL is properly formatted
        Test.startTest();
        MessagingApiService.TokenRequestConfig config = MessagingApiService.getTokenRequestConfig(null, 'Test');
        Test.stopTest();

        String scrtUrl = config.scrtUrl;
        // The URL should end with salesforce-scrt.com (possibly with a path)
        System.assert(scrtUrl.contains('-scrt.com'), 'URL should contain -scrt.com');
        // Should not contain double replacement
        System.assert(!scrtUrl.contains('salesforce-scrt-scrt'), 'Should not have double replacement');
    }

    @IsTest
    static void testTokenRequestConfigWrapper() {
        MessagingApiService.TokenRequestConfig config = new MessagingApiService.TokenRequestConfig();
        config.orgId = 'testOrgId';
        config.esDeveloperName = 'testDeployment';
        config.capabilitiesVersion = '1';
        config.platform = 'Web';
        config.scrtUrl = 'https://test.salesforce-scrt.com';

        System.assertEquals('testOrgId', config.orgId);
        System.assertEquals('testDeployment', config.esDeveloperName);
        System.assertEquals('1', config.capabilitiesVersion);
        System.assertEquals('Web', config.platform);
        System.assertEquals('https://test.salesforce-scrt.com', config.scrtUrl);
    }

    @IsTest
    static void testTokenRequestConfigWrapper_NullValues() {
        MessagingApiService.TokenRequestConfig config = new MessagingApiService.TokenRequestConfig();
        // Test null values are handled
        System.assertEquals(null, config.orgId);
        System.assertEquals(null, config.esDeveloperName);
        System.assertEquals(null, config.capabilitiesVersion);
        System.assertEquals(null, config.platform);
        System.assertEquals(null, config.scrtUrl);
    }
}
