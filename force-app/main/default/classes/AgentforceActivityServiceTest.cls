/**
 * @description Test class for AgentforceActivityService and AgentforceActivityWrapper
 * @author Claude Code
 */
@IsTest
private class AgentforceActivityServiceTest {

    private static final String TEST_SESSION_ID = '0Mw000000000001AAA';
    private static final String TEST_SESSION_ID_2 = '0Mw000000000002AAA';

    @TestSetup
    static void setupTestData() {
        List<Agentforce_Activity__c> activities = new List<Agentforce_Activity__c>();

        // Create test activities for session 1
        activities.add(new Agentforce_Activity__c(
            Messaging_Session_Id__c = TEST_SESSION_ID,
            Event_Type__c = 'Session_Started',
            Event_Timestamp__c = Datetime.now().addMinutes(-10),
            Event_Source__c = 'agentforceChatHost',
            Event_Data__c = '{"welcomeMessage": "Hello!"}',
            Message_Count__c = 0,
            Time_In_Chat__c = 0
        ));

        activities.add(new Agentforce_Activity__c(
            Messaging_Session_Id__c = TEST_SESSION_ID,
            Event_Type__c = 'Message_Sent',
            Event_Timestamp__c = Datetime.now().addMinutes(-8),
            Event_Source__c = 'agentforceChatHost',
            Event_Data__c = '{"messageIndex": 1}',
            Message_Count__c = 1,
            Time_In_Chat__c = 120
        ));

        activities.add(new Agentforce_Activity__c(
            Messaging_Session_Id__c = TEST_SESSION_ID,
            Event_Type__c = 'Link_Click',
            Event_Timestamp__c = Datetime.now().addMinutes(-5),
            Event_Source__c = 'productCatalog',
            Event_Data__c = '{"linkUrl": "/products/123", "linkLabel": "View Product"}',
            Message_Count__c = 2,
            Time_In_Chat__c = 300
        ));

        activities.add(new Agentforce_Activity__c(
            Messaging_Session_Id__c = TEST_SESSION_ID,
            Event_Type__c = 'Session_Ended',
            Event_Timestamp__c = Datetime.now(),
            Event_Source__c = 'agentforceChatHost',
            Event_Data__c = '{"duration": 600, "messageCount": 5}',
            Message_Count__c = 5,
            Time_In_Chat__c = 600
        ));

        insert activities;
    }

    @IsTest
    static void testLogActivitySuccess() {
        AgentforceActivityWrapper wrapper = new AgentforceActivityWrapper();
        wrapper.sessionId = TEST_SESSION_ID_2;
        wrapper.eventType = 'Session_Started';
        wrapper.timestamp = Datetime.now().getTime();
        wrapper.eventSource = 'agentforceChatHost';
        wrapper.eventData = '{"test": true}';
        wrapper.messageCount = 0;
        wrapper.timeInChat = 0;

        Test.startTest();
        Id recordId = AgentforceActivityService.logActivity(wrapper);
        Test.stopTest();

        System.assertNotEquals(null, recordId, 'Record ID should not be null');

        Agentforce_Activity__c record = [
            SELECT Messaging_Session_Id__c, Event_Type__c
            FROM Agentforce_Activity__c
            WHERE Id = :recordId
        ];
        System.assertEquals(TEST_SESSION_ID_2, record.Messaging_Session_Id__c, 'Session ID should match');
        System.assertEquals('Session_Started', record.Event_Type__c, 'Event type should match');
    }

    @IsTest
    static void testLogActivityNullActivity() {
        Test.startTest();
        try {
            AgentforceActivityService.logActivity(null);
            System.assert(false, 'Should have thrown exception');
        } catch (AuraHandledException e) {
            System.assertNotEquals(null, e.getMessage(), 'Should have error message');
        }
        Test.stopTest();
    }

    @IsTest
    static void testLogActivityMissingSessionId() {
        AgentforceActivityWrapper wrapper = new AgentforceActivityWrapper();
        wrapper.eventType = 'Session_Started';

        Test.startTest();
        try {
            AgentforceActivityService.logActivity(wrapper);
            System.assert(false, 'Should have thrown exception');
        } catch (AuraHandledException e) {
            System.assertNotEquals(null, e.getMessage(), 'Should have error message');
        }
        Test.stopTest();
    }

