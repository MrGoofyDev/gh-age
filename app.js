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
    const initialRaw = urlParams.get('username');
    if (initialRaw && input) {
        const username = normalizeUsername(initialRaw);
        if (username) {
            input.value = username;
            fetchGitHubData(username, true);
        } else {
            input.value = initialRaw;
            showError("Invalid username or URL format.");
        }
    }

    // Handle browser back/forward buttons
    window.addEventListener('popstate', (e) => {
        const stateUser = e.state?.username || new URLSearchParams(window.location.search).get('username');
        if (stateUser) {
            const username = normalizeUsername(stateUser);
            if (username) {
                if (input) input.value = username;
                fetchGitHubData(username, false);
            }
        } else {
            resetUI();
            if (input) input.value = '';
        }
    });

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const rawInput = input.value.trim();
            if (!rawInput) return;

            const username = normalizeUsername(rawInput);
            if (username) {
                updateURL(username);
                fetchGitHubData(username, true); 
            } else {
                showError("Invalid username or URL format.");
            }
        });
    }

    if (shareBtn) {
        let copyTimeout = null;
        const defaultShareHTML = shareBtn.innerHTML;

        shareBtn.addEventListener('click', () => {
            const userLoginElem = document.getElementById('user-login');
            if (!userLoginElem) return;
            const username = userLoginElem.textContent.replace('@', '').trim();
            if (!username) return;

            const shareUrl = `${window.location.origin}${window.location.pathname}?username=${encodeURIComponent(username)}`;
            
            if (navigator.share) {
                navigator.share({
                    title: `GitHub Account Age - ${username}`,
                    text: `Check out how old @${username}'s GitHub account is!`,
                    url: shareUrl
                }).catch((err) => {
                    if (err.name !== 'AbortError') {
                        console.error('Share failed:', err);
                    }
                });
            } else if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(shareUrl).then(() => {
                    if (copyTimeout) clearTimeout(copyTimeout);
                    shareBtn.innerHTML = `<span class="text-green-700 font-bold">Copied!</span>`;
                    copyTimeout = setTimeout(() => {
                        shareBtn.innerHTML = defaultShareHTML;
                        copyTimeout = null;
                    }, 2000);
                }).catch((err) => {
                    console.error('Clipboard copy failed:', err);
                });
            } else {
                // Fallback for environments without Clipboard API
                const tempInput = document.createElement('input');
                tempInput.value = shareUrl;
                document.body.appendChild(tempInput);
                tempInput.select();
                try {
                    document.execCommand('copy');
                    if (copyTimeout) clearTimeout(copyTimeout);
                    shareBtn.innerHTML = `<span class="text-green-700 font-bold">Copied!</span>`;
                    copyTimeout = setTimeout(() => {
                        shareBtn.innerHTML = defaultShareHTML;
                        copyTimeout = null;
                    }, 2000);
                } catch (e) {
                    console.error('Copy fallback failed:', e);
                }
                document.body.removeChild(tempInput);
            }
        });
    }

    /**
     * Normalizes input to extract username from URL or @handle and validates GitHub username format
     */
    function normalizeUsername(raw) {
        if (!raw || typeof raw !== 'string') return null;
        let val = raw.trim();

        // Handle full URLs (e.g., https://github.com/username, github.com/username/repo)
        const urlMatch = val.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#]+)/i);
        if (urlMatch) {
            val = urlMatch[1];
        }

        // Handle @username
        if (val.startsWith('@')) {
            val = val.slice(1);
        }

        // Strip query params and hashes if any residual
        val = val.split(/[?#]/)[0].trim();

        // Regular username (alphanumeric and single hyphens only, no start/end hyphens, max 39 chars)
        if (/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(val)) {
            return val;
        }

        return null;
    }

    /**
     * Updates the browser URL without reloading
     */
    function updateURL(username) {
        const newUrl = `${window.location.pathname}?username=${encodeURIComponent(username)}`;
        window.history.pushState({ username }, '', newUrl);
    }

    /**
     * Fetches data from GitHub API
     */
    async function fetchGitHubData(username, shouldScroll = true) {
        resetUI();
        loading.classList.remove('hidden');

        try {
            const response = await fetch(`https://gh-age.mrgoofy7.workers.dev?username=${encodeURIComponent(username)}`);
            
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
            if (data.error) {
                showError(data.error);
                return;
            }
            if (!data.created_at) {
                showError("Could not retrieve account creation date.");
                return;
            }

            loading.classList.add('hidden'); // Hide loading before displaying to ensure correct scroll measurement
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
        if (isNaN(creationDate.getTime())) {
            showError("Invalid creation date received from API.");
            return;
        }
        
        // Basic Info
        const avatar = document.getElementById('user-avatar');
        if (avatar) {
            avatar.src = user.avatar_url;
            avatar.alt = `${user.login}'s avatar`;
        }

        const nameElem = document.getElementById('user-name');
        if (nameElem) nameElem.textContent = user.name || user.login;

        const loginElem = document.getElementById('user-login');
        if (loginElem) loginElem.textContent = `@${user.login}`;

        const reposElem = document.getElementById('user-repos');
        if (reposElem) reposElem.textContent = user.public_repos ?? 0;

        const followersElem = document.getElementById('user-followers');
        if (followersElem) followersElem.textContent = user.followers ?? 0;

        const bioElem = document.getElementById('user-bio');
        if (bioElem) bioElem.textContent = user.bio || "No bio available.";

        const ghLink = document.getElementById('view-on-github');
        if (ghLink) ghLink.href = user.html_url || `https://github.com/${user.login}`;

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
        let tzName = "";
        try {
            tzName = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' })
                .formatToParts(creationDate)
                .find(part => part.type === 'timeZoneName')?.value || "";
        } catch (e) {
            // ignore
        }

        const formattedDate = creationDate.toLocaleString(undefined, timeOptions);
        const creationLocal = document.getElementById('creation-local');
        if (creationLocal) {
            creationLocal.textContent = tzName ? `${formattedDate} (${tzName})` : formattedDate;
        }

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
            // Use setTimeout to ensure the DOM has updated and layout is stable before scrolling
            setTimeout(() => {
                results.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
        
        startAgeTicker();
    }

    /**
     * Safely adds calendar months to a date, clamping day to end of month if needed
     */
    function addMonthsClamped(baseDate, monthsToAdd) {
        const d = new Date(baseDate);
        const targetMonth = d.getMonth() + monthsToAdd;
        const year = d.getFullYear() + Math.floor(targetMonth / 12);
        const month = ((targetMonth % 12) + 12) % 12;
        const day = d.getDate();

        const daysInTargetMonth = new Date(year, month + 1, 0).getDate();
        const clampedDay = Math.min(day, daysInTargetMonth);

        const result = new Date(baseDate);
        result.setFullYear(year, month, clampedDay);
        return result;
    }

    /**
     * Calculates exact calendar years, months, days, hours, minutes, seconds
     */
    function calculateExactAge(from, to) {
        if (!from || isNaN(from.getTime()) || to < from) {
            return { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
        }

        let years = to.getFullYear() - from.getFullYear();
        let temp = addMonthsClamped(from, years * 12);
        if (temp > to) {
            years--;
            temp = addMonthsClamped(from, years * 12);
        }

        let months = 0;
        while (true) {
            let nextTemp = addMonthsClamped(from, years * 12 + months + 1);
            if (nextTemp <= to) {
                months++;
                temp = nextTemp;
            } else {
                break;
            }
        }

        let days = 0;
        let dayTemp = new Date(temp);
        while (true) {
            let nextDay = new Date(dayTemp);
            nextDay.setDate(nextDay.getDate() + 1);
            if (nextDay <= to) {
                days++;
                dayTemp = nextDay;
            } else {
                break;
            }
        }

        const diffMs = to - dayTemp;
        const totalSec = Math.floor(diffMs / 1000);
        const seconds = totalSec % 60;
        const minutes = Math.floor(totalSec / 60) % 60;
        const hours = Math.floor(totalSec / 3600);

        return { years, months, days, hours, minutes, seconds };
    }

    /**
     * Calculates age and updates the counter every second
     */
    function startAgeTicker() {
        if (ageInterval) clearInterval(ageInterval);

        const updateTicker = () => {
            if (!creationDate || isNaN(creationDate.getTime())) return;
            const now = new Date();
            const age = calculateExactAge(creationDate, now);

            const yearsEl = document.getElementById('age-years');
            const monthsEl = document.getElementById('age-months');
            const daysEl = document.getElementById('age-days');
            const hoursEl = document.getElementById('age-hours');
            const minutesEl = document.getElementById('age-minutes');
            const secondsEl = document.getElementById('age-seconds');

            if (yearsEl) yearsEl.textContent = String(age.years).padStart(2, '0');
            if (monthsEl) monthsEl.textContent = String(age.months).padStart(2, '0');
            if (daysEl) daysEl.textContent = String(age.days).padStart(2, '0');
            if (hoursEl) hoursEl.textContent = String(age.hours).padStart(2, '0');
            if (minutesEl) minutesEl.textContent = String(age.minutes).padStart(2, '0');
            if (secondsEl) secondsEl.textContent = String(age.seconds).padStart(2, '0');
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
