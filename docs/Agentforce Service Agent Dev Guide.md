Definitive Technical Guide: Architecting and Deploying Salesforce Agentforce Service Agents via Embedded Service V2 (MIAW)
1. Executive Summary and Architectural Paradigm
The enterprise customer service landscape is currently undergoing its most significant transformation in a decade, shifting from deterministic, rule-based interactions to probabilistic, reasoning-based engagements powered by Generative AI. At the forefront of this shift is the Agentforce Service Agent, a sophisticated autonomous entity capable of semantic understanding, dynamic plan generation, and autonomous action execution. However, the efficacy of this reasoning engine is inextricably linked to the transport layer that facilitates its interactions with end-users. The legacy synchronous chat architectures—specifically Salesforce Live Agent and Embedded Service V1—are fundamentally incompatible with the asynchronous, persistent, and context-heavy nature of Generative AI. Consequently, the deployment of Agentforce mandates a migration to Embedded Service Deployments V2, technically designated as Messaging for In-App and Web (MIAW).
This report serves as an exhaustive technical manual for Solution Architects, Developers, and System Administrators. It moves beyond high-level marketing overviews to provide a granular, "in-the-trenches" analysis of the deployment lifecycle. We will dissect the requisite infrastructure, the nuances of Omni-Channel routing logic, the critical security configurations involving JSON Web Tokens (JWT) for user verification, and the hidden JavaScript capabilities required to inject context into the Agent's reasoning engine. By synthesizing documentation from the Salesforce Trust Layer, developer guides, and release notes, this document aims to be the single source of truth for avoiding deployment failure and maximizing the "Agentic" capabilities of the platform.
2. The Architectural Pivot: From Session-Based to Persistent Messaging
To successfully deploy Agentforce, one must first unlearn the constraints of legacy chat. The distinction between Embedded Service V1 (Live Agent) and V2 (MIAW) is not merely a version upgrade but a complete replacement of the underlying protocol.
2.1 The Asynchronous Transport Layer
Legacy Live Agent functioned on a synchronous connection model. If a user refreshed their browser or lost internet connectivity, the session was severed, and the context was lost. This fragility is unacceptable for AI agents that may need time to "think" or process complex multi-step reasoning tasks. Embedded Service V2 introduces an asynchronous messaging protocol built on a Managed Runtime.
The V2 architecture leverages Lightweight Message Queuing Telemetry Transport (MQTT) or similar persistent socket connections that allow the conversation state to be decoupled from the browser session. This persistence is what enables the "History" feature, where a user can return to a chat hours or days later and see previous interactions, a critical capability for long-running support cases.1 For the Agentforce Service Agent, this architecture is vital because it allows the LLM to access the full historical context of the conversation thread, rather than just the current active session, thereby reducing hallucination and improving answer relevancy.1
2.2 Client-Side Evolution: embedded_svc vs. embeddedservice_bootstrap
A frequent point of failure in deployment is the confusion between client-side libraries.
Legacy (V1): Relied on the embedded_svc object and Aura components injected into the DOM. It allowed for extensive, albeit brittle, customization of the chat window via CSS overrides and Aura component injection.1
MIAW (V2): Utilizes the embeddedservice_bootstrap library. This is a more modern, secure framework that restricts direct DOM manipulation to prevent Cross-Site Scripting (XSS) and maintain strict Content Security Policy (CSP) adherence. Customization is now handled primarily through the Builder interface and LWC (Lightning Web Components) for specific slots (like Pre-Chat), rather than arbitrary code injection.1
Strategic Implication: Organizations cannot simply "repoint" their existing website code to Agentforce. The deployment requires a complete replacement of the HTML script tags and a re-implementation of any pre-chat logic using the new onEmbeddedMessagingReady event listeners.4
2.3 Feature Parity and Trade-offs
While V2 is the future, it currently has specific trade-offs compared to V1.

