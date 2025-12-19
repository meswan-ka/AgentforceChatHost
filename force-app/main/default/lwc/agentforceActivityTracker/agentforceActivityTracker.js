import { LightningElement, api, wire } from 'lwc';
import { subscribe, unsubscribe, APPLICATION_SCOPE, MessageContext } from 'lightning/messageService';
import AGENTFORCE_SESSION_CHANNEL from '@salesforce/messageChannel/AgentforceSessionChannel__c';
import upsertSessionActivity from '@salesforce/apex/AgentforceActivityService.upsertSessionActivity';
import Id from '@salesforce/user/Id';

/**
 * @description Activity tracker component that subscribes to LMS and logs events to Apex
 * Stores ONE record per session with all events in a JSON array (Event_Data__c)
 * Upserts on: 5 events OR 30 seconds OR session end (whichever comes first)
 */
export default class AgentforceActivityTracker extends LightningElement {
    // Tracking configuration - set via Experience Builder properties
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
    eventLog = []; // Array of all events for this session
    upsertTimeout = null;
    lastUpsertTime = null;
    isSessionActive = false;

    // Upsert trigger thresholds
    EVENT_THRESHOLD = 5;
    TIME_THRESHOLD_MS = 30000; // 30 seconds

    // Wire the message context
    @wire(MessageContext)
    messageContext;

    connectedCallback() {
        this.subscribeToChannel();
        this.setupVisibilityHandler();
    }

    disconnectedCallback() {
        this.unsubscribeFromChannel();
        this.removeVisibilityHandler();
        // Final upsert on component destroy
        if (this.isSessionActive && this.eventLog.length > 0) {
            this.upsertSessionRecord(true);
        }
    }

    /**
     * Setup visibility change handler for browser close/tab switch
     */
    setupVisibilityHandler() {
        this._visibilityHandler = this.handleVisibilityChange.bind(this);
        document.addEventListener('visibilitychange', this._visibilityHandler);
    }

    /**
     * Remove visibility change handler
     */
    removeVisibilityHandler() {
        if (this._visibilityHandler) {
            document.removeEventListener('visibilitychange', this._visibilityHandler);
        }
    }

    /**
     * Handle visibility change (browser close/tab switch)
     */
    handleVisibilityChange() {
        if (document.visibilityState === 'hidden' && this.isSessionActive && this.eventLog.length > 0) {
            // Use sendBeacon for reliability on page unload
            this.upsertSessionRecord(false);
        }
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

        // Handle session start - reset tracking state
        if (eventType === 'SESSION_STARTED') {
            this.resetSessionState(sessionId, timestamp);
        }

        // Check if we should track this event type
        if (!this.shouldTrackEvent(eventType)) {
            return;
        }

        // Add event to log
        this.addEventToLog(eventType, timestamp, data);

        // Handle session end - immediate upsert
        if (eventType === 'SESSION_ENDED') {
            this.isSessionActive = false;
            this.upsertSessionRecord(true);
            return;
        }

        // Check if we should upsert (5 events OR 30 seconds)
        this.checkUpsertTriggers();
    }

