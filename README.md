# Agentforce Chat Host

A comprehensive Lightning Web Component solution for embedding Agentforce chat in Salesforce Experience Cloud with full engagement tracking capabilities.

## Overview

This package provides three primary components:

| Component | Purpose |
|-----------|---------|
| **agentforceChatHost** | Main chat interface with welcome screen, conversation UI, and Messaging API integration |
| **agentforceChatHostCPE** | Custom Property Editor for configuring the chat host in Experience Builder |
| **agentforceActivityTracker** | Background component that logs user engagement events to `Agentforce_Activity__c` |

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Experience Cloud Page                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────┐          LMS           ┌──────────────────────┐   │
│  │  agentforceChatHost  │─────────────────────▶  │ agentforceActivity   │   │
│  │                      │   SESSION_STARTED      │      Tracker         │   │
│  │  - Welcome Screen    │   MESSAGE_SENT         │                      │   │
│  │  - Chat Interface    │   MESSAGE_RECEIVED     │  - Subscribes LMS    │   │
│  │  - Messaging API     │   SESSION_ENDED        │  - Batches events    │   │
│  └──────────────────────┘                        │  - Logs to Apex      │   │
│            │                                      └──────────┬───────────┘   │
│            │                                                 │               │
│            ▼                                                 ▼               │
│  ┌──────────────────────┐                        ┌──────────────────────┐   │
│  │  MessagingApiService │                        │ AgentforceActivity   │   │
│  │       (Apex)         │                        │     Service (Apex)   │   │
│  └──────────────────────┘                        └──────────────────────┘   │
│                                                              │               │
│                                                              ▼               │
│                                                  ┌──────────────────────┐   │
│                                                  │ Agentforce_Activity  │   │
│                                                  │      __c (Object)    │   │
│                                                  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Lightning Message Service (LMS)

Components communicate via `AgentforceSessionChannel__c` with the following message structure:

```javascript
{
    sessionId: 'session-1733320000000-abc123',  // Unique session identifier
    eventType: 'SESSION_STARTED',               // Event type constant
    timestamp: 1733320000000,                   // Unix timestamp
    data: '{"key": "value"}'                    // JSON-stringified event data
}
```

**Supported Event Types:**
- `SESSION_STARTED` - Chat session initiated
- `SESSION_ENDED` - Chat session closed
- `MESSAGE_SENT` - User sent a message
- `MESSAGE_RECEIVED` - Agent responded
- `LINK_CLICK` - User clicked a link in chat
- `FORM_SUBMIT` - User submitted a form in chat

---

## Prerequisites

1. **Salesforce Org Requirements:**
   - Experience Cloud enabled
   - Messaging for In-App and Web enabled
   - Agentforce/Einstein Bots configured

2. **Embedded Service Deployment:**
   - Create an Embedded Service Deployment in Setup
   - Note the **API Name** (e.g., `Agentforce_Chat`)
   - Configure the deployment with your Agentforce agent

3. **Required Permissions:**
   - Guest user profile needs access to:
     - `MessagingApiService` Apex class
     - `AgentforceActivityService` Apex class
     - `AgentforceChatHostController` Apex class
     - `Agentforce_Activity__c` object (Create permission)

4. **Permission Sets (Included):**
   | Permission Set | Purpose |
   |----------------|---------|
   | `Messaging_Api_Access` | Grants access to MessagingApiService Apex class |
   | `Agentforce_Activity_Access` | Grants CRUD + View All on Agentforce_Activity__c |

---

## Installation

### Deploy All Components

```bash
# Deploy LWCs
sf project deploy start --source-dir force-app/main/default/lwc/agentforceChatHost,force-app/main/default/lwc/agentforceChatHostCPE,force-app/main/default/lwc/agentforceActivityTracker

# Deploy Apex Classes
sf project deploy start --source-dir force-app/main/default/classes/AgentforceChatHostController.cls,force-app/main/default/classes/MessagingApiService.cls,force-app/main/default/classes/AgentforceActivityService.cls,force-app/main/default/classes/AgentforceActivityWrapper.cls

# Deploy Message Channel
sf project deploy start --source-dir force-app/main/default/messageChannels/AgentforceSessionChannel.messageChannel-meta.xml

# Deploy Custom Object
sf project deploy start --source-dir force-app/main/default/objects/Agentforce_Activity__c

# Deploy Permission Sets
sf project deploy start --source-dir force-app/main/default/permissionsets
```