Feature Domain
Embedded Service V1 (Legacy)
Embedded Service V2 (MIAW)
Implication for Agentforce
Communication Style
Synchronous (Session ends on disconnect)
Asynchronous/Persistent
Agentforce requires persistence for "reasoning" delays and complex task execution.1
Routing Engine
Live Agent Routing / Omni-Channel
Omni-Channel Flow (Required)
You must build Flows to route to Agentforce; legacy routing configs will not work.5
Client Library
embedded_svc.js
embeddedservice_bootstrap.js
Code snippets are mutually exclusive; requires web team involvement.1
Custom UI
Aura Components & CSS Overrides
Custom Client API (Headless) or Builder
"Headless" mode is available for complete UI control via REST API.7
Guest Access
Native Support
Supported (Authenticated preferred)
User Verification (JWT) is highly recommended for security and persistence.8

3. Pre-Deployment Infrastructure and Licensing
Before a single line of code is written, the Salesforce environment must be provisioned and configured to support the high-throughput messaging channels that Agentforce requires.
3.1 Licensing Prerequisites
The deployment of Agentforce Service Agent is contingent upon specific licensing tiers. The foundation requires Service Cloud with Digital Engagement or the specific Messaging for In-App and Web SKU. It is critical to verify that the "Messaging for In-App and Web User" permission set license is available and assigned to the integration users.9 Furthermore, the Agentforce capability itself often requires the Agentforce Service Agent add-on, which governs the consumption-based pricing model (credits per conversation). Without these licenses active, the setup nodes for "Messaging Settings" and "Agents" may be visible but functionally restricted, leading to opaque error messages during activation.10
3.2 Permission Set Architecture
Security in V2 is granular. You must construct a permission set specifically for the "Agent" persona (the digital worker) and the "Admin" persona.
The Administrator: Needs Customize Application, Manage AI Agents, and Modify Metadata to configure the channel and deployment.11
The Agent User: When an Agentforce Agent operates, it does so under the context of a specialized integration user (often the "Platform Integration User" or a specific "Agent User"). This user must have access to the objects (Case, Contact, Order) and fields that the Agent is expected to query. A common failure mode is the Agent responding with "I cannot access that data" because the underlying integration user lacks Field Level Security (FLS) visibility on the target records.6
3.3 The Messaging Channel Configuration
The "Channel" is the logical pipe through which messages flow.
Navigate to Messaging Settings: In Salesforce Setup, this is the command center for V2.
Channel Creation: You must select "Messaging for In-App and Web". Do not select "Web Chat" (which refers to V1) or "WhatsApp/SMS" (Standard Messaging). The distinction is subtle in the UI but architecturally massive.12
Developer Name: Choose a robust API name (e.g., MIAW_Web_Channel). This will be referenced in your Omni-Channel Flows and metadata deployments.
Parameter Mapping: If you intend to pass hidden data from your website (like Cart_Value or Customer_Segment) to the Agent, you cannot just send it; you must declare these parameters in the Custom Parameters section of the Messaging Channel settings. If a parameter is sent from the web but not defined here, the MIAW ingress gateway will strip it out before it reaches the flow.5
4. The Routing Engine: Omni-Channel Flow Construction
The most significant divergence from legacy chat implementation lies in routing. Agentforce does not "pick up" chats; chats are routed to it via Omni-Channel Flow. This Flow is the brain of the operation, determining context, executing lookups, and deciding whether to involve the AI Agent or a human immediately.
4.1 Flow Type and Structure
You must create a Flow of type Omni-Channel Flow. Standard Screen Flows or Autolaunched Flows cannot be used for routing logic.
Input Variable (recordId): You must define a text variable named recordId and mark it as Available for Input. When a chat initiates, the system passes the ID of the newly created MessagingSession record into this variable. Without this, your flow is operating in a vacuum.12
4.2 Handling Pre-Chat Context
The power of Agentforce lies in its ability to know the user before the first greeting. This is achieved by mapping the Pre-Chat values to the Messaging Session.
Get Records: Use the recordId to retrieve the MessagingSession object.
Update Records: The variables passed from the website (defined in the Channel parameters) arrive in the Flow. You must explicitly write these values into custom fields on the MessagingSession object using an Update Records element.
Why? The Agentforce Reasoning Engine reads data from the record, not the Flow's temporary memory. If you don't persist the "Order Number" to a field on the Messaging Session, the Agent won't know about it.5
4.3 The "Route Work" Action & The Fallback Queue
The actual hand-off to the AI happens in the Route Work action.
Service Channel: Select "Messaging".
Route To: Select Bot (or "Agentforce Service Agent" in the latest API versions).11
Agent Selection: Pick your specific Agent (e.g., "Service_Copilot").
Fallback Queue: This is mandatory. If the Agent is overloaded (hitting the 500 concurrent session limit) or the Reasoning Engine times out (30s), the system must have a place to dump the chat. If this is left blank, the routing will fail, and the chat will effectively disappear for the user.6
The "Required Agent" Trap:
A pervasive issue in template-based flows involves the "Required Agent" checkbox in the Route Work element.
The Symptom: The flow fails with "This Route Work invocable action did not create a valid Pending Service Routing."
The Cause: If "Required Agent" is checked, the system looks for a specific human user ID. Since we are routing to a Bot definition, this logic conflicts.
The Fix: Ensure "Required Agent" is unchecked when routing to an Agentforce Agent. This tells Omni-Channel to treat the destination as a queue/bot entity rather than a specific human seat.14
5. Agentforce Service Agent Configuration
With the routing highway paved, we must configure the vehicle—the Agent itself.
5.1 Connecting the "Brain" to the Channel
In the Agentforce Agents setup node, you must explicitly link your Agent to the Messaging Channel created in Section 3.3.
Troubleshooting: If your Channel does not appear in the selection list, verify that the Channel's "Routing Type" is set to Omni-Flow and that the Flow is active. The Agent Builder filters out channels that are not correctly configured for flow-based routing.11
5.2 Context Variable Mapping
The Agent needs to be told which fields on the MessagingSession it is allowed to read.
Open the Agent in Agent Builder.
Navigate to Settings > Context.
You will see a list of "Context Variables." You must map your custom fields (e.g., MessagingSession.Cart_Value__c) to the Agent's internal context.
Implication: Once mapped, these variables become available to the Reasoning Engine. You can then write Instructions like: "If the Cart Value is greater than $500, prioritize offering a discount." The Agent will check the context variable to evaluate this rule.15
5.3 Timeouts and Performance Guardrails
Agentforce operates under strict performance constraints to ensure platform stability.
Reasoning Timeout: The engine has approximately 30 seconds to generate a plan and response. If the LLM lags or the plan generation is too complex, it may time out.17
Action Timeout: Any Flow or Apex invoked by the Agent must complete within 60 seconds.
Best Practice: Avoid synchronous callouts to slow legacy ERPs. If a process takes longer than 60 seconds, architect it as a "Fire and Forget" platform event, and have the Agent inform the user: "I have started the process; you will receive an email confirmation shortly." Do not make the Agent wait.17
6. Client-Side Integration: The "Embedded Service"
This is where the rubber meets the road—integration with your public-facing website.
6.1 Creating the Deployment
Navigate to Embedded Service Deployments and create a new deployment for Messaging for In-App and Web.
Critical: Ensure the "Deployment Type" is set to Web.
Connection: Link it to the Messaging Channel configured previously. This binds the UI to the Routing logic.18
6.2 The Code Snippet and embeddedservice_bootstrap
Upon publishing, Salesforce generates a code snippet. This snippet is fundamentally different from the V1 embedded_svc. It uses the embeddedservice_bootstrap namespace.
Standard Implementation Block:

