/**
 * Portfolio Studio CMS & Admin Controller
 * Handles live editing, drag-and-drop reordering, image uploads,
 * local persistence, JSON import/export, and 1-click GitHub API synchronization.
 */

// Global State
let currentData = null;
let dragSrcEl = null;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    loadPortfolioData();
    initTabNavigation();
    initGlobalActionButtons();
});

// =============================================================================
// 1. Cryptographic Security & Authentication Engine
// =============================================================================
const AUTH_STORAGE_KEY = 'studio_admin_auth';
const LEGACY_STORAGE_KEY = 'studio_admin_pin';
const LOCKOUT_STORAGE_KEY = 'studio_admin_lockout';
const ATTEMPTS_STORAGE_KEY = 'studio_admin_failed_attempts';
const DEFAULT_PIN = '1234';
const PBKDF2_ITERATIONS = 100000;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 1000; // 30 seconds
let lockoutTimer = null;

/**
 * Generates a cryptographically random 16-byte salt (hex string)
 */
function generateSaltHex(length = 16) {
    const bytes = new Uint8Array(length);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Derives a PBKDF2-HMAC-SHA256 key hash from a plaintext PIN and salt
 */
async function hashPinWithSalt(pin, saltHex, iterations = PBKDF2_ITERATIONS) {
    const enc = new TextEncoder();
    const pinBuffer = enc.encode(pin);
    const saltMatches = saltHex.match(/.{1,2}/g) || [];
    const saltBuffer = new Uint8Array(saltMatches.map(byte => parseInt(byte, 16)));

    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        pinBuffer,
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
    );

    const derivedBits = await window.crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: saltBuffer,
            iterations: iterations,
            hash: 'SHA-256'
        },
        keyMaterial,
        256
    );

    const hashArray = Array.from(new Uint8Array(derivedBits));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Stores PIN in localStorage using salted PBKDF2 hash (cleans up legacy plaintext)
 */
async function storeSecurePin(pin) {
    const salt = generateSaltHex(16);
    const hash = await hashPinWithSalt(pin, salt, PBKDF2_ITERATIONS);
    const authData = {
        salt,
        hash,
        iterations: PBKDF2_ITERATIONS,
        updatedAt: new Date().toISOString()
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return authData;
}

/**
 * Retrieves the stored cryptographic auth record, auto-migrating legacy PIN if needed
 */
async function getStoredAuthData() {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.hash && parsed.salt) {
                return parsed;
            }
        } catch (e) {
            console.error('Error parsing secure auth data:', e);
        }
    }

    // Auto-migrate from legacy plaintext key or initialize default '1234'
    const legacyPin = localStorage.getItem(LEGACY_STORAGE_KEY) || DEFAULT_PIN;
    return await storeSecurePin(legacyPin);
}

/**
 * Verifies if entered PIN matches the stored salted PBKDF2 hash
 */
async function verifyPin(enteredPin) {
    const authData = await getStoredAuthData();
    if (!authData || !authData.hash || !authData.salt) return false;
    const computedHash = await hashPinWithSalt(enteredPin, authData.salt, authData.iterations || PBKDF2_ITERATIONS);
    return computedHash === authData.hash;
}

/**
 * Checks and updates brute-force lockout status in UI
 */
function checkLockoutStatus() {
    const lockoutUntil = parseInt(localStorage.getItem(LOCKOUT_STORAGE_KEY) || '0', 10);
    const now = Date.now();
    const noticeEl = document.getElementById('auth-lockout-notice');
    const msgEl = document.getElementById('auth-lockout-msg');
    const submitBtn = document.getElementById('auth-submit-btn');
    const pinInput = document.getElementById('admin-pin');

    if (lockoutUntil > now) {
        const remainingSec = Math.ceil((lockoutUntil - now) / 1000);
        if (noticeEl && msgEl) {
            noticeEl.style.display = 'flex';
            msgEl.textContent = `Too many failed attempts. Locked for ${remainingSec}s.`;
        }
        if (submitBtn) submitBtn.disabled = true;
        if (pinInput) pinInput.disabled = true;

        if (lockoutTimer) clearInterval(lockoutTimer);
        lockoutTimer = setInterval(() => {
            const currentNow = Date.now();
            const left = Math.ceil((lockoutUntil - currentNow) / 1000);
            if (left <= 0) {
                clearInterval(lockoutTimer);
                localStorage.removeItem(LOCKOUT_STORAGE_KEY);
                localStorage.removeItem(ATTEMPTS_STORAGE_KEY);
                if (noticeEl) noticeEl.style.display = 'none';
                if (submitBtn) submitBtn.disabled = false;
                if (pinInput) {
                    pinInput.disabled = false;
                    pinInput.focus();
                }
            } else {
                if (msgEl) msgEl.textContent = `Too many failed attempts. Locked for ${left}s.`;
            }
        }, 1000);
        return true;
    } else {
        if (noticeEl) noticeEl.style.display = 'none';
        if (submitBtn) submitBtn.disabled = false;
        if (pinInput) pinInput.disabled = false;
        return false;
    }
}

/**
 * Records an invalid PIN attempt and triggers lockout if threshold reached
 */