### Assign Permission Sets

```bash
# Assign to a user (replace username)
sf org assign permset --name Messaging_Api_Access --target-org your-org-alias
sf org assign permset --name Agentforce_Activity_Access --target-org your-org-alias
```

### Run Tests

```bash
# Run all tests with code coverage
sf apex run test --class-names AgentforceChatHostControllerTest,MessagingApiServiceTest,AgentforceActivityServiceTest --result-format human --code-coverage
```

---

## Experience Cloud Setup

### Step 1: Add the Chat Host Component

1. Open your Experience Cloud site in **Experience Builder**
2. Navigate to the page where you want the chat
3. Drag **Agentforce Chat Host** from the Components panel onto the page
4. The Custom Property Editor will open automatically

### Step 2: Configure via Custom Property Editor

The CPE provides four configuration sections:

#### Setup Section
| Property | Description | Required |
|----------|-------------|----------|
| **Deployment API Name** | The developer name of your Embedded Service Deployment | Yes |

#### Appearance Section
| Property | Default | Description |
|----------|---------|-------------|
| Height | 500px | Component height (400-800px options) |
| Width | 100% | Percentage width (30-100%) |
| Send Button Color | `#0176d3` | Color of the send message button |
| Customize Background Gradient | Off | Toggle to customize gradient colors |
| Gradient Start (Top) | `#e8f4fd` | Top color of welcome screen gradient |
| Gradient End (Bottom) | `#ffffff` | Bottom color of welcome screen gradient |

#### Welcome & Branding Section
| Property | Default | Description |
|----------|---------|-------------|
| Welcome Title | "How can Agentforce help?" | Main heading on welcome screen |
| Welcome Message | "Ask questions..." | Subtitle text |
| Chat Header Title | "Agentforce" | Title shown in chat header |
| Customize Callout Word | Off | Toggle to style a word differently |
| Callout Word | "Agentforce" | Word to highlight in title |
| Callout Color | `#0176d3` | Color for callout word |
| Text Style (Bold/Italic) | Bold | Styling for callout word |

#### Search Integration Section
| Property | Default | Description |
|----------|---------|-------------|
| Enable Search Integration | Off | Enable on search results pages |
| URL Parameter / Path Segment | "term" | Parameter name to capture |
| Auto-start Chat on Search | Off | Automatically start chat with search query |

### Step 3: Add Activity Tracker (Optional)

For engagement tracking on pages with the chat host:

1. Drag **Agentforce Activity Tracker** onto the same page
2. Configure tracking options:

| Property | Default | Description |
|----------|---------|-------------|
| Track Session Lifecycle | On | Log session start/end events |
| Track Messages | On | Log sent/received messages |
| Track Time in Chat | On | Calculate time spent in chat |
| Track Link Clicks | Off | Log link click events |
| Track Form Submissions | Off | Log form submission events |
| Component Name | "agentforceActivityTracker" | Identifier for event source |

### Step 4: Publish Site

1. Click **Publish** in Experience Builder
2. Test the chat functionality on your live site

---

## Activity Tracker Deep Dive

The `agentforceActivityTracker` component provides comprehensive engagement tracking with a **one-record-per-session** design for efficient storage and querying.

### How It Works

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Activity Tracking Flow                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  LMS Events → eventLog[] (in-memory) → Upsert Trigger → Apex/DB    │
│                                                                      │
│  ┌─────────────┐    ┌─────────────┐    ┌──────────────────────┐     │
│  │ SESSION_    │    │ Events      │    │ Upsert when:         │     │
│  │ STARTED     │───▶│ accumulate  │───▶│ • 5 events reached   │     │
│  │ MESSAGE_*   │    │ in array    │    │ • 30 seconds elapsed │     │
│  │ LINK_CLICK  │    │             │    │ • Session ends       │     │
│  │ FORM_SUBMIT │    └─────────────┘    │ • Page closes        │     │
│  │ SESSION_    │                       └──────────────────────┘     │
│  │ ENDED       │                                                     │
│  └─────────────┘                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### One-Record-Per-Session Design

