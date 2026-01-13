import { LightningElement, api, track } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';

export default class InlineChatContainer extends LightningElement {
    // ========================================
    // PUBLIC API PROPERTIES (Configurable in Experience Builder)
    // ========================================
    
    @api orgId;                          // Salesforce Org ID
    @api deploymentApiName;              // Embedded Service Deployment API Name
    @api siteUrl;                        // Experience Cloud Site URL
    @api scrt2Url;                       // SCRT2 URL for messaging
    @api language = 'en_US';             // Language setting
    
    // Display Configuration
    @api displayMode = 'inline';         // 'inline' or 'floating'
    @api showHeader = false;             // Show/hide Salesforce header in inline mode
    @api containerHeight = '600px';      // Height of chat container
    @api containerWidth = '100%';        // Width of chat container
    
    // Conditional Display Options
    @api enableConditionalMode = false;  // Enable URL-based mode switching
    @api inlineTriggerPath = '';         // URL path that triggers inline mode (e.g., 'global-search')
    @api inlineTriggerParam = '';        // URL param that triggers inline mode (e.g., 'query')
    
    // Auto-launch Options
    @api autoLaunch = false;             // Automatically launch chat on load
    @api autoLaunchDelay = 1000;         // Delay before auto-launch (ms)
    @api initialMessage = '';            // Optional initial message to send

    // ========================================
    // TRACKED PROPERTIES
    // ========================================
    
    @track isLoading = true;
    @track errorMessage = '';
    @track chatInitialized = false;

    // ========================================
    // PRIVATE PROPERTIES
    // ========================================
    
    scriptLoaded = false;
    _effectiveDisplayMode = 'inline';

    // ========================================
    // GETTERS
    // ========================================
    
    get isInlineMode() {
        return this._effectiveDisplayMode === 'inline';
    }

    get containerStyle() {
        return `height: ${this.containerHeight}; width: ${this.containerWidth};`;
    }

    // ========================================
    // LIFECYCLE HOOKS
    // ========================================
    
    connectedCallback() {
        this.determineDisplayMode();
    }

    renderedCallback() {
        if (this.scriptLoaded) {
            return;
        }
        this.scriptLoaded = true;
        this.initializeChat();
    }

    disconnectedCallback() {
        // Cleanup if needed
        this.cleanupChat();
    }

    // ========================================
    // INITIALIZATION METHODS
    // ========================================
    
    /**
     * Determines the effective display mode based on configuration and URL
     */
    determineDisplayMode() {
        if (this.enableConditionalMode) {
            const currentPath = window.location.pathname;
            const urlParams = new URLSearchParams(window.location.search);
            
            let shouldBeInline = false;
            
            // Check path condition
            if (this.inlineTriggerPath && currentPath.includes(this.inlineTriggerPath)) {
                shouldBeInline = true;
            }
            
            // Check param condition
            if (this.inlineTriggerParam && urlParams.has(this.inlineTriggerParam)) {
                shouldBeInline = true;
            }
            
            this._effectiveDisplayMode = shouldBeInline ? 'inline' : 'floating';
        } else {
            this._effectiveDisplayMode = this.displayMode;
        }
        
        console.log(`[InlineChatContainer] Display mode: ${this._effectiveDisplayMode}`);
    }

    /**
     * Main initialization method for the Embedded Service
     */
    async initializeChat() {
        try {
            this.isLoading = true;
            this.errorMessage = '';

            // Validate required parameters
            if (!this.validateConfiguration()) {
                return;
            }

            // Define the initialization function
            window.initEmbeddedMessaging = () => {
                this.configureAndInitialize();
            };

            // Load the bootstrap script
            await this.loadBootstrapScript();

        } catch (error) {
            console.error('[InlineChatContainer] Initialization error:', error);
            this.errorMessage = 'Failed to initialize chat. Please refresh the page.';
            this.isLoading = false;
        }
    }

    /**
     * Validates that all required configuration is present
     */
    validateConfiguration() {
        const requiredFields = [
            { field: 'orgId', label: 'Org ID' },
            { field: 'deploymentApiName', label: 'Deployment API Name' },
            { field: 'siteUrl', label: 'Site URL' },
            { field: 'scrt2Url', label: 'SCRT2 URL' }
        ];

        const missingFields = requiredFields
            .filter(({ field }) => !this[field])
            .map(({ label }) => label);

        if (missingFields.length > 0) {
            this.errorMessage = `Missing configuration: ${missingFields.join(', ')}`;
            this.isLoading = false;
            console.error('[InlineChatContainer] Missing fields:', missingFields);
            return false;
        }

        return true;
    }