    @IsTest
    static void testLogActivitiesBulkSuccess() {
        List<AgentforceActivityWrapper> wrappers = new List<AgentforceActivityWrapper>();

        for (Integer i = 0; i < 5; i++) {
            AgentforceActivityWrapper wrapper = new AgentforceActivityWrapper();
            wrapper.sessionId = TEST_SESSION_ID_2;
            wrapper.eventType = 'Message_Sent';
            wrapper.timestamp = Datetime.now().getTime();
            wrapper.eventSource = 'agentforceChatHost';
            wrapper.messageCount = i + 1;
            wrappers.add(wrapper);
        }

        Test.startTest();
        List<Id> recordIds = AgentforceActivityService.logActivities(wrappers);
        Test.stopTest();

        System.assertEquals(5, recordIds.size(), 'Should have created 5 records');

        List<Agentforce_Activity__c> records = [
            SELECT Id FROM Agentforce_Activity__c
            WHERE Messaging_Session_Id__c = :TEST_SESSION_ID_2
        ];
        System.assertEquals(5, records.size(), 'Should have 5 records in database');
    }

    @IsTest
    static void testLogActivitiesEmptyList() {
        Test.startTest();
        try {
            AgentforceActivityService.logActivities(new List<AgentforceActivityWrapper>());
            System.assert(false, 'Should have thrown exception');
        } catch (AuraHandledException e) {
            System.assertNotEquals(null, e.getMessage(), 'Should have error message');
        }
        Test.stopTest();
    }

    @IsTest
    static void testLogActivitiesNullList() {
        Test.startTest();
        try {
            AgentforceActivityService.logActivities(null);
            System.assert(false, 'Should have thrown exception');
        } catch (AuraHandledException e) {
            System.assertNotEquals(null, e.getMessage(), 'Should have error message');
        }
        Test.stopTest();
    }

    @IsTest
    static void testLogActivitiesSkipsInvalid() {
        List<AgentforceActivityWrapper> wrappers = new List<AgentforceActivityWrapper>();

        // Valid wrapper
        AgentforceActivityWrapper valid = new AgentforceActivityWrapper();
        valid.sessionId = TEST_SESSION_ID_2;
        valid.eventType = 'Session_Started';
        valid.timestamp = Datetime.now().getTime();
        wrappers.add(valid);

        // Invalid wrapper (no sessionId)
        AgentforceActivityWrapper invalid = new AgentforceActivityWrapper();
        invalid.eventType = 'Session_Started';
        wrappers.add(invalid);

        // Null wrapper
        wrappers.add(null);

        Test.startTest();
        List<Id> recordIds = AgentforceActivityService.logActivities(wrappers);
        Test.stopTest();

        System.assertEquals(1, recordIds.size(), 'Should have created only 1 valid record');
    }

    @IsTest
    static void testGetSessionActivitiesSuccess() {
        Test.startTest();
        List<AgentforceActivityWrapper> activities = AgentforceActivityService.getSessionActivities(TEST_SESSION_ID);
        Test.stopTest();

        System.assertEquals(4, activities.size(), 'Should return 4 activities');
        System.assertEquals('Session_Started', activities[0].eventType, 'First activity should be Session_Started');
        System.assertEquals('Session_Ended', activities[3].eventType, 'Last activity should be Session_Ended');
    }

    @IsTest
    static void testGetSessionActivitiesNoResults() {
        Test.startTest();
        List<AgentforceActivityWrapper> activities = AgentforceActivityService.getSessionActivities('0Mw000000000099XXX');
        Test.stopTest();

        System.assertEquals(0, activities.size(), 'Should return empty list for non-existent session');
    }

    @IsTest
    static void testGetSessionActivitiesBlankSessionId() {
        Test.startTest();
        try {
            AgentforceActivityService.getSessionActivities('');
            System.assert(false, 'Should have thrown exception');
        } catch (AuraHandledException e) {
            System.assertNotEquals(null, e.getMessage(), 'Should have error message');
        }
        Test.stopTest();
    }

    @IsTest
    static void testGetSessionSummarySuccess() {
        Test.startTest();
        Map<String, Object> summary = AgentforceActivityService.getSessionSummary(TEST_SESSION_ID);
        Test.stopTest();

        System.assertEquals(4, summary.get('totalEvents'), 'Should have 4 total events');
        System.assertEquals(5, Integer.valueOf(summary.get('messageCount')), 'Message count should be 5');
        System.assertEquals(600, Integer.valueOf(summary.get('timeInChat')), 'Time in chat should be 600');

        Map<String, Integer> breakdown = (Map<String, Integer>) summary.get('eventBreakdown');
        System.assertNotEquals(null, breakdown, 'Event breakdown should exist');
        System.assertEquals(1, breakdown.get('Session_Started'), 'Should have 1 Session_Started');
        System.assertEquals(1, breakdown.get('Link_Click'), 'Should have 1 Link_Click');
    }

