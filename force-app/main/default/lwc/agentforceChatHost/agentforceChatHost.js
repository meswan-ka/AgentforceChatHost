import { LightningElement, api, wire } from 'lwc';
import { publish, MessageContext } from 'lightning/messageService';
import AGENTFORCE_SESSION_CHANNEL from '@salesforce/messageChannel/AgentforceSessionChannel__c';
import getBackgroundImageUrl from '@salesforce/apex/AgentforceChatHostController.getBackgroundImageUrl';
import getTokenRequestConfig from '@salesforce/apex/MessagingApiService.getTokenRequestConfig';

/**
 * @description Host component for Agentforce Chat in Experience Cloud
 * Connects to Salesforce Messaging for In-App and Web API
 */
export default class AgentforceChatHost extends LightningElement {
    // CPE Configuration (JSON string from Experience Builder)
    // Using getter/setter to apply config when Experience Builder sets the value
    _configJson = '';

    @api
    get configJson() {
        return this._configJson;
    }

    set configJson(val) {
        this._configJson = val;
        // Reset flag so config gets applied when value changes
        this._configApplied = false;
        this._applyConfigJson();
    }

    // Display Configuration
    @api displayMode = 'Inline';
    @api inlineHeight = 500;
    @api inlineWidthPercent = 100;

    // Background Image Configuration
    @api backgroundImageId = '';

    // Background Gradient Configuration
    @api gradientStartColor = '#e8f4fd';
    @api gradientMidColor = '#f5f9fc';
    @api gradientEndColor = '#ffffff';

    // Welcome Title & Callout Configuration
    @api welcomeTitle = 'How can Agentforce help?';
    @api welcomeTitleColor = '#032d60';
    @api calloutWord = 'Agentforce';
    @api calloutColor = '#0176d3';
    @api calloutBold = false; // Default false per LWC rules; CPE sends true as default
    @api calloutItalic = false;
    @api calloutFontWeight = '700';

    // Branding & Messaging
    @api welcomeMessage = 'Ask questions, get personalized answers, and take action with Agentforce.';
    @api chatHeaderTitle = 'Agentforce';
    @api sendButtonColor = '#0176d3';
    @api deploymentDeveloperName = '';

    // Chat Message Styling
    @api agentPrimaryColor = '#0176d3';
    @api agentBubbleColor = '#f3f3f3';
    @api userBubbleColor = '#e8f4fd';
    @api userTextColor = '#032d60';
    @api autoUserTextColor = false; // Default false per LWC rules; CPE sends true as default

    // Search Integration Configuration
    @api enableSearchIntegration = false;
    @api searchUrlParameter = 'term';
    @api autoStartOnSearch = false;

    // Flag to track if config has been applied
    _configApplied = false;

    // UI State
    _screenState = 'welcome'; // 'welcome', 'chat', 'loading', 'error', 'connecting'
    inputMessage = '';
    messages = [];
    isAgentTyping = false;
    errorMessage = '';
    _isInitializing = false;
    _initializingStatus = 'Connecting...';
    _isMenuOpen = false;

    // Background Image State
    _backgroundImageUrl = null;

    // Session State
    currentSessionId = null;
    sessionStartTime = null;
    _sessionStartTimeFormatted = null;
    messageCount = 0;
    isConversationActive = false;
    _messageIdCounter = 0;

    // Messaging API State
    _accessToken = null;
    _conversationId = null;
    _scrtUrl = null;
    _orgId = null;
    _lastEventId = null;
    _sseAbortController = null;
    _sessionActive = false;
    _sessionActiveResolver = null;
    _waitingForSession = false;
    _agentGreetingReceived = false;
    _agentGreetingResolver = null;
    _initialSearchQuery = null;
    _searchIntegrationProcessed = false;

    @wire(MessageContext)
    messageContext;

    @wire(getBackgroundImageUrl, { imageId: '$backgroundImageId' })
    wiredBackgroundImage({ error, data }) {
        if (data) {
            this._backgroundImageUrl = data;
        } else if (error) {
            this._backgroundImageUrl = null;
        }
    }

    // ==================== COMPUTED PROPERTIES ====================

    get wrapperClass() {
        return 'chat-wrapper';
    }