    /**
     * Loads the Salesforce Embedded Service bootstrap script
     */
    loadBootstrapScript() {
        return new Promise((resolve, reject) => {
            // Check if script already exists
            if (window.embeddedservice_bootstrap) {
                console.log('[InlineChatContainer] Bootstrap already loaded');
                window.initEmbeddedMessaging();
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = `${this.siteUrl}/assets/js/bootstrap.min.js`;
            script.async = true;

            script.onload = () => {
                console.log('[InlineChatContainer] Bootstrap script loaded');
                if (window.initEmbeddedMessaging) {
                    window.initEmbeddedMessaging();
                }
                resolve();
            };

            script.onerror = (error) => {
                console.error('[InlineChatContainer] Failed to load bootstrap script:', error);
                reject(new Error('Failed to load chat bootstrap script'));
            };

            document.body.appendChild(script);
        });
    }

    /**
     * Configures and initializes the Embedded Service
     */
    configureAndInitialize() {
        try {
            // Get the container element from shadow DOM
            const chatElement = this.refs.chatContainer;
            
            if (this._effectiveDisplayMode === 'inline' && !chatElement) {
                console.error('[InlineChatContainer] Chat container element not found');
                this.errorMessage = 'Chat container not found. Please refresh.';
                this.isLoading = false;
                return;
            }

            // Configure settings
            window.embeddedservice_bootstrap.settings.language = this.language;

            // Set display mode and target element
            if (this._effectiveDisplayMode === 'inline') {
                window.embeddedservice_bootstrap.settings.displayMode = 'inline';
                window.embeddedservice_bootstrap.settings.targetElement = chatElement;
                window.embeddedservice_bootstrap.settings.headerEnabled = this.showHeader;
            }
            // For floating mode, we don't set these - it uses defaults

            // Initialize the service
            window.embeddedservice_bootstrap.init(
                this.orgId,
                this.deploymentApiName,
                this.siteUrl,
                {
                    scrt2URL: this.scrt2Url
                }
            );

            this.chatInitialized = true;
            this.isLoading = false;

            console.log('[InlineChatContainer] Chat initialized successfully');

            // Handle auto-launch if enabled
            if (this.autoLaunch) {
                this.handleAutoLaunch();
            }

            // Dispatch success event
            this.dispatchEvent(new CustomEvent('chatinitialized', {
                detail: { displayMode: this._effectiveDisplayMode }
            }));

        } catch (error) {
            console.error('[InlineChatContainer] Configuration error:', error);
            this.errorMessage = 'Failed to configure chat service.';
            this.isLoading = false;
        }
    }

    // ========================================
    // PUBLIC API METHODS
    // ========================================
    
    /**
     * Programmatically launch the chat window
     * @returns {Promise}
     */
    @api
    launchChat() {
        return new Promise((resolve, reject) => {
            if (!window.embeddedservice_bootstrap?.utilAPI) {
                reject(new Error('Chat not initialized'));
                return;
            }

            window.embeddedservice_bootstrap.utilAPI.launchChat()
                .then(() => {
                    console.log('[InlineChatContainer] Chat launched successfully');
                    resolve();
                })
                .catch((error) => {
                    console.error('[InlineChatContainer] Failed to launch chat:', error);
                    reject(error);
                });
        });
    }

    /**
     * Send a text message to the chat
     * @param {string} message - The message to send
     * @param {number} delay - Delay before sending (ms)
     * @returns {Promise}
     */
    @api
    sendMessage(message, delay = 2000) {
        return new Promise((resolve, reject) => {
            if (!window.embeddedservice_bootstrap?.utilAPI) {
                reject(new Error('Chat not initialized'));
                return;
            }

            setTimeout(() => {
                window.embeddedservice_bootstrap.utilAPI.sendTextMessage(message)
                    .then(() => {
                        console.log('[InlineChatContainer] Message sent:', message);
                        resolve();
                    })
                    .catch((error) => {
                        console.error('[InlineChatContainer] Failed to send message:', error);
                        reject(error);
                    });
            }, delay);
        });
    }

    /**
     * Minimize the chat window (floating mode only)
     * @returns {Promise}
     */
    @api
    minimizeChat() {
        return new Promise((resolve, reject) => {
            if (!window.embeddedservice_bootstrap?.utilAPI) {
                reject(new Error('Chat not initialized'));
                return;
            }

            window.embeddedservice_bootstrap.utilAPI.minimizeChat()
                .then(() => {
                    console.log('[InlineChatContainer] Chat minimized');
                    resolve();
                })
                .catch((error) => {
                    console.error('[InlineChatContainer] Failed to minimize chat:', error);
                    reject(error);
                });
        });
    }

    /**
     * End the current chat session
     * @returns {Promise}
     */
    @api
    endChat() {
        return new Promise((resolve, reject) => {
            if (!window.embeddedservice_bootstrap?.utilAPI) {
                reject(new Error('Chat not initialized'));
                return;
            }

            window.embeddedservice_bootstrap.utilAPI.endChat()
                .then(() => {
                    console.log('[InlineChatContainer] Chat ended');
                    resolve();
                })
                .catch((error) => {
                    console.error('[InlineChatContainer] Failed to end chat:', error);
                    reject(error);
                });
        });
    }

    // ========================================
    // PRIVATE HELPER METHODS
    // ========================================
    
    /**
     * Handles auto-launch functionality
     */
    handleAutoLaunch() {
        setTimeout(async () => {
            try {
                await this.launchChat();
                
                if (this.initialMessage) {
                    await this.sendMessage(this.initialMessage, 3000);
                }
            } catch (error) {
                console.error('[InlineChatContainer] Auto-launch failed:', error);
            }
        }, this.autoLaunchDelay);
    }

    /**
     * Cleanup when component is destroyed
     */
    cleanupChat() {
        // Remove event listeners or cleanup if needed
        console.log('[InlineChatContainer] Component cleanup');
    }
}
