import { LightningElement, api, track } from 'lwc';

/**
 * Custom Property Editor for Agentforce Web Host component (Experience Cloud)
 * Configures Enhanced Chat v2 / Web deployment settings
 */
export default class AgentforceWebHostCPE extends LightningElement {
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

    // Default values
    static DEFAULTS = {
        // Required Configuration - matches Salesforce generated code snippet exactly
        orgId: '',              // Param 1: Org ID (00D...)
        deploymentDevName: '',  // Param 2: Deployment API Name (e.g., 'AgentLake')
        siteEndpointUrl: '',    // Param 3: Site Endpoint URL (e.g., 'https://site.com/ESWAgentLake123')
        scrtUrl: '',            // Param 4: SCRT URL (e.g., 'https://org.my.salesforce-scrt.com')

        // Display Configuration
        displayMode: 'FloatingButton',
        inlineContainerHeight: 500,
        inlineContainerWidth: 400,

        // Branding Configuration
        headerBackgroundColor: '#0176d3',
        brandColor: '#0176d3',
        contrastColor: '#ffffff',
        navBarColor: '#0176d3',
        secondaryNavBarColor: '#032d60',
        fontFamily: 'Salesforce Sans, sans-serif',

        // Labels Configuration
        chatButtonLabel: 'Chat with an Agent',
        chatHeaderTitle: 'Agentforce',
        prechatBackgroundImgUrl: '',

        // Feature Toggles
        enablePrechat: false,
        enableOfflineSupport: false
    };

    // Experience Cloud CPE Contract - value getter/setter
    @api
    get value() {
        return JSON.stringify(this._config);
    }

    set value(val) {
        if (Date.now() - this._lastDispatchTime < 150) {
            return;
        }

        let parsed = {};
        if (typeof val === 'string' && val) {
            try {
                parsed = JSON.parse(val);
            } catch (e) {
                parsed = {};
            }
        } else if (val && typeof val === 'object') {
            parsed = val;
        }

        const filtered = Object.fromEntries(
            Object.entries(parsed).filter(([, v]) => v !== '')
        );

        this._config = { ...AgentforceWebHostCPE.DEFAULTS, ...filtered };
    }

    // UI State - Section expansion
    @track isSetupExpanded = true;
    @track isDisplayExpanded = true;
    @track isBrandingExpanded = false;
    @track isLabelsExpanded = false;
    @track isFeaturesExpanded = false;

    // ==================== OPTIONS ====================

    get displayModeOptions() {
        return [
            { label: 'Floating Button', value: 'FloatingButton' },
            { label: 'Inline Container', value: 'Inline' }
        ];
    }

    get fontFamilyOptions() {
        return [
            { label: 'Salesforce Sans', value: 'Salesforce Sans, sans-serif' },
            { label: 'Arial', value: 'Arial, sans-serif' },
            { label: 'Helvetica', value: 'Helvetica, sans-serif' },
            { label: 'System Default', value: '-apple-system, BlinkMacSystemFont, sans-serif' }
        ];
    }

    // ==================== COMPUTED PROPERTIES ====================

    // Section icons
    get setupIconName() {
        return this.isSetupExpanded ? 'utility:chevrondown' : 'utility:chevronright';
    }

    get displayIconName() {
        return this.isDisplayExpanded ? 'utility:chevrondown' : 'utility:chevronright';
    }

    get brandingIconName() {
        return this.isBrandingExpanded ? 'utility:chevrondown' : 'utility:chevronright';
    }

    get labelsIconName() {
        return this.isLabelsExpanded ? 'utility:chevrondown' : 'utility:chevronright';
    }

    get featuresIconName() {
        return this.isFeaturesExpanded ? 'utility:chevrondown' : 'utility:chevronright';
    }

    // Conditional display
    get showInlineOptions() {
        return this._config.displayMode === 'Inline';
    }

    // Template bindings - Setup (matches Salesforce generated snippet)
    get orgId() { return this._config.orgId; }
    get deploymentDevName() { return this._config.deploymentDevName; }
    get siteEndpointUrl() { return this._config.siteEndpointUrl; }
    get scrtUrl() { return this._config.scrtUrl; }

