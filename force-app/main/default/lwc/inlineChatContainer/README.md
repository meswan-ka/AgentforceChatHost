# Inline Chat Container LWC

## Agentforce Embedded Service Package

A Lightning Web Component for embedding Salesforce Enhanced Chat v2 (Messaging for Web) in **inline mode** within Experience Cloud sites. This component provides a configurable, reusable solution for rendering the Agentforce chat interface directly within your page layout instead of as a floating action button.

---

## Features

- **Inline Mode**: Embed chat directly within a page container
- **Floating Mode**: Standard FAB (Floating Action Button) behavior
- **Conditional Mode Switching**: Automatically switch between inline/floating based on URL patterns
- **Auto-Launch**: Automatically open chat on page load
- **Initial Message**: Send a predefined message when chat launches
- **Experience Builder Integration**: Fully configurable via drag-and-drop with property panel
- **Programmatic API**: Public methods for controlling chat from parent components

---

## Installation

### Prerequisites

1. Salesforce org with Enhanced Chat v2 / Messaging for Web enabled
2. Embedded Service Deployment configured
3. Experience Cloud site set up
4. SCRT2 URL configured for your org

### Deploy to Org

```bash
# Using Salesforce CLI
sf project deploy start --source-dir force-app/main/default/lwc/inlineChatContainer

# Or using SFDX
sfdx force:source:deploy -p force-app/main/default/lwc/inlineChatContainer
```

---

## Configuration

### Required Properties

| Property | Type | Description |
|----------|------|-------------|
| `orgId` | String | Your Salesforce Org ID (starts with 00D) |
| `deploymentApiName` | String | API name of your Embedded Service Deployment |
| `siteUrl` | String | Full URL of your Experience Cloud site |
| `scrt2Url` | String | SCRT2 URL for messaging service |

### Display Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `displayMode` | String | `inline` | `inline` or `floating` |
| `showHeader` | Boolean | `false` | Show Salesforce header in inline mode |
| `containerHeight` | String | `600px` | Height of chat container |
| `containerWidth` | String | `100%` | Width of chat container |
| `language` | String | `en_US` | Language code for interface |

### Conditional Mode Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enableConditionalMode` | Boolean | `false` | Enable URL-based mode switching |
| `inlineTriggerPath` | String | `''` | URL path that triggers inline mode |
| `inlineTriggerParam` | String | `''` | URL parameter that triggers inline mode |

### Auto-Launch Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `autoLaunch` | Boolean | `false` | Auto-open chat on load |
| `autoLaunchDelay` | Integer | `1000` | Delay before auto-launch (ms) |
| `initialMessage` | String | `''` | Message to send on launch |

---

## Usage Examples

### Basic Inline Mode (Experience Builder)

1. Add the **Inline Chat Container** component to your Experience page
2. Configure the required properties in the property panel:
   - Org ID: `00D8Z000001AbCdEAF`
   - Deployment API Name: `My_Embedded_Service`
   - Site URL: `https://mycompany.my.site.com/support`
   - SCRT2 URL: `https://mycompany.my.salesforce-scrt.com`

### Conditional Mode for Search Pages

To display inline chat only on search results pages:

1. Enable **Conditional Mode**
2. Set **Inline Trigger Path**: `global-search`
3. Set **Inline Trigger Parameter**: `query`

This will render inline when the URL matches:
- `https://yoursite.com/global-search?query=help`

And floating mode for all other pages.

### Programmatic Usage in Parent Component

```javascript
// Parent component JS
handleLaunchChat() {
    const chatComponent = this.template.querySelector('c-inline-chat-container');
    chatComponent.launchChat()
        .then(() => console.log('Chat opened'))
        .catch(err => console.error('Failed to open chat', err));
}

handleSendMessage() {
    const chatComponent = this.template.querySelector('c-inline-chat-container');
    chatComponent.sendMessage('Hello, I need help with my order', 2000)
        .then(() => console.log('Message sent'))
        .catch(err => console.error('Failed to send message', err));
}
```

```html
<!-- Parent component HTML -->
<c-inline-chat-container
    org-id="00D8Z000001AbCdEAF"
    deployment-api-name="My_Embedded_Service"
    site-url="https://mycompany.my.site.com/support"
    scrt2-url="https://mycompany.my.salesforce-scrt.com"
    display-mode="inline"
    container-height="500px"
    onchatinitalized={handleChatReady}>
</c-inline-chat-container>

<lightning-button label="Launch Chat" onclick={handleLaunchChat}></lightning-button>
```

---

## Public API Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `launchChat()` | - | Opens the chat window |
| `sendMessage(message, delay)` | `message`: String, `delay`: Number (ms) | Sends a text message |
| `minimizeChat()` | - | Minimizes chat (floating mode) |
| `endChat()` | - | Ends the current session |

---

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| `chatinitialized` | `{ displayMode: String }` | Fired when chat is successfully initialized |

---

## CSS Customization

### Theme Variants

Apply these classes to the host element:

```html
<!-- Dark theme -->
<c-inline-chat-container class="theme-dark" ...></c-inline-chat-container>

<!-- Borderless -->
<c-inline-chat-container class="borderless" ...></c-inline-chat-container>

<!-- Full height sidebar -->
<c-inline-chat-container class="full-height" ...></c-inline-chat-container>
```

### Custom Styling

Override styles using CSS custom properties or by extending the CSS file.

---

## Troubleshooting

### Common Console Warnings

1. **"displayMode is set to inline but targetElement is using default"**
   - Ensure the chat-container div exists in the DOM before initialization
   - Check that `refs.chatContainer` is accessible

2. **"targetElement is set but displayMode is not inline"**
   - Set `displayMode = 'inline'` explicitly

3. **"Chat container element not found"**
   - The component may be rendering before the DOM is ready
   - Ensure the template includes the chat-container div

### Debug Mode

Check browser console for logs prefixed with `[InlineChatContainer]`

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01 | Initial release |

---

## Related Documentation

- [Salesforce Enhanced Chat v2 Inline Mode](https://developer.salesforce.com/docs/ai/agentforce/guide/enhanced-chat-inline-mode.html)
- [Messaging for In-App and Web Developer Guide](https://developer.salesforce.com/docs/service/messaging-web/guide/api-overview.html)
- [Lightning Web Components Developer Guide](https://developer.salesforce.com/docs/platform/lwc/guide/)