Unlike traditional event logging (one record per event), this implementation stores **all events for a session in a single record**:

| Approach | Records per 50-event session | Query complexity |
|----------|------------------------------|------------------|
| Multi-record (old) | 50 records | Aggregate queries needed |
| **Single-record (current)** | **1 record** | Simple SOQL |

**Benefits:**
- Reduced DML operations (upsert vs insert)
- Lower storage footprint
- Easier session-level analytics
- Atomic session data

### Upsert Triggers

The tracker uses intelligent batching to balance real-time logging with API efficiency:

| Trigger | Condition | Behavior |
|---------|-----------|----------|
| **Event Threshold** | 5 events accumulated | Immediate upsert |
| **Time Threshold** | 30 seconds since last upsert | Scheduled upsert |
| **Session End** | `SESSION_ENDED` event received | Final upsert |
| **Page Close** | Browser tab closed/hidden | Visibility change handler |

The `Messaging_Session_Id__c` field is configured as an **External ID** with **unique constraint**, enabling upsert behavior.

### Event Storage Format

All events are stored as a JSON array in `Event_Data__c`:

```json
[
  {
    "type": "Session_Started",
    "timestamp": 1733320000000,
    "source": "agentforceActivityTracker"
  },
  {
    "type": "Message_Sent",
    "timestamp": 1733320015000,
    "source": "agentforceActivityTracker",
    "data": { "messageLength": 45 }
  },
  {
    "type": "Link_Click",
    "timestamp": 1733320030000,
    "source": "agentforceActivityTracker",
    "data": { "url": "https://help.example.com/article" }
  },
  {
    "type": "Session_Ended",
    "timestamp": 1733320120000,
    "source": "agentforceActivityTracker"
  }
]
```

### Event Types

| LMS Event | Stored As | When Tracked |
|-----------|-----------|--------------|
| `SESSION_STARTED` | `Session_Started` | Session lifecycle ON |
| `SESSION_ENDED` | `Session_Ended` | Session lifecycle ON |
| `MESSAGE_SENT` | `Message_Sent` | Track messages ON |
| `MESSAGE_RECEIVED` | `Message_Received` | Track messages ON |
| `LINK_CLICK` | `Link_Click` | Track link clicks ON |
| `FORM_SUBMIT` | `Form_Submit` | Track form submissions ON |
| (Upsert event) | `Session_Updated` | Automatic (internal) |

### Browser Close Handling

The tracker handles browser close scenarios using two mechanisms:

1. **`disconnectedCallback()`** - Fires when component is destroyed
2. **`visibilitychange` event** - Fires when tab is hidden/closed

```javascript
// Visibility handler ensures data is saved even on sudden browser close
handleVisibilityChange() {
    if (document.visibilityState === 'hidden' && this.isSessionActive) {
        this.upsertSessionRecord(false);
    }
}
```

---

## Custom Object: Agentforce_Activity__c

Activity events are logged to this custom object (one record per session):

| Field | API Name | Type | Description |
|-------|----------|------|-------------|
| Messaging Session ID | `Messaging_Session_Id__c` | Text (255) | **External ID, Unique** - Session identifier for upsert |
| Event Type | `Event_Type__c` | Picklist | Final event state (`Session_Ended` or `Session_Updated`) |
| Event Timestamp | `Event_Timestamp__c` | DateTime | Session start time |
| Event Source | `Event_Source__c` | Text | Component that tracked the session |
| Event Data | `Event_Data__c` | Long Text | JSON array of all session events |
| Event Count | `Event_Count__c` | Number | Total events in session |
| Message Count | `Message_Count__c` | Number | Total messages sent + received |
| Time in Chat | `Time_In_Chat__c` | Number | Total seconds from start to end |
| Session End Time | `Session_End_Time__c` | DateTime | When session ended (null if active) |
| User | `User__c` | Lookup(User) | Logged-in user (if authenticated) |
| Contact | `Contact__c` | Lookup(Contact) | Related contact |