    get wrapperStyle() {
        if (this.displayMode === 'Inline') {
            let style = `height: ${this.inlineHeight}px; width: ${this.inlineWidthPercent}%;`;
            if (this.inlineWidthPercent < 100) {
                style += ' margin: 0 auto;';
            }
            return style;
        }
        return '';
    }

    get hasBackgroundImage() {
        return this._backgroundImageUrl !== null && this._backgroundImageUrl !== '';
    }

    get backgroundStyle() {
        if (this._backgroundImageUrl) {
            return `background-image: url('${this._backgroundImageUrl}');`;
        }
        return '';
    }

    get containerClass() {
        return 'chat-container';
    }

    get containerStyle() {
        // Apply custom gradient colors to welcome screen
        return `--gradient-start: ${this.gradientStartColor}; --gradient-mid: ${this.gradientMidColor}; --gradient-end: ${this.gradientEndColor};`;
    }

    get hasDeploymentConfigured() {
        return this.deploymentDeveloperName && this.deploymentDeveloperName.trim() !== '';
    }

    // ==================== TITLE & CALLOUT ====================

    /**
     * Parses the welcome title and splits it into parts for rendering
     * with the callout word styled separately
     */
    get titleParts() {
        const title = this.welcomeTitle || '';
        const callout = this.calloutWord || '';

        // If no callout word specified, return title as single part
        if (!callout) {
            return [{ text: title, isCallout: false }];
        }

        // Case-insensitive search for the callout word
        const lowerTitle = title.toLowerCase();
        const lowerCallout = callout.toLowerCase();
        const index = lowerTitle.indexOf(lowerCallout);

        // If callout word not found in title, return title as single part
        if (index === -1) {
            return [{ text: title, isCallout: false }];
        }

        const parts = [];

        // Text before callout
        if (index > 0) {
            parts.push({ text: title.substring(0, index), isCallout: false });
        }

        // The callout word (preserve original case from title)
        parts.push({
            text: title.substring(index, index + callout.length),
            isCallout: true
        });

        // Text after callout
        if (index + callout.length < title.length) {
            parts.push({
                text: title.substring(index + callout.length),
                isCallout: false
            });
        }

        return parts;
    }

    get welcomeTitleStyle() {
        return `color: ${this.welcomeTitleColor};`;
    }

    get calloutStyle() {
        let style = `color: ${this.calloutColor};`;

        if (this.calloutBold) {
            style += ` font-weight: ${this.calloutFontWeight};`;
        }

        if (this.calloutItalic) {
            style += ' font-style: italic;';
        }

        return style;
    }

    get sendButtonStyle() {
        // Only apply custom color when button is enabled (has message to send)
        if (this.isSendDisabled) {
            return '';
        }
        return `background-color: ${this.sendButtonColor};`;
    }

    get agentIconStyle() {
        // Derive a darker shade for the gradient end
        return `background: linear-gradient(135deg, ${this.agentPrimaryColor} 0%, ${this._darkenColor(this.agentPrimaryColor, 40)} 100%);`;
    }

    get headerTitleStyle() {
        return `color: ${this.agentPrimaryColor};`;
    }

    get agentBubbleStyle() {
        return `background-color: ${this.agentBubbleColor};`;
    }

    get userBubbleStyle() {
        const textColor = this._getEffectiveUserTextColor();
        return `background-color: ${this.userBubbleColor}; color: ${textColor};`;
    }

    /**
     * Get the effective user text color - auto-calculated or manual
     */
    _getEffectiveUserTextColor() {
        if (this.autoUserTextColor) {
            return this._getContrastColor(this.userBubbleColor);
        }
        return this.userTextColor;
    }

    /**
     * Calculate optimal contrast color (dark or light) for a given background
     * Uses WCAG relative luminance formula
     */
    _getContrastColor(hexColor) {
        const luminance = this._getLuminance(hexColor);
        // Use dark text for light backgrounds, light text for dark backgrounds
        // Threshold of 0.5 provides good contrast in most cases
        return luminance > 0.5 ? '#1a1a1a' : '#ffffff';
    }