    @IsTest
    static void testGetSessionSummaryBlankSessionId() {
        Test.startTest();
        try {
            AgentforceActivityService.getSessionSummary(null);
            System.assert(false, 'Should have thrown exception');
        } catch (AuraHandledException e) {
            System.assertNotEquals(null, e.getMessage(), 'Should have error message');
        }
        Test.stopTest();
    }

    @IsTest
    static void testWrapperConstructorWithAllFields() {
        Id testUserId = UserInfo.getUserId();

        AgentforceActivityWrapper wrapper = new AgentforceActivityWrapper(
            TEST_SESSION_ID,
            'Session_Started',
            Datetime.now().getTime(),
            'agentforceChatHost',
            '{"test": true}',
            5,
            300,
            testUserId,
            null
        );

        System.assertEquals(TEST_SESSION_ID, wrapper.sessionId, 'Session ID should match');
        System.assertEquals('Session_Started', wrapper.eventType, 'Event type should match');
        System.assertEquals('agentforceChatHost', wrapper.eventSource, 'Event source should match');
        System.assertEquals(5, wrapper.messageCount, 'Message count should match');
        System.assertEquals(300, wrapper.timeInChat, 'Time in chat should match');
        System.assertEquals(testUserId, wrapper.userId, 'User ID should match');
    }

    @IsTest
    static void testWrapperToSObject() {
        Long now = Datetime.now().getTime();

        AgentforceActivityWrapper wrapper = new AgentforceActivityWrapper();
        wrapper.sessionId = TEST_SESSION_ID;
        wrapper.eventType = 'Link_Click';
        wrapper.timestamp = now;
        wrapper.eventSource = 'productCatalog';
        wrapper.eventData = '{"linkUrl": "/test"}';
        wrapper.messageCount = 3;
        wrapper.timeInChat = 180;

        Agentforce_Activity__c record = wrapper.toSObject();

        System.assertEquals(TEST_SESSION_ID, record.Messaging_Session_Id__c, 'Session ID should match');
        System.assertEquals('Link_Click', record.Event_Type__c, 'Event type should match');
        System.assertEquals('productCatalog', record.Event_Source__c, 'Event source should match');
        System.assertEquals('{"linkUrl": "/test"}', record.Event_Data__c, 'Event data should match');
        System.assertEquals(3, record.Message_Count__c, 'Message count should match');
        System.assertEquals(180, record.Time_In_Chat__c, 'Time in chat should match');
    }

    @IsTest
    static void testWrapperToSObjectNullTimestamp() {
        AgentforceActivityWrapper wrapper = new AgentforceActivityWrapper();
        wrapper.sessionId = TEST_SESSION_ID;
        wrapper.eventType = 'Session_Started';
        wrapper.timestamp = null;

        Agentforce_Activity__c record = wrapper.toSObject();

        System.assertNotEquals(null, record.Event_Timestamp__c, 'Timestamp should default to now when null');
    }

    @IsTest
    static void testWrapperFromSObject() {
        Agentforce_Activity__c record = new Agentforce_Activity__c(
            Messaging_Session_Id__c = TEST_SESSION_ID,
            Event_Type__c = 'Form_Submit',
            Event_Timestamp__c = Datetime.now(),
            Event_Source__c = 'contactForm',
            Event_Data__c = '{"formName": "contact"}',
            Message_Count__c = 2,
            Time_In_Chat__c = 120
        );

        AgentforceActivityWrapper wrapper = AgentforceActivityWrapper.fromSObject(record);

        System.assertEquals(TEST_SESSION_ID, wrapper.sessionId, 'Session ID should match');
        System.assertEquals('Form_Submit', wrapper.eventType, 'Event type should match');
        System.assertEquals('contactForm', wrapper.eventSource, 'Event source should match');
        System.assertEquals(2, wrapper.messageCount, 'Message count should match');
        System.assertEquals(120, wrapper.timeInChat, 'Time in chat should match');
    }

    @IsTest
    static void testWrapperFromSObjectNullValues() {
        Agentforce_Activity__c record = new Agentforce_Activity__c(
            Messaging_Session_Id__c = TEST_SESSION_ID,
            Event_Type__c = 'Session_Started',
            Event_Timestamp__c = null,
            Message_Count__c = null,
            Time_In_Chat__c = null
        );

        AgentforceActivityWrapper wrapper = AgentforceActivityWrapper.fromSObject(record);

        System.assertEquals(null, wrapper.timestamp, 'Timestamp should be null');
        System.assertEquals(null, wrapper.messageCount, 'Message count should be null');
        System.assertEquals(null, wrapper.timeInChat, 'Time in chat should be null');
    }
}