HTML


<script type='text/javascript'>
    function initEmbeddedMessaging() {
        try {
            embeddedservice_bootstrap.settings.language = 'en_US'; // Contextualize language
            embeddedservice_bootstrap.init(
                '00Dxx0000000xxx', // Org ID
                'Deployment_Name', // Deployment Developer Name
                'https://your-org.my.site.com/ESWDeploymentName', // Scrt2 URL (CDN)
                {
                    scrt2URL: 'https://your-org.my.salesforce-scrt.com' // SCRT Endpoint
                }
            );
        } catch (err) {
            console.error('Error loading Embedded Messaging: ', err);
        }
    };
</script>
<script type='text/javascript' src='https://your-org.my.site.com/ESWDeploymentName/assets/js/bootstrap.min.js' onload='initEmbeddedMessaging()'></script>


20
6.3 Security: CORS and CSP
The V2 framework is extremely strict regarding web security. A "missing chat button" is almost always a CORS or CSP violation.
CORS (Cross-Origin Resource Sharing): You must add your website's domain (e.g., https://www.example.com) to the Salesforce CORS Allowlist. This permits the browser to make cross-domain XMLHttpRequest calls to the Salesforce scrt endpoints.21
Trusted URLs (CSP): You must create a Trusted URL entry for your website.
Directives: Ensure that script-src, frame-src, and img-src are allowed.
Experience Cloud: If deploying to a Salesforce Site, you must go to the Experience Builder > Settings > Security and set the CSP level to Relaxed CSP. Strict CSP often blocks the inline scripts required for the bootstrap initialization.21
7. Advanced Implementation: Passing Context & Verification
To elevate the implementation from a generic bot to a personalized concierge, you must implement Hidden Pre-Chat and User Verification.
7.1 Hidden Pre-Chat API
You often know who the user is (they are logged into your portal) and don't want to ask for their Name/Email again.
The embeddedservice_bootstrap API initializes asynchronously. You cannot simply set variables immediately; you must wait for the framework to signal readiness.
The Event Listener Pattern:

