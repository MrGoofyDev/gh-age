/**
 * GitHub Account Age Checker
 * Pure Vanilla JavaScript logic for API integration, age calculation, and UI management.
 */

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('checker-form');
    const input = document.getElementById('username-input');
    const errorMessage = document.getElementById('error-message');
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    const shareBtn = document.getElementById('share-btn');

    // Update copyright year
    const yearSpan = document.getElementById('copyright-year');
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();

    let ageInterval = null;
    let creationDate = null;

    // Initialize from URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const initialUsername = urlParams.get('username');
    if (initialUsername && input) {
        input.value = initialUsername;
        fetchGitHubData(initialUsername, false); // Don't scroll on initial load
    }

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const rawInput = input.value.trim();
            if (!rawInput) return;

            const username = normalizeUsername(rawInput);
            if (username) {
                updateURL(username);
                fetchGitHubData(username, true); // Scroll for manual checks
            } else {
                showError("Invalid username or URL format.");
            }
        });
    }

    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            const userLoginElem = document.getElementById('user-login');
            if (!userLoginElem) return;
            const username = userLoginElem.textContent.replace('@', '');
            const shareUrl = `${window.location.origin}${window.location.pathname}?username=${username}`;
            
            if (navigator.share) {
                navigator.share({
                    title: `My GitHub Account Age`,
                    text: `Check out how old my GitHub account is!`,
                    url: shareUrl
                }).catch(console.error);
            } else {
                // Fallback: Copy to clipboard
                navigator.clipboard.writeText(shareUrl).then(() => {
                    const originalText = shareBtn.innerHTML;
                    shareBtn.innerHTML = `<span class="text-green-600 font-bold">Copied!</span>`;
                    setTimeout(() => { shareBtn.innerHTML = originalText; }, 2000);
                });
            }
        });
    }

    /**
     * Normalizes input to extract username from URL or @handle
     */
    function normalizeUsername(input) {
        // Handle full URLs (https://github.com/username)
        const urlMatch = input.match(/github\.com\/([^/]+)/);
        if (urlMatch) return urlMatch[1].split('?')[0];

        // Handle @username
        if (input.startsWith('@')) return input.slice(1);

        // Regular username (alphanumeric and hyphens only, no start/end hyphens)
        if (/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(input)) return input;

        return null;
    }

    /**
     * Updates the browser URL without reloading
     */
    function updateURL(username) {
        const newUrl = `${window.location.pathname}?username=${username}`;
        window.history.pushState({ username }, '', newUrl);
    }

    /**
     * Fetches data from GitHub API
     */
    async function fetchGitHubData(username, shouldScroll = true) {
        resetUI();
        loading.classList.remove('hidden');

        try {
            const response = await fetch(`https://gh-age.mrgoofy7.workers.dev?username=${username}`);
            
            if (response.status === 404) {
                showError("User not found. Please check the username.");
                return;
            }

            if (response.status === 403) {
                showError("API rate limit exceeded. Please try again later.");
                return;
            }

            if (!response.ok) {
                throw new Error("Failed to fetch data.");
            }

            const data = await response.json();
            displayResults(data, shouldScroll);
        } catch (err) {
            showError("An unexpected error occurred. Please check your connection.");
            console.error(err);
        } finally {
            loading.classList.add('hidden');
        }
    }

    /**
     * Displays results in the UI
     */
    function displayResults(user, shouldScroll = true) {
        creationDate = new Date(user.created_at);
        
        // Basic Info
        document.getElementById('user-avatar').src = user.avatar_url;
        document.getElementById('user-name').textContent = user.name || user.login;
        document.getElementById('user-login').textContent = `@${user.login}`;
        document.getElementById('user-repos').textContent = user.public_repos;
        document.getElementById('user-followers').textContent = user.followers;
        document.getElementById('user-bio').textContent = user.bio || "No bio available.";
        document.getElementById('view-on-github').href = user.html_url;

        // Date Formatting
        const timeOptions = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true
        };
        
        // Detect short timezone name (e.g., "EDT", "GMT+6", or localized name)
        const tzName = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' })
            .formatToParts(creationDate)
            .find(part => part.type === 'timeZoneName')?.value || "";

        const formattedDate = creationDate.toLocaleString(undefined, timeOptions);
        document.getElementById('creation-local').textContent = tzName ? `${formattedDate} (${tzName})` : formattedDate;

        // Set local generation timestamp
        const checkTimestamp = document.getElementById('check-timestamp');
        if (checkTimestamp) {
            checkTimestamp.textContent = new Date().toLocaleString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                timeZoneName: 'short'
            });
        }

        // Show Results
        results.classList.remove('hidden');
        
        if (shouldScroll) {
            results.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        
        startAgeTicker();
    }

    /**
     * Calculates age and updates the counter every second
     */
    function startAgeTicker() {
        if (ageInterval) clearInterval(ageInterval);

        const updateTicker = () => {
            const now = new Date();
            const diff = now - creationDate;

            // Simple calculation logic (approximation for years/months for display)
            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            // More precise Years/Months calculation
            let years = now.getFullYear() - creationDate.getFullYear();
            let months = now.getMonth() - creationDate.getMonth();
            let d = now.getDate() - creationDate.getDate();

            if (d < 0) {
                months--;
                // Adjust for days in previous month
                const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
                d += lastMonth.getDate();
            }
            if (months < 0) {
                years--;
                months += 12;
            }

            document.getElementById('age-years').textContent = String(years).padStart(2, '0');
            document.getElementById('age-months').textContent = String(months).padStart(2, '0');
            document.getElementById('age-days').textContent = String(d).padStart(2, '0');
            document.getElementById('age-hours').textContent = String(hours % 24).padStart(2, '0');
            document.getElementById('age-minutes').textContent = String(minutes % 60).padStart(2, '0');
            document.getElementById('age-seconds').textContent = String(seconds % 60).padStart(2, '0');
        };

        updateTicker();
        ageInterval = setInterval(updateTicker, 1000);
    }

    function resetUI() {
        if (ageInterval) clearInterval(ageInterval);
        results.classList.add('hidden');
        errorMessage.textContent = "";
    }

    function showError(msg) {
        errorMessage.textContent = msg;
        loading.classList.add('hidden');
        results.classList.add('hidden');
    }
});