function recordFailedAttempt() {
    let attempts = parseInt(localStorage.getItem(ATTEMPTS_STORAGE_KEY) || '0', 10) + 1;
    localStorage.setItem(ATTEMPTS_STORAGE_KEY, attempts.toString());

    if (attempts >= MAX_FAILED_ATTEMPTS) {
        const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
        localStorage.setItem(LOCKOUT_STORAGE_KEY, lockoutUntil.toString());
        checkLockoutStatus();
        showToast(`Too many failed attempts. Locked for ${LOCKOUT_DURATION_MS / 1000}s`, 'error');
    } else {
        const remaining = MAX_FAILED_ATTEMPTS - attempts;
        showToast(`Incorrect PIN. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`, 'error');
    }
}

/**
 * Clears failed attempts counter upon successful authentication
 */
function clearFailedAttempts() {
    localStorage.removeItem(ATTEMPTS_STORAGE_KEY);
    localStorage.removeItem(LOCKOUT_STORAGE_KEY);
    if (lockoutTimer) clearInterval(lockoutTimer);
}

/**
 * Initializes show/hide password visibility toggles across forms
 */
function initPinVisibilityToggles() {
    document.querySelectorAll('.pin-toggle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = btn.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (!input) return;
            const icon = btn.querySelector('i');
            if (input.type === 'password') {
                input.type = 'text';
                if (icon) {
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                }
            } else {
                input.type = 'password';
                if (icon) {
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            }
        });
    });
}

function initAuth() {
    const authScreen = document.getElementById('auth-screen');
    const adminApp = document.getElementById('admin-app');
    const authForm = document.getElementById('auth-form');
    const pinInput = document.getElementById('admin-pin');
    const btnLock = document.getElementById('btn-lock');

    initPinVisibilityToggles();
    checkLockoutStatus();

    // Trigger proactive migration / initialization in background
    getStoredAuthData().catch(err => console.error('Auth initialization error:', err));

    const isAuthenticated = sessionStorage.getItem('studio_auth') === 'true';

    if (isAuthenticated) {
        authScreen.style.display = 'none';
        adminApp.style.display = 'flex';
    } else {
        authScreen.style.display = 'flex';
        adminApp.style.display = 'none';
    }

    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (checkLockoutStatus()) return;

            const enteredPin = pinInput.value.trim();
            if (!enteredPin) return;

            const isValid = await verifyPin(enteredPin);

            if (isValid) {
                clearFailedAttempts();
                sessionStorage.setItem('studio_auth', 'true');
                authScreen.style.display = 'none';
                adminApp.style.display = 'flex';
                pinInput.value = '';
                showToast('Welcome back, Lakshan! Studio unlocked.', 'success');
            } else {
                recordFailedAttempt();
                pinInput.value = '';
                pinInput.focus();
            }
        });
    }

    if (btnLock) {
        btnLock.addEventListener('click', () => {
            sessionStorage.removeItem('studio_auth');
            adminApp.style.display = 'none';
            authScreen.style.display = 'flex';
            if (pinInput) {
                pinInput.value = '';
                pinInput.type = 'password';
            }
            document.querySelectorAll('.pin-toggle-btn i').forEach(icon => {
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            });
            checkLockoutStatus();
            showToast('Session locked.', 'info');
        });
    }

    // Change PIN Form
    const changePinForm = document.getElementById('form-change-pin');
    if (changePinForm) {
        changePinForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currInput = document.getElementById('current-pin');
            const newPinInput = document.getElementById('new-pin');
            const confPinInput = document.getElementById('confirm-pin');

            const curr = currInput.value.trim();
            const newP = newPinInput.value.trim();
            const confP = confPinInput.value.trim();

            const isCurrentValid = await verifyPin(curr);
            if (!isCurrentValid) {
                showToast('Current PIN is incorrect', 'error');
                currInput.focus();
                return;
            }
            if (newP.length < 4 || newP.length > 12) {
                showToast('New PIN must be between 4 and 12 characters', 'error');
                newPinInput.focus();
                return;
            }
            if (newP !== confP) {
                showToast('New PIN and confirmation do not match', 'error');
                confPinInput.focus();
                return;
            }

            await storeSecurePin(newP);
            showToast('Admin security PIN updated & cryptographically secured!', 'success');
            changePinForm.reset();

            // Reset toggles back to password state
            document.querySelectorAll('#form-change-pin .pin-toggle-btn i').forEach(icon => {
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            });
            document.querySelectorAll('#form-change-pin input').forEach(input => {
                input.type = 'password';
            });
        });
    }
}

// =============================================================================
// 2. Data Loading and Population
// =============================================================================
function loadPortfolioData() {
    currentData = (typeof getPortfolioData === 'function')
        ? getPortfolioData()
        : JSON.parse(JSON.stringify(window.defaultPortfolioData || {}));

    populateAllSections();
    updateOverviewStats();
}

