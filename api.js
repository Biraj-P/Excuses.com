// Excuses.com - API Integration File
// This file contains the code to connect to the Together AI API

// Excuse cache system
const EXCUSE_CACHE = {
    maxSize: 50,  // Maximum number of cached excuses
    items: {},    // Cache storage
    keys: [],     // For tracking order and implementing LRU
};

/**
 * Add an excuse to the cache
 * @param {string} situation - The situation that generated the excuse
 * @param {string} excuse - The generated excuse
 */
function addToExcuseCache(situation, excuse) {
    // Don't cache empty or error excuses
    if (!excuse || excuse.includes("error") || excuse.includes("sorry")) return;
    
    // Generate a stable cache key
    const cacheKey = situation.trim().toLowerCase();
    
    // If this key already exists, update it and move to front of LRU
    if (EXCUSE_CACHE.items[cacheKey]) {
        EXCUSE_CACHE.items[cacheKey] = excuse;
        // Update its position in the keys array
        const index = EXCUSE_CACHE.keys.indexOf(cacheKey);
        if (index !== -1) {
            EXCUSE_CACHE.keys.splice(index, 1);
            EXCUSE_CACHE.keys.unshift(cacheKey);
        }
        return;
    }
    
    // Check if cache is full
    if (EXCUSE_CACHE.keys.length >= EXCUSE_CACHE.maxSize) {
        // Remove least recently used item
        const oldestKey = EXCUSE_CACHE.keys.pop();
        delete EXCUSE_CACHE.items[oldestKey];
    }
    
    // Add new item to cache
    EXCUSE_CACHE.items[cacheKey] = excuse;
    EXCUSE_CACHE.keys.unshift(cacheKey);
    
    // Try to persist to localStorage
    try {
        localStorage.setItem('excuse_cache', JSON.stringify({
            items: EXCUSE_CACHE.items,
            keys: EXCUSE_CACHE.keys
        }));
    } catch (e) {
        console.warn('Failed to save excuse cache to localStorage', e);
    }
}

/**
 * Get an excuse from the cache
 * @param {string} situation - The situation to look up
 * @returns {string|null} The cached excuse or null if not found
 */
function getFromExcuseCache(situation) {
    // Attempt to load cache from localStorage if it's empty
    if (EXCUSE_CACHE.keys.length === 0 && typeof localStorage !== 'undefined') {
        try {
            const saved = localStorage.getItem('excuse_cache');
            if (saved) {
                const parsed = JSON.parse(saved);
                EXCUSE_CACHE.items = parsed.items || {};
                EXCUSE_CACHE.keys = parsed.keys || [];
            }
        } catch (e) {
            console.warn('Failed to load excuse cache from localStorage', e);
        }
    }
    
    // Generate a stable cache key
    const cacheKey = situation.trim().toLowerCase();
    
    // Check if this situation is cached
    if (EXCUSE_CACHE.items[cacheKey]) {
        // Update LRU ordering
        const index = EXCUSE_CACHE.keys.indexOf(cacheKey);
        if (index !== -1) {
            EXCUSE_CACHE.keys.splice(index, 1);
            EXCUSE_CACHE.keys.unshift(cacheKey);
        }
        return EXCUSE_CACHE.items[cacheKey];
    }
    
    return null;
}

/**
 * Clear the excuse cache
 */
function clearExcuseCache() {
    EXCUSE_CACHE.items = {};
    EXCUSE_CACHE.keys = [];
    
    // Remove from localStorage if available
    if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('excuse_cache');
    }
}

// Check for GitHub Pages environment
if (typeof window !== 'undefined' && window.location.hostname.includes('github.io')) {
    console.log('%c⚠️ GitHub Pages Environment Detected', 'font-size:14px; font-weight:bold; color:#ff9800');
    console.log('%cThe Together API calls will not work directly from GitHub Pages due to CORS restrictions.', 'color:#ff5722');
    console.log('%cThe application will fall back to using a local database of excuses instead.', 'color:#ff5722');
    console.log('%cFor full AI functionality, consider deploying to:','font-weight:bold');
    console.log('1. Netlify with serverless functions');
    console.log('2. Vercel with API routes');
    console.log('3. Your own server with proper CORS configuration');
    console.log('%cAlternatively, you can use a CORS proxy (not recommended for production)', 'font-style:italic');
}

/**
 * Generate an excuse using Together API's Meta-Llama/Llama-3.3-70B-Instruct-Turbo-Free model
 * @param {string} situation - The situation to generate an excuse for
 * @param {Object} options - Optional parameters
 * @param {boolean} options.bypassCache - If true, will generate a new excuse even if one exists in cache
 * @returns {Promise<string>} - The generated excuse
 */