    // Template bindings - Display
    get displayMode() { return this._config.displayMode; }
    get inlineContainerHeight() { return this._config.inlineContainerHeight; }
    get inlineContainerWidth() { return this._config.inlineContainerWidth; }

    // Template bindings - Branding
    get headerBackgroundColor() { return this._config.headerBackgroundColor; }
    get brandColor() { return this._config.brandColor; }
    get contrastColor() { return this._config.contrastColor; }
    get navBarColor() { return this._config.navBarColor; }
    get secondaryNavBarColor() { return this._config.secondaryNavBarColor; }
    get fontFamily() { return this._config.fontFamily; }

    // Template bindings - Labels
    get chatButtonLabel() { return this._config.chatButtonLabel; }
    get chatHeaderTitle() { return this._config.chatHeaderTitle; }
    get prechatBackgroundImgUrl() { return this._config.prechatBackgroundImgUrl; }

    // Template bindings - Features
    get enablePrechat() { return this._config.enablePrechat; }
    get enableOfflineSupport() { return this._config.enableOfflineSupport; }

    // ==================== CORE METHODS ====================

    updateProperty(propertyName, propertyValue) {
        this._config = { ...this._config, [propertyName]: propertyValue };
        this.dispatchValueChange();
    }

    dispatchValueChange() {
        this._lastDispatchTime = Date.now();
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

    toggleDisplay() {
        this.isDisplayExpanded = !this.isDisplayExpanded;
    }

    toggleBranding() {
        this.isBrandingExpanded = !this.isBrandingExpanded;
    }

    toggleLabels() {
        this.isLabelsExpanded = !this.isLabelsExpanded;
    }

    toggleFeatures() {
        this.isFeaturesExpanded = !this.isFeaturesExpanded;
    }

    // ==================== SETUP SECTION HANDLERS ====================

    handleOrgIdChange(event) {
        this.updateProperty('orgId', event.detail.value);
    }

    handleDeploymentDevNameChange(event) {
        this.updateProperty('deploymentDevName', event.detail.value);
    }

    handleSiteEndpointUrlChange(event) {
        this.updateProperty('siteEndpointUrl', event.detail.value);
    }

    handleScrtUrlChange(event) {
        this.updateProperty('scrtUrl', event.detail.value);
    }

    // ==================== DISPLAY SECTION HANDLERS ====================

    handleDisplayModeChange(event) {
        this.updateProperty('displayMode', event.detail.value);
    }

    handleHeightChange(event) {
        this.updateProperty('inlineContainerHeight', parseInt(event.detail.value, 10) || 500);
    }

    handleWidthChange(event) {
        this.updateProperty('inlineContainerWidth', parseInt(event.detail.value, 10) || 400);
    }

    // ==================== BRANDING SECTION HANDLERS ====================

    handleHeaderBackgroundColorChange(event) {
        const value = event.target.value || event.detail.value;
        this.updateProperty('headerBackgroundColor', value);
    }

    handleBrandColorChange(event) {
        const value = event.target.value || event.detail.value;
        this.updateProperty('brandColor', value);
    }

    handleContrastColorChange(event) {
        const value = event.target.value || event.detail.value;
        this.updateProperty('contrastColor', value);
    }

    handleNavBarColorChange(event) {
        const value = event.target.value || event.detail.value;
        this.updateProperty('navBarColor', value);
    }

    handleSecondaryNavBarColorChange(event) {
        const value = event.target.value || event.detail.value;
        this.updateProperty('secondaryNavBarColor', value);
    }

    handleFontFamilyChange(event) {
        this.updateProperty('fontFamily', event.detail.value);
    }

    // ==================== LABELS SECTION HANDLERS ====================

    handleChatButtonLabelChange(event) {
        this.updateProperty('chatButtonLabel', event.detail.value);
    }

    handleChatHeaderTitleChange(event) {
        this.updateProperty('chatHeaderTitle', event.detail.value);
    }

    handlePrechatBackgroundImgUrlChange(event) {
        this.updateProperty('prechatBackgroundImgUrl', event.detail.value);
    }

    // ==================== FEATURES SECTION HANDLERS ====================

    handlePrechatToggle(event) {
        this.updateProperty('enablePrechat', event.target.checked);
    }

    handleOfflineSupportToggle(event) {
        this.updateProperty('enableOfflineSupport', event.target.checked);
    }
}
