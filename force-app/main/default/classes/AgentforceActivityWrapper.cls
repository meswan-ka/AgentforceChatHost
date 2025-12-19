/**
 * @description Wrapper class for Agentforce activity data transfer between LWC and Apex
 * @author Claude Code
 */
public with sharing class AgentforceActivityWrapper {

    @AuraEnabled public String sessionId { get; set; }
    @AuraEnabled public String eventType { get; set; }
    @AuraEnabled public Long timestamp { get; set; }
    @AuraEnabled public String eventSource { get; set; }
    @AuraEnabled public String eventData { get; set; }
    @AuraEnabled public Integer messageCount { get; set; }
    @AuraEnabled public Integer timeInChat { get; set; }
    @AuraEnabled public Id userId { get; set; }
    @AuraEnabled public Id contactId { get; set; }
    @AuraEnabled public Long sessionEndTime { get; set; }
    @AuraEnabled public Integer eventCount { get; set; }

    /**
     * @description Default constructor
     */
    public AgentforceActivityWrapper() {}

    /**
     * @description Constructor with all fields
     */
    public AgentforceActivityWrapper(
        String sessionId,
        String eventType,
        Long timestamp,
        String eventSource,
        String eventData,
        Integer messageCount,
        Integer timeInChat,
        Id userId,
        Id contactId
    ) {
        this.sessionId = sessionId;
        this.eventType = eventType;
        this.timestamp = timestamp;
        this.eventSource = eventSource;
        this.eventData = eventData;
        this.messageCount = messageCount;
        this.timeInChat = timeInChat;
        this.userId = userId;
        this.contactId = contactId;
    }

    /**
     * @description Convert wrapper to SObject record
     * @return Agentforce_Activity__c record
     */
    public Agentforce_Activity__c toSObject() {
        return new Agentforce_Activity__c(
            Messaging_Session_Id__c = this.sessionId,
            Event_Type__c = this.eventType,
            Event_Timestamp__c = this.timestamp != null
                ? Datetime.newInstance(this.timestamp)
                : Datetime.now(),
            Event_Source__c = this.eventSource,
            Event_Data__c = this.eventData,
            Message_Count__c = this.messageCount,
            Time_In_Chat__c = this.timeInChat,
            User__c = this.userId,
            Contact__c = this.contactId,
            Session_End_Time__c = this.sessionEndTime != null
                ? Datetime.newInstance(this.sessionEndTime)
                : null,
            Event_Count__c = this.eventCount
        );
    }

    /**
     * @description Create wrapper from SObject record
     * @param record The Agentforce_Activity__c record
     * @return AgentforceActivityWrapper instance
     */
    public static AgentforceActivityWrapper fromSObject(Agentforce_Activity__c record) {
        AgentforceActivityWrapper wrapper = new AgentforceActivityWrapper();
        wrapper.sessionId = record.Messaging_Session_Id__c;
        wrapper.eventType = record.Event_Type__c;
        wrapper.timestamp = record.Event_Timestamp__c != null
            ? record.Event_Timestamp__c.getTime()
            : null;
        wrapper.eventSource = record.Event_Source__c;
        wrapper.eventData = record.Event_Data__c;
        wrapper.messageCount = record.Message_Count__c != null
            ? Integer.valueOf(record.Message_Count__c)
            : null;
        wrapper.timeInChat = record.Time_In_Chat__c != null
            ? Integer.valueOf(record.Time_In_Chat__c)
            : null;
        wrapper.userId = record.User__c;
        wrapper.contactId = record.Contact__c;
        wrapper.sessionEndTime = record.Session_End_Time__c != null
            ? record.Session_End_Time__c.getTime()
            : null;
        wrapper.eventCount = record.Event_Count__c != null
            ? Integer.valueOf(record.Event_Count__c)
            : null;
        return wrapper;
    }
}