async function generateExcuseWithLlamaModel(situation, options = {}) {
    try {
        // Check cache unless explicitly bypassed
        if (!options.bypassCache) {
            const cachedExcuse = getFromExcuseCache(situation);
            if (cachedExcuse) {
                console.log('Using cached excuse for:', situation);
                return cachedExcuse;
            }
        }
    
        // Check deployment environment
        const isRestrictedEnv = isRestrictedEnvironment();
        const isNetlify = window.location.hostname.includes('netlify.app') || 
                        window.location.hostname === 'excuses.com';
        const isVercel = window.location.hostname.includes('vercel.app') ||
                        window.location.hostname.endsWith('.now.sh');
        const isDevelopment = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1';
          // If we're in a restricted environment like GitHub Pages, directly use the local fallback
        if (isRestrictedEnv) {
            console.log('%c⚠️ Restricted environment detected: Using local excuses database', 'color:#ff9800; font-weight: bold');
            
            // For GitHub Pages, we need to check if the function is available in the window object
            // This ensures it can be accessed from different script files
            if (typeof window.getExcuseForSituation === 'function') {
                const localExcuse = window.getExcuseForSituation(situation);
                // Add to cache
                addToExcuseCache(situation, localExcuse);
                return localExcuse;
            } else if (typeof getExcuseForSituation === 'function') {
                const localExcuse = getExcuseForSituation(situation);
                // Add to cache
                addToExcuseCache(situation, localExcuse);
                return localExcuse;
            } else {
                // Fallback to generic excuses if local database function isn't available
                console.warn('Local excuse generation function not available, using generic fallback');
                const genericExcuses = [
                    "I had an unexpected family emergency that required my immediate attention.",
                    "My car broke down on the way, and I had to wait for roadside assistance.",
                    "I suddenly came down with a terrible migraine that made it impossible to focus.",
                    "There was a power outage at my home that disrupted everything.",
                    "My internet connection was down all day due to maintenance work."
                ];
                const randomIndex = Math.floor(Math.random() * genericExcuses.length);
                return genericExcuses[randomIndex];
            }
        }
        
        // Determine how to handle API requests based on environment
        let apiUrl, apiKey, useServerlessFunction = false;
        
        if (isNetlify) {
            // On Netlify, use the serverless function
            apiUrl = '/.netlify/functions/together-proxy';
            useServerlessFunction = true;
            console.log('Using Netlify serverless function for API calls');
            // No API key needed in client - it's stored securely in environment variables
        } else if (isVercel) {
            // On Vercel, use API route
            apiUrl = '/api/together-api';
            useServerlessFunction = true;
            console.log('Using Vercel API route for API calls');
        } else {
            // Development or custom server
            apiUrl = 'https://api.together.xyz/v1/chat/completions';
            apiKey = localStorage.getItem('together_api_key') || 'tgp_v1__u8MIvPmKx522z6Ink0KrcWTbtBZKpIrw5m2nejKgMg';
        }
        
        // Set up messages for the chat API
        const messages = [
            {
                role: "system",
                content: "You are an excuse generator AI that creates believable, creative, and slightly humorous excuses for various situations. You respond with just the excuse text, without any introductions, explanations, or disclaimers."
            },
            {
                role: "user",
                content: `I need an excuse for the following situation: ${situation}\nGive me a creative and believable excuse that I can use. It should be 1-3 sentences long and sound natural.`
            }
        ];
        
        // Show console message for debugging
        console.log(`Making API request to: ${apiUrl}`);
          // Set up API request
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Only include Authorization header when calling the API directly
                ...(useServerlessFunction ? {} : {'Authorization': `Bearer ${apiKey}`})
            },
            body: JSON.stringify({
                model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
                messages: messages,
                max_tokens: 150,
                temperature: 0.7,
                top_p: 0.9,
                frequency_penalty: 0.3,
                presence_penalty: 0.3
            })
        });
          if (!response.ok) {
            console.error(`API request failed with status ${response.status}`);
            
            // Handle specific error codes for GitHub Pages
            if (response.status === 0 || response.status === 403) {
                // CORS or network error, which is common with GitHub Pages
                throw new Error("API access is blocked on GitHub Pages due to CORS restrictions. Please use a different hosting platform or set up a proxy.");
            }
            
            throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('API Response:', JSON.stringify(data, null, 2));
        
        // Extract the generated text from the response
        let generatedText;
        
        // Different APIs have different response structures
        if (data.choices && data.choices[0] && data.choices[0].message) {
            // OpenAI Chat API format
            generatedText = data.choices[0].message.content.trim();
        } else if (data.choices && data.choices[0] && data.choices[0].text) {
            // OpenAI Completions API format
            generatedText = data.choices[0].text.trim();
        } else if (data.output && data.output.choices && data.output.choices[0]) {
            // Together API format (some versions)
            generatedText = data.output.choices[0].text.trim();
        } else if (data.output && typeof data.output === 'string') {
            // Simple output format
            generatedText = data.output.trim();
        } else if (data.error) {
            // Error handling
            console.error('API Error:', data.error);
            throw new Error(data.error.message || 'API request failed');
        } else {
            generatedText = 'Sorry, I couldn\'t generate an excuse at the moment.';
        }
        
        // Clean up the response to extract just the excuse
        const excuse = cleanupExcuse(generatedText);
        
        // Add the generated excuse to cache
        addToExcuseCache(situation, excuse);
        
        return excuse;    } catch (error) {
        console.error('Error calling Together API:', error);
        
        // Enhanced error handling with more specific error messages based on error type
        let errorMessage = 'API Error! ';
        let errorType = 'unknown';
        
        // Check the specific error type
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            errorType = 'network';
            errorMessage = 'Network error when connecting to AI service. ';
        } else if (error.message.includes('CORS')) {
            errorType = 'cors';
            errorMessage = 'CORS policy prevented API access. ';
        } else if (error.message.includes('API key')) {
            errorType = 'auth';
            errorMessage = 'API authentication failed. Please check your API key. ';
        } else if (isRestrictedEnvironment()) {
            errorType = 'restricted';
            errorMessage = 'API cannot be accessed from this environment due to security restrictions. ';
        }
        
        // Additional information for various error types
        if (errorType === 'restricted' || errorType === 'cors') {
            errorMessage += 'The app is falling back to local excuses. For full AI functionality, use a different hosting solution.';
            console.info('Restricted environment detected. API calls require special handling.');
        } else if (errorType === 'network') {
            errorMessage += 'Check your internet connection or try again later. Falling back to local excuses.';
        } else if (errorType === 'auth') {
            errorMessage += 'Visit the config page to enter your API key. Using local excuses for now.';
        } else {
            errorMessage += 'Falling back to local excuse generation.';
        }
        
        // Show notification if the function is available
        if (typeof window !== 'undefined' && typeof showNotification === 'function') {
            showNotification(errorMessage, 'error');
        }
        
        // Try to get an excuse from cache first
        const cachedExcuse = getFromExcuseCache(situation);
        if (cachedExcuse) {
            console.log('Using cached excuse after API error');
            return cachedExcuse;
        }
        
        // Fallback to local excuse generation if available
        if (typeof getExcuseForSituation === 'function') {
            const localExcuse = getExcuseForSituation(situation);
            // Still add this to cache for future requests
            addToExcuseCache(situation, localExcuse);
            return localExcuse;
        }
        
        return "I couldn't connect to the AI service. Using local excuse database instead.";
    }
}

