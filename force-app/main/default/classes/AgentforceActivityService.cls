/**
 * @description Service class for logging and querying Agentforce activity records
 * @author Claude Code
 */
public with sharing class AgentforceActivityService {

    /**
     * @description Log a single activity from LWC
     * @param activity The activity wrapper containing event data
     * @return The created activity record Id
     */
    @AuraEnabled
    public static Id logActivity(AgentforceActivityWrapper activity) {
        if (activity == null || String.isBlank(activity.sessionId)) {
            throw new AuraHandledException('Activity and sessionId are required');
        }

        Agentforce_Activity__c record = activity.toSObject();

        try {
            insert record;
            return record.Id;
        } catch (DmlException e) {
            throw new AuraHandledException('Failed to log activity: ' + e.getMessage());
        }
    }

    /**
     * @description Log multiple activities in bulk from LWC
     * @param activities List of activity wrappers
     * @return List of created activity record Ids
     */
    @AuraEnabled
    public static List<Id> logActivities(List<AgentforceActivityWrapper> activities) {
        if (activities == null || activities.isEmpty()) {
            throw new AuraHandledException('At least one activity is required');
        }

        List<Agentforce_Activity__c> records = new List<Agentforce_Activity__c>();
        for (AgentforceActivityWrapper wrapper : activities) {
            if (wrapper != null && String.isNotBlank(wrapper.sessionId)) {
                records.add(wrapper.toSObject());
            }
        }

        if (records.isEmpty()) {
            throw new AuraHandledException('No valid activities to log');
        }

        try {
            insert records;
            List<Id> recordIds = new List<Id>();
            for (Agentforce_Activity__c record : records) {
                recordIds.add(record.Id);
            }
            return recordIds;
        } catch (DmlException e) {
            throw new AuraHandledException('Failed to log activities: ' + e.getMessage());
        }
    }

    /**
     * @description Upsert a session activity record (one record per session)
     * Uses Messaging_Session_Id__c as external ID for upsert
     * @param activity The activity wrapper containing session data
     * @return The upserted activity record Id
     */
    @AuraEnabled
    public static Id upsertSessionActivity(AgentforceActivityWrapper activity) {
        if (activity == null || String.isBlank(activity.sessionId)) {
            throw new AuraHandledException('Activity and sessionId are required');
        }

        Agentforce_Activity__c record = activity.toSObject();

        try {
            Database.UpsertResult result = Database.upsert(
                record,
                Agentforce_Activity__c.Messaging_Session_Id__c,
                false
            );

            if (!result.isSuccess()) {
                String errorMsg = '';
                for (Database.Error err : result.getErrors()) {
                    errorMsg += err.getMessage() + ' ';
                }
                throw new AuraHandledException('Failed to upsert session activity: ' + errorMsg);
            }

            return result.getId();
        } catch (DmlException e) {
            throw new AuraHandledException('Failed to upsert session activity: ' + e.getMessage());
        }
    }

    /**
     * @description Get all activities for a specific messaging session
     * @param sessionId The Messaging Session Id
     * @return List of activity wrappers ordered by timestamp
     */
    @AuraEnabled(cacheable=true)
    public static List<AgentforceActivityWrapper> getSessionActivities(String sessionId) {
        if (String.isBlank(sessionId)) {
            throw new AuraHandledException('Session ID is required');
        }

        List<Agentforce_Activity__c> records = [
            SELECT
                Id,
                Messaging_Session_Id__c,
                Event_Type__c,
                Event_Timestamp__c,
                Event_Source__c,
                Event_Data__c,
                Message_Count__c,
                Time_In_Chat__c,
                User__c,
                Contact__c,
                Session_End_Time__c,
                Event_Count__c
            FROM Agentforce_Activity__c
            WHERE Messaging_Session_Id__c = :sessionId
            ORDER BY Event_Timestamp__c ASC
            LIMIT 1000
        ];

        List<AgentforceActivityWrapper> wrappers = new List<AgentforceActivityWrapper>();
        for (Agentforce_Activity__c record : records) {
            wrappers.add(AgentforceActivityWrapper.fromSObject(record));
        }
        return wrappers;
    }

    /**
     * @description Get session summary metrics
     * @param sessionId The Messaging Session Id
     * @return Map containing summary metrics
     */
    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getSessionSummary(String sessionId) {
        if (String.isBlank(sessionId)) {
            throw new AuraHandledException('Session ID is required');
        }

        List<AggregateResult> results = [
            SELECT
                COUNT(Id) totalEvents,
                MAX(Message_Count__c) maxMessageCount,
                MAX(Time_In_Chat__c) maxTimeInChat
            FROM Agentforce_Activity__c
            WHERE Messaging_Session_Id__c = :sessionId
        ];

        Map<String, Object> summary = new Map<String, Object>();

        if (!results.isEmpty()) {
            AggregateResult agg = results[0];
            summary.put('totalEvents', agg.get('totalEvents'));
            summary.put('messageCount', agg.get('maxMessageCount'));
            summary.put('timeInChat', agg.get('maxTimeInChat'));
        }

        // Get event type breakdown
        List<AggregateResult> eventBreakdown = [
            SELECT Event_Type__c, COUNT(Id) eventCount
            FROM Agentforce_Activity__c
            WHERE Messaging_Session_Id__c = :sessionId
            GROUP BY Event_Type__c
        ];

        Map<String, Integer> eventCounts = new Map<String, Integer>();
        for (AggregateResult agg : eventBreakdown) {
            String eventType = (String) agg.get('Event_Type__c');
            Integer count = (Integer) agg.get('eventCount');
            eventCounts.put(eventType, count);
        }
        summary.put('eventBreakdown', eventCounts);

        return summary;
    }
}