    /**
     * Calculate relative luminance of a hex color (WCAG 2.1 formula)
     */
    _getLuminance(hex) {
        // Remove # if present
        hex = hex.replace('#', '');

        // Parse RGB values
        let r = parseInt(hex.substring(0, 2), 16) / 255;
        let g = parseInt(hex.substring(2, 4), 16) / 255;
        let b = parseInt(hex.substring(4, 6), 16) / 255;

        // Apply gamma correction
        r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
        g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
        b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

        // Calculate relative luminance
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    /**
     * Helper to darken a hex color by a percentage
     */
    _darkenColor(hex, percent) {
        // Remove # if present
        hex = hex.replace('#', '');

        // Parse RGB values
        let r = parseInt(hex.substring(0, 2), 16);
        let g = parseInt(hex.substring(2, 4), 16);
        let b = parseInt(hex.substring(4, 6), 16);

        // Darken by percentage
        r = Math.max(0, Math.floor(r * (1 - percent / 100)));
        g = Math.max(0, Math.floor(g * (1 - percent / 100)));
        b = Math.max(0, Math.floor(b * (1 - percent / 100)));

        // Convert back to hex
        return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    }

    get showWelcomeScreen() {
        return this._screenState === 'welcome';
    }

    get showChatScreen() {
        return this._screenState === 'chat';
    }

    get isInitializing() {
        return this._isInitializing;
    }

    get initializingStatus() {
        return this._initializingStatus;
    }

    get showMessages() {
        return !this._isInitializing;
    }

    get isLoading() {
        return this._screenState === 'loading';
    }

    get isConnecting() {
        return this._screenState === 'connecting';
    }

    get hasError() {
        return this._screenState === 'error';
    }

    get isSendDisabled() {
        // On welcome screen, only check for empty message
        if (this._screenState === 'welcome') {
            return !this.inputMessage || this.inputMessage.trim() === '';
        }
        // On chat screen, also check for access token and typing state
        return !this.inputMessage || this.inputMessage.trim() === '' || this.isAgentTyping || !this._accessToken;
    }

    get isInputDisabled() {
        // On welcome screen, input is always enabled
        if (this._screenState === 'welcome') {
            return false;
        }
        // On chat screen, disable during typing or if not connected
        return this.isAgentTyping || !this._accessToken;
    }

    get sendButtonVariant() {
        return this.isSendDisabled ? 'bare' : 'inverse';
    }

    get currentTime() {
        return this._formatTime(new Date());
    }

    get sessionStartTimeDisplay() {
        return this._sessionStartTimeFormatted || this._formatTime(new Date());
    }

    // ==================== LIFECYCLE ====================

    connectedCallback() {
        // Parse configJson from CPE if provided (takes precedence over flat props)
        this._applyConfigJson();

        this.generateSessionId();

        // Check for search integration on load
        if (this.enableSearchIntegration && !this._searchIntegrationProcessed) {
            this._checkForSearchQuery();
        }
    }

    /**
     * Parse and apply configJson from Experience Builder CPE
     * Falls back to individual @api properties if configJson is not set
     */
    _applyConfigJson() {
        if (this._configApplied || !this.configJson) {
            return;
        }

        try {
            const config = typeof this.configJson === 'string'
                ? JSON.parse(this.configJson)
                : this.configJson;

            // Apply each config value, keeping defaults for missing properties
            if (config.deploymentDeveloperName !== undefined) this.deploymentDeveloperName = config.deploymentDeveloperName;
            if (config.displayMode !== undefined) this.displayMode = config.displayMode;
            if (config.inlineHeight !== undefined) this.inlineHeight = config.inlineHeight;
            if (config.inlineWidthPercent !== undefined) this.inlineWidthPercent = config.inlineWidthPercent;
            if (config.backgroundImageId !== undefined) this.backgroundImageId = config.backgroundImageId;
            if (config.gradientStartColor !== undefined) this.gradientStartColor = config.gradientStartColor;
            if (config.gradientMidColor !== undefined) this.gradientMidColor = config.gradientMidColor;
            if (config.gradientEndColor !== undefined) this.gradientEndColor = config.gradientEndColor;
            if (config.welcomeTitle !== undefined) this.welcomeTitle = config.welcomeTitle;
            if (config.welcomeTitleColor !== undefined) this.welcomeTitleColor = config.welcomeTitleColor;
            if (config.calloutWord !== undefined) this.calloutWord = config.calloutWord;
            if (config.calloutColor !== undefined) this.calloutColor = config.calloutColor;
            if (config.calloutBold !== undefined) this.calloutBold = config.calloutBold;
            if (config.calloutItalic !== undefined) this.calloutItalic = config.calloutItalic;
            if (config.calloutFontWeight !== undefined) this.calloutFontWeight = config.calloutFontWeight;
            if (config.welcomeMessage !== undefined) this.welcomeMessage = config.welcomeMessage;
            if (config.chatHeaderTitle !== undefined) this.chatHeaderTitle = config.chatHeaderTitle;
            if (config.sendButtonColor !== undefined) this.sendButtonColor = config.sendButtonColor;
            if (config.agentPrimaryColor !== undefined) this.agentPrimaryColor = config.agentPrimaryColor;
            if (config.agentBubbleColor !== undefined) this.agentBubbleColor = config.agentBubbleColor;
            if (config.userBubbleColor !== undefined) this.userBubbleColor = config.userBubbleColor;
            if (config.userTextColor !== undefined) this.userTextColor = config.userTextColor;
            if (config.autoUserTextColor !== undefined) this.autoUserTextColor = config.autoUserTextColor;
            if (config.enableSearchIntegration !== undefined) this.enableSearchIntegration = config.enableSearchIntegration;
            if (config.searchUrlParameter !== undefined) this.searchUrlParameter = config.searchUrlParameter;
            if (config.autoStartOnSearch !== undefined) this.autoStartOnSearch = config.autoStartOnSearch;

            this._configApplied = true;
        } catch (e) {
            // If parsing fails, fall back to individual @api properties
        }
    }

    disconnectedCallback() {
        this.closeSSEConnection();
    }

    /**
     * Check URL for search query parameter and auto-start chat if present
     * Supports both:
     * - Query parameters: ?term=search+query
     * - Path-based URLs: /global-search/search-query (Experience Cloud pattern)
     */
    _checkForSearchQuery() {
        try {
            let searchQuery = null;

            // First, try query parameters (e.g., ?term=lwc)
            const urlParams = new URLSearchParams(window.location.search);
            searchQuery = urlParams.get(this.searchUrlParameter);

            // If no query param found, check for path-based URL pattern
            // Experience Cloud uses: /global-search/SearchTerm
            if (!searchQuery) {
                const pathname = window.location.pathname;

                // Check for /global-search/ pattern
                const globalSearchMatch = pathname.match(/\/global-search\/(.+?)(?:\/|$)/i);
                if (globalSearchMatch && globalSearchMatch[1]) {
                    searchQuery = decodeURIComponent(globalSearchMatch[1])
                        .replace(/[-_]/g, ' ')
                        .trim();
                }

                // Also check for custom path pattern
                if (!searchQuery && this.searchUrlParameter) {
                    const customPathRegex = new RegExp(`\\/${this.searchUrlParameter}\\/(.+?)(?:\\/|$)`, 'i');
                    const customMatch = pathname.match(customPathRegex);
                    if (customMatch && customMatch[1]) {
                        searchQuery = decodeURIComponent(customMatch[1])
                            .replace(/[-_]/g, ' ')
                            .trim();
                    }
                }
            }

            if (searchQuery && searchQuery.trim()) {
                this._initialSearchQuery = searchQuery.trim();
                this._searchIntegrationProcessed = true;

                // Auto-start chat with the search query
                if (this.autoStartOnSearch) {
                    // Use setTimeout to ensure component is fully rendered
                    // eslint-disable-next-line @lwc/lwc/no-async-operation
                    setTimeout(() => {
                        this._startChatWithSearchQuery();
                    }, 100);
                }
            }
        } catch (error) {
            // Silently fail - search integration is optional
        }
    }

    /**
     * Start the chat session with the search query as the first message
     */
    async _startChatWithSearchQuery() {
        if (!this._initialSearchQuery) {
            return;
        }

        this.inputMessage = this._initialSearchQuery;
        await this.handleSendMessage();
    }

    // ==================== MESSAGING API ====================

    /**
     * Initialize the Messaging API connection
     */
    async initializeMessagingApi() {
        if (!this.hasDeploymentConfigured) {
            this.errorMessage = 'No deployment configured. Please select a deployment in the component settings.';
            this._screenState = 'error';
            return false;
        }

        this._screenState = 'chat';
        this._isInitializing = true;
        this._initializingStatus = 'Connecting...';

        try {
            this._initializingStatus = 'Getting configuration...';
            let config;
            try {
                config = await getTokenRequestConfig({
                    orgId: null,
                    deploymentDeveloperName: this.deploymentDeveloperName
                });
            } catch (apexError) {
                const apexMessage = apexError.body?.message || apexError.message || 'Configuration failed';
                throw new Error(apexMessage);
            }

            if (!config || !config.scrtUrl) {
                throw new Error('Invalid configuration');
            }

            this._scrtUrl = config.scrtUrl;
            this._orgId = config.orgId;

            this._initializingStatus = 'Authenticating...';
            const tokenResponse = await this.fetchAccessToken(config);
            if (!tokenResponse || !tokenResponse.accessToken) {
                throw new Error('Failed to obtain access token');
            }

            this._accessToken = tokenResponse.accessToken;
            this._lastEventId = tokenResponse.lastEventId || '';

            this._initializingStatus = 'Starting conversation...';
            const conversationResponse = await this.createConversation();
            if (!conversationResponse) {
                throw new Error('Failed to create conversation');
            }

            this._conversationId = conversationResponse.conversationId || this._conversationId;

            this.subscribeToSSE();

            this._initializingStatus = 'Connecting to agent...';
            await this.waitForSessionActive();

            this._initializingStatus = 'Agent is joining...';
            await this.waitForAgentGreeting();

            this._isInitializing = false;
            return true;
        } catch (error) {
            const errorDetail = error.body?.message || error.message || 'Failed to connect to agent';
            this.errorMessage = errorDetail;
            this._screenState = 'error';
            this._isInitializing = false;
            return false;
        }
    }

    /**
     * Fetch unauthenticated access token from SCRT
     */
    async fetchAccessToken(config) {
        const tokenUrl = `${config.scrtUrl}/iamessage/api/v2/authorization/unauthenticated/access-token`;

        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orgId: config.orgId,
                esDeveloperName: config.esDeveloperName,
                capabilitiesVersion: config.capabilitiesVersion,
                platform: config.platform
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Token request failed: ${response.status} - ${errorText}`);
        }

        const responseText = await response.text();
        if (!responseText) {
            throw new Error('Empty response from token endpoint');
        }

        return JSON.parse(responseText);
    }

    /**
     * Create a new conversation
     */
    async createConversation() {
        this._conversationId = this.generateUUID();
        const conversationUrl = `${this._scrtUrl}/iamessage/api/v2/conversation`;

        const response = await fetch(conversationUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this._accessToken}`
            },
            body: JSON.stringify({
                conversationId: this._conversationId,
                esDeveloperName: this.deploymentDeveloperName,
                routingAttributes: {}
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Create conversation failed: ${response.status} - ${errorText}`);
        }

        const responseText = await response.text();
        if (!responseText) {
            return { conversationId: this._conversationId };
        }

        try {
            return JSON.parse(responseText);
        } catch (e) {
            return { conversationId: this._conversationId };
        }
    }

    /**
     * Subscribe to Server-Sent Events for real-time messages
     */
    subscribeToSSE() {
        this._sseAbortController?.abort();
        this._sseAbortController = new AbortController();

        const sseUrl = `${this._scrtUrl}/eventrouter/v1/sse?_ts=${Date.now()}`;
        const headers = {
            'Accept': 'text/event-stream',
            'Authorization': `Bearer ${this._accessToken}`,
            'X-Org-Id': this._orgId
        };

        if (this._lastEventId) {
            headers['Last-Event-ID'] = this._lastEventId;
        }

        this._startSSEStream(sseUrl, headers);
    }

    /**
     * Wait for the session to become active (15s timeout)
     */
    waitForSessionActive() {
        return new Promise((resolve) => {
            if (this._sessionActive) {
                resolve();
                return;
            }

            this._waitingForSession = true;
            this._sessionActiveResolver = resolve;

            // eslint-disable-next-line @lwc/lwc/no-async-operation
            setTimeout(() => {
                if (this._waitingForSession) {
                    this._waitingForSession = false;
                    this._sessionActiveResolver = null;
                    resolve();
                }
            }, 15000);
        });
    }

    /**
     * Wait for the agent's initial greeting message (10s timeout)
     */
    waitForAgentGreeting() {
        return new Promise((resolve) => {
            if (this._agentGreetingReceived) {
                resolve();
                return;
            }

            this._agentGreetingResolver = resolve;

            // eslint-disable-next-line @lwc/lwc/no-async-operation
            setTimeout(() => {
                if (this._agentGreetingResolver) {
                    this._agentGreetingResolver = null;
                    resolve();
                }
            }, 10000);
        });
    }

    /**
     * Internal method to start SSE stream processing
     */
    async _startSSEStream(sseUrl, headers) {
        try {
            const response = await fetch(sseUrl, {
                method: 'GET',
                headers: headers,
                signal: this._sseAbortController.signal
            });

            if (!response.ok) {
                return;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const events = buffer.split('\n\n');
                buffer = events.pop() || '';

                for (const eventStr of events) {
                    if (eventStr.trim()) {
                        this.processSSEEvent(eventStr);
                    }
                }
            }
        } catch (error) {
            // Silently handle abort and connection errors
        }
    }

    /**
     * Process a single SSE event string
     */
    processSSEEvent(eventStr) {
        const lines = eventStr.split('\n');
        let data = '';
        let eventId = '';

        for (const line of lines) {
            if (line.startsWith('data:')) {
                data += line.substring(5).trim();
            } else if (line.startsWith('id:')) {
                eventId = line.substring(3).trim();
            }
        }

        if (eventId) {
            this._lastEventId = eventId;
        }

        if (data) {
            this.handleSSEMessage({ data });
        }
    }

    /**
     * Handle incoming SSE message
     */
    handleSSEMessage(event) {
        try {
            const data = JSON.parse(event.data);
            const entry = data.conversationEntry;
            if (!entry) return;

            const entryType = entry.entryType;
            const sender = entry.sender;

            console.log('[ChatHost] SSE RECEIVED:', {
                entryType,
                senderRole: sender?.role,
                conversationId: this._conversationId
            });

            if (entryType === 'Message') {
                const payload = JSON.parse(entry.entryPayload);
                const abstractMessage = payload.abstractMessage;

                if (sender && (sender.role === 'Chatbot' || sender.role === 'Agent')) {
                    this.isAgentTyping = false;
                    const messageText = abstractMessage?.staticContent?.text || '';

                    if (messageText) {
                        this.addMessage(messageText, 'agent', false);
                        this.messageCount++;

                        if (!this._agentGreetingReceived) {
                            this._agentGreetingReceived = true;
                            if (this._agentGreetingResolver) {
                                this._agentGreetingResolver();
                                this._agentGreetingResolver = null;
                            }
                        }

                        this.publishToChannel('MESSAGE_RECEIVED', {
                            messageIndex: this.messageCount
                        });
                    }
                }
            } else if (entryType === 'TypingStartedIndicator') {
                if (sender && (sender.role === 'Chatbot' || sender.role === 'Agent')) {
                    this.isAgentTyping = true;
                }
            } else if (entryType === 'TypingStoppedIndicator') {
                this.isAgentTyping = false;
            } else if (entryType === 'SessionStatusChanged') {
                const payload = JSON.parse(entry.entryPayload);
                if (payload.sessionStatus === 'Active') {
                    this._sessionActive = true;
                    if (this._waitingForSession && this._sessionActiveResolver) {
                        this._waitingForSession = false;
                        this._sessionActiveResolver();
                        this._sessionActiveResolver = null;
                    }
                }
            }
        } catch (error) {
            // Silently handle parse errors
        }
    }

    /**
     * Close SSE connection by aborting the fetch request
     */
    closeSSEConnection() {
        if (this._sseAbortController) {
            this._sseAbortController.abort();
            this._sseAbortController = null;
        }
    }

    /**
     * Send a message through the Messaging API
     */
    async sendMessageToApi(messageText, isNewSession = false) {
        if (!this._accessToken || !this._conversationId) {
            throw new Error('Not connected to messaging service');
        }

        console.log('[ChatHost] API SEND:', {
            conversationId: this._conversationId,
            messagePreview: messageText.substring(0, 50) + (messageText.length > 50 ? '...' : ''),
            isNewSession
        });

        const messageUrl = `${this._scrtUrl}/iamessage/api/v2/conversation/${this._conversationId}/message`;
        const messageId = this.generateUUID();

        const response = await fetch(messageUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this._accessToken}`
            },
            body: JSON.stringify({
                message: {
                    id: messageId,
                    messageType: 'StaticContentMessage',
                    staticContent: { formatType: 'Text', text: messageText }
                },
                esDeveloperName: this.deploymentDeveloperName,
                isNewMessagingSession: isNewSession,
                language: 'en'
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Send message failed: ${response.status} - ${errorText}`);
        }

        const responseText = await response.text();
        if (!responseText) return { success: true };

        try {
            return JSON.parse(responseText);
        } catch (e) {
            return { success: true };
        }
    }

    /**
     * Generate a UUID for conversation/message IDs
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // ==================== EVENT HANDLERS ====================

    handleInputChange(event) {
        this.inputMessage = event.target.value;
    }

    handleKeyUp(event) {
        if (event.key === 'Enter' && !this.isSendDisabled) {
            this.handleSendMessage();
        }
    }

    async handleSendMessage() {
        if (this.isSendDisabled && this._screenState !== 'welcome') {
            return;
        }

        const messageText = this.inputMessage.trim();
        if (!messageText) {
            return;
        }

        // If on welcome screen, initialize and transition to chat
        if (this._screenState === 'welcome') {
            const initialized = await this.initializeMessagingApi();
            if (!initialized) {
                return;
            }

            this._screenState = 'chat';
            this._sessionStartTimeFormatted = this._formatTime(new Date());
            this.isConversationActive = true;

            // Publish session started
            this.publishToChannel('SESSION_STARTED', {
                welcomeMessage: this.welcomeMessage,
                displayMode: this.displayMode,
                deploymentDeveloperName: this.deploymentDeveloperName
            });

            // Dispatch custom event
            console.log('[ChatHost] DOM EVENT DISPATCH: sessionstarted', {
                sessionId: this.currentSessionId,
                conversationId: this._conversationId
            });
            this.dispatchEvent(new CustomEvent('sessionstarted', {
                detail: {
                    sessionId: this.currentSessionId,
                    conversationId: this._conversationId,
                    timestamp: Date.now()
                },
                bubbles: true,
                composed: true
            }));
        }

        // Add user message to UI
        this.addMessage(messageText, 'user');
        this.inputMessage = '';

        // Track if this is the first message BEFORE incrementing
        const isFirstMessage = this.messageCount === 0;

        this.messageCount++;

        // Publish message sent
        this.publishToChannel('MESSAGE_SENT', {
            messageIndex: this.messageCount
        });

        // Show typing indicator
        this.isAgentTyping = true;

        // Send to Messaging API
        try {
            await this.sendMessageToApi(messageText, isFirstMessage);
        } catch (error) {
            this.isAgentTyping = false;
            this.addMessage('Sorry, there was an error sending your message. Please try again.', 'agent');
        }
    }

    handleMenuClick() {
        this._isMenuOpen = !this._isMenuOpen;
    }

    handleCloseMenu() {
        this._isMenuOpen = false;
    }

    get isMenuOpen() {
        return this._isMenuOpen;
    }

    handleEndSessionClick() {
        this._isMenuOpen = false;
        this.endSession();
    }

    handleDownloadTranscriptClick() {
        this._isMenuOpen = false;
        this._downloadTranscript();
    }

    /**
     * Generate and download chat transcript as a text file
     */
    _downloadTranscript() {
        if (this.messages.length === 0) {
            return;
        }

        // Build transcript content
        let transcript = `Chat Transcript - ${this.chatHeaderTitle}\n`;
        transcript += `Session ID: ${this.currentSessionId}\n`;
        transcript += `Date: ${new Date().toLocaleDateString()}\n`;
        transcript += `${'='.repeat(50)}\n\n`;

        for (const msg of this.messages) {
            transcript += `[${msg.time}] ${msg.senderName}:\n`;
            transcript += `${msg.text}\n\n`;
        }

        transcript += `${'='.repeat(50)}\n`;
        transcript += `End of transcript - ${this.messages.length} messages`;

        // Create and trigger download
        const blob = new Blob([transcript], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `chat-transcript-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    handleRetry() {
        this._screenState = 'welcome';
        this.errorMessage = '';
        this._accessToken = null;
        this._conversationId = null;
    }

    // ==================== MESSAGE HANDLING ====================

    addMessage(text, sender, isHtml = false) {
        this._messageIdCounter++;
        let bubbleStyle;
        if (sender === 'agent') {
            bubbleStyle = `background-color: ${this.agentBubbleColor};`;
        } else {
            const textColor = this._getEffectiveUserTextColor();
            bubbleStyle = `background-color: ${this.userBubbleColor}; color: ${textColor};`;
        }
        const message = {
            id: `msg-${this._messageIdCounter}`,
            text: text,
            sender: sender,
            isAgent: sender === 'agent',
            isUser: sender === 'user',
            isHtml: isHtml,
            time: this._formatTime(new Date()),
            senderName: sender === 'agent' ? this.chatHeaderTitle : 'You',
            containerClass: `message-row ${sender}`,
            bubbleClass: `message-bubble ${sender}`,
            bubbleStyle: bubbleStyle
        };

        this.messages = [...this.messages, message];

        // Scroll to bottom after render
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            this.scrollToBottom();
        }, 50);
    }

    scrollToBottom() {
        const container = this.refs.messagesContainer;
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    // ==================== SESSION MANAGEMENT ====================

    generateSessionId() {
        // Generate a unique session ID
        this.currentSessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
    }

    publishToChannel(eventType, data = {}) {
        if (!this.currentSessionId || !this.messageContext) {
            return;
        }

        const message = {
            sessionId: this.currentSessionId,
            eventType: eventType,
            timestamp: Date.now(),
            data: JSON.stringify(data)
        };

        console.log('[ChatHost] LMS DISPATCH:', {
            eventType,
            sessionId: this.currentSessionId,
            data
        });

        try {
            publish(this.messageContext, AGENTFORCE_SESSION_CHANNEL, message);
        } catch (error) {
            console.error('[ChatHost] LMS DISPATCH ERROR:', error);
        }
    }

    // ==================== UTILITIES ====================

    _formatTime(date) {
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }

    // ==================== PUBLIC API ====================

    @api
    getSessionId() {
        return this.currentSessionId;
    }

    @api
    getConversationId() {
        return this._conversationId;
    }

    @api
    isActive() {
        return this.isConversationActive;
    }

    @api
    getSessionMetrics() {
        const startTime = this._sessionStartTimeFormatted ? new Date().getTime() : null;
        return {
            sessionId: this.currentSessionId,
            conversationId: this._conversationId,
            startTime: startTime,
            messageCount: this.messageCount,
            isActive: this.isConversationActive
        };
    }

    @api
    publishEvent(eventType, data) {
        this.publishToChannel(eventType, data);
    }

    @api
    endSession() {
        if (this.isConversationActive) {
            this.closeSSEConnection();

            this.publishToChannel('SESSION_ENDED', {
                messageCount: this.messageCount,
                conversationId: this._conversationId
            });

            console.log('[ChatHost] DOM EVENT DISPATCH: sessionended', {
                sessionId: this.currentSessionId,
                conversationId: this._conversationId,
                messageCount: this.messageCount
            });
            this.dispatchEvent(new CustomEvent('sessionended', {
                detail: {
                    sessionId: this.currentSessionId,
                    conversationId: this._conversationId,
                    messageCount: this.messageCount
                },
                bubbles: true,
                composed: true
            }));

            this.isConversationActive = false;
            this._screenState = 'welcome';
            this.messages = [];
            this.messageCount = 0;
            this._accessToken = null;
            this._conversationId = null;
            this._lastEventId = null;
            this._sessionActive = false;
            this._waitingForSession = false;
            this._sessionActiveResolver = null;
            this._agentGreetingReceived = false;
            this._agentGreetingResolver = null;
            this._isInitializing = false;
            this._initializingStatus = 'Connecting...';
            this.generateSessionId();
        }
    }
}