### Event Type Picklist Values

| API Name | Label | Description |
|----------|-------|-------------|
| `Session_Started` | Session Started | Chat session initiated |
| `Session_Ended` | Session Ended | Chat session closed |
| `Session_Updated` | Session Updated | Intermediate upsert (session still active) |
| `Message_Sent` | Message Sent | User sent a message |
| `Message_Received` | Message Received | Agent responded |
| `Link_Click` | Link Click | User clicked a link |
| `Form_Submit` | Form Submit | User submitted a form |

---

## Search Integration

The chat host can integrate with Experience Cloud search pages to auto-populate user queries.

### Supported URL Formats

1. **Query Parameters:**
   ```
   https://yoursite.com/search?term=how+to+reset+password
   ```

2. **Path-based URLs (Experience Cloud pattern):**
   ```
   https://yoursite.com/global-search/reset-password
   ```

### Configuration

1. Enable **Search Integration** in the CPE
2. Set the **URL Parameter / Path Segment** (default: `term`)
3. Optionally enable **Auto-start Chat on Search** to automatically send the search query as the first message

---

## JavaScript API

### agentforceChatHost Public Methods

```javascript
// Get current session ID
const sessionId = chatHostRef.getSessionId();

// Get conversation ID (Messaging API)
const conversationId = chatHostRef.getConversationId();

// Check if chat is active
const isActive = chatHostRef.isActive();

// Get session metrics
const metrics = chatHostRef.getSessionMetrics();
// Returns: { sessionId, conversationId, startTime, messageCount, isActive }

// Publish custom event to LMS
chatHostRef.publishEvent('CUSTOM_EVENT', { customData: 'value' });

// End the current session
chatHostRef.endSession();
```

### agentforceActivityTracker Public Methods

```javascript
// Log a custom event
activityTrackerRef.logEvent('CUSTOM_ACTION', { action: 'button_click' });

// Get current session ID
const sessionId = activityTrackerRef.getSessionId();
```

### DOM Events

The chat host dispatches custom DOM events:

```javascript
// Session started
element.addEventListener('sessionstarted', (event) => {
    console.log('Session ID:', event.detail.sessionId);
    console.log('Conversation ID:', event.detail.conversationId);
});

// Session ended
element.addEventListener('sessionended', (event) => {
    console.log('Final message count:', event.detail.messageCount);
});
```

---

## Apex Services

### MessagingApiService

Provides configuration for the Salesforce Messaging API:

```apex
// Get token request configuration
MessagingApiService.TokenRequestConfig config =
    MessagingApiService.getTokenRequestConfig(null, 'Agentforce_Chat');
// Returns: { orgId, esDeveloperName, capabilitiesVersion, platform, scrtUrl }
```

### AgentforceActivityService

Manages activity logging and retrieval:

```apex
// Upsert session activity (one-record-per-session pattern) - RECOMMENDED
Id recordId = AgentforceActivityService.upsertSessionActivity(activityWrapper);
// Uses Messaging_Session_Id__c as external ID for upsert

// Log a single activity (creates new record each time)
Id recordId = AgentforceActivityService.logActivity(activityWrapper);

// Log multiple activities (batch insert)
List<Id> recordIds = AgentforceActivityService.logActivities(activityWrappers);

// Get all activities for a session
List<AgentforceActivityWrapper> activities =
    AgentforceActivityService.getSessionActivities('session-123');

// Get session summary metrics
Map<String, Object> summary =
    AgentforceActivityService.getSessionSummary('session-123');
// Returns: { totalEvents, messageCount, timeInChat, eventBreakdown }
```

### AgentforceActivityWrapper

Data transfer object for activity records:

