// Excuses.com - Main Script
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const situationInput = document.getElementById('situation');
    const generateBtn = document.getElementById('generate-btn');
    const excuseResult = document.getElementById('excuse-result');
    const excuseText = document.getElementById('excuse-text');
    const copyBtn = document.getElementById('copy-btn');
    const newExcuseBtn = document.getElementById('new-excuse-btn');
    const chipButtons = document.querySelectorAll('.chip');
    const settingsToggle = document.querySelector('.settings-toggle');
    const settingsDropdown = document.getElementById('settings-dropdown');
    const clearCacheBtn = document.getElementById('clear-cache-btn');
    const toggleAnimationsBtn = document.getElementById('toggle-animations-btn');
    
    // Initialize UI configuration
    initApiConfig();
    initSettingsMenu();
    
    // Current situation being processed
    let currentSituation = '';
    
    // Event Listeners
    generateBtn.addEventListener('click', generateExcuse);
    copyBtn.addEventListener('click', copyToClipboard);
    newExcuseBtn.addEventListener('click', generateNewExcuse);    
    
    /**
     * Initialize settings menu functionality
     */
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
        
        // Prevent clicks inside dropdown from closing it
        settingsDropdown.addEventListener('click', function(e) {
            e.stopPropagation();
        });
        
        // Clear cache button functionality
        clearCacheBtn.addEventListener('click', function() {
            if (typeof clearExcuseCache === 'function') {
                clearExcuseCache();
                showNotification('Excuse cache cleared!', 'success');
            } else {
                // Fallback if clearExcuseCache isn't available
                try {
                    localStorage.removeItem('excuse_cache');
                    showNotification('Cache cleared successfully!', 'success');
                } catch (e) {
                    showNotification('Error clearing cache: ' + e.message, 'error');
                }
            }
            
            // Hide the dropdown
            settingsDropdown.classList.remove('show');
        });
        
        // Toggle animations button functionality
        toggleAnimationsBtn.addEventListener('click', function() {
            const animationsEnabled = localStorage.getItem('animations_disabled') !== 'true';
            
            if (animationsEnabled) {
                // Disable animations
                document.body.classList.add('no-animations');
                localStorage.setItem('animations_disabled', 'true');
                showNotification('Animations disabled', 'success');
            } else {
                // Enable animations
                document.body.classList.remove('no-animations');
                localStorage.setItem('animations_disabled', 'false');
                showNotification('Animations enabled', 'success');
            }
            
            // Update button text
            toggleAnimationsBtn.textContent = animationsEnabled ? 'Enable Animations' : 'Disable Animations';
            
            // Hide the dropdown
            settingsDropdown.classList.remove('show');
        });
        
        // Set initial animations state
        if (localStorage.getItem('animations_disabled') === 'true') {
            document.body.classList.add('no-animations');
            toggleAnimationsBtn.textContent = 'Enable Animations';
        }
    }
    
    /**
     * Initialize API configuration - sets up UI elements
     */
    function initApiConfig() {
        // Check if running on GitHub Pages
        const isGitHubPages = window.location.hostname.includes('github.io');
        
        // Add API model indicator with appropriate label
        const apiInfoDiv = document.createElement('div');
        apiInfoDiv.className = 'api-info';
        
        if (isGitHubPages) {
            apiInfoDiv.innerHTML = '⚠️ Local Mode (GitHub Pages)';
            apiInfoDiv.title = 'API access is limited on GitHub Pages. Using local excuse database.';
            apiInfoDiv.classList.add('warning');
        } else {
            apiInfoDiv.innerHTML = '🧠 AI: Meta-Llama-3.3-70B';
            apiInfoDiv.title = 'Using Together API with Meta-Llama/Llama-3.3-70B-Instruct-Turbo-Free model';
        }
        
        document.querySelector('.container').appendChild(apiInfoDiv);
        
        // Show appropriate notification based on hosting environment
        setTimeout(() => {
            const notification = document.createElement('div');
            notification.className = 'notification';
            
            if (isGitHubPages) {
                notification.textContent = 'GitHub Pages detected: Using local excuse database. API functionality is limited.';
                notification.classList.add('warning');
            } else {
                notification.textContent = 'AI-powered excuses enabled!';
            }
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.classList.add('show');
                
                setTimeout(() => {
                    notification.classList.remove('show');
                    setTimeout(() => {
                        document.body.removeChild(notification);
                    }, 500);
                }, isGitHubPages ? 6000 : 3000); // Show warning longer
            }, 100);
        }, 1000);
        
        // Add GitHub Pages info banner if needed
        if (isGitHubPages) {
            addGitHubPagesInfoBanner();
        }
    }
    
    /**
     * Add an information banner for GitHub Pages users
     */    function addGitHubPagesInfoBanner() {
        const banner = document.createElement('div');
        banner.className = 'github-pages-banner';
        banner.innerHTML = `
            <p><strong>⚠️ Limited Functionality:</strong> You're viewing this app on GitHub Pages, which doesn't support direct API calls due to security restrictions.</p>
            <p>The app is using a <strong>local database</strong> instead of the Meta-Llama 3.3 AI model. Excuses are still high-quality but aren't uniquely generated.</p>
            <p>Your requests are cached locally for better performance. You can clear the cache in the <a href="config.html" style="color: white; text-decoration: underline;">settings page</a>.</p>
            <p>For full AI functionality with Meta-Llama 3.3, deploy to <a href="deploy.html" style="color: white; text-decoration: underline;">Netlify or Vercel</a>.</p>
            <button class="close-banner">✕</button>
        `;
        document.body.appendChild(banner);
        
        // Add close button functionality
        banner.querySelector('.close-banner').addEventListener('click', () => {
            banner.style.display = 'none';
            localStorage.setItem('github-pages-banner-closed', 'true');
        });
        
        // Only show if not previously closed
        if (localStorage.getItem('github-pages-banner-closed') === 'true') {
            banner.style.display = 'none';
        }
    }
    
    // Set up suggestion chips
    chipButtons.forEach(chip => {
        chip.addEventListener('click', function() {
            situationInput.value = this.textContent;
            situationInput.focus();
        });
    });    // Main function to generate an excuse
    async function generateExcuse() {
        const situation = situationInput.value.trim();
        
        if (!situation) {
            showNotification('Please describe your situation first!', 'warning');
            situationInput.focus();
            return;
        }
        
        // Store current situation
        currentSituation = situation;
          
        // Show loading state
        generateBtn.disabled = true;
        generateBtn.textContent = 'Generating...';
        const loadingSpinner = document.getElementById('loading-spinner');
        loadingSpinner.classList.remove('hidden');
        
        // Check cache first - we do this manually to control the UI
        let fromCache = false;
        let excuse;
        
        try {
            // Check if the excuse is in cache
            if (typeof getFromExcuseCache === 'function') {
                excuse = getFromExcuseCache(situation);
                if (excuse) {
                    fromCache = true;
                    console.log('Using cached excuse for:', situation);
                }
            }
            
            // If not in cache, or cache function not available, generate a new excuse
            if (!excuse) {
                // Check if we're on GitHub Pages to add a slight artificial delay
                // This makes the fallback feel more natural and similar to API response
                const isGitHubPages = window.location.hostname.includes('github.io');
                if (isGitHubPages) {
                    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200)); // 0.8-2s delay
                }
                
                // Generate excuse using Together API (or fallback)
                excuse = await generateExcuseWithLlamaModel(situation);
            }
              // Display the excuse
            excuseText.textContent = excuse;
            
            // Show the excuse card if hidden
            if (excuseResult.classList.contains('hidden')) {
                excuseResult.classList.remove('hidden');
            } else if (localStorage.getItem('animations_disabled') !== 'true') {
                // Apply highlight animation when generating a new excuse for an already visible card
                excuseResult.classList.remove('excuse-highlight');
                void excuseResult.offsetWidth; // Force layout recalculation
                excuseResult.classList.add('excuse-highlight');
            }
            
            // Update source badge
            const excuseSource = document.getElementById('excuse-source');
            if (excuseSource) {
                // Get environment information
                const isRestrictedEnv = typeof isRestrictedEnvironment === 'function' 
                    ? isRestrictedEnvironment() 
                    : window.location.hostname.includes('github.io');
                
                // Change the badge text based on source
                if (isRestrictedEnv) {
                    excuseSource.textContent = 'Local Database';
                    excuseSource.classList.add('local-mode');
                } else {
                    excuseSource.textContent = 'Meta-Llama 3.3';
                    excuseSource.classList.remove('local-mode');
                }
            }
              // Update cache indicator
            const cacheIndicator = document.getElementById('cache-indicator');
            if (cacheIndicator) {
                // First remove any existing animations/classes
                cacheIndicator.classList.remove('active', 'animated');
                
                // Force layout recalculation to ensure animation restarts
                void cacheIndicator.offsetWidth;
                
                if (fromCache) {
                    // Show cache indicator with animation if animations are enabled
                    if (localStorage.getItem('animations_disabled') !== 'true') {
                        cacheIndicator.classList.add('animated');
                    } else {
                        cacheIndicator.classList.add('active');
                        // Hide the indicator after 3 seconds if not using animation
                        setTimeout(() => {
                            cacheIndicator.classList.remove('active');
                        }, 3000);
                    }
                } else {
                    cacheIndicator.classList.remove('active', 'animated');
                }
            }
            
            // Smooth scroll to result
            excuseResult.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error('Error generating excuse:', error);
            showNotification('Something went wrong generating your excuse. Please try again.', 'error');
        } finally {
            // Reset button state
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generate Excuse';
            document.getElementById('loading-spinner').classList.add('hidden');
        }
    }    // Generate a new excuse for the same situation
    async function generateNewExcuse() {
        try {
            // Update button state
            newExcuseBtn.disabled = true;
            newExcuseBtn.textContent = 'Generating...';
            document.getElementById('loading-spinner').classList.remove('hidden');
            
            // Check if we're on GitHub Pages to add a slight artificial delay
            const isGitHubPages = window.location.hostname.includes('github.io');
            if (isGitHubPages) {
                await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200)); // 0.8-2s delay
            }            // For "Generate Another" we always want a fresh excuse, so bypass the cache
            const excuse = await generateExcuseWithLlamaModel(currentSituation, { bypassCache: true });
            excuseText.textContent = excuse;
            
            // Apply highlight animation if animations are enabled
            if (localStorage.getItem('animations_disabled') !== 'true') {
                excuseResult.classList.remove('excuse-highlight');
                void excuseResult.offsetWidth; // Force layout recalculation
                excuseResult.classList.add('excuse-highlight');
            }
            
            // Make sure the cache indicator is hidden since this is a fresh generate
            const cacheIndicator = document.getElementById('cache-indicator');
            if (cacheIndicator) {
                cacheIndicator.classList.remove('active', 'animated');
            }
            
            // Update source badge
            const excuseSource = document.getElementById('excuse-source');
            if (excuseSource) {
                const isRestrictedEnv = typeof isRestrictedEnvironment === 'function' 
                    ? isRestrictedEnvironment() 
                    : window.location.hostname.includes('github.io');
                
                // Change the badge text based on source
                if (isRestrictedEnv) {
                    excuseSource.textContent = 'Local Database';
                    excuseSource.classList.add('local-mode');
                } else {
                    excuseSource.textContent = 'Meta-Llama 3.3';
                    excuseSource.classList.remove('local-mode');
                }
            }
        } catch (error) {
            console.error('Error generating new excuse:', error);
            showNotification('Failed to generate a new excuse. Please try again.', 'error');
        } finally {
            newExcuseBtn.disabled = false;
            newExcuseBtn.textContent = 'Generate Another';
            document.getElementById('loading-spinner').classList.add('hidden');
        }
    }
    
    // Copy excuse to clipboard
    function copyToClipboard() {
        navigator.clipboard.writeText(excuseText.textContent)
            .then(() => {
                // Change button text temporarily
                const originalText = copyBtn.textContent;
                copyBtn.textContent = 'Copied!';
                
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                }, 2000);
            })
            .catch(err => {
                console.error('Failed to copy: ', err);
                alert('Failed to copy to clipboard. Please try again.');
            });
    }
    
    /**
     * Generate an excuse using Together API's Meta-Llama/Llama-3.3-70B-Instruct-Turbo-Free model
     * @param {string} situation - The situation to generate an excuse for
     * @returns {Promise<string>} - The generated excuse
     */    // generateExcuseWithLlamaModel is now imported from api.js
    
    /**
     * Show a notification to the user
     * @param {string} message - The notification message
     * @param {string} type - The type of notification (success, error, etc.)
     */
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
            
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 500);
            }, 3000);
        }, 100);
    }
    
    // EXCUSE DATABASE
    // Categories of excuses
    const excuseCategories = {
        work: [
            "My computer crashed just as I was about to send it, and IT couldn't recover the files.",
            "I got stuck in an unexpected all-hands meeting that ran overtime.",
            "There was a security incident in the building, and we weren't allowed to access our workstations.",
            "I was helping another department with an urgent priority task that management assigned.",
            "My VPN connection kept dropping, and I couldn't access the company server.",
            "I had to deal with an emergency client issue that couldn't wait.",
            "The power went out in my neighborhood and my laptop battery died before I could finish.",
            "My internet provider had a major outage that affected our entire area.",
            "I was waiting for critical input from the team in the other time zone before I could proceed.",
            "My hard drive corrupted and I had to reinstall everything from backup.",
            "My project management software crashed and lost my latest updates.",
            "I accidentally worked on an outdated version of the document and had to reconcile the changes.",
            "I caught a mistake at the last minute that needed to be fixed before submission.",
            "Our cloud storage was having synchronization issues and my files weren't updating properly.",
            "I was pulled into an emergency client call that lasted longer than expected.",
            "There was a mix-up with task assignments in our management software.",
            "I was waiting for legal clearance before I could proceed with the submission.",
            "The requirements changed at the last minute and I had to make substantial adjustments.",
            "I was debugging a critical production issue that management prioritized.",
            "I've been tackling back-to-back meetings all day and couldn't get to it until now."
        ],
        
        personal: [
            "I had a family emergency that required my immediate attention.",
            "My car broke down on the way, and I had to wait for roadside assistance.",
            "I suddenly came down with a terrible migraine that made it impossible to focus.",
            "I had to take my pet to the emergency vet for an unexpected issue.",
            "My phone died, and I didn't realize what time it was.",
            "There was a water leak in my apartment that I had to deal with immediately.",
            "I got caught in a massive traffic jam due to an accident on the highway.",
            "I had an unexpected visitor from out of town who needed my help.",
            "I lost my house keys and was locked out until the locksmith could come.",
            "My alarm didn't go off because of a power outage during the night.",
            "I've been battling a terrible case of food poisoning since yesterday.",
            "I had to help an elderly neighbor with an emergency situation.",
            "My phone notifications weren't coming through due to a system update.",
            "I had an unexpected allergic reaction and had to take antihistamines that made me drowsy.",
            "I slipped on ice outside my building and had to sit down for a while.",
            "My building's elevator was out of service, and I live on a high floor.",
            "I got caught in a sudden downpour without an umbrella and was soaked.",
            "My wallet was stolen, and I had to deal with canceling cards and filing a police report.",
            "I had to pick up a sick relative from the hospital unexpectedly.",
            "I accidentally locked my keys and phone in my car and had to wait for help."
        ],
        
        school: [
            "My younger sibling accidentally deleted my assignment file while using my computer.",
            "I had multiple exams back-to-back and couldn't finish the work in time.",
            "The school portal was down when I tried to submit my assignment.",
            "My study group had conflicting information about the due date.",
            "I misunderstood the assignment requirements and had to restart.",
            "My printer ran out of ink right as I was printing my assignment.",
            "I lost my notes when my backpack was stolen at the library.",
            "The research database I needed was offline for maintenance.",
            "I couldn't access the required reading because the library had recalled the book.",
            "My USB drive corrupted, and I lost my saved work.",
            "I had to assist with a student council emergency that took precedence.",
            "The lab equipment I needed for my project was broken.",
            "I was involved in a school event that ran longer than scheduled.",
            "My tutor canceled our session where I was supposed to finalize my work.",
            "I was selected for a surprise school committee meeting that couldn't be rescheduled.",
            "The classroom building was temporarily closed due to a maintenance issue.",
            "I was helping a classmate understand the material and lost track of time.",
            "The assignment file was too large to upload through the school system.",
            "My group members didn't contribute their parts on time.",
            "I was participating in a mandatory school competition that conflicted with my study time."
        ],
        
        social: [
            "I double-booked myself without realizing and had a prior commitment.",
            "I fell asleep after a particularly exhausting day and missed your message.",
            "My phone was in airplane mode after a flight, and I forgot to turn it off.",
            "I got the dates mixed up and thought our plan was for a different day.",
            "I was in an area with no cell reception for most of the day.",
            "A close friend had an emotional crisis, and I was helping them through it.",
            "I had a last-minute family obligation that I couldn't get out of.",
            "I caught a sudden stomach bug and was too sick to message you.",
            "I thought you were going to confirm the details later, so I was waiting to hear back.",
            "My phone battery died early in the day, and I didn't have my charger.",
            "I had an unexpected visit from relatives who just showed up at my door.",
            "I got completely caught up in a work emergency and lost track of everything else.",
            "I was in the hospital getting tests done and didn't have access to my phone.",
            "I misplaced my phone and only just found it again.",
            "I mixed up the time zones since I'm traveling at the moment.",
            "My car wouldn't start, and I was stuck waiting for a tow truck.",
            "I was volunteering at an event that went overtime unexpectedly.",
            "I got stuck in a never-ending customer service call trying to resolve an urgent issue.",
            "I had a minor accident and was dealing with insurance and paperwork all day.",
            "My internet and cell service were both down due to construction in my area."
        ],
        
        digital: [
            "I sent the email, but it must have gone to your spam folder.",
            "My account got temporarily locked for security reasons, and I couldn't log in.",
            "The app kept crashing every time I tried to complete the action.",
            "I tried to respond, but my message showed as 'failed to send' and I didn't notice.",
            "The notification came through silently, so I didn't see it until now.",
            "My cloud storage failed to sync correctly, so the file didn't update.",
            "The website was experiencing technical issues every time I tried to access it.",
            "I scheduled the message to send later accidentally instead of sending it immediately.",
            "My smart device misinterpreted my voice command and did something else entirely.",
            "I was trying to use the new update, but it kept resetting to the old version.",
            "My browser history got cleared, and I lost the important link you sent.",
            "The authentication system kept rejecting my correct password for security reasons.",
            "The collaboration tool didn't notify me when you made changes to the document.",
            "I got logged out automatically and didn't realize I wasn't receiving messages.",
            "My antivirus quarantined the file thinking it was suspicious.",
            "The streaming quality was so poor I couldn't actually make out what was happening.",
            "My smart home system had a glitch and kept turning off my internet.",
            "I was in the middle of a system update that took hours longer than expected.",
            "The online payment system declined my card repeatedly despite having funds.",
            "My device automatically installed updates and restarted without warning."
        ],
        
        time: [
            "I completely lost track of time while deep in a work project.",
            "My watch battery died, and I didn't realize it was showing the wrong time.",
            "I was caught in the longest subway delay due to signal problems.",
            "There was a multi-car accident on the highway that turned a 20-minute drive into 2 hours.",
            "The last meeting ran way over time, and I couldn't step out.",
            "I was on an important call that I absolutely couldn't cut short.",
            "My Uber driver took a completely wrong route despite my directions.",
            "I had to make an emergency stop that I didn't anticipate.",
            "I miscalculated how long it would take to get here with the current weather conditions.",
            "I was waiting for a delivery that had a specific arrival window.",
            "My flight was delayed, and the airline kept changing the departure time.",
            "I got caught behind a very slow-moving truck on a no-passing road.",
            "I was trying to help an elderly person who was clearly lost.",
            "The bus simply didn't show up for its scheduled time.",
            "I got off at the wrong stop and had to backtrack.",
            "My bike got a flat tire halfway here, and I had to walk the rest of the way.",
            "Every traffic light seemed to turn red just as I approached it.",
            "I got stuck behind a marathon route and couldn't cross to the other side.",
            "My train was stopped due to a security inspection.",
            "I got caught in a sudden hailstorm and had to take shelter."
        ],
        
        tech: [
            "My device froze and required a complete system restore.",
            "I got caught in an unexpected software update loop.",
            "My hard drive started making strange noises and I had to back everything up immediately.",
            "My screen suddenly went black and wouldn't turn back on.",
            "I got hit with a ransomware attack and had to call IT emergency services.",
            "My keyboard stopped responding to certain key presses.",
            "My router died and I had to get a replacement.",
            "The software crashed and corrupted my save file.",
            "My laptop battery swelled up and I had to stop using it immediately.",
            "My screen cracked when something fell on it unexpectedly.",
            "I spilled water on my keyboard and had to dry it out.",
            "My computer blue-screened repeatedly every time I tried to use that program.",
            "My webcam and microphone stopped working right before the video call.",
            "The developer pushed a bad update that broke core functionality.",
            "My backup failed without notifying me, and I lost important files.",
            "My virus scanner quarantined essential system files by mistake.",
            "My graphics card started showing artifacts and failed during the process.",
            "I hit the wrong key combination and lost an hour's worth of unsaved work.",
            "My computer's cooling fan failed and it kept shutting down from overheating.",
            "My account got locked after too many failed password attempts."
        ]
    };
    
    // Generic excuses that can apply to most situations
    const genericExcuses = [
        "I came down with a severe case of food poisoning.",
        "My alarm didn't go off, and I completely overslept.",
        "There was a family emergency that required my immediate attention.",
        "I got caught in unexpected traffic due to an accident.",
        "My car wouldn't start this morning.",
        "I had a power outage at my home.",
        "My internet connection was down.",
        "I had to take my pet to the emergency vet.",
        "I suddenly got very sick and couldn't get out of bed.",
        "I had a last-minute doctor's appointment I couldn't reschedule.",
        "My phone died, and I didn't have my charger.",
        "There was a water leak in my apartment I had to deal with.",
        "I had to help a family member who was stranded.",
        "Public transport was severely delayed today.",
        "I got locked out of my house/apartment.",
        "My wallet/keys were stolen, and I had to deal with that.",
        "I had an unexpected visitor that I couldn't turn away.",
        "I had a migraine that completely incapacitated me.",
        "I was involved in a minor accident.",
        "I had to take a relative to the hospital unexpectedly."
    ];
    
    // Detailed excuses for specific situations
    const specificExcuses = {
        "late for work": [
            "My regular train was canceled, and the next one was delayed.",
            "My car was blocked in by an illegally parked vehicle, and I had to wait for a tow truck.",
            "There was a gas leak on my street, and residents weren't allowed to leave the area.",
            "My home printer jammed while printing an important document I needed to bring.",
            "My building's elevator got stuck between floors, and we had to wait for maintenance."
        ],
        
        "missed deadline": [
            "I was waiting on critical information from a colleague who is out sick.",
            "I discovered a major flaw that required reworking the entire project.",
            "The client changed requirements at the last minute.",
            "The software we're using had a major bug that corrupted my files.",
            "I was pulled off this project to handle an emergency with another client."
        ],
        
        "forgot birthday": [
            "I had actually planned a surprise for later this week.",
            "My calendar app glitched and didn't send me the reminder.",
            "I've been organizing something special but needed more time to finalize it.",
            "My reminder was set for the wrong date somehow.",
            "I was actually waiting because I ordered something special that hasn't arrived yet."
        ],
        
        "cancel plans": [
            "I've come down with something that might be contagious, and I don't want to risk spreading it.",
            "My babysitter canceled at the last minute, and I can't find a replacement.",
            "My boss just called with an urgent project that needs to be done by tomorrow.",
            "My car is making a strange noise, and the mechanic advised not to drive it until it's checked.",
            "A pipe burst in my apartment, and I'm waiting for emergency plumbing services."
        ],
        
        "didn't respond to text": [
            "My phone was on silent for a meeting, and I forgot to check it afterward.",
            "I started typing a response, got distracted, and thought I had sent it.",
            "I was in the middle of something and was planning to respond when I finished.",
            "I was driving and then completely forgot to reply when I arrived.",
            "I was in an area with terrible reception, and my messages weren't going through."
        ],
        
        "homework": [
            "My laptop crashed, and I lost all my work because it wasn't backed up yet.",
            "I misunderstood the assignment and was working on the wrong thing.",
            "I had a family emergency that took up all my evening.",
            "Our internet was out all night, so I couldn't access the online resources.",
            "I left my notebook in school with all my work in it."
        ],
        
        "meeting": [
            "The previous meeting ran over time, and I couldn't leave without seeming rude.",
            "My calendar sent the reminder for the wrong time zone.",
            "I was stuck on a customer service call that I couldn't end.",
            "I was having technical difficulties joining the video conference.",
            "I was in another building for a meeting, and it took longer than expected to get back."
        ]
    };
    
    // Keywords to help categorize situations
    const categoryKeywords = {
        work: ['work', 'job', 'office', 'boss', 'colleague', 'project', 'client', 'email', 'meeting', 'deadline', 'report', 'presentation'],
        personal: ['sick', 'health', 'doctor', 'family', 'emergency', 'home', 'apartment', 'car', 'vehicle', 'accident', 'hospital'],
        school: ['homework', 'assignment', 'class', 'teacher', 'professor', 'course', 'exam', 'test', 'study', 'library', 'project', 'group project'],        social: ['friend', 'party', 'event', 'date', 'dinner', 'lunch', 'coffee', 'movie', 'concert', 'message', 'call', 'forgot to', "didn't respond"],
        digital: ['email', 'message', 'text', 'app', 'website', 'account', 'password', 'online', 'download', 'upload', 'file', 'document'],
        time: ['late', 'missed', 'forgot', 'overslept', 'delay', 'traffic', 'train', 'bus', 'commute', 'drive', 'appointment'],
        tech: ['computer', 'laptop', 'phone', 'device', 'software', 'hardware', 'internet', 'wifi', 'connection', 'system', 'crash', 'error']
    };
    
    // Function to determine the best category for a situation
    function determineCategory(situation) {
        // Convert to lowercase for comparison
        const lowercaseSituation = situation.toLowerCase();
        
        // Check for specific situations first
        for (const [specificSituation, excuses] of Object.entries(specificExcuses)) {
            if (lowercaseSituation.includes(specificSituation)) {
                return {
                    type: 'specific',
                    situation: specificSituation
                };
            }
        }
        
        // Count keyword matches for each category
        let bestCategory = 'generic';
        let highestMatches = 0;
        
        for (const [category, keywords] of Object.entries(categoryKeywords)) {
            let matches = 0;
            for (const keyword of keywords) {
                if (lowercaseSituation.includes(keyword)) {
                    matches++;
                }
            }
            
            if (matches > highestMatches) {
                highestMatches = matches;
                bestCategory = category;
            }
        }
        
        // If we have at least one match, return the category
        if (highestMatches > 0) {
            return {
                type: 'category',
                category: bestCategory
            };
        }
        
        // Default to generic
        return {
            type: 'generic'
        };
    }
      /**
     * Get a pseudo-random excuse from an array based on the situation
     * This creates some determinism so the same situation will tend to get
     * the same excuse, but still allows for variety
     * @param {Array} excuseArray - Array of excuses to choose from
     * @param {string} situation - The situation to use as a seed
     * @returns {string} - Selected excuse
     */
    function getExcuseFromArray(excuseArray, situation) {
        // Create a simple hash from the situation string for deterministic selection
        let hash = 0;
        for (let i = 0; i < situation.length; i++) {
            hash = ((hash << 5) - hash) + situation.charCodeAt(i);
            hash |= 0; // Convert to 32bit integer
        }
        
        // Use the hash to select an index, but add some randomness
        const baseIndex = Math.abs(hash) % excuseArray.length;
        
        // 70% of the time, use the deterministic excuse
        // 30% of the time, choose randomly for variety
        if (Math.random() < 0.7) {
            return excuseArray[baseIndex];
        } else {
            const randomIndex = Math.floor(Math.random() * excuseArray.length);
            return excuseArray[randomIndex];
        }
    }
      // Main function to get an excuse based on the situation
    function getExcuseForSituation(situation) {
        const categorization = determineCategory(situation);
        
        if (categorization.type === 'specific') {
            return getExcuseFromArray(specificExcuses[categorization.situation], situation);
        } else if (categorization.type === 'category') {
            return getExcuseFromArray(excuseCategories[categorization.category], situation);
        } else {
            return getExcuseFromArray(genericExcuses, situation);
        }
    }
    
    // Make the getExcuseForSituation function globally available
    // This ensures it can be accessed from api.js
    window.getExcuseForSituation = getExcuseForSituation;
    
    /**
     * Initialize cache management
     * This adds functionality to clear the excuse cache
     */
    function initCacheManagement() {
        // Add a small settings menu for cache management
        const container = document.querySelector('.container');
        const settingsMenu = document.createElement('div');
        settingsMenu.className = 'settings-menu';
        settingsMenu.innerHTML = `
            <button class="settings-toggle" title="Settings">⚙️</button>
            <div class="settings-dropdown">
                <div class="settings-option">
                    <button id="clear-cache" class="text-button">🧹 Clear Excuse Cache</button>
                </div>
            </div>
        `;
        container.appendChild(settingsMenu);
        
        // Add event listeners
        const settingsToggle = settingsMenu.querySelector('.settings-toggle');
        const settingsDropdown = settingsMenu.querySelector('.settings-dropdown');
        const clearCacheBtn = document.getElementById('clear-cache');
        
        // Show/hide settings dropdown
        settingsToggle.addEventListener('click', function() {
            settingsDropdown.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(event) {
            if (!settingsMenu.contains(event.target)) {
                settingsDropdown.classList.remove('show');
            }
        });
        
        // Clear cache button functionality
        clearCacheBtn.addEventListener('click', function() {
            if (typeof clearExcuseCache === 'function') {
                clearExcuseCache();
                showNotification('Excuse cache cleared successfully', 'success');
                settingsDropdown.classList.remove('show');
            } else {
                console.error('clearExcuseCache function not available');
                showNotification('Could not clear cache: function not available', 'error');
            }
        });
    }
    
    // Initialize cache management
    initCacheManagement();
});