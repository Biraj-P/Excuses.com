// netlify/functions/together-proxy.js
// This is a serverless function that proxies requests to the Together API
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: "Method Not Allowed" }) 
    };
  }

  try {
    // Parse the request body
    const requestBody = JSON.parse(event.body);
    
    // You can validate the model parameter here if needed
    if (!requestBody.model || !requestBody.messages) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required parameters" })
      };
    }
    
    // Get the API key from environment variables
    const apiKey = process.env.TOGETHER_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "API key not configured on server" })
      };
    }

    // Make the request to the Together API
    const response = await fetch("https://api.together.xyz/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    // Get the response data
    const data = await response.json();

    // Return the response to the client
    return {
      statusCode: response.status,
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json"
      }
    };
  } catch (error) {
    console.error("Proxy error:", error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error", message: error.message })
    };
  }
};