function populateAllSections() {
    if (!currentData) return;

    // 1. Hero
    if (currentData.hero) {
        const h = currentData.hero;
        setVal('hero-terminal', h.terminalTag || '');
        setVal('hero-name-input', h.name || '');
        setVal('hero-desc-input', h.description || '');
        setVal('hero-cv-url', h.cvUrl || '');
        setVal('hero-cv-name', h.cvFilename || '');

        renderTagsList('hero-roles-manager', 'hero-role-input', h.roles || [], (newRoles) => {
            currentData.hero.roles = newRoles;
        });
    }

    // 2. About & Education
    if (currentData.about) {
        const a = currentData.about;
        setVal('about-img-url', a.profileImage || '');
        updateImagePreview('about-img-preview', a.profileImage || 'assets/image.jpg');
        setVal('about-lead-input', a.leadParagraph || '');
        setVal('about-paragraphs-input', (a.paragraphs || []).join('\n\n'));

        renderAboutStatsEditor();
        renderEducationManager();

        renderTagsList('coursework-tags-manager', 'coursework-tag-input', a.coursework || [], (newCoursework) => {
            currentData.about.coursework = newCoursework;
        });
    }

    // 3. Work Experience
    renderExperienceManager();

    // 4. Skills
    renderSkillsManager();

    // 5. Projects Studio
    renderProjectsManager();

    // 6. Contact
    if (currentData.contact) {
        const c = currentData.contact;
        setVal('contact-subtitle-input', c.subtitle || '');
        setVal('contact-desc-input', c.description || '');
        setVal('contact-email-input', c.email || '');
        setVal('contact-phone-input', c.phone || '');
        setVal('contact-loc-input', c.location || '');

        if (c.socials) {
            setVal('contact-github-input', c.socials.github || '');
            setVal('contact-linkedin-input', c.socials.linkedin || '');
        }
    }

    // GitHub Settings
    const savedGh = JSON.parse(localStorage.getItem('studio_gh_config') || '{}');
    if (savedGh.token) setVal('gh-token', savedGh.token);
    if (savedGh.repo) setVal('gh-repo', savedGh.repo);
    if (savedGh.branch) setVal('gh-branch', savedGh.branch);
    if (savedGh.msg) setVal('gh-commit-msg', savedGh.msg);
}

function updateOverviewStats() {
    setText('count-projects', (currentData.projects || []).length);
    setText('count-experience', (currentData.experience || []).length);
    setText('count-skills', (currentData.skills || []).length);
}

// =============================================================================
// 3. Tab Navigation & Topbar Controller
// =============================================================================
function initTabNavigation() {
    const tabBtns = document.querySelectorAll('.nav-tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });
}

function switchTab(tabId) {
    const tabBtns = document.querySelectorAll('.nav-tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabBtns.forEach(b => b.classList.remove('active'));
    tabPanes.forEach(p => p.classList.remove('active'));

    const activeBtn = document.querySelector(`.nav-tab-btn[data-tab="${tabId}"]`);
    const activePane = document.getElementById(`tab-${tabId}`);

    if (activeBtn) activeBtn.classList.add('active');
    if (activePane) activePane.classList.add('active');

    // Update topbar titles
    const titles = {
        overview: { title: 'Studio Overview', subtitle: 'Manage and customize your portfolio data in real-time' },
        hero: { title: 'Hero Section', subtitle: 'Customize greetings, dynamic typing roles, and resume links' },
        about: { title: 'About & Education', subtitle: 'Update profile photo, biography, key statistics, and degrees' },
        experience: { title: 'Work Experience', subtitle: 'Manage career milestones, roles, and achievements' },
        skills: { title: 'Technical Stack', subtitle: 'Organize skills, tools, and technical proficiency badges' },
        projects: { title: 'Projects Studio', subtitle: 'Add, drop, and drag to reorder portfolio projects' },
        contact: { title: 'Contact & Socials', subtitle: 'Update email, phone, location, and social profiles' },
        sync: { title: 'GitHub Sync & Backup', subtitle: 'Deploy changes to GitHub Pages or download code files' },
        settings: { title: 'Security Settings', subtitle: 'Update your portfolio admin security PIN' }
    };

    if (titles[tabId]) {
        setText('topbar-title', titles[tabId].title);
        setText('topbar-subtitle', titles[tabId].subtitle);
    }
}

// =============================================================================
// 4. Section Renderers and Interactive Managers
// =============================================================================

// --- A. Tags Input Component ---
function renderTagsList(containerId, inputId, tagsArray, onChange) {
    const container = document.getElementById(containerId);
    const input = document.getElementById(inputId);
    if (!container || !input) return;

    // Clear existing badges
    container.querySelectorAll('.tag-badge').forEach(b => b.remove());

    tagsArray.forEach((tag, idx) => {
        const badge = document.createElement('span');
        badge.className = 'tag-badge';
        badge.innerHTML = `
            ${escapeHtml(tag)}
            <i class="fa-solid fa-xmark tag-remove" data-index="${idx}"></i>
        `;
        badge.querySelector('.tag-remove').addEventListener('click', (e) => {
            e.stopPropagation();
            tagsArray.splice(idx, 1);
            renderTagsList(containerId, inputId, tagsArray, onChange);
            if (onChange) onChange(tagsArray);
        });
        container.insertBefore(badge, input);
    });

    input.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const val = input.value.trim().replace(/^,|,$/g, '');
            if (val && !tagsArray.includes(val)) {
                tagsArray.push(val);
                input.value = '';
                renderTagsList(containerId, inputId, tagsArray, onChange);
                if (onChange) onChange(tagsArray);
            }
        }
    };
}

