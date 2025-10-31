// backend/utils/aiProviderManager.js - VERSION OPTIMISÉE

class AIProviderManager {
  constructor() {
    this.providers = [];
    this.currentProviderIndex = 0;
    this.failureCount = new Map();
    this.lastSuccessfulProvider = null;
    this.maxFailures = 3;
    this.isInitialized = false;
    
    // ✅ Configuration optimale pour réponses complètes
    this.defaultConfig = {
      max_tokens: 4000,        // Augmenté pour permettre des réponses longues
      temperature: 0.7,        // Balance créativité/cohérence
      top_p: 0.95,            // Diversité des réponses
      frequency_penalty: 0.2,  // Évite les répétitions
      presence_penalty: 0.1,   // Encourage la diversité
    };
  }

  async initialize() {
    if (this.isInitialized) return;

    console.log("[AIManager] Initializing providers...");
    this.providers = await this.initializeProviders();
    this.isInitialized = true;
    console.log(`[AIManager] ✅ ${this.providers.length} provider(s) initialized: ${this.providers.map(p => p.name).join(", ")}`);
  }

  async initializeProviders() {
    const providers = [];

    // ========================================
    // OpenAI GPT-4o-mini
    // ========================================
    if (process.env.OPENAI_API_KEY) {
      try {
        const OpenAI = (await import("openai")).default;
        providers.push({
          name: "OpenAI",
          priority: 1,
          client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
          model: "gpt-4o-mini",
          type: "openai",
          isActive: true,
        });
        console.log("[AIManager] ✅ OpenAI initialized");
      } catch (err) {
        console.warn("[AIManager] ⚠️ OpenAI not available:", err.message);
      }
    }

    // ========================================
    // Anthropic Claude
    // ========================================
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const Anthropic = (await import("@anthropic-ai/sdk")).default;
        providers.push({
          name: "Anthropic",
          priority: 2,
          client: new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
          model: "claude-3-5-sonnet-20241022",
          type: "anthropic",
          isActive: true,
        });
        console.log("[AIManager] ✅ Anthropic initialized");
      } catch (err) {
        console.warn("[AIManager] ⚠️ Anthropic not available:", err.message);
      }
    }

    // ========================================
    // Google Gemini
    // ========================================
    if (process.env.GEMINI_API_KEY) {
      try {
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        providers.push({
          name: "Gemini",
          priority: 3,
          client: new GoogleGenerativeAI(process.env.GEMINI_API_KEY),
          model: "gemini-1.5-flash",
          type: "gemini",
          isActive: true,
        });
        console.log("[AIManager] ✅ Gemini initialized");
      } catch (err) {
        console.warn("[AIManager] ⚠️ Gemini not available:", err.message);
      }
    }

    // ========================================
    // Groq (Llama/Mixtral ultra-rapide)
    // ========================================
    if (process.env.GROQ_API_KEY) {
      try {
        const Groq = (await import("groq-sdk")).default;
        providers.push({
          name: "Groq",
          priority: 4,
          client: new Groq({ apiKey: process.env.GROQ_API_KEY }),
          model: "llama-3.3-70b-versatile",
          type: "groq",
          isActive: true,
        });
        console.log("[AIManager] ✅ Groq initialized");
      } catch (err) {
        console.warn("[AIManager] ⚠️ Groq not available:", err.message);
      }
    }

    // ========================================
    // Cohere
    // ========================================
    if (process.env.COHERE_API_KEY) {
      try {
        const { CohereClient } = await import("cohere-ai");
        providers.push({
          name: "Cohere",
          priority: 5,
          client: new CohereClient({ token: process.env.COHERE_API_KEY }),
          model: "command-r-plus",
          type: "cohere",
          isActive: true,
        });
        console.log("[AIManager] ✅ Cohere initialized");
      } catch (err) {
        console.warn("[AIManager] ⚠️ Cohere not available:", err.message);
      }
    }

    // ========================================
    // HuggingFace
    // ========================================
    if (process.env.HUGGINGFACE_TOKEN) {
      try {
        const { HfInference } = await import("@huggingface/inference");
        providers.push({
          name: "HuggingFace",
          priority: 6,
          client: new HfInference(process.env.HUGGINGFACE_TOKEN),
          model: "meta-llama/Llama-3.2-3B-Instruct",
          type: "huggingface",
          isActive: true,
        });
        console.log("[AIManager] ✅ HuggingFace initialized");
      } catch (err) {
        console.warn("[AIManager] ⚠️ HuggingFace not available:", err.message);
      }
    }

    // Trier par priorité
    providers.sort((a, b) => a.priority - b.priority);

    if (providers.length === 0) {
      console.error("[AIManager] ❌ No AI providers configured! Please add API keys to .env");
    }

    return providers;
  }

  async generateResponse(systemPrompt, messages, options = {}) {
    // Initialiser si nécessaire
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.providers.length === 0) {
      throw new Error("No AI providers available. Please configure API keys in .env file.");
    }

    // ✅ Merger les options avec la config par défaut
    const config = { ...this.defaultConfig, ...options };
    const { stream = true, maxRetries = this.providers.length } = config;
    
    let attempts = 0;
    let lastError = null;

    while (attempts < maxRetries) {
      const provider = this.getCurrentProvider();
      
      if (!provider) {
        throw new Error("No active AI providers available");
      }

      try {
        console.log(`[AIManager] Attempt ${attempts + 1}/${maxRetries} using ${provider.name}`);
        
        const response = await this.callProvider(provider, systemPrompt, messages, config);
        
        // Reset failure count on success
        this.failureCount.set(provider.name, 0);
        this.lastSuccessfulProvider = provider.name;
        
        console.log(`[AIManager] ✅ Success with ${provider.name}`);
        return response;

      } catch (error) {
        lastError = error;
        console.error(`[AIManager] ❌ Error with ${provider.name}:`, error.message);

        // Increment failure count
        const failures = (this.failureCount.get(provider.name) || 0) + 1;
        this.failureCount.set(provider.name, failures);

        // Check if provider should be temporarily disabled
        if (this.isQuotaError(error) || failures >= this.maxFailures) {
          console.warn(`[AIManager] ⚠️ Disabling ${provider.name} temporarily`);
          provider.isActive = false;
          
          // Re-enable after 5 minutes
          setTimeout(() => {
            provider.isActive = true;
            this.failureCount.set(provider.name, 0);
            console.log(`[AIManager] ♻️ Re-enabled ${provider.name}`);
          }, 5 * 60 * 1000);
        }

        // Move to next provider
        this.rotateProvider();
        attempts++;
      }
    }

    throw new Error(`All providers failed. Last error: ${lastError?.message || "Unknown error"}`);
  }

  async callProvider(provider, systemPrompt, messages, config) {
    const fullMessages = [
      { role: "system", content: systemPrompt },
      ...messages
    ];

    switch (provider.type) {
      case "openai":
        return this.callOpenAI(provider, fullMessages, config);
      
      case "anthropic":
        return this.callAnthropic(provider, systemPrompt, messages, config);
      
      case "gemini":
        return this.callGemini(provider, systemPrompt, messages, config);
      
      case "groq":
        return this.callGroq(provider, fullMessages, config);
      
      case "cohere":
        return this.callCohere(provider, systemPrompt, messages, config);
      
      case "huggingface":
        return this.callHuggingFace(provider, fullMessages, config);
      
      default:
        throw new Error(`Unknown provider type: ${provider.type}`);
    }
  }

  async callOpenAI(provider, messages, config) {
    const response = await provider.client.chat.completions.create({
      model: provider.model,
      messages,
      temperature: config.temperature,
      max_tokens: config.max_tokens,
      top_p: config.top_p,
      frequency_penalty: config.frequency_penalty,
      presence_penalty: config.presence_penalty,
      stream: config.stream,
    });

    return { stream: response, provider: provider.name };
  }

  async callAnthropic(provider, systemPrompt, messages, config) {
    const response = await provider.client.messages.create({
      model: provider.model,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content
      })),
      max_tokens: config.max_tokens,
      temperature: config.temperature,
      top_p: config.top_p,
      stream: config.stream,
    });

    return { stream: response, provider: provider.name };
  }

  async callGemini(provider, systemPrompt, messages, config) {
    const model = provider.client.getGenerativeModel({ 
      model: provider.model,
      generationConfig: {
        maxOutputTokens: config.max_tokens,
        temperature: config.temperature,
        topP: config.top_p,
      }
    });
    
    const chat = model.startChat({
      history: messages.slice(0, -1).map(m => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }]
      })),
      systemInstruction: systemPrompt,
    });

    const lastMessage = messages[messages.length - 1].content;
    
    if (config.stream) {
      const result = await chat.sendMessageStream(lastMessage);
      return { stream: result.stream, provider: provider.name };
    } else {
      const result = await chat.sendMessage(lastMessage);
      return { text: result.response.text(), provider: provider.name };
    }
  }

  async callGroq(provider, messages, config) {
    const response = await provider.client.chat.completions.create({
      model: provider.model,
      messages,
      temperature: config.temperature,
      max_tokens: config.max_tokens,
      top_p: config.top_p,
      frequency_penalty: config.frequency_penalty,
      presence_penalty: config.presence_penalty,
      stream: config.stream,
    });

    return { stream: response, provider: provider.name };
  }

  async callCohere(provider, systemPrompt, messages, config) {
    const chatHistory = messages.slice(0, -1).map(m => ({
      role: m.role === "user" ? "USER" : "CHATBOT",
      message: m.content
    }));

    const lastMessage = messages[messages.length - 1].content;

    if (config.stream) {
      const response = await provider.client.chatStream({
        model: provider.model,
        message: lastMessage,
        chatHistory,
        preamble: systemPrompt,
        temperature: config.temperature,
        maxTokens: config.max_tokens,
        p: config.top_p,
      });

      return { stream: response, provider: provider.name };
    } else {
      const response = await provider.client.chat({
        model: provider.model,
        message: lastMessage,
        chatHistory,
        preamble: systemPrompt,
        temperature: config.temperature,
        maxTokens: config.max_tokens,
        p: config.top_p,
      });

      return { text: response.text, provider: provider.name };
    }
  }

  async callHuggingFace(provider, messages, config) {
    if (config.stream) {
      const response = provider.client.chatCompletionStream({
        model: provider.model,
        messages,
        max_tokens: config.max_tokens,
        temperature: config.temperature,
        top_p: config.top_p,
      });

      return { stream: response, provider: provider.name };
    } else {
      const response = await provider.client.chatCompletion({
        model: provider.model,
        messages,
        max_tokens: config.max_tokens,
        temperature: config.temperature,
        top_p: config.top_p,
      });

      return { text: response.choices[0].message.content, provider: provider.name };
    }
  }

  getCurrentProvider() {
    const activeProviders = this.providers.filter(p => p.isActive);
    
    if (activeProviders.length === 0) {
      return null;
    }

    return activeProviders[this.currentProviderIndex % activeProviders.length];
  }

  rotateProvider() {
    this.currentProviderIndex++;
    const provider = this.getCurrentProvider();
    if (provider) {
      console.log(`[AIManager] 🔄 Rotating to ${provider.name}`);
    }
  }

  isQuotaError(error) {
    const quotaKeywords = [
      "quota",
      "rate limit",
      "429",
      "insufficient_quota",
      "billing",
      "usage limit",
      "overloaded"
    ];

    const errorString = (error.message || String(error)).toLowerCase();
    return quotaKeywords.some(keyword => errorString.includes(keyword));
  }

  getStatus() {
    if (!this.isInitialized) {
      return [];
    }

    return this.providers.map(p => ({
      name: p.name,
      isActive: p.isActive,
      failures: this.failureCount.get(p.name) || 0,
      model: p.model
    }));
  }
}

// Export singleton
export const aiManager = new AIProviderManager();

// Auto-initialize on first import
aiManager.initialize().catch(err => {
  console.error("[AIManager] ❌ Initialization error:", err);
});