/**
 * Clean up the LLM-generated excuse to extract just the excuse text
 * @param {string} text - The raw text from the LLM
 * @returns {string} - Cleaned up excuse
 */
function cleanupExcuse(text) {
    // Common patterns to remove from the beginning of LLM responses
    const startPatterns = [
        /^Here'?s an excuse you could use:/i,
        /^Here'?s a (good|creative|believable|plausible) excuse:/i,
        /^Excuse:/i,
        /^An excuse for this situation could be:/i,
        /^You could say( that)?:/i,
        /^I would suggest:/i,
        /^"/, // Sometimes LLMs put the entire response in quotes
        /^I'm sorry, but I can't generate excuses for/, // Refusal pattern
    ];
    
    // Remove common patterns from the start
    let cleaned = text;
    for (const pattern of startPatterns) {
        cleaned = cleaned.replace(pattern, '').trim();
    }
    
    // Remove quotes at the beginning and end if they match
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        cleaned = cleaned.substring(1, cleaned.length - 1).trim();
    }
    
    // Remove bracketed instructions that might appear in LLM output
    cleaned = cleaned.replace(/\[.*?\]/g, '').trim();
    
    return cleaned;
}

/**
 * Determines if the app is being run in a restricted environment (like GitHub Pages) 
 * where API access might be limited due to CORS policies
 * @returns {boolean} - True if in a restricted environment
 */
function isRestrictedEnvironment() {
    // Check if running in a browser
    if (typeof window === 'undefined') return false;
    
    // Check for GitHub Pages and other restricted environments
    const isGitHubPages = window.location.hostname.includes('github.io');
    const isRestrictedDomain = 
        window.location.hostname.includes('.github.') || 
        window.location.hostname.includes('.gitlab.') ||
        window.location.hostname.endsWith('.pages.dev') || // Cloudflare Pages without custom config
        window.location.protocol === 'file:'; // Local file system
        
    return isGitHubPages || isRestrictedDomain;
}