JavaScript


window.addEventListener("onEmbeddedMessagingReady", () => {
    console.log("MIAW API is ready for interaction.");
    
    // 1. Set Visible Fields (Populate the form)
    embeddedservice_bootstrap.prechatAPI.setVisiblePrechatFields({
        "_firstName": { "value": "John", "isEditableByEndUser": false },
        "_lastName": { "value": "Doe", "isEditableByEndUser": false }
    });

    // 2. Set Hidden Fields (Inject Context)
    // Key names MUST match Custom Parameters in Messaging Channel Settings
    embeddedservice_bootstrap.prechatAPI.setHiddenPrechatFields({
        "Customer_ID": "867-5309",
        "Cart_Value": "150.00",
        "Page_Context": "Checkout_Failure"
    });
});

// Initialize the bootstrap AFTER adding the listener
embeddedservice_bootstrap.init(...);


Mechanism: The setHiddenPrechatFields method injects this data into the payload. The Omni-Channel Flow then receives these as input variables, updates the MessagingSession, and the Agentforce Agent reads them to say, "I see you're having trouble on the Checkout page with a cart of $150".4
7.2 User Verification (JWT) for Persistence
For authenticated sessions, Salesforce uses JSON Web Tokens (JWT) to securely link the messaging session to a Salesforce Contact. This enables Asynchronous Persistence—a user can start a chat on a desktop, leave, and resume it on mobile hours later.
JWT Configuration Strategy:
Key Generation: Generate an RSA 2048-bit Key Pair.
Salesforce Setup: In "User Verification," upload the Public Key (in JWK format).
Token Generation (Server-Side): Your web server must sign a JWT using the Private Key.
Algorithm: RS256.
Required Claims:
iss (Issuer): Must match the Salesforce configuration.
sub (Subject): Immutable unique ID of the user (e.g., cust-001). Salesforce maps this to the Messaging User.
exp (Expiration): Unix timestamp.
iat (Issued At): Unix timestamp.
JSON
{
  "sub": "cust-001",
  "iss": "https://auth.mycompany.com",
  "exp": 1735689600
}


