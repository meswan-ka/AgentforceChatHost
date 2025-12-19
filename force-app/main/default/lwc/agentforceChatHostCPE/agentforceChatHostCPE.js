import { LightningElement, api, track } from 'lwc';

/**
 * Custom Property Editor for Agentforce Chat Host component (Experience Cloud)
 * Follows Experience Cloud CPE contract with @api value object
 */
export default class AgentforceChatHostCPE extends LightningElement {
    // Experience Cloud CPE Contract - Required @api properties
    @api label;
    @api description;
    @api required;
    @api errors;
    @api schema;

    // Internal tracked state for all configuration properties
    @track _config = {};

    // Timestamp of last dispatch to prevent stale overwrites
    _lastDispatchTime = 0;

    // Default values matching runtime component
    static DEFAULTS = {
        deploymentDeveloperName: '',
        displayMode: 'Inline',
        inlineHeight: 500,
        inlineWidthPercent: 100,
        backgroundImageId: '',
        gradientStartColor: '#e8f4fd',
        gradientMidColor: '#f5f9fc', // Kept for compatibility but not shown in UI
        gradientEndColor: '#ffffff',
        customizeGradient: false, // UI toggle state persisted in config
        welcomeTitle: 'How can Agentforce help?',
        calloutWord: 'Agentforce',
        calloutColor: '#0176d3',
        calloutBold: true,
        calloutItalic: false,
        calloutFontWeight: '700',
        customizeCalloutWord: false, // UI toggle state persisted in config
        welcomeMessage: 'Ask questions, get personalized answers, and take action with Agentforce.',
        chatHeaderTitle: 'Agentforce',
        sendButtonColor: '#0176d3',
        // Chat message styling
        agentPrimaryColor: '#0176d3',
        agentBubbleColor: '#f3f3f3',
        userBubbleColor: '#e8f4fd',
        userTextColor: '#032d60',
        autoUserTextColor: true,
        customizeChatColors: false, // UI toggle state persisted in config
        enableSearchIntegration: false,
        searchUrlParameter: 'term',
        autoStartOnSearch: false
    };

    // Experience Cloud CPE Contract - value getter/setter
    // CRITICAL: The target property is type="String", so we serialize to JSON
    @api
    get value() {
        // Return JSON string to match type="String" declaration
        return JSON.stringify(this._config);
    }

    set value(val) {
        // Skip if we dispatched very recently (within 150ms) to prevent
        // Experience Builder from overwriting with stale data
        if (Date.now() - this._lastDispatchTime < 150) {
            return;
        }
        // Parse incoming value - could be JSON string or object
        let parsed = {};
        if (typeof val === 'string' && val) {
            try {
                parsed = JSON.parse(val);
            } catch (e) {
                // Invalid JSON, use empty object
                parsed = {};
            }
        } else if (val && typeof val === 'object') {
            // Handle object case for backwards compatibility
            parsed = val;
        }
        // Filter out empty string values so defaults are used instead
        const filtered = Object.fromEntries(
            Object.entries(parsed).filter(([, v]) => v !== '')
        );
        // Merge with defaults (empty strings removed, so defaults apply)
        this._config = { ...AgentforceChatHostCPE.DEFAULTS, ...filtered };
        // Initialize UI toggles based on current values
        this._initializeUIState();
    }

    // UI State - Section expansion
    @track isSetupExpanded = true;
    @track isAppearanceExpanded = true;
    @track isWelcomeExpanded = false;
    @track isSearchExpanded = false;

    /**
     * Initialize UI toggle states from persisted config values
     */
    _initializeUIState() {
        // Toggle states are now persisted in config - no recalculation needed
        // This prevents toggles from resetting when other properties change
    }

    // ==================== OPTIONS ====================

    get heightOptions() {
        return [
            { label: '400px - Compact', value: 400 },
            { label: '500px - Standard', value: 500 },
            { label: '600px - Large', value: 600 },
            { label: '700px - Extra Large', value: 700 },
            { label: '800px - Full', value: 800 }
        ];
    }

    get fontWeightOptions() {
        // Salesforce Sans only supports 500 and 700 weights in Experience Cloud
        return [
            { label: 'Medium (500)', value: '500' },
            { label: 'Bold (700)', value: '700' }
        ];
    }

    // ==================== COMPUTED PROPERTIES ====================

    // Section icons
    get setupIconName() {
        return this.isSetupExpanded ? 'utility:chevrondown' : 'utility:chevronright';
    }

    get appearanceIconName() {
        return this.isAppearanceExpanded ? 'utility:chevrondown' : 'utility:chevronright';
    }

    get welcomeIconName() {
        return this.isWelcomeExpanded ? 'utility:chevrondown' : 'utility:chevronright';
    }

    get searchIconName() {
        return this.isSearchExpanded ? 'utility:chevrondown' : 'utility:chevronright';
    }

