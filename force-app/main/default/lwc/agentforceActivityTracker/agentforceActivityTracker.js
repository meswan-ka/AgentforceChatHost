import { LightningElement, api, wire } from 'lwc';
import { subscribe, unsubscribe, APPLICATION_SCOPE, MessageContext } from 'lightning/messageService';
import AGENTFORCE_SESSION_CHANNEL from '@salesforce/messageChannel/AgentforceSessionChannel__c';
import logActivity from '@salesforce/apex/AgentforceActivityService.logActivity';
import logActivities from '@salesforce/apex/AgentforceActivityService.logActivities';
import Id from '@salesforce/user/Id';

/**
 * @description Activity tracker component that subscribes to LMS and logs events to Apex
 * This component should be placed on Experience Cloud pages to track user engagement
 */
export default class AgentforceActivityTracker extends LightningElement {
    // Tracking configuration - set via Experience Builder properties
    // NOTE: JS defaults must be false per LWC rules; meta.xml defaults override these when
    // the component is added to a page. The meta.xml sets core tracking (session, messages, time) to true.
    @api trackSessionLifecycle = false;
    @api trackLinkClicks = false;
    @api trackFormSubmissions = false;
    @api trackMessageCount = false;
    @api trackTimeInChat = false;

    // Component identification
    @api componentName = 'agentforceActivityTracker';

    // Internal state
    subscription = null;
    currentSessionId = null;
    sessionStartTime = null;
    messageCount = 0;
    pendingActivities = [];
    batchTimeout = null;

    // Batch configuration
    BATCH_DELAY_MS = 2000;
    MAX_BATCH_SIZE = 50;

    // Wire the message context
    @wire(MessageContext)
    messageContext;

    connectedCallback() {
        this.subscribeToChannel();
    }

    disconnectedCallback() {
        this.unsubscribeFromChannel();
        this.flushPendingActivities();
    }

    /**
     * Subscribe to the Agentforce Session Channel
     */
    subscribeToChannel() {
        if (!this.subscription) {
            this.subscription = subscribe(
                this.messageContext,
                AGENTFORCE_SESSION_CHANNEL,
                (message) => this.handleMessage(message),
                { scope: APPLICATION_SCOPE }
            );
        }
    }

    /**
     * Unsubscribe from the channel
     */
    unsubscribeFromChannel() {
        if (this.subscription) {
            unsubscribe(this.subscription);
            this.subscription = null;
        }
    }

    /**
     * Handle incoming LMS messages
     * @param {Object} message - The LMS message payload
     */
    handleMessage(message) {
        const { sessionId, eventType, timestamp, data } = message;

        console.log('[ActivityTracker] LMS RECEIVED:', {
            eventType,
            sessionId,
            timestamp: new Date(timestamp).toISOString(),
            data: data ? JSON.parse(data) : null
        });

        // Update current session tracking
        if (eventType === 'SESSION_STARTED') {
            this.currentSessionId = sessionId;
            this.sessionStartTime = timestamp;
            this.messageCount = 0;
        }

        // Check if we should track this event type
        if (!this.shouldTrackEvent(eventType)) {
            return;
        }

        // Build activity record
        const activity = this.buildActivityWrapper(sessionId, eventType, timestamp, data);

        // Queue for batch insert
        this.queueActivity(activity);
    }

    /**
     * Determine if event type should be tracked based on configuration
     * @param {String} eventType - The event type
     * @returns {Boolean} Whether to track the event
     */
    shouldTrackEvent(eventType) {
        switch (eventType) {
            case 'SESSION_STARTED':
            case 'SESSION_ENDED':
                return this.trackSessionLifecycle;
            case 'LINK_CLICK':
                return this.trackLinkClicks;
            case 'FORM_SUBMIT':
                return this.trackFormSubmissions;
            case 'MESSAGE_SENT':
            case 'MESSAGE_RECEIVED':
                return this.trackMessageCount;
            default:
                return true;
        }
    }