    /**
     * Reset session state for new session
     * @param {String} sessionId - New session ID
     * @param {Number} timestamp - Session start timestamp
     */
    resetSessionState(sessionId, timestamp) {
        // If there was a previous session with pending events, upsert it first
        if (this.currentSessionId && this.eventLog.length > 0) {
            this.upsertSessionRecord(true);
        }

        this.currentSessionId = sessionId;
        this.sessionStartTime = timestamp;
        this.messageCount = 0;
        this.eventLog = [];
        this.lastUpsertTime = Date.now();
        this.isSessionActive = true;

        if (this.upsertTimeout) {
            clearTimeout(this.upsertTimeout);
            this.upsertTimeout = null;
        }
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
     * Add event to the event log array
     * @param {String} eventType - Event type
     * @param {Number} timestamp - Unix timestamp
     * @param {String} data - Event-specific data (JSON string)
     */
    addEventToLog(eventType, timestamp, data) {
        // Update message count for message events
        if (eventType === 'MESSAGE_SENT' || eventType === 'MESSAGE_RECEIVED') {
            this.messageCount++;
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

        const eventEntry = {
            type: eventTypeMap[eventType] || eventType,
            timestamp: timestamp,
            source: this.componentName
        };

        // Include parsed data if available
        if (data) {
            try {
                eventEntry.data = JSON.parse(data);
            } catch (e) {
                eventEntry.data = data;
            }
        }

        this.eventLog.push(eventEntry);

        console.log('[ActivityTracker] EVENT LOGGED:', {
            eventType: eventEntry.type,
            eventCount: this.eventLog.length,
            messageCount: this.messageCount
        });
    }

    /**
     * Check if upsert triggers are met (5 events OR 30 seconds)
     */
    checkUpsertTriggers() {
        const eventsSinceLastUpsert = this.eventLog.length;
        const timeSinceLastUpsert = Date.now() - (this.lastUpsertTime || Date.now());

        // Trigger on event threshold
        if (eventsSinceLastUpsert >= this.EVENT_THRESHOLD) {
            console.log('[ActivityTracker] UPSERT TRIGGER: Event threshold reached', eventsSinceLastUpsert);
            this.upsertSessionRecord(false);
            return;
        }

        // Clear existing timeout and set new one for time-based trigger
        if (this.upsertTimeout) {
            clearTimeout(this.upsertTimeout);
        }

        const remainingTime = this.TIME_THRESHOLD_MS - timeSinceLastUpsert;
        if (remainingTime > 0) {
            this.upsertTimeout = setTimeout(() => {
                if (this.eventLog.length > 0 && this.isSessionActive) {
                    console.log('[ActivityTracker] UPSERT TRIGGER: Time threshold reached');
                    this.upsertSessionRecord(false);
                }
            }, remainingTime);
        }
    }

    /**
     * Build activity wrapper for upsert
     * @param {Boolean} isSessionEnd - Whether this is the final upsert for session end
     * @returns {Object} Activity wrapper object
     */
    buildSessionActivityWrapper(isSessionEnd) {
        const now = Date.now();

        // Calculate time in chat (seconds)
        let timeInChat = null;
        if (this.trackTimeInChat && this.sessionStartTime) {
            timeInChat = Math.floor((now - this.sessionStartTime) / 1000);
        }

        return {
            sessionId: this.currentSessionId,
            eventType: isSessionEnd ? 'Session_Ended' : 'Session_Updated',
            timestamp: this.sessionStartTime,
            eventSource: this.componentName,
            eventData: JSON.stringify(this.eventLog),
            messageCount: this.trackMessageCount ? this.messageCount : null,
            timeInChat: timeInChat,
            userId: Id,
            contactId: null,
            sessionEndTime: isSessionEnd ? now : null,
            eventCount: this.eventLog.length
        };
    }

    /**
     * Upsert the session activity record
     * @param {Boolean} isSessionEnd - Whether this is the final upsert for session end
     */
    async upsertSessionRecord(isSessionEnd) {
        if (!this.currentSessionId || this.eventLog.length === 0) {
            return;
        }

        // Clear any pending timeout
        if (this.upsertTimeout) {
            clearTimeout(this.upsertTimeout);
            this.upsertTimeout = null;
        }

        const activityWrapper = this.buildSessionActivityWrapper(isSessionEnd);

        console.log('[ActivityTracker] UPSERTING to Apex:', {
            sessionId: activityWrapper.sessionId,
            eventCount: activityWrapper.eventCount,
            messageCount: activityWrapper.messageCount,
            timeInChat: activityWrapper.timeInChat,
            isSessionEnd: isSessionEnd
        });

        try {
            await upsertSessionActivity({ activity: activityWrapper });
            console.log('[ActivityTracker] UPSERT SUCCESS');
            this.lastUpsertTime = Date.now();
        } catch (error) {
            console.error('[ActivityTracker] UPSERT FAILED:', error);
            // Don't clear eventLog on failure - will retry on next trigger
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
            console.warn('[ActivityTracker] No active session to log event');
            return;
        }

        this.addEventToLog(eventType, Date.now(), JSON.stringify(data));
        this.checkUpsertTriggers();
    }

    /**
     * Get current session ID
     * @returns {String} Current session ID or null
     */
    @api
    getSessionId() {
        return this.currentSessionId;
    }

    /**
     * Get current event count for this session
     * @returns {Number} Number of events logged
     */
    @api
    getEventCount() {
        return this.eventLog.length;
    }

    /**
     * Force an immediate upsert (useful for testing or manual triggers)
     */
    @api
    forceUpsert() {
        if (this.currentSessionId && this.eventLog.length > 0) {
            this.upsertSessionRecord(false);
        }
    }
}