// --- B. About Stats Editor ---
function renderAboutStatsEditor() {
    const grid = document.getElementById('about-stats-editor-grid');
    if (!grid) return;

    const stats = currentData.about.stats || [];
    grid.innerHTML = stats.map((stat, idx) => `
        <div class="dynamic-item-card">
            <div class="form-group">
                <label class="form-label">Stat Label</label>
                <input type="text" class="form-control stat-label-input" data-idx="${idx}" value="${escapeHtml(stat.label)}">
            </div>
            <div class="form-group">
                <label class="form-label">Stat Value</label>
                <input type="text" class="form-control stat-val-input" data-idx="${idx}" value="${escapeHtml(stat.value)}">
            </div>
        </div>
    `).join('');

    grid.querySelectorAll('.stat-label-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const idx = parseInt(e.target.getAttribute('data-idx'));
            currentData.about.stats[idx].label = e.target.value;
        });
    });

    grid.querySelectorAll('.stat-val-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const idx = parseInt(e.target.getAttribute('data-idx'));
            currentData.about.stats[idx].value = e.target.value;
        });
    });
}

// --- C. Education Manager ---
function renderEducationManager() {
    const container = document.getElementById('education-items-manager');
    if (!container) return;

    const eduList = currentData.about.education || [];
    container.innerHTML = eduList.map((edu, idx) => `
        <div class="dynamic-item-card">
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">Degree / Level</label>
                    <input type="text" class="form-control edu-degree-input" data-idx="${idx}" value="${escapeHtml(edu.degree)}">
                </div>
                <div class="form-group">
                    <label class="form-label">Institution / School</label>
                    <input type="text" class="form-control edu-school-input" data-idx="${idx}" value="${escapeHtml(edu.school)}">
                </div>
                <div class="form-group">
                    <label class="form-label">Period</label>
                    <input type="text" class="form-control edu-period-input" data-idx="${idx}" value="${escapeHtml(edu.period)}">
                </div>
                <div class="form-group">
                    <label class="form-label">Grade / SGPA Badge (optional)</label>
                    <input type="text" class="form-control edu-badge-input" data-idx="${idx}" value="${escapeHtml(edu.gradeBadge || '')}">
                </div>
            </div>
            <div class="dynamic-item-actions">
                <button class="btn btn-danger btn-sm btn-delete-edu" data-idx="${idx}">
                    <i class="fa-solid fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');

    // Attach listeners
    container.querySelectorAll('.edu-degree-input').forEach(el => {
        el.addEventListener('input', (e) => {
            currentData.about.education[parseInt(e.target.getAttribute('data-idx'))].degree = e.target.value;
        });
    });
    container.querySelectorAll('.edu-school-input').forEach(el => {
        el.addEventListener('input', (e) => {
            currentData.about.education[parseInt(e.target.getAttribute('data-idx'))].school = e.target.value;
        });
    });
    container.querySelectorAll('.edu-period-input').forEach(el => {
        el.addEventListener('input', (e) => {
            currentData.about.education[parseInt(e.target.getAttribute('data-idx'))].period = e.target.value;
        });
    });
    container.querySelectorAll('.edu-badge-input').forEach(el => {
        el.addEventListener('input', (e) => {
            currentData.about.education[parseInt(e.target.getAttribute('data-idx'))].gradeBadge = e.target.value;
        });
    });
    container.querySelectorAll('.btn-delete-edu').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(btn.getAttribute('data-idx'));
            currentData.about.education.splice(idx, 1);
            renderEducationManager();
        });
    });

    const addEduBtn = document.getElementById('btn-add-education');
    if (addEduBtn) {
        addEduBtn.onclick = () => {
            currentData.about.education = currentData.about.education || [];
            currentData.about.education.push({
                degree: "New Degree",
                school: "Institution Name",
                period: "2024 — Present",
                gradeBadge: ""
            });
            renderEducationManager();
        };
    }
}

// --- D. Experience Manager ---
function renderExperienceManager() {
    const container = document.getElementById('experience-items-manager');
    if (!container) return;

    const list = currentData.experience || [];
    container.innerHTML = list.map((exp, idx) => `
        <div class="dynamic-item-card">
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">Job Title</label>
                    <input type="text" class="form-control exp-title-input" data-idx="${idx}" value="${escapeHtml(exp.title)}">
                </div>
                <div class="form-group">
                    <label class="form-label">Role Subtitle / Focus</label>
                    <input type="text" class="form-control exp-sub-input" data-idx="${idx}" value="${escapeHtml(exp.subtitle || '')}">
                </div>
                <div class="form-group">
                    <label class="form-label">Company Name</label>
                    <input type="text" class="form-control exp-comp-input" data-idx="${idx}" value="${escapeHtml(exp.company)}">
                </div>
                <div class="form-group">
                    <label class="form-label">Company Website URL</label>
                    <input type="url" class="form-control exp-compurl-input" data-idx="${idx}" value="${escapeHtml(exp.companyUrl || '')}">
                </div>
                <div class="form-group">
                    <label class="form-label">Work Period</label>
                    <input type="text" class="form-control exp-period-input" data-idx="${idx}" value="${escapeHtml(exp.period)}">
                </div>
                <div class="form-group full-width">
                    <label class="form-label">Key Achievements / Bullet Points <span class="form-label-hint">One per line</span></label>
                    <textarea class="form-control exp-details-input" data-idx="${idx}" rows="3">${(exp.details || []).map(escapeHtml).join('\n')}</textarea>
                </div>
            </div>
            <div class="dynamic-item-actions">
                <button class="btn btn-danger btn-sm btn-delete-exp" data-idx="${idx}">
                    <i class="fa-solid fa-trash"></i> Delete Experience
                </button>
            </div>
        </div>
    `).join('');

    // Attach listeners
    container.querySelectorAll('.exp-title-input').forEach(el => {
        el.addEventListener('input', (e) => { currentData.experience[parseInt(e.target.getAttribute('data-idx'))].title = e.target.value; });
    });
    container.querySelectorAll('.exp-sub-input').forEach(el => {
        el.addEventListener('input', (e) => { currentData.experience[parseInt(e.target.getAttribute('data-idx'))].subtitle = e.target.value; });
    });
    container.querySelectorAll('.exp-comp-input').forEach(el => {
        el.addEventListener('input', (e) => { currentData.experience[parseInt(e.target.getAttribute('data-idx'))].company = e.target.value; });
    });
    container.querySelectorAll('.exp-compurl-input').forEach(el => {
        el.addEventListener('input', (e) => { currentData.experience[parseInt(e.target.getAttribute('data-idx'))].companyUrl = e.target.value; });
    });
    container.querySelectorAll('.exp-period-input').forEach(el => {
        el.addEventListener('input', (e) => { currentData.experience[parseInt(e.target.getAttribute('data-idx'))].period = e.target.value; });
    });
    container.querySelectorAll('.exp-details-input').forEach(el => {
        el.addEventListener('input', (e) => {
            const lines = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
            currentData.experience[parseInt(e.target.getAttribute('data-idx'))].details = lines;
        });
    });
    container.querySelectorAll('.btn-delete-exp').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentData.experience.splice(parseInt(btn.getAttribute('data-idx')), 1);
            renderExperienceManager();
            updateOverviewStats();
        });
    });

    const addExpBtn = document.getElementById('btn-add-experience');
    if (addExpBtn) {
        addExpBtn.onclick = () => {
            currentData.experience = currentData.experience || [];
            currentData.experience.push({
                id: `exp-${Date.now()}`,
                title: "Software Engineer",
                subtitle: "Engineering",
                company: "Company Name",
                companyUrl: "",
                period: "2026",
                details: ["Contributed to software features and collaborated with team members."]
            });
            renderExperienceManager();
            updateOverviewStats();
        };
    }
}

// --- E. Skills Categories Manager ---
function renderSkillsManager() {
    const container = document.getElementById('skills-categories-manager');
    if (!container) return;

    const categories = currentData.skills || [];
    container.innerHTML = categories.map((cat, idx) => `
        <div class="dynamic-item-card">
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">Category Title</label>
                    <input type="text" class="form-control skill-cat-title-input" data-idx="${idx}" value="${escapeHtml(cat.category)}">
                </div>
                <div class="form-group">
                    <label class="form-label">FontAwesome Icon Class</label>
                    <input type="text" class="form-control skill-cat-icon-input" data-idx="${idx}" value="${escapeHtml(cat.icon || 'fa-solid fa-code')}">
                </div>
                <div class="form-group full-width">
                    <label class="form-label">Skill Badges</label>
                    <div class="tags-manager" id="skill-tags-manager-${idx}">
                        <input type="text" id="skill-tag-input-${idx}" class="tag-input" placeholder="Add skill (e.g. Python)...">
                    </div>
                </div>
            </div>
            <div class="dynamic-item-actions">
                <button class="btn btn-danger btn-sm btn-delete-skill-cat" data-idx="${idx}">
                    <i class="fa-solid fa-trash"></i> Delete Category
                </button>
            </div>
        </div>
    `).join('');

    categories.forEach((cat, idx) => {
        renderTagsList(`skill-tags-manager-${idx}`, `skill-tag-input-${idx}`, cat.items || [], (newItems) => {
            currentData.skills[idx].items = newItems;
        });
    });

    container.querySelectorAll('.skill-cat-title-input').forEach(el => {
        el.addEventListener('input', (e) => {
            currentData.skills[parseInt(e.target.getAttribute('data-idx'))].category = e.target.value;
        });
    });
    container.querySelectorAll('.skill-cat-icon-input').forEach(el => {
        el.addEventListener('input', (e) => {
            currentData.skills[parseInt(e.target.getAttribute('data-idx'))].icon = e.target.value;
        });
    });
    container.querySelectorAll('.btn-delete-skill-cat').forEach(btn => {
        btn.addEventListener('click', () => {
            currentData.skills.splice(parseInt(btn.getAttribute('data-idx')), 1);
            renderSkillsManager();
            updateOverviewStats();
        });
    });

    const addSkillBtn = document.getElementById('btn-add-skill-cat');
    if (addSkillBtn) {
        addSkillBtn.onclick = () => {
            currentData.skills = currentData.skills || [];
            currentData.skills.push({
                id: `skill-cat-${Date.now()}`,
                category: "New Skill Group",
                icon: "fa-solid fa-code",
                items: ["Skill 1", "Skill 2"]
            });
            renderSkillsManager();
            updateOverviewStats();
        };
    }
}

// --- F. Projects Studio & Drag-and-Drop Reordering ---
function renderProjectsManager() {
    const listContainer = document.getElementById('projects-manager-list');
    if (!listContainer) return;

    const projects = currentData.projects || [];
    listContainer.innerHTML = '';

    projects.forEach((proj, idx) => {
        const row = document.createElement('div');
        row.className = 'project-item-row';
        row.draggable = true;
        row.setAttribute('data-id', proj.id || `proj-${idx}`);
        row.setAttribute('data-index', idx);

        row.innerHTML = `
            <div class="project-drag-handle" title="Drag to reorder"><i class="fa-solid fa-grip-vertical"></i></div>
            <div class="project-row-thumb">
                ${proj.image ? `<img src="${escapeHtml(proj.image)}" alt="${escapeHtml(proj.title)}">` : `<i class="${escapeHtml(proj.icon || 'fa-solid fa-code')}"></i>`}
            </div>
            <div class="project-row-info">
                <div class="project-row-title">
                    <span>${escapeHtml(proj.title)}</span>
                    <span class="project-row-cat-badge">${escapeHtml(proj.category || 'ml')}</span>
                    ${proj.year ? `<span style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">${escapeHtml(proj.year)}</span>` : ''}
                </div>
                <p class="project-row-desc">${escapeHtml(proj.description || '')}</p>
            </div>
            <div class="project-row-actions">
                <button class="btn btn-secondary btn-sm btn-edit-proj" data-index="${idx}"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
                <button class="btn btn-danger btn-sm btn-del-proj" data-index="${idx}"><i class="fa-solid fa-trash"></i> Drop</button>
            </div>
        `;

        // Attach Drag and Drop Events
        setupRowDragAndDrop(row, listContainer);

        // Edit button
        row.querySelector('.btn-edit-proj').addEventListener('click', () => {
            openProjectEditor(idx);
        });

        // Delete button
        row.querySelector('.btn-del-proj').addEventListener('click', () => {
            if (confirm(`Are you sure you want to drop project "${proj.title}"?`)) {
                currentData.projects.splice(idx, 1);
                renderProjectsManager();
                updateOverviewStats();
                showToast(`Project "${proj.title}" dropped.`, 'info');
            }
        });

        listContainer.appendChild(row);
    });

    // Add Project Modal Trigger
    const addProjBtn = document.getElementById('btn-add-project');
    if (addProjBtn) {
        addProjBtn.onclick = () => {
            openProjectEditor(-1); // -1 for new project
        };
    }
}

// Drag and Drop Logic
function setupRowDragAndDrop(row, container) {
    row.addEventListener('dragstart', (e) => {
        dragSrcEl = row;
        row.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', row.outerHTML);
    });

    row.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const targetRow = e.target.closest('.project-item-row');
        if (targetRow && targetRow !== dragSrcEl) {
            const rect = targetRow.getBoundingClientRect();
            const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
            container.insertBefore(dragSrcEl, next && targetRow.nextSibling || targetRow);
        }
    });

    row.addEventListener('dragend', () => {
        row.classList.remove('dragging');
        // Re-calculate the projects array based on new DOM order
        const reordered = [];
        container.querySelectorAll('.project-item-row').forEach(item => {
            const projId = item.getAttribute('data-id');
            const found = currentData.projects.find(p => (p.id || '') === projId);
            if (found) reordered.push(found);
        });

        if (reordered.length === currentData.projects.length) {
            currentData.projects = reordered;
            renderProjectsManager();
            showToast('Project order updated! Click "Save Changes" to apply.', 'info');
        }
    });
}

// =============================================================================
// 5. Project Editor Modal & Image Upload Handling
// =============================================================================
let editingProjectTags = [];

function openProjectEditor(index) {
    const modal = document.getElementById('modal-project');
    const modalTitle = document.getElementById('modal-project-title');
    const saveBtn = document.getElementById('btn-save-project');

    let proj = null;
    if (index >= 0 && currentData.projects[index]) {
        proj = currentData.projects[index];
        modalTitle.innerHTML = '<i class="fa-solid fa-pen-to-square" style="color: var(--primary-color);"></i> Edit Project';
        setVal('proj-edit-id', proj.id || `proj-${index}`);
    } else {
        proj = {
            id: `proj-${Date.now()}`,
            title: '',
            category: 'web',
            year: new Date().getFullYear().toString(),
            type: '',
            icon: 'fa-solid fa-code',
            image: '',
            description: '',
            tags: [],
            githubUrl: '',
            liveUrl: ''
        };
        modalTitle.innerHTML = '<i class="fa-solid fa-plus" style="color: var(--primary-color);"></i> Add New Project';
        setVal('proj-edit-id', proj.id);
    }

    setVal('proj-edit-title', proj.title || '');
    setVal('proj-edit-category', proj.category || 'web');
    setVal('proj-edit-year', proj.year || '');
    setVal('proj-edit-type', proj.type || '');
    setVal('proj-edit-img-url', proj.image || '');
    setVal('proj-edit-icon', proj.icon || 'fa-solid fa-code');
    setVal('proj-edit-desc', proj.description || '');
    setVal('proj-edit-github', proj.githubUrl || '');
    setVal('proj-edit-live', proj.liveUrl || '');

    updateProjectModalVisualPreview(proj.image, proj.icon);

    editingProjectTags = [...(proj.tags || [])];
    renderTagsList('proj-tags-manager', 'proj-tag-input', editingProjectTags, (newTags) => {
        editingProjectTags = newTags;
    });

    // Image URL input changes
    document.getElementById('proj-edit-img-url').oninput = (e) => {
        updateProjectModalVisualPreview(e.target.value, document.getElementById('proj-edit-icon').value);
    };
    document.getElementById('proj-edit-icon').oninput = (e) => {
        updateProjectModalVisualPreview(document.getElementById('proj-edit-img-url').value, e.target.value);
    };

    // Image File Upload
    const fileInput = document.getElementById('proj-edit-img-file');
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            handleImageFileUpload(file, 800, 500, (dataUrl) => {
                setVal('proj-edit-img-url', dataUrl);
                updateProjectModalVisualPreview(dataUrl, '');
                showToast('Image uploaded and previewed.', 'success');
            });
        }
    };

    // Save project button handler
    saveBtn.onclick = () => {
        const title = getVal('proj-edit-title').trim();
        const desc = getVal('proj-edit-desc').trim();

        if (!title || !desc) {
            showToast('Please provide both Project Title and Description', 'error');
            return;
        }

        const projectPayload = {
            id: getVal('proj-edit-id'),
            title: title,
            category: getVal('proj-edit-category'),
            year: getVal('proj-edit-year').trim(),
            type: getVal('proj-edit-type').trim(),
            image: getVal('proj-edit-img-url').trim(),
            icon: getVal('proj-edit-icon').trim() || 'fa-solid fa-code',
            description: desc,
            tags: editingProjectTags,
            githubUrl: getVal('proj-edit-github').trim(),
            liveUrl: getVal('proj-edit-live').trim()
        };

        if (index >= 0) {
            currentData.projects[index] = projectPayload;
            showToast(`Project "${title}" updated successfully!`, 'success');
        } else {
            currentData.projects.unshift(projectPayload);
            showToast(`New project "${title}" added to portfolio!`, 'success');
        }

        closeModal('modal-project');
        renderProjectsManager();
        updateOverviewStats();
    };

    openModal('modal-project');
}

function updateProjectModalVisualPreview(imageUrl, iconClass) {
    const previewBox = document.getElementById('proj-img-preview-box');
    if (!previewBox) return;

    if (imageUrl) {
        previewBox.innerHTML = `<img src="${escapeHtml(imageUrl)}" alt="Preview" style="width: 100%; height: 100%; object-fit: cover;">`;
    } else {
        previewBox.innerHTML = `<i class="${escapeHtml(iconClass || 'fa-solid fa-code')}" id="proj-icon-preview"></i>`;
    }
}

// Profile Image Upload
document.getElementById('about-img-file')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        handleImageFileUpload(file, 400, 400, (dataUrl) => {
            setVal('about-img-url', dataUrl);
            updateImagePreview('about-img-preview', dataUrl);
            currentData.about.profileImage = dataUrl;
            showToast('Profile photo updated & compressed!', 'success');
        });
    }
});

document.getElementById('about-img-url')?.addEventListener('input', (e) => {
    const url = e.target.value.trim();
    updateImagePreview('about-img-preview', url || 'assets/image.jpg');
    currentData.about.profileImage = url;
});

// Helper: Compress and encode image file to DataURL
function handleImageFileUpload(file, maxWidth, maxHeight, callback) {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
        const image = new Image();
        image.onload = () => {
            let width = image.width;
            let height = image.height;

            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height *= maxWidth / width));
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width *= maxHeight / height));
                    height = maxHeight;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0, width, height);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            callback(dataUrl);
        };
        image.src = readerEvent.target.result;
    };
    reader.readAsDataURL(file);
}

function updateImagePreview(imgId, src) {
    const el = document.getElementById(imgId);
    if (el) el.src = src;
}

// =============================================================================
// 6. Global Save, Export, Import, & GitHub Sync
// =============================================================================
function initGlobalActionButtons() {
    // Save All Changes Button
    document.getElementById('btn-save-all')?.addEventListener('click', () => {
        saveCurrentFormValuesToState();
        localStorage.setItem('portfolio_custom_data', JSON.stringify(currentData));
        showToast('All portfolio changes saved locally! Live site is updated.', 'success');
    });

    // Export JSON
    document.getElementById('btn-export-json')?.addEventListener('click', () => {
        saveCurrentFormValuesToState();
        const jsonStr = JSON.stringify(currentData, null, 2);
        downloadFile(jsonStr, 'portfolio-data.json', 'application/json');
        showToast('Exported portfolio-data.json successfully.', 'success');
    });

    // Import JSON
    document.getElementById('input-import-json')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsed = JSON.parse(event.target.result);
                if (parsed.hero && parsed.about) {
                    currentData = parsed;
                    localStorage.setItem('portfolio_custom_data', JSON.stringify(currentData));
                    populateAllSections();
                    updateOverviewStats();
                    showToast('Portfolio configuration imported successfully!', 'success');
                } else {
                    showToast('Invalid portfolio configuration format.', 'error');
                }
            } catch (err) {
                showToast('Failed to parse JSON file.', 'error');
            }
        };
        reader.readAsText(file);
    });

    // Download data.js
    document.getElementById('btn-download-datajs')?.addEventListener('click', () => {
        saveCurrentFormValuesToState();
        const fileContent = generateDataJsCode(currentData);
        downloadFile(fileContent, 'data.js', 'text/javascript');
        showToast('Downloaded updated data.js', 'success');
    });

    // Reset Defaults
    document.getElementById('btn-reset-defaults')?.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all portfolio details to original defaults?')) {
            localStorage.removeItem('portfolio_custom_data');
            currentData = JSON.parse(JSON.stringify(window.defaultPortfolioData || {}));
            populateAllSections();
            updateOverviewStats();
            showToast('Reset portfolio to defaults.', 'info');
        }
    });

    // GitHub 1-Click Sync
    document.getElementById('btn-github-sync')?.addEventListener('click', () => {
        syncToGitHub();
    });
}

function saveCurrentFormValuesToState() {
    if (!currentData) return;

    // Hero
    currentData.hero = currentData.hero || {};
    currentData.hero.terminalTag = getVal('hero-terminal');
    currentData.hero.name = getVal('hero-name-input');
    currentData.hero.description = getVal('hero-desc-input');
    currentData.hero.cvUrl = getVal('hero-cv-url');
    currentData.hero.cvFilename = getVal('hero-cv-name');

    // About
    currentData.about = currentData.about || {};
    currentData.about.profileImage = getVal('about-img-url');
    currentData.about.leadParagraph = getVal('about-lead-input');
    const paras = getVal('about-paragraphs-input').split('\n\n').map(p => p.trim()).filter(Boolean);
    currentData.about.paragraphs = paras;

    // Contact
    currentData.contact = currentData.contact || {};
    currentData.contact.subtitle = getVal('contact-subtitle-input');
    currentData.contact.description = getVal('contact-desc-input');
    currentData.contact.email = getVal('contact-email-input');
    currentData.contact.phone = getVal('contact-phone-input');
    currentData.contact.location = getVal('contact-loc-input');

    currentData.contact.socials = currentData.contact.socials || {};
    currentData.contact.socials.github = getVal('contact-github-input');
    currentData.contact.socials.linkedin = getVal('contact-linkedin-input');

    // Meta
    currentData.meta = currentData.meta || {};
    currentData.meta.lastUpdated = new Date().toISOString().split('T')[0];
}

// Generate code for data.js
function generateDataJsCode(data) {
    return `/**
 * Portfolio Data Source of Truth
 * Generated via Portfolio Studio CMS on ${new Date().toISOString()}
 */

const defaultPortfolioData = ${JSON.stringify(data, null, 4)};

// Global helper to retrieve active portfolio data
function getPortfolioData() {
    try {
        const local = localStorage.getItem('portfolio_custom_data');
        if (local) {
            const parsed = JSON.parse(local);
            return {
                ...defaultPortfolioData,
                ...parsed,
                hero: { ...defaultPortfolioData.hero, ...(parsed.hero || {}) },
                about: { ...defaultPortfolioData.about, ...(parsed.about || {}) },
                contact: { ...defaultPortfolioData.contact, ...(parsed.contact || {}) },
                meta: { ...defaultPortfolioData.meta, ...(parsed.meta || {}) }
            };
        }
    } catch (e) {
        console.warn('Failed to load portfolio data from localStorage:', e);
    }
    return defaultPortfolioData;
}
`;
}

// Sync directly to GitHub Repository via REST API
async function syncToGitHub() {
    const token = getVal('gh-token').trim();
    const repo = getVal('gh-repo').trim();
    const branch = getVal('gh-branch').trim() || 'main';
    const commitMsg = getVal('gh-commit-msg').trim() || 'Update portfolio content via Portfolio Studio CMS';
    const statusEl = document.getElementById('gh-sync-status');
    const syncBtn = document.getElementById('btn-github-sync');

    if (!token) {
        showToast('Please enter a GitHub Personal Access Token', 'error');
        return;
    }
    if (!repo || !repo.includes('/')) {
        showToast('Please enter repository in owner/repo format', 'error');
        return;
    }

    // Save config for next time
    localStorage.setItem('studio_gh_config', JSON.stringify({ token, repo, branch, msg: commitMsg }));

    saveCurrentFormValuesToState();
    localStorage.setItem('portfolio_custom_data', JSON.stringify(currentData));

    syncBtn.disabled = true;
    syncBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing with GitHub...';
    if (statusEl) statusEl.textContent = 'Connecting to GitHub API...';

    try {
        const fileContent = generateDataJsCode(currentData);
        const encodedContent = btoa(unescape(encodeURIComponent(fileContent)));

        // 1. Get current SHA of data.js
        const getUrl = `https://api.github.com/repos/${repo}/contents/data.js?ref=${branch}`;
        const getRes = await fetch(getUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json'
            }
        });

        let sha = null;
        if (getRes.ok) {
            const getData = await getRes.json();
            sha = getData.sha;
        }

        // 2. Commit update to data.js
        const putUrl = `https://api.github.com/repos/${repo}/contents/data.js`;
        const bodyPayload = {
            message: commitMsg,
            content: encodedContent,
            branch: branch
        };
        if (sha) bodyPayload.sha = sha;

        const putRes = await fetch(putUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bodyPayload)
        });

        if (putRes.ok) {
            showToast('Deployed to GitHub successfully! Changes are live on GitHub Pages.', 'success');
            if (statusEl) statusEl.innerHTML = '<span style="color: var(--accent-emerald);">Commit Successful!</span>';
        } else {
            const errData = await putRes.json();
            throw new Error(errData.message || 'GitHub API error');
        }
    } catch (err) {
        showToast(`GitHub Sync Error: ${err.message}`, 'error');
        if (statusEl) statusEl.innerHTML = `<span style="color: var(--accent-rose);">Sync Failed: ${escapeHtml(err.message)}</span>`;
    } finally {
        syncBtn.disabled = false;
        syncBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Commit &amp; Deploy to GitHub';
    }
}

// =============================================================================
// 7. Utilities & Helpers
// =============================================================================
function getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
}

function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideInToast 0.3s ease reverse forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