    /**
     * Build activity wrapper object for Apex
     * @param {String} sessionId - Messaging Session ID
     * @param {String} eventType - Event type
     * @param {Number} timestamp - Unix timestamp
     * @param {Object} data - Event-specific data
     * @returns {Object} Activity wrapper
     */
    buildActivityWrapper(sessionId, eventType, timestamp, data) {
        // Update message count for message events
        if (eventType === 'MESSAGE_SENT' || eventType === 'MESSAGE_RECEIVED') {
            this.messageCount++;
        }

        // Calculate time in chat
        let timeInChat = null;
        if (this.trackTimeInChat && this.sessionStartTime) {
            timeInChat = Math.floor((timestamp - this.sessionStartTime) / 1000);
        }

        // Map event type to picklist value
        const eventTypeMap = {
            'SESSION_STARTED': 'Session_Started',
            'SESSION_ENDED': 'Session_Ended',
            'LINK_CLICK': 'Link_Click',
            'FORM_SUBMIT': 'Form_Submit',
            'MESSAGE_SENT': 'Message_Sent',
            'MESSAGE_RECEIVED': 'Message_Received'
        };

        return {
            sessionId: sessionId,
            eventType: eventTypeMap[eventType] || eventType,
            timestamp: timestamp,
            eventSource: data?.sourceComponent || this.componentName,
            eventData: data ? JSON.stringify(data) : null,
            messageCount: this.trackMessageCount ? this.messageCount : null,
            timeInChat: timeInChat,
            userId: Id,
            contactId: null
        };
    }

    /**
     * Queue activity for batch insert
     * @param {Object} activity - Activity wrapper
     */
    queueActivity(activity) {
        console.log('[ActivityTracker] QUEUED for Apex:', {
            eventType: activity.eventType,
            sessionId: activity.sessionId,
            messageCount: activity.messageCount,
            timeInChat: activity.timeInChat
        });
        this.pendingActivities.push(activity);

        // If batch is full, flush immediately
        if (this.pendingActivities.length >= this.MAX_BATCH_SIZE) {
            this.flushPendingActivities();
            return;
        }

        // Reset batch timeout
        if (this.batchTimeout) {
            clearTimeout(this.batchTimeout);
        }

        // Schedule batch flush
        this.batchTimeout = setTimeout(() => {
            this.flushPendingActivities();
        }, this.BATCH_DELAY_MS);
    }

    /**
     * Flush pending activities to Apex
     */
    async flushPendingActivities() {
        if (this.pendingActivities.length === 0) {
            return;
        }

        const activitiesToSend = [...this.pendingActivities];
        this.pendingActivities = [];

        if (this.batchTimeout) {
            clearTimeout(this.batchTimeout);
            this.batchTimeout = null;
        }

        try {
            console.log('[ActivityTracker] FLUSHING to Apex:', {
                count: activitiesToSend.length,
                eventTypes: activitiesToSend.map(a => a.eventType)
            });
            if (activitiesToSend.length === 1) {
                await logActivity({ activity: activitiesToSend[0] });
            } else {
                await logActivities({ activities: activitiesToSend });
            }
            console.log('[ActivityTracker] APEX SUCCESS:', activitiesToSend.length, 'activities logged');
        } catch (error) {
            console.error('Failed to log activities:', error);
            // Re-queue failed activities for retry (with limit)
            if (this.pendingActivities.length < this.MAX_BATCH_SIZE) {
                this.pendingActivities.unshift(...activitiesToSend);
            }
        }
    }

    /**
     * Public method to manually log an activity from other components
     * @param {String} eventType - Event type
     * @param {Object} data - Event-specific data
     */
    @api
    logEvent(eventType, data = {}) {
        if (!this.currentSessionId) {
            console.warn('No active session to log event');
            return;
        }

        const activity = this.buildActivityWrapper(
            this.currentSessionId,
            eventType,
            Date.now(),
            data
        );

        this.queueActivity(activity);
    }

    /**
     * Get current session ID
     * @returns {String} Current session ID or null
     */
    @api
    getSessionId() {
        return this.currentSessionId;
    }
}
