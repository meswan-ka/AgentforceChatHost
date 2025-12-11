/**
 * @description Test class for AgentforceChatHostController
 * Achieves 90%+ code coverage
 */
@IsTest
private class AgentforceChatHostControllerTest {

    @TestSetup
    static void setupTestData() {
        // Create a ContentVersion (which auto-creates ContentDocument)
        ContentVersion cv = new ContentVersion();
        cv.Title = 'Test Background Image';
        cv.PathOnClient = 'test_background.png';
        cv.VersionData = Blob.valueOf('test image content');
        cv.IsMajorVersion = true;
        insert cv;
    }

    @IsTest
    static void testGetBackgroundImageUrl_WithValidContentDocumentId() {
        // Get the ContentDocumentId from our test setup
        ContentVersion cv = [SELECT ContentDocumentId FROM ContentVersion WHERE Title = 'Test Background Image' LIMIT 1];
        String contentDocumentId = cv.ContentDocumentId;

        Test.startTest();
        String result = AgentforceChatHostController.getBackgroundImageUrl(contentDocumentId);
        Test.stopTest();

        // Should return a valid URL
        System.assertNotEquals(null, result, 'Should return a URL for valid ContentDocumentId');
        System.assert(result.contains('/sfc/servlet.shepherd/version/download/'), 'URL should be in correct format');
    }

    @IsTest
    static void testGetBackgroundImageUrl_WithNullInput() {
        Test.startTest();
        String result = AgentforceChatHostController.getBackgroundImageUrl(null);
        Test.stopTest();

        System.assertEquals(null, result, 'Should return null for null input');
    }

    @IsTest
    static void testGetBackgroundImageUrl_WithBlankInput() {
        Test.startTest();
        String result = AgentforceChatHostController.getBackgroundImageUrl('');
        Test.stopTest();

        System.assertEquals(null, result, 'Should return null for blank input');
    }

    @IsTest
    static void testGetBackgroundImageUrl_WithWhitespaceInput() {
        Test.startTest();
        String result = AgentforceChatHostController.getBackgroundImageUrl('   ');
        Test.stopTest();

        System.assertEquals(null, result, 'Should return null for whitespace-only input');
    }

    @IsTest
    static void testGetBackgroundImageUrl_WithInvalidId() {
        Test.startTest();
        String result = AgentforceChatHostController.getBackgroundImageUrl('invalidId123');
        Test.stopTest();

        // Should return null since it's not a valid ContentDocument
        System.assertEquals(null, result, 'Should return null for invalid ID');
    }

    @IsTest
    static void testGetBackgroundImageUrl_WithNonExistent069Id() {
        // Use a valid format but non-existent ID starting with 069
        String fakeId = '069000000000000AAA';

        Test.startTest();
        String result = AgentforceChatHostController.getBackgroundImageUrl(fakeId);
        Test.stopTest();

        System.assertEquals(null, result, 'Should return null for non-existent ContentDocumentId');
    }

    @IsTest
    static void testGetBackgroundImageUrl_WithNonContentDocId() {
        // Test with an ID not starting with 069 (takes fallback path)
        String testId = 'TESTID12345';

        Test.startTest();
        String result = AgentforceChatHostController.getBackgroundImageUrl(testId);
        Test.stopTest();

        System.assertEquals(null, result, 'Should return null when content not found');
    }
}