Client-Side Injection:
JavaScript
embeddedservice_bootstrap.userVerificationAPI.setIdentityToken({
    identityTokenType: "JWT",
    identityToken: "eyJhbGciOiJSUzI1NiIs..."
});


.22
Caveat: If the JWT signature is invalid or the iss does not match, the chat initialization will fail with a 401 Unauthorized error. This is a hard failure; there is no fallback to "Guest" mode if Verification is enforced.24
8. Headless Deployment (Beta)
For architectures requiring a completely bespoke UI (e.g., mobile apps or highly branded consumer portals), V2 supports Headless Mode.
Custom Client Deployment: Select "Custom Client" in the Deployment settings.
REST API: Instead of a JS snippet, you interact with the Messaging for In-App and Web REST API.
Endpoints exist to: Initialize Conversation, SendMessage, GetMessages (Polling), and UploadFile.
This decouples the UI from Salesforce entirely, allowing you to build the chat interface in React, Vue, or Swift, while still routing the backend logic through Omni-Flow to Agentforce.25
9. Troubleshooting and Diagnostics
The complexity of V2 means failures are often silent or cryptic. This matrix resolves the most common deployment blockers.
9.1 Browser Console Error Matrix

Error
Root Cause
Remediation
401 Unauthorized (on iamessage endpoint)
Invalid JWT Signature or Expired Token.
Validate iss matches exactly. Ensure exp is in the future. Verify Private Key used for signing matches the Public Key uploaded to Salesforce.24
403 Forbidden
CORS violation or IP Restriction.
Add hosting domain to CORS Allowlist. Check Network Access settings for the Integration User profile.24
Refused to frame...
CSP Header mismatch.
Add domain to Trusted URLs with frame-src enabled. In Experience Cloud, set to Relaxed CSP.21
Unable to load configuration
Deployment not published or Scrt2 URL mismatch.
Click Publish in Deployment Settings (wait 10 mins). Verify the scrt2URL in the snippet matches the Deployment's endpoint.26

