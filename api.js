// Excuses.com - API Integration File
// This file contains the code to connect to the Together AI API

/**
 * Generate an excuse using Together API's Meta-Llama/Llama-3.3-70B-Instruct-Turbo-Free model
 * @param {string} situation - The situation to generate an excuse for
 * @returns {Promise<string>} - The generated excuse
 */
async function generateExcuseWithLlamaModel(situation) {
    try {
        const apiKey = 'tgp_v1__u8MIvPmKx522z6Ink0KrcWTbtBZKpIrw5m2nejKgMg';
        const apiUrl = 'https://api.together.xyz/v1/chat/completions';
        
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
        
        // Set up API request
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
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
            throw new Error(`API request failed with status ${response.status}`);
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
        // Display an error notification if available
        if (typeof showNotification === 'function') {
            showNotification('API Error! Falling back to local excuses.', 'error');
        }
        // Fallback to local excuse generation if available
        if (typeof getExcuseForSituation === 'function') {
            return getExcuseForSituation(situation);
        }
        return "I couldn't connect to the AI service. Please check your internet connection and try again.";
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