```apex
AgentforceActivityWrapper wrapper = new AgentforceActivityWrapper();
wrapper.sessionId = 'session-123';           // Required - used as external ID
wrapper.eventType = 'Session_Ended';         // Required - picklist value
wrapper.timestamp = Datetime.now().getTime(); // Session start time (Unix ms)
wrapper.eventSource = 'agentforceActivityTracker';
wrapper.eventData = '[{...}]';               // JSON array of events
wrapper.eventCount = 4;                      // Total events in session
wrapper.messageCount = 10;                   // Total messages
wrapper.timeInChat = 300;                    // Seconds in chat
wrapper.sessionEndTime = Datetime.now().getTime(); // End time (Unix ms)
wrapper.userId = UserInfo.getUserId();
wrapper.contactId = null;
```

---

## Troubleshooting

### Chat Not Loading

1. **Verify Deployment API Name** - Must match exactly (case-sensitive)
2. **Check Guest User Permissions** - Ensure Apex class access is granted
3. **Verify SCRT URL** - Check browser console for authentication errors

### Activity Not Being Logged

1. **Check LMS Subscription** - Ensure Activity Tracker is on the same page
2. **Verify Object Permissions** - Guest user needs Create on `Agentforce_Activity__c`
3. **Check Browser Console** - Look for `[ActivityTracker]` log messages

### Search Integration Not Working

1. **Verify URL Format** - Check that your URL matches supported patterns
2. **Enable Feature** - Ensure Search Integration toggle is enabled in CPE
3. **Check Parameter Name** - Must match your URL's query parameter

### Styling Issues

1. **API Version** - LWCs use API 64.0 for LMS compatibility
2. **CSS Variables** - Gradient colors use CSS custom properties
3. **Experience Cloud Theme** - Component respects Salesforce Sans font

---

## File Structure

```
force-app/main/default/
├── classes/
│   ├── AgentforceChatHostController.cls          # Background image service
│   ├── AgentforceChatHostControllerTest.cls
│   ├── MessagingApiService.cls                   # Messaging API config
│   ├── MessagingApiServiceTest.cls
│   ├── AgentforceActivityService.cls             # Activity logging
│   ├── AgentforceActivityServiceTest.cls
│   └── AgentforceActivityWrapper.cls             # Data transfer object
├── lwc/
│   ├── agentforceChatHost/                       # Main chat component
│   │   ├── agentforceChatHost.js
│   │   ├── agentforceChatHost.html
│   │   ├── agentforceChatHost.css
│   │   └── agentforceChatHost.js-meta.xml
│   ├── agentforceChatHostCPE/                    # Custom Property Editor
│   │   ├── agentforceChatHostCPE.js
│   │   ├── agentforceChatHostCPE.html
│   │   ├── agentforceChatHostCPE.css
│   │   └── agentforceChatHostCPE.js-meta.xml
│   └── agentforceActivityTracker/                # Activity tracking
│       ├── agentforceActivityTracker.js
│       ├── agentforceActivityTracker.html
│       └── agentforceActivityTracker.js-meta.xml
├── messageChannels/
│   └── AgentforceSessionChannel.messageChannel-meta.xml
├── permissionsets/
│   ├── Agentforce_Activity_Access.permissionset-meta.xml
│   └── Messaging_Api_Access.permissionset-meta.xml
└── objects/
    └── Agentforce_Activity__c/
        ├── Agentforce_Activity__c.object-meta.xml
        └── fields/
            ├── Messaging_Session_Id__c.field-meta.xml  # External ID, Unique
            ├── Event_Type__c.field-meta.xml
            ├── Event_Timestamp__c.field-meta.xml
            ├── Event_Source__c.field-meta.xml
            ├── Event_Data__c.field-meta.xml            # JSON array of events
            ├── Event_Count__c.field-meta.xml           # Total events in session
            ├── Message_Count__c.field-meta.xml
            ├── Time_In_Chat__c.field-meta.xml
            ├── Session_End_Time__c.field-meta.xml      # When session ended
            ├── User__c.field-meta.xml
            └── Contact__c.field-meta.xml
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 27.0 | 2025-12 | Activity tracker redesign: one-record-per-session with upsert, JSON event storage, hybrid timing (5 events OR 30s) |
| 26.W | 2025-12 | Search integration, gradient customization, callout word styling |

---

## License

This project is proprietary software developed by Kelley Austin, now part of Perficient.
