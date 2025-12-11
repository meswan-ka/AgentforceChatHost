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

## Custom Object: Agentforce_Activity__c

Activity events are logged to this custom object:

| Field | API Name | Type | Description |
|-------|----------|------|-------------|
| Messaging Session ID | `Messaging_Session_Id__c` | Text | Unique session identifier |
| Event Type | `Event_Type__c` | Picklist | Type of activity event |
| Event Timestamp | `Event_Timestamp__c` | DateTime | When the event occurred |
| Event Source | `Event_Source__c` | Text | Component that triggered the event |
| Event Data | `Event_Data__c` | Long Text | JSON payload with event details |
| Message Count | `Message_Count__c` | Number | Running count of messages |
| Time in Chat | `Time_In_Chat__c` | Number | Seconds since session start |
| User | `User__c` | Lookup(User) | Logged-in user (if authenticated) |
| Contact | `Contact__c` | Lookup(Contact) | Related contact |

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
// Log a single activity
Id recordId = AgentforceActivityService.logActivity(activityWrapper);

// Log multiple activities (batch)
List<Id> recordIds = AgentforceActivityService.logActivities(activityWrappers);

// Get all activities for a session
List<AgentforceActivityWrapper> activities =
    AgentforceActivityService.getSessionActivities('session-123');

// Get session summary metrics
Map<String, Object> summary =
    AgentforceActivityService.getSessionSummary('session-123');
// Returns: { totalEvents, messageCount, timeInChat, eventBreakdown }
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
            ├── Messaging_Session_Id__c.field-meta.xml
            ├── Event_Type__c.field-meta.xml
            ├── Event_Timestamp__c.field-meta.xml
            ├── Event_Source__c.field-meta.xml
            ├── Event_Data__c.field-meta.xml
            ├── Message_Count__c.field-meta.xml
            ├── Time_In_Chat__c.field-meta.xml
            ├── User__c.field-meta.xml
            └── Contact__c.field-meta.xml
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 26.W | 2025-12 | Search integration, gradient customization, callout word styling |

---

## License

This project is proprietary software developed by Kelley Austin, now part of Perficient.
