// Excuses.com - API Integration File
// This file contains the code to connect to the Together AI API

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
 * @returns {Promise<string>} - The generated excuse
 */
async function generateExcuseWithLlamaModel(situation) {
    try {        // Check deployment environment
        const isGithubPages = window.location.hostname.includes('github.io');
        const isNetlify = window.location.hostname.includes('netlify.app') || 
                        window.location.hostname === 'excuses.com';
        const isDevelopment = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1';
          // Determine how to handle API requests based on environment
        let apiUrl, apiKey, useServerlessFunction = false;
        
        if (isNetlify) {
            // On Netlify, use the serverless function
            apiUrl = '/.netlify/functions/together-proxy';
            useServerlessFunction = true;
            console.log('Using Netlify serverless function for API calls');
            // No API key needed in client - it's stored securely in environment variables
        } else if (isGithubPages) {
            // GitHub Pages doesn't support server-side code or CORS proxies properly
            apiUrl = 'https://api.together.xyz/v1/chat/completions'; // This will likely fail with CORS error
            apiKey = localStorage.getItem('together_api_key') || '';
            console.log('GitHub Pages detected - API calls will likely fail due to CORS restrictions');
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
        return cleanupExcuse(generatedText);
    } catch (error) {
        console.error('Error calling Together API:', error);
        
        // Generate a descriptive error message for GitHub Pages issues
        let errorMessage = 'API Error! ';
        if (window.location.hostname.includes('github.io')) {
            errorMessage = 'API cannot be accessed directly from GitHub Pages due to security restrictions. ';
            errorMessage += 'The app is falling back to local excuses. For AI functionality, use a different hosting solution or set up a proper backend.';
            
            // Show a more visible error message for GitHub Pages users
            if (typeof showNotification === 'function') {
                showNotification(errorMessage, 'error');
            } else {
                alert(errorMessage);
            }
            
            // Log detailed debugging info
            console.info('GitHub Pages detected. API calls require special handling.');
        } else {
            errorMessage += 'Falling back to local excuses.';
            
            // Display a general error notification if available
            if (typeof showNotification === 'function') {
                showNotification(errorMessage, 'error');
            }
        }
        
        // Fallback to local excuse generation if available
        if (typeof getExcuseForSituation === 'function') {
            return getExcuseForSituation(situation);
        }
        
        return "I couldn't connect to the AI service. The AI functionality doesn't work on GitHub Pages without a custom backend.";
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

// Check if the API is available and working
async function checkApiAvailability() {
    try {
        // Simple test request with minimal tokens
        const testSituation = "test";
        const result = await generateExcuseWithLlamaModel(testSituation);
        
        // If we get a result without an error, the API is working
        console.log("API check successful:", result.substring(0, 50) + "...");
        return {
            available: true,
            source: "together-api"
        };
    } catch (error) {
        console.warn("API check failed:", error.message);
        return {
            available: false,
            error: error.message,
            source: "local-fallback"
        };
    }
}