9.2 Flow and Routing Diagnostics
Error: "Pending Service Routing"
Cause: The Flow tried to route to a null destination or the "Required Agent" box was checked for a Bot.
Fix: Uncheck "Required Agent." Ensure the Fallback Queue ID is valid and hardcoded or dynamically retrieved correctly.27
Agent Not Responding / Stuck in "Waiting"
Cause: Race condition between Queue and Agent, or Agent is inactive.
Fix: Ensure you are not routing to both a Queue and an Agent simultaneously. The Route Work action must be exclusive. Verify the Agent is Active in Agentforce Studio.11
10. Operational Limits and Governance
Deploying to production requires awareness of the platform's hard boundaries.
10.1 Concurrency and Scale
11,000 Concurrent Sessions: Enhanced Messaging supports a massive scale of up to 11,000 active sessions per org. However, outbound messaging functionality may be throttled if this limit is reached.28
Agentforce Specific Limits:
500 Concurrent Agent Sessions: There is a soft limit of roughly 500 concurrent sessions being actively processed by the Agentforce reasoning engine. Beyond this, requests may be queued or failed over. This can be increased via support for enterprise tiers.29
20 Active Agents: An org is limited to 20 active Agent definitions.30
10.2 Data Governance (Zero Data Retention)
A critical selling point for compliance is the Einstein Trust Layer. When Agentforce queries the LLM:
Masking: PII is masked before leaving the Salesforce boundary.
Zero Retention: The LLM provider (e.g., OpenAI, Azure) is contractually prohibited from retaining the data or using it for model training. The data is processed and immediately discarded.
Audit: All prompts and responses are logged in the Audit Trail for governance review.31
11. Migration Strategy: Live Agent to MIAW
For customers on the legacy V1 stack, migration is mandatory before the February 14, 2026 retirement date of legacy Chat.10
Audit: Catalog all existing Live Agent Buttons and Deployments.
Rebuild: Recreate each "Button" as a "Messaging Channel" and each "Deployment" as an "Embedded Service Deployment V2."
Flow Migration: Translate legacy "Routing Configurations" into "Omni-Channel Flows."
Snippet Swap: Replace the embedded_svc code on the website with embeddedservice_bootstrap.
Agentforce Activation: Only after the pipe is switched to MIAW can you activate the Agentforce Service Agent to handle the traffic.
Conclusion
The deployment of an Agentforce Service Agent via Embedded Service V2 is a sophisticated architectural endeavor that unifies front-end web security, asynchronous transport protocols, and flow-based logic. It demands a rigorous adherence to the new configuration patterns—specifically the "Bootstrap" client library, the Omni-Channel Flow routing engine, and the strict implementation of User Verification.
By meticulously following this roadmap—validating the Pre-Chat injections, securing the JWT implementation, and configuring the Fallback Queues—organizations can deploy a resilient, persistent AI workforce that not only answers queries but intelligently resolves problems, realizing the true promise of the Agentic Era.
Works cited
Salesforce Embedded Service: Comparing v1 and v2 Deployments, accessed January 12, 2026, https://salesforcechronicles.com/?p=1848
Compare Enhanced Chat Capabilities to Legacy Chat Capabilities - Salesforce Help, accessed January 12, 2026, https://help.salesforce.com/s/articleView?id=service.miaw_chat_vs_messaging.htm&language=en_US&type=5
Embedded Service Chat for Web Developer Guide - Salesforce, accessed January 12, 2026, https://resources.docs.salesforce.com/latest/latest/en-us/sfdc/pdf/embedded_services_web_dev_guide.pdf
Hidden Pre-Chat | APIs | Enhanced Web Chat | Salesforce Developers, accessed January 12, 2026, https://developer.salesforce.com/docs/service/messaging-web/guide/pre-chat.html
Map Context Variables and Route Chat with Omni-Channel Flow - Salesforce Help, accessed January 12, 2026, https://help.salesforce.com/s/articleView?id=experience.support_context_passing_framework_omni_flow.htm&language=en_US&type=5
Agentforce Service Agent With Context Variable - Absyz, accessed January 12, 2026, https://www.absyz.com/agentforce-service-agent/
Create a Custom UI Solution for Messaging for In-App and Web (Beta) - Salesforce Help, accessed January 12, 2026, https://help.salesforce.com/s/articleView?id=release-notes.rn_messaging_custom_client.htm&language=en_US&release=250&type=5
Understanding Token-Based User Verification - Salesforce Help, accessed January 12, 2026, https://help.salesforce.com/s/articleView?id=service.user_verification_overview.htm&language=en_US&type=5
Messaging for Web and In-App error | Salesforce Trailblazer Community - Trailhead, accessed January 12, 2026, https://trailhead.salesforce.com/trailblazer-community/feed/0D54V00007VIgDbSAL
What's Enhanced Chat? - Salesforce Help, accessed January 12, 2026, https://help.salesforce.com/s/articleView?id=service.reimagine_miaw.htm&language=en_US&type=5
Connect a Service Agent to Enhanced Chat v2 in the Legacy Builder - Salesforce Help, accessed January 12, 2026, https://help.salesforce.com/s/articleView?id=ai.service_agent_deploy_enhanced_chat_v2.htm&language=en_US&type=5
Exercise 2: Configure a Service Deployment - Salesforce Developers, accessed January 12, 2026, https://developer.salesforce.com/workshops/agentforce-workshop/service-agents/2-configure-a-service-deployment
STEP BY STEP AGENTFORCE SETUP AND DEPLOYMENT ON SITE, accessed January 12, 2026, https://www.sfdcamplified.com/wp-content/uploads/2025/07/agentforce-setup-and-deployment-to-community.pdf
Error: "This Route Work invocable action did not create a valid Pending Service Routing" in SCV with Amazon Connect - Trailhead, accessed January 12, 2026, https://trailhead.salesforce.com/trailblazer-community/feed/0D54V00007YwNIYSA3
Use Context Variables in Messaging Conversations - Salesforce Help, accessed January 12, 2026, https://help.salesforce.com/s/articleView?id=ai.service_agent_context_variables.htm&language=en_US&type=5
Create Context Variables for Messaging Sessions - Salesforce Help, accessed January 12, 2026, https://help.salesforce.com/s/articleView?id=cc.b2c_shopping_agent_create_context_variables.htm&language=en_US&type=5
Agentforce Considerations - Salesforce Help, accessed January 12, 2026, https://help.salesforce.com/s/articleView?id=ai.copilot_considerations.htm&language=en_US&type=5
Create a Basic Messaging for Web Deployment in Five Minutes for an Agentforce Service Agent - UnofficialSF, accessed January 12, 2026, https://unofficialsf.com/create-a-basic-messaging-for-web-deployment-in-five-minutes-for-an-agentforce-service-agent/
Messaging for In-App | Salesforce Developer Center, accessed January 12, 2026, https://developer.salesforce.com/developer-centers/service-sdk
Use Pre-Chat API to Pass Customer Information to the Service Rep in an External Website, accessed January 12, 2026, https://help.salesforce.com/s/articleView?id=service.miaw_pre_chat_api_2.htm&language=en_US&type=5
Troubleshoot Enhanced Chat Setup - Salesforce Help, accessed January 12, 2026, https://help.salesforce.com/s/articleView?id=service.miaw_troubleshoot.htm&language=en_US&type=5
User Verification Terms - Salesforce Help, accessed January 12, 2026, https://help.salesforce.com/s/articleView?id=service.user_verification_terms.htm&language=en_US&type=5
Set Up User Verification - Salesforce Help, accessed January 12, 2026, https://help.salesforce.com/s/articleView?id=sf.user_verification_setup.htm&language=en_US&type=5
Messaging for In-App and Web User Verification setup in Salesforce - Medium, accessed January 12, 2026, https://medium.com/@anonymoususer123/messaging-for-in-app-and-web-user-verification-setup-in-salesforce-5789bd8731a4
Add Your Embedded Chat to a Website - Salesforce Help, accessed January 12, 2026, https://help.salesforce.com/s/articleView?id=service.snapins_chat_get_code.htm&language=en_US&type=5
Messaging for In-App and Web, | Salesforce Trailblazer Community, accessed January 12, 2026, https://trailhead.salesforce.com/trailblazer-community/feed/0D54V00007T4vCcSAJ
visual workflow - OmniFlow - Preferred Agent - Fallback queue - Salesforce Stack Exchange, accessed January 12, 2026, https://salesforce.stackexchange.com/questions/417440/omniflow-preferred-agent-fallback-queue
Service Cloud Messaging Limits and Considerations - Salesforce Help, accessed January 12, 2026, https://help.salesforce.com/s/articleView?id=service.livemessage_limitations.htm&language=en_US&type=5
Agentforce Voice - Salesforce Help, accessed January 12, 2026, https://help.salesforce.com/s/articleView?id=ai.agentforce_voice.htm&language=en_US&type=5
Salesforce Agentforce Limitations You Should Know in 2025 - GetGenerative.ai, accessed January 12, 2026, https://www.getgenerative.ai/salesforce-agentforce-limitations/
Considerations for Agentforce Service Agent - Salesforce Help, accessed January 12, 2026, https://help.salesforce.com/s/articleView?id=ai.service_agent_considerations.htm&language=en_US&type=5
