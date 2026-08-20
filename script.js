document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------------------
    // 0. Load Dynamic Portfolio Data
    // -------------------------------------------------------------------------
    const portfolioData = (typeof getPortfolioData === 'function') ? getPortfolioData() : (window.defaultPortfolioData || {});

    // Render Dynamic Content from Portfolio Data
    renderPortfolioContent(portfolioData);

    // -------------------------------------------------------------------------
    // 1. Theme Configuration & Toggling
    // -------------------------------------------------------------------------
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle ? themeToggle.querySelector('i') : null;
    
    // Check local storage or system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'light' || (!savedTheme && !prefersDark)) {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        if (themeIcon) themeIcon.className = 'fa-solid fa-sun';
    } else {
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
        if (themeIcon) themeIcon.className = 'fa-solid fa-moon';
    }
    
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            if (document.body.classList.contains('dark-theme')) {
                document.body.classList.remove('dark-theme');
                document.body.classList.add('light-theme');
                if (themeIcon) themeIcon.className = 'fa-solid fa-sun';
                localStorage.setItem('theme', 'light');
            } else {
                document.body.classList.add('dark-theme');
                document.body.classList.remove('light-theme');
                if (themeIcon) themeIcon.className = 'fa-solid fa-moon';
                localStorage.setItem('theme', 'dark');
            }
            // Update particle colors based on new theme
            updateParticleColors();
        });
    }

    // -------------------------------------------------------------------------
    // 2. Interactive Particle Background Canvas
    // -------------------------------------------------------------------------
    const canvas = document.getElementById('canvas-bg');
    let ctx = null;
    let width = 0;
    let height = 0;
    const particles = [];
    let particleColor = 'rgba(0, 240, 255, 0.45)'; // Cyan
    let linkColor = 'rgba(0, 240, 255, 0.08)';
    let connectionDistance = 130;
    let maxParticles = 50;

    const mouse = {
        x: null,
        y: null,
        radius: 160
    };

    function updateParticleColors() {
        if (document.body.classList.contains('dark-theme')) {
            particleColor = 'rgba(0, 240, 255, 0.45)'; // Neon Cyan
            linkColor = 'rgba(0, 240, 255, 0.08)';
        } else {
            particleColor = 'rgba(8, 145, 178, 0.35)'; // Dark Cyan
            linkColor = 'rgba(8, 145, 178, 0.06)';
        }
    }

    if (canvas) {
        ctx = canvas.getContext('2d');
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        maxParticles = Math.min(75, Math.floor((width * height) / 18000));
        
        updateParticleColors();
        
        window.addEventListener('resize', () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            initParticles();
        });
        
        window.addEventListener('mousemove', (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        });
        
        window.addEventListener('mouseout', () => {
            mouse.x = null;
            mouse.y = null;
        });
        
        class Particle {
            constructor() {
                this.reset();
            }
            
            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = (Math.random() - 0.5) * 0.5;
                this.radius = Math.random() * 2 + 1;
            }
            
            update() {
                this.x += this.vx;
                this.y += this.vy;
                
                // Boundary checks
                if (this.x < 0 || this.x > width) this.vx *= -1;
                if (this.y < 0 || this.y > height) this.vy *= -1;
                
                // Mouse push/pull logic
                if (mouse.x !== null && mouse.y !== null) {
                    const dx = mouse.x - this.x;
                    const dy = mouse.y - this.y;
                    const distance = Math.hypot(dx, dy);
                    if (distance < mouse.radius) {
                        const force = (mouse.radius - distance) / mouse.radius;
                        this.x -= (dx / distance) * force * 0.8;
                        this.y -= (dy / distance) * force * 0.8;
                    }
                }
            }
            
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = particleColor;
                ctx.fill();
            }
        }
        
        function initParticles() {
            particles.length = 0;
            for (let i = 0; i < maxParticles; i++) {
                particles.push(new Particle());
            }
        }
        
        function animateParticles() {
            ctx.clearRect(0, 0, width, height);
            
            for (let i = 0; i < particles.length; i++) {
                particles[i].update();
                particles[i].draw();
                
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.hypot(dx, dy);
                    
                    if (dist < connectionDistance) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = linkColor;
                        ctx.lineWidth = (1 - dist / connectionDistance) * 0.8;
                        ctx.stroke();
                    }
                }
            }
            requestAnimationFrame(animateParticles);
        }
        
        initParticles();
        animateParticles();
    }

    // -------------------------------------------------------------------------
    // 3. Dynamic Typing Effect (Hero Section)
    // -------------------------------------------------------------------------
    const typedSpan = document.getElementById('typed-text');
    const roles = (portfolioData.hero && Array.isArray(portfolioData.hero.roles) && portfolioData.hero.roles.length > 0)
        ? portfolioData.hero.roles
        : [
            "Computer Science & Engineering Student",
            "IoT & Embedded Systems Enthusiast",
            "VHDL & FPGA Developer",
            "Full-Stack Web Developer"
        ];
    
    let roleIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typingSpeed = 100;
    
    function type() {
        if (!typedSpan) return;
        const currentRole = roles[roleIndex];
        
        if (isDeleting) {
            charIndex--;
            typingSpeed = 50; // Deleting is faster
        } else {
            charIndex++;
            typingSpeed = 120; // Natural typing pace
        }
        
        typedSpan.textContent = currentRole.substring(0, charIndex);
        
        if (!isDeleting && charIndex === currentRole.length) {
            isDeleting = true;
            typingSpeed = 2000; // Pause at end of word
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            roleIndex = (roleIndex + 1) % roles.length;
            typingSpeed = 500; // Pause before typing next word
        }
        
        setTimeout(type, typingSpeed);
    }
    
    if (typedSpan) {
        setTimeout(type, 1000);
    }

    // -------------------------------------------------------------------------
    // 4. Responsive Mobile Navigation Menu
    // -------------------------------------------------------------------------
    const mobileToggle = document.getElementById('mobile-toggle');
    const navbar = document.getElementById('navbar');
    const navLinks = document.querySelectorAll('.nav-link');
    
    if (mobileToggle && navbar) {
        mobileToggle.addEventListener('click', () => {
            navbar.classList.toggle('active');
            mobileToggle.classList.toggle('active');
        });
    }
    
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navbar) navbar.classList.remove('active');
            if (mobileToggle) mobileToggle.classList.remove('active');
        });
    });

    // -------------------------------------------------------------------------
    // 5. Scrollspy: Active Navigation Links
    // -------------------------------------------------------------------------
    const sections = document.querySelectorAll('section');
    
    function scrollSpy() {
        let currentSectionId = '';
        const scrollPosition = window.scrollY + 120; // Offset for header
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                currentSectionId = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSectionId}`) {
                link.classList.add('active');
            }
        });
    }
    
    window.addEventListener('scroll', scrollSpy);

    // -------------------------------------------------------------------------
    // 6. Project Category Filtering & 3D Tilt Initialization
    // -------------------------------------------------------------------------
    setupProjectFiltersAndTilt();

    // -------------------------------------------------------------------------
    // 7. Contact Form Terminal-Inspired Validation & Direct Inbox Delivery
    // -------------------------------------------------------------------------
    const contactForm = document.getElementById('contact-form');
    const formStatus = document.getElementById('form-status');
    const submitBtn = document.getElementById('submit-btn');
    
    if (contactForm && submitBtn && formStatus) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nameVal = document.getElementById('name').value.trim();
            const emailVal = document.getElementById('email').value.trim();
            const subjectVal = document.getElementById('subject').value.trim();
            const messageVal = document.getElementById('message').value.trim();
            
            if (!nameVal || !emailVal || !subjectVal || !messageVal) {
                formStatus.className = 'form-status error';
                formStatus.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Error: Missing required fields.';
                return;
            }
            
            const portfolioData = (typeof getPortfolioData === 'function') ? getPortfolioData() : {};
            const contactConfig = portfolioData.contact || {};
            const emailService = contactConfig.emailService || {};
            const recipientEmail = emailService.recipientEmail || contactConfig.email || 'lakshanj.24@cse.mrt.ac.lk';
            const accessKey = (emailService.accessKey || '').trim();
            const provider = emailService.provider || 'web3forms';

            // Terminal-style compile animations
            submitBtn.disabled = true;
            formStatus.className = 'form-status';
            
            const printLine = (text) => {
                formStatus.textContent = text;
            };

            const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

            printLine('guest@lakshan.dev:~$ compile -f contact_form.cpp');
            await sleep(400);
            printLine('Compiling: [||||||||||] 100% SUCCESS');
            await sleep(400);
            printLine(`guest@lakshan.dev:~$ ./send_message --to="${recipientEmail}"`);
            await sleep(400);
            printLine('Encrypting & dispatching packets...');

            try {
                let isSuccess = false;
                let errorMsg = '';

                if (provider === 'web3forms' && accessKey) {
                    const response = await fetch('https://api.web3forms.com/submit', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({
                            access_key: accessKey,
                            name: nameVal,
                            email: emailVal,
                            subject: subjectVal,
                            message: messageVal,
                            from_name: `${nameVal} (via Portfolio Contact)`,
                            replyto: emailVal
                        })
                    });
                    const resData = await response.json();
                    if (response.ok && resData.success) {
                        isSuccess = true;
                    } else {
                        errorMsg = resData.message || 'Web3Forms dispatch error';
                    }
                } else if (provider === 'formspree' && accessKey) {
                    const endpoint = accessKey.startsWith('http') ? accessKey : `https://formspree.io/f/${accessKey}`;
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({
                            name: nameVal,
                            email: emailVal,
                            subject: subjectVal,
                            message: messageVal,
                            _replyto: emailVal
                        })
                    });
                    if (response.ok) {
                        isSuccess = true;
                    } else {
                        const resData = await response.json().catch(() => ({}));
                        errorMsg = resData.error || 'Formspree transmission error';
                    }
                } else {
                    // Fallback when no Access Key is configured:
                    // Open default mail client directly with pre-composed email
                    const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(subjectVal)}&body=${encodeURIComponent(`Hi Lakshan,\n\n${messageVal}\n\nFrom: ${nameVal}\nEmail: ${emailVal}`)}`;
                    window.location.href = mailtoUrl;
                    isSuccess = true;
                }

                if (isSuccess) {
                    formStatus.className = 'form-status success';
                    formStatus.innerHTML = `<i class="fa-solid fa-circle-check"></i> Connection established. Message delivered directly to ${recipientEmail}!`;
                    contactForm.reset();
                    document.querySelectorAll('.form-group input, .form-group textarea').forEach(el => {
                        el.dispatchEvent(new Event('change'));
                    });
                } else {
                    formStatus.className = 'form-status error';
                    formStatus.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> [FAILED] ${errorMsg}. Please email <a href="mailto:${recipientEmail}" style="color: var(--primary-color);">${recipientEmail}</a> directly.`;
                }
            } catch (err) {
                console.error('Contact submission error:', err);
                formStatus.className = 'form-status error';
                formStatus.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Network error. Please email <a href="mailto:${recipientEmail}" style="color: var(--primary-color);">${recipientEmail}</a> directly.`;
            } finally {
                submitBtn.disabled = false;
            }
        });
    }

    // -------------------------------------------------------------------------
    // 8. Admin Panel Keyboard Shortcut (Ctrl + Shift + A)
    // -------------------------------------------------------------------------
    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
            e.preventDefault();
            window.location.href = 'admin.html';
        }
    });

    // =========================================================================
    // Dynamic Rendering Engine
    // =========================================================================
    function renderPortfolioContent(data) {
        if (!data) return;

        // 1. Hero Section
        if (data.hero) {
            const h = data.hero;
            const termEl = document.getElementById('hero-terminal-text');
            if (termEl && h.terminalTag) termEl.textContent = h.terminalTag;

            const nameEl = document.getElementById('hero-name');
            if (nameEl && h.name) nameEl.textContent = h.name;

            const descEl = document.getElementById('hero-description');
            if (descEl && h.description) descEl.textContent = h.description;

            const cvBtn = document.getElementById('hero-cv-btn');
            if (cvBtn && h.cvUrl) {
                cvBtn.href = h.cvUrl;
                if (h.cvFilename) cvBtn.setAttribute('download', h.cvFilename);
            }
        }

        // 2. About Section
        if (data.about) {
            const a = data.about;
            const imgEl = document.getElementById('about-profile-img');
            if (imgEl && a.profileImage) imgEl.src = a.profileImage;

            const leadEl = document.getElementById('about-lead');
            if (leadEl && a.leadParagraph) leadEl.textContent = a.leadParagraph;

            const pContainer = document.getElementById('about-paragraphs-container');
            if (pContainer && Array.isArray(a.paragraphs)) {
                pContainer.innerHTML = a.paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('');
            }

            const statsContainer = document.getElementById('about-stats-container');
            if (statsContainer && Array.isArray(a.stats)) {
                statsContainer.innerHTML = a.stats.map(s => `
                    <div class="stat-card">
                        <h3 class="stat-num">${escapeHtml(s.value)}</h3>
                        <p class="stat-label">${escapeHtml(s.label)}</p>
                    </div>
                `).join('');
            }

            const eduContainer = document.getElementById('education-list-container');
            if (eduContainer && Array.isArray(a.education)) {
                eduContainer.innerHTML = a.education.map((edu, idx) => `
                    <div class="education-item" style="${idx < a.education.length - 1 ? 'margin-bottom: 1.5rem;' : ''}">
                        <h4 class="edu-degree">${escapeHtml(edu.degree)}</h4>
                        <p class="edu-school">${escapeHtml(edu.school)}</p>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.25rem; flex-wrap: wrap; gap: 0.5rem;">
                            <span class="edu-date">${escapeHtml(edu.period)}</span>
                            ${edu.gradeBadge ? `<span style="font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--secondary-color); background: var(--secondary-glow); padding: 2px 8px; border-radius: 4px; border: 1px solid var(--card-border);">${escapeHtml(edu.gradeBadge)}</span>` : ''}
                        </div>
                    </div>
                `).join('');
            }

            const courseContainer = document.getElementById('coursework-tags-container');
            if (courseContainer && Array.isArray(a.coursework)) {
                courseContainer.innerHTML = a.coursework.map(c => `<span class="course-tag">${escapeHtml(c)}</span>`).join('');
            }
        }

        // 3. Experience Section
        if (Array.isArray(data.experience)) {
            const expContainer = document.getElementById('experience-timeline-container');
            if (expContainer) {
                expContainer.innerHTML = data.experience.map(exp => `
                    <div class="timeline-item">
                        <div class="timeline-dot"></div>
                        <div class="card glass-card timeline-content">
                            <div class="timeline-header">
                                <div>
                                    <h3 class="job-title">${escapeHtml(exp.title)} ${exp.subtitle ? `<span>— ${escapeHtml(exp.subtitle)}</span>` : ''}</h3>
                                    <div class="job-company">
                                        ${exp.companyUrl ? `<a href="${escapeHtml(exp.companyUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(exp.company)}</a>` : escapeHtml(exp.company)}
                                    </div>
                                </div>
                                <span class="job-date">${escapeHtml(exp.period)}</span>
                            </div>
                            <ul class="job-details">
                                ${(exp.details || []).map(d => `<li>${escapeHtml(d)}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                `).join('');
            }
        }

        // 4. Skills Section
        if (Array.isArray(data.skills)) {
            const skillsContainer = document.getElementById('skills-grid-container');
            if (skillsContainer) {
                skillsContainer.innerHTML = data.skills.map(s => `
                    <div class="card glass-card skill-category-card">
                        <h3 class="skill-category-title"><i class="${escapeHtml(s.icon || 'fa-solid fa-code')}"></i> ${escapeHtml(s.category)}</h3>
                        <div class="skill-tags">
                            ${(s.items || []).map(item => `<span class="skill-tag">${escapeHtml(item)}</span>`).join('')}
                        </div>
                    </div>
                `).join('');
            }
        }

        // 5. Project Filters & Projects Grid
        if (Array.isArray(data.projectCategories)) {
            const filterContainer = document.getElementById('project-filters-container');
            if (filterContainer) {
                filterContainer.innerHTML = data.projectCategories.map((f, i) => `
                    <button class="filter-btn ${i === 0 ? 'active' : ''}" data-filter="${escapeHtml(f.key)}">${escapeHtml(f.label)}</button>
                `).join('');
            }
        }

        if (Array.isArray(data.projects)) {
            const projectsContainer = document.getElementById('projects-grid-container');
            if (projectsContainer) {
                projectsContainer.innerHTML = data.projects.map(p => `
                    <div class="project-card glass-card" data-category="${escapeHtml(p.category || 'all')}">
                        ${p.image ? `
                            <div class="project-img-placeholder" style="padding: 0; overflow: hidden; background: #000;">
                                <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}" style="width: 100%; height: 100%; object-fit: cover; transition: transform var(--transition-speed) ease;">
                            </div>
                        ` : `
                            <div class="project-img-placeholder">
                                <i class="${escapeHtml(p.icon || 'fa-solid fa-code')} project-banner-icon"></i>
                            </div>
                        `}
                        <div class="project-content">
                            <div class="project-meta">
                                <span class="project-type">${escapeHtml(p.type || '')}</span>
                                ${p.year ? `<span class="project-year" style="font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; color: var(--primary-color);">${escapeHtml(p.year)}</span>` : ''}
                            </div>
                            <h3 class="project-title">${escapeHtml(p.title)}</h3>
                            <p class="project-desc">${escapeHtml(p.description)}</p>
                            <div class="project-tech-tags">
                                ${(p.tags || []).map(t => `<span>${escapeHtml(t)}</span>`).join('')}
                            </div>
                            <div class="project-links">
                                ${p.githubUrl ? `<a href="${escapeHtml(p.githubUrl)}" target="_blank" rel="noopener noreferrer" aria-label="GitHub Repository"><i class="fa-brands fa-github"></i> Source</a>` : ''}
                                ${p.liveUrl ? `<a href="${escapeHtml(p.liveUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Live Demo"><i class="fa-solid fa-arrow-up-right-from-square"></i> Demo</a>` : ''}
                            </div>
                        </div>
                    </div>
                `).join('');
            }
        }

        // 6. Contact Section
        if (data.contact) {
            const c = data.contact;
            const subEl = document.getElementById('contact-subtitle');
            if (subEl && c.subtitle) subEl.textContent = c.subtitle;

            const descEl = document.getElementById('contact-desc');
            if (descEl && c.description) descEl.textContent = c.description;

            const emailEl = document.getElementById('contact-email');
            if (emailEl && c.email) {
                emailEl.href = `mailto:${c.email}`;
                emailEl.textContent = c.email;
            }

            const phoneEl = document.getElementById('contact-phone');
            if (phoneEl && c.phone) {
                phoneEl.href = `tel:${c.phone.replace(/[^0-9+]/g, '')}`;
                phoneEl.textContent = c.phone;
            }

            const locEl = document.getElementById('contact-location');
            if (locEl && c.location) locEl.textContent = c.location;

            if (c.socials) {
                const ghEl = document.getElementById('contact-github');
                if (ghEl && c.socials.github) ghEl.href = c.socials.github;

                const liEl = document.getElementById('contact-linkedin');
                if (liEl && c.socials.linkedin) liEl.href = c.socials.linkedin;
            }
        }
    }

    // Helper: Escape HTML to prevent XSS
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Setup filtering and 3D card tilt dynamically
    function setupProjectFiltersAndTilt() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        const projectCards = document.querySelectorAll('.project-card');
        
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const filterValue = btn.getAttribute('data-filter');
                
                projectCards.forEach(card => {
                    const category = card.getAttribute('data-category');
                    
                    if (filterValue === 'all' || category === filterValue) {
                        card.style.display = 'flex';
                        setTimeout(() => {
                            card.style.opacity = '1';
                            card.style.transform = 'scale(1)';
                        }, 50);
                    } else {
                        card.style.opacity = '0';
                        card.style.transform = 'scale(0.95)';
                        setTimeout(() => {
                            card.style.display = 'none';
                        }, 300);
                    }
                });
            });
        });

        projectCards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const cardRect = card.getBoundingClientRect();
                const cardWidth = cardRect.width;
                const cardHeight = cardRect.height;
                
                const mouseX = e.clientX - cardRect.left - cardWidth / 2;
                const mouseY = e.clientY - cardRect.top - cardHeight / 2;
                
                const rotateX = -(mouseY / (cardHeight / 2)) * 8;
                const rotateY = (mouseX / (cardWidth / 2)) * 8;
                
                card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'rotateX(0) rotateY(0) translateY(0)';
            });
        });
    }
});