    // Conditional display - read from persisted config
    get showGradientControls() {
        return this._config.customizeGradient;
    }

    get showCalloutWordControls() {
        return this._config.customizeCalloutWord;
    }

    // Toggle state getters for template binding
    get customizeGradient() {
        return this._config.customizeGradient;
    }

    get customizeCalloutWord() {
        return this._config.customizeCalloutWord;
    }

    get showSearchOptions() {
        return this._config.enableSearchIntegration;
    }

    // Stateful button classes for Bold
    get boldButtonVariant() {
        return this._config.calloutBold ? 'brand' : 'neutral';
    }

    get boldButtonClass() {
        return this._config.calloutBold ? 'style-btn active' : 'style-btn';
    }

    // Stateful button classes for Italic
    get italicButtonVariant() {
        return this._config.calloutItalic ? 'brand' : 'neutral';
    }

    get italicButtonClass() {
        return this._config.calloutItalic ? 'style-btn active' : 'style-btn';
    }

    // Template bindings
    get deploymentDeveloperName() { return this._config.deploymentDeveloperName; }
    get inlineHeight() { return this._config.inlineHeight; }
    get inlineWidthPercent() { return this._config.inlineWidthPercent; }
    get gradientStartColor() { return this._config.gradientStartColor; }
    get gradientEndColor() { return this._config.gradientEndColor; }
    get welcomeTitle() { return this._config.welcomeTitle; }
    get calloutWord() { return this._config.calloutWord; }
    get calloutColor() { return this._config.calloutColor; }
    get calloutBold() { return this._config.calloutBold; }
    get calloutItalic() { return this._config.calloutItalic; }
    get calloutFontWeight() { return this._config.calloutFontWeight; }
    get welcomeMessage() { return this._config.welcomeMessage; }
    get chatHeaderTitle() { return this._config.chatHeaderTitle; }
    get sendButtonColor() { return this._config.sendButtonColor; }
    get enableSearchIntegration() { return this._config.enableSearchIntegration; }
    get searchUrlParameter() { return this._config.searchUrlParameter; }
    get autoStartOnSearch() { return this._config.autoStartOnSearch; }
    get agentPrimaryColor() { return this._config.agentPrimaryColor; }
    get agentBubbleColor() { return this._config.agentBubbleColor; }
    get userBubbleColor() { return this._config.userBubbleColor; }
    get userTextColor() { return this._config.userTextColor; }
    get autoUserTextColor() { return this._config.autoUserTextColor; }
    get customizeChatColors() { return this._config.customizeChatColors; }
    get showChatColorControls() { return this._config.customizeChatColors; }
    get showUserTextColorPicker() { return this._config.customizeChatColors && !this._config.autoUserTextColor; }

    /**
     * Calculate the auto-generated text color for preview
     */
    get calculatedUserTextColor() {
        if (!this._config.autoUserTextColor) {
            return this._config.userTextColor;
        }
        return this._getContrastColor(this._config.userBubbleColor);
    }

    /**
     * Calculate optimal contrast color (dark or light) for a given background
     */
    _getContrastColor(hexColor) {
        const luminance = this._getLuminance(hexColor);
        return luminance > 0.5 ? '#1a1a1a' : '#ffffff';
    }

