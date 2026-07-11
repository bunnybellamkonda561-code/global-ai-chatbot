const registry = require('./registry.json');

/**
 * Parses user message to see if they want to connect to a specific company or go back to the hub.
 * Returns the matching agent ID or null.
 */
function detectRouting(message, currentAgentId) {
  const msgLower = message.toLowerCase();
  
  // Check for return to hub / disconnect
  if (
    msgLower.includes('disconnect') || 
    msgLower.includes('exit') || 
    msgLower.includes('go back to hub') || 
    msgLower.includes('main hub') || 
    msgLower.includes('router') ||
    msgLower.includes('stop chatting with')
  ) {
    return 'hub';
  }

  // Check if any agent keyword is mentioned
  for (const agent of registry.agents) {
    // Check name or keywords
    if (msgLower.includes(agent.id) || msgLower.includes(agent.name.toLowerCase())) {
      return agent.id;
    }
    for (const keyword of agent.keywords) {
      if (msgLower.includes(keyword)) {
        return agent.id;
      }
    }
  }

  return null;
}

/**
 * Simulates a response from an agent when no API key is provided.
 */
function getSimulatedResponse(message, agentId) {
  const msgLower = message.toLowerCase();

  // If Hub Coordinator
  if (agentId === 'hub') {
    // Check if they asked for active companies
    if (msgLower.includes('company') || msgLower.includes('list') || msgLower.includes('which') || msgLower.includes('who')) {
      const names = registry.agents.map(a => `**${a.name}** (${a.category})`).join(', ');
      return `Currently, I can connect you to the following global support chatbots: ${names}. You can say: *"Connect me to Spotify"* or *"I want to talk to Nike"* to jump in!`;
    }
    
    // Help query
    if (msgLower.includes('help') || msgLower.includes('hello') || msgLower.includes('hi')) {
      return registry.hub.greeting;
    }

    // Default hub router response
    return `I am the Global AI Care Router. I didn't recognize a specific company in your query. You can ask me to connect you to companies like **Nike**, **Spotify**, **Delta Airlines**, or **Apex Electronics**. For example: *"I want to chat with Spotify support"* or *"Take me to Nike"*`;
  }

  // Find the company agent
  const agent = registry.agents.find(a => a.id === agentId);
  if (!agent) {
    return `Error: System agent '${agentId}' not found. Re-routing to Global Router...`;
  }

  // 1. Search FAQ patterns
  for (const faqItem of agent.faq) {
    const regex = new RegExp(faqItem.pattern, 'i');
    if (regex.test(msgLower)) {
      return faqItem.response;
    }
  }

  // 2. Generate a generic, contextual brand-specific response
  const brandResponses = {
    nike: [
      "That's the Nike spirit! 👟 Could you tell me if this is regarding a specific gear, order delivery, or sizing inquiry? Let's get you set up for victory.",
      "Just Do It! To assist you best, could you let me know if you are inquiring about a member account, a retail store purchase, or an online order?",
      "Excellent question. Under the Nike trial policy, we want to make sure you have the perfect gear. Can you provide more details about the item or the issue?"
    ],
    spotify: [
      "Let's get those tunes sorted! 🎵 What device or platform are you using Spotify on (iOS, Android, Web, or Desktop)?",
      "I hear you! That's definitely something we want to fix so you can keep listening. Could you let me know if this is happening on a free account or Premium?",
      "Good question! To help you get the best streaming experience, could you share a bit more detail about what error message or behavior you are seeing?"
    ],
    delta: [
      "Thank you for your inquiry. ✈️ To look up real-time status or baggage rules for your flight, could you please provide your 6-character flight Confirmation Code or Flight Number?",
      "At Delta, we strive to keep your travel seamless. Could you please specify if you're traveling domestically or internationally so I can reference the exact regulation?",
      "I would be glad to help guide your journey. Let me know if you need assistance modifying a booking, adding a SkyMiles number, or checking baggage allowances."
    ],
    apex: [
      "Diagnostic report received. 💻 What specific model number is printed on the bottom casing of your device? That will help me check technical schematics.",
      "Apex systems are ready to troubleshoot. Has this device suffered any liquid exposure or physical impact recently, or is it a software/firmware concern?",
      "To resolve this configuration query, let me know if you are running the default Apex OS or if you have upgraded to a secondary system."
    ],
    amazon: [
      "Thank you for contact Amazon Support! 📦 Can you specify if this query relates to a digital order, physical shipment delivery, or Prime subscription?",
      "I'm here to ensure your shipping is seamless. Do you have a tracking number or Order ID we can trace today?",
      "I'd be glad to look that up. Is this order fulfilled by Amazon or a third-party seller?"
    ],
    starbucks: [
      "Happy to assist a Starbucks Rewards member! ☕ Which drink customization or reward tier are you inquiring about today?",
      "Let's get that coffee credit resolved. Did you reload using our mobile app, or is this regarding a physical gift card?",
      "I'd love to help! Are you looking for seasonal beverage ingredients or standard nutritional details?"
    ],
    netflix: [
      "Let's get that streaming issue sorted out! 🍿 What device are you using (Smart TV, mobile app, or web browser)?",
      "I want to make sure you can watch uninterrupted. Are you seeing an error code, or is it a profile login issue?",
      "Great question. Let me know if this is regarding adding a household member or upgrading your streaming resolution."
    ],
    dhl: [
      "Thank you for choosing DHL Express. 🚚 Do you have your 10-digit Waybill or tracking code so I can scan our active manifests?",
      "I can assist with international shipping rates. What is the destination country and weight of your parcel?",
      "To resolve this customs query, let me know if you are the shipper or receiver of this package."
    ]
  };

  const pool = brandResponses[agentId] || [
    `Thanks for reaching out to ${agent.name} support! We are online and ready to assist you. What can we resolve for you today?`
  ];
  
  // Return a random response from the brand pool to simulate AI variety
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

module.exports = {
  detectRouting,
  getSimulatedResponse
};
