import { LightningElement, api, track } from 'lwc';

/**
 * Custom Property Editor for Agentforce Chat (Inline) component
 * Follows Experience Cloud CPE contract with @api value object
 */
export default class AgentforceChatCPE extends LightningElement {
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
        orgId: '',
        deploymentDeveloperName: '',
        siteUrl: '',
        scrtUrl: '',
        displayMode: 'inline',
        height: 600,
        widthPercent: 100,
        showHeader: false,
        enableConditionalDisplay: false,
        conditionalPathPattern: 'global-search',
        conditionalQueryParam: 'term',
        invertCondition: false
    };

    // Experience Cloud CPE Contract - value getter/setter
    @api
    get value() {
        return JSON.stringify(this._config);
    }

    set value(val) {
        // Skip if we dispatched very recently (within 150ms)
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

        // Filter out empty string values
        const filtered = Object.fromEntries(
            Object.entries(parsed).filter(([, v]) => v !== '')
        );

        // Merge with defaults
        this._config = { ...AgentforceChatCPE.DEFAULTS, ...filtered };
    }

    // UI State - Section expansion
    @track isDeploymentExpanded = true;
    @track isDisplayExpanded = true;
    @track isConditionalExpanded = false;

    // ==================== OPTIONS ====================

    get displayModeOptions() {
        return [
            { label: 'Inline (in container)', value: 'inline' },
            { label: 'Floating (FAB button)', value: 'floating' }
        ];
    }

    get heightOptions() {
        return [
            { label: '400px - Compact', value: 400 },
            { label: '500px - Standard', value: 500 },
            { label: '600px - Large', value: 600 },
            { label: '700px - Extra Large', value: 700 },
            { label: '800px - Full', value: 800 }
        ];
    }

    // ==================== SECTION ICONS ====================

    get deploymentIconName() {
        return this.isDeploymentExpanded ? 'utility:chevrondown' : 'utility:chevronright';
    }

    get displayIconName() {
        return this.isDisplayExpanded ? 'utility:chevrondown' : 'utility:chevronright';
    }

    get conditionalIconName() {
        return this.isConditionalExpanded ? 'utility:chevrondown' : 'utility:chevronright';
    }

    // ==================== TEMPLATE BINDINGS ====================

    get orgId() { return this._config.orgId; }
    get deploymentDeveloperName() { return this._config.deploymentDeveloperName; }
    get siteUrl() { return this._config.siteUrl; }
    get scrtUrl() { return this._config.scrtUrl; }
    get displayMode() { return this._config.displayMode; }
    get height() { return this._config.height; }
    get widthPercent() { return this._config.widthPercent; }
    get showHeader() { return this._config.showHeader; }
    get enableConditionalDisplay() { return this._config.enableConditionalDisplay; }
    get conditionalPathPattern() { return this._config.conditionalPathPattern; }
    get conditionalQueryParam() { return this._config.conditionalQueryParam; }
    get invertCondition() { return this._config.invertCondition; }

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

    toggleDeployment() {
        this.isDeploymentExpanded = !this.isDeploymentExpanded;
    }

    toggleDisplay() {
        this.isDisplayExpanded = !this.isDisplayExpanded;
    }

    toggleConditional() {
        this.isConditionalExpanded = !this.isConditionalExpanded;
    }

    // ==================== DEPLOYMENT HANDLERS ====================

    handleOrgIdChange(event) {
        this.updateProperty('orgId', event.detail.value);
    }

    handleDeploymentChange(event) {
        this.updateProperty('deploymentDeveloperName', event.detail.value);
    }

    handleSiteUrlChange(event) {
        this.updateProperty('siteUrl', event.detail.value);
    }

    handleScrtUrlChange(event) {
        this.updateProperty('scrtUrl', event.detail.value);
    }

    // ==================== DISPLAY HANDLERS ====================

    handleDisplayModeChange(event) {
        this.updateProperty('displayMode', event.detail.value);
    }

    handleHeightChange(event) {
        this.updateProperty('height', parseInt(event.detail.value, 10) || 600);
    }

    handleWidthChange(event) {
        this.updateProperty('widthPercent', parseInt(event.detail.value, 10) || 100);
    }

    handleShowHeaderChange(event) {
        this.updateProperty('showHeader', event.target.checked);
    }

    // ==================== CONDITIONAL DISPLAY HANDLERS ====================

    handleConditionalToggle(event) {
        this.updateProperty('enableConditionalDisplay', event.target.checked);
    }

    handlePathPatternChange(event) {
        this.updateProperty('conditionalPathPattern', event.detail.value);
    }

    handleQueryParamChange(event) {
        this.updateProperty('conditionalQueryParam', event.detail.value);
    }

    handleInvertConditionChange(event) {
        this.updateProperty('invertCondition', event.target.checked);
    }
}