    /**
     * Calculate relative luminance of a hex color (WCAG 2.1 formula)
     */
    _getLuminance(hex) {
        hex = hex.replace('#', '');
        let r = parseInt(hex.substring(0, 2), 16) / 255;
        let g = parseInt(hex.substring(2, 4), 16) / 255;
        let b = parseInt(hex.substring(4, 6), 16) / 255;
        r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
        g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
        b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    // ==================== CORE METHODS ====================

    /**
     * Update a single property and dispatch valuechange event
     */
    updateProperty(propertyName, propertyValue) {
        this._config = { ...this._config, [propertyName]: propertyValue };
        this.dispatchValueChange();
    }

    /**
     * Dispatch valuechange event to Experience Builder
     * CRITICAL: Serialize to JSON string to:
     * 1. Break the reactive proxy chain (prevents stack overflow)
     * 2. Match the type="String" property declaration
     */
    dispatchValueChange() {
        // Record dispatch time to prevent stale overwrites
        this._lastDispatchTime = Date.now();
        // Serialize config to JSON string - this breaks the reactive proxy chain
        // and aligns with the type="String" property declaration in meta.xml
        const jsonValue = JSON.stringify(this._config);
        this.dispatchEvent(new CustomEvent('valuechange', {
            detail: { value: jsonValue },
            bubbles: true,
            composed: true
        }));
    }

    // ==================== SECTION TOGGLES ====================

    toggleSetup() {
        this.isSetupExpanded = !this.isSetupExpanded;
    }

    toggleAppearance() {
        this.isAppearanceExpanded = !this.isAppearanceExpanded;
    }

    toggleWelcome() {
        this.isWelcomeExpanded = !this.isWelcomeExpanded;
    }

    toggleSearch() {
        this.isSearchExpanded = !this.isSearchExpanded;
    }

    // ==================== SETUP SECTION HANDLERS ====================

    handleDeploymentChange(event) {
        this.updateProperty('deploymentDeveloperName', event.detail.value);
    }

    // ==================== APPEARANCE SECTION HANDLERS ====================

    handleHeightChange(event) {
        this.updateProperty('inlineHeight', parseInt(event.detail.value, 10) || 500);
    }

    handleWidthChange(event) {
        this.updateProperty('inlineWidthPercent', parseInt(event.detail.value, 10) || 100);
    }

    handleCustomizeGradientToggle(event) {
        const checked = event.target.checked;
        // Persist toggle state and reset colors if turning off
        if (!checked) {
            this._config = {
                ...this._config,
                customizeGradient: false,
                gradientStartColor: '#e8f4fd',
                gradientEndColor: '#ffffff'
            };
        } else {
            this._config = { ...this._config, customizeGradient: true };
        }
        this.dispatchValueChange();
    }

    handleGradientStartColorChange(event) {
        const value = event.target.value || event.detail.value;
        this.updateProperty('gradientStartColor', value);
    }

    handleGradientEndColorChange(event) {
        const value = event.target.value || event.detail.value;
        this.updateProperty('gradientEndColor', value);
    }

    handleSendButtonColorChange(event) {
        const value = event.target.value || event.detail.value;
        this.updateProperty('sendButtonColor', value);
    }

    handleCustomizeChatColorsToggle(event) {
        const checked = event.target.checked;
        // Persist toggle state and reset colors if turning off
        if (!checked) {
            this._config = {
                ...this._config,
                customizeChatColors: false,
                agentPrimaryColor: '#0176d3',
                agentBubbleColor: '#f3f3f3',
                userBubbleColor: '#e8f4fd',
                userTextColor: '#032d60',
                autoUserTextColor: true
            };
        } else {
            this._config = { ...this._config, customizeChatColors: true };
        }
        this.dispatchValueChange();
    }

    handleAgentPrimaryColorChange(event) {
        const value = event.target.value || event.detail.value;
        this.updateProperty('agentPrimaryColor', value);
    }

    handleAgentBubbleColorChange(event) {
        const value = event.target.value || event.detail.value;
        this.updateProperty('agentBubbleColor', value);
    }

    handleUserBubbleColorChange(event) {
        const value = event.target.value || event.detail.value;
        this.updateProperty('userBubbleColor', value);
    }

    handleAutoUserTextColorToggle(event) {
        this.updateProperty('autoUserTextColor', event.target.checked);
    }

    handleUserTextColorChange(event) {
        const value = event.target.value || event.detail.value;
        this.updateProperty('userTextColor', value);
    }

    // ==================== WELCOME SECTION HANDLERS ====================

    handleWelcomeTitleChange(event) {
        this.updateProperty('welcomeTitle', event.detail.value);
    }

    handleWelcomeMessageChange(event) {
        this.updateProperty('welcomeMessage', event.detail.value);
    }

    handleChatHeaderTitleChange(event) {
        this.updateProperty('chatHeaderTitle', event.detail.value);
    }

    handleCustomizeCalloutWordToggle(event) {
        const checked = event.target.checked;
        // Persist toggle state and reset callout settings if turning off
        if (!checked) {
            this._config = {
                ...this._config,
                customizeCalloutWord: false,
                calloutWord: 'Agentforce',
                calloutColor: '#0176d3',
                calloutBold: true,
                calloutItalic: false,
                calloutFontWeight: '700'
            };
        } else {
            this._config = { ...this._config, customizeCalloutWord: true };
        }
        this.dispatchValueChange();
    }

    handleCalloutWordChange(event) {
        this.updateProperty('calloutWord', event.detail.value);
    }

    handleCalloutColorChange(event) {
        const value = event.target.value || event.detail.value;
        this.updateProperty('calloutColor', value);
    }

    // Stateful button handlers for Bold/Italic
    handleBoldToggle() {
        this.updateProperty('calloutBold', !this._config.calloutBold);
    }

    handleItalicToggle() {
        this.updateProperty('calloutItalic', !this._config.calloutItalic);
    }

    handleCalloutFontWeightChange(event) {
        this.updateProperty('calloutFontWeight', event.detail.value);
    }

    // ==================== SEARCH SECTION HANDLERS ====================

    handleSearchToggle(event) {
        this.updateProperty('enableSearchIntegration', event.target.checked);
    }

    handleSearchUrlParameterChange(event) {
        this.updateProperty('searchUrlParameter', event.detail.value || 'term');
    }

    handleAutoStartToggle(event) {
        this.updateProperty('autoStartOnSearch', event.target.checked);
    }
}
