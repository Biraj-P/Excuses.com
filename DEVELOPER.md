# Excuses.com Developer Guide

This guide explains how to set up and deploy the Excuses.com application with the Together API integration.

## Project Structure

- `index.html` - Main application page
- `script.js` - Core application logic
- `api.js` - Together API integration
- `styles.css` - Application styling
- `config.html` - API key configuration page
- `deploy.html` - Deployment guide
- `netlify/functions/together-proxy.js` - Netlify serverless function for API proxying
- `api/together-api.js` - Vercel API route for API proxying
- `vercel.json` - Vercel configuration

## Local Development

1. Clone the repository:
   ```
   git clone https://github.com/Biraj-P/Excuses.com.git
   cd Excuses.com
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

4. Open [http://localhost:5000](http://localhost:5000) in your browser.

## API Integration

The application uses the Together API with Meta-Llama/Llama-3.3-70B-Instruct-Turbo-Free model to generate creative excuses.

### API Integration Flow:

1. User enters a situation
2. Application makes a request to Together API (directly or via serverless function)
3. API returns a generated excuse
4. Application displays the excuse to the user

### Environments:

- **Local Development**: Direct API call with API key in localStorage
- **GitHub Pages**: Limited functionality (uses local excuse database)
- **Netlify**: Uses serverless function to protect API key
- **Vercel**: Uses API route to protect API key

## Deployment Options

### GitHub Pages

**Note**: GitHub Pages does not support server-side code, so the application will fall back to using the local excuse database instead of the AI model.

To deploy to GitHub Pages:

```
git branch gh-pages
git checkout gh-pages
git push origin gh-pages
```

### Netlify (Recommended)

1. Connect your GitHub repository to Netlify
2. Set the environment variable `TOGETHER_API_KEY` with your Together API key
3. Deploy! The serverless function will handle the API calls securely

### Vercel

1. Connect your GitHub repository to Vercel
2. Set the environment variable `TOGETHER_API_KEY` with your Together API key
3. The API route will handle the API calls securely

## Customization

### Adding New Excuse Categories

To add new excuse categories, edit the `excuseCategories` object in `script.js`:

```javascript
const excuseCategories = {
  newCategory: [
    "Excuse 1",
    "Excuse 2",
    // Add more excuses
  ],
  // Existing categories
};
```

Also update the `categoryKeywords` object to associate keywords with the new category:

```javascript
const categoryKeywords = {
  newCategory: ['keyword1', 'keyword2', 'keyword3'],
  // Existing categories
};
```

## Advanced Features

### Caching System

The application includes a client-side caching system to improve performance and reduce API calls:

- Successful excuse generations are cached in memory and localStorage
- Cached excuses are retrieved for repeat queries to save API calls
- The cache uses a Least Recently Used (LRU) eviction policy
- Cache has a configurable maximum size (default: 50 items)

#### Cache Management

Users can clear the cache using the settings menu in the top left corner. Developers can programmatically manage the cache using:

```javascript
// Clear the cache
clearExcuseCache();

// Add to cache
addToExcuseCache(situation, excuse);

// Retrieve from cache
const excuse = getFromExcuseCache(situation);
```

### GitHub Pages Fallback Mechanism

When deployed on GitHub Pages, the application cannot make direct API calls due to CORS restrictions. Therefore, it implements a robust fallback mechanism:

1. Automatically detects GitHub Pages environment
2. Shows appropriate warning notifications to users
3. Uses a local database of pre-written excuses categorized by situation type
4. Implements deterministic excuse selection so the same situation tends to get the same excuse

#### Environment Detection

The application uses multiple methods to detect restricted environments:

```javascript
// Check for GitHub Pages and other restricted environments
function isRestrictedEnvironment() {
    const isGitHubPages = window.location.hostname.includes('github.io');
    const isRestrictedDomain = 
        window.location.hostname.includes('.github.') || 
        window.location.hostname.includes('.gitlab.') ||
        window.location.hostname.endsWith('.pages.dev') || 
        window.location.protocol === 'file:';
        
    return isGitHubPages || isRestrictedDomain;
}
```

### Error Handling

Enhanced error handling provides specific messages based on error type:

- Network errors
- CORS errors
- API authentication errors
- Restricted environment errors

All errors gracefully fall back to using the local excuse database.

## Settings Menu

The application includes a user-friendly settings menu accessible from the main interface:

### Features

- **Cache Management**: Users can clear the excuse cache directly from the settings menu
- **Animation Toggle**: Provides an option to disable animations for users who prefer a simpler interface
- **Quick Access**: Direct links to API Configuration and Deployment Guide

### Implementation

The settings menu is implemented using vanilla JavaScript with responsive CSS:

```javascript
function initSettingsMenu() {
    // Toggle settings dropdown
    settingsToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        settingsDropdown.classList.toggle('show');
    });
    
    // Close settings dropdown when clicking outside
    document.addEventListener('click', function() {
        if (settingsDropdown.classList.contains('show')) {
            settingsDropdown.classList.remove('show');
        }
    });
}
```

User preferences like animation settings are stored in localStorage for persistence across sessions.

## Animations

The application includes subtle animations to enhance the user experience:

- Excuse card highlight animation when new excuses are generated
- Cache indicator animation for visual feedback
- Menu transitions and hover effects

All animations can be disabled by the user via the settings menu, which sets the `animations_disabled` flag in localStorage and adds the `no-animations` class to the document body.

## Troubleshooting

### API Not Working on GitHub Pages

This is expected behavior. GitHub Pages doesn't support server-side code or CORS for external API calls. Use a different hosting solution for full functionality.

### API Errors

If you encounter API errors:

1. Check that your API key is valid
2. Verify the API endpoint is correct
3. Check for CORS issues in the browser console
4. Verify that the environment variables are set correctly on your hosting platform

## Credits

- Together API: [https://www.together.ai/](https://www.together.ai/)
- Meta-Llama/Llama-3.3-70B-Instruct-Turbo-Free model
