document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------------------
    // 1. Theme Configuration & Toggling
    // -------------------------------------------------------------------------
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle.querySelector('i');
    
    // Check local storage or system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'light' || (!savedTheme && !prefersDark)) {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        themeIcon.className = 'fa-solid fa-sun';
    } else {
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
        themeIcon.className = 'fa-solid fa-moon';
    }
    
    themeToggle.addEventListener('click', () => {
        if (document.body.classList.contains('dark-theme')) {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            themeIcon.className = 'fa-solid fa-sun';
            localStorage.setItem('theme', 'light');
        } else {
            document.body.classList.add('dark-theme');
            document.body.classList.remove('light-theme');
            themeIcon.className = 'fa-solid fa-moon';
            localStorage.setItem('theme', 'dark');
        }
        // Update particle colors based on new theme
        updateParticleColors();
    });

    // -------------------------------------------------------------------------
    // 2. Interactive Particle Background Canvas
    // -------------------------------------------------------------------------
    const canvas = document.getElementById('canvas-bg');
    const ctx = canvas.getContext('2d');
    
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    
    const particles = [];
    let particleColor = 'rgba(0, 240, 255, 0.45)'; // Cyan
    let linkColor = 'rgba(0, 240, 255, 0.08)';
    let connectionDistance = 130;
    const maxParticles = Math.min(75, Math.floor((width * height) / 18000)); // Responsive count
    
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
    
    // Initial color setup
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
                    // Push particles slightly away
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
            
            // Link particles that are close
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

    // -------------------------------------------------------------------------
    // 3. Dynamic Typing Effect (Hero Section)
    // -------------------------------------------------------------------------
    const typedSpan = document.getElementById('typed-text');
    const roles = [
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
    
    // Start the typing animation
    setTimeout(type, 1000);

    // -------------------------------------------------------------------------
    // 4. Responsive Mobile Navigation Menu
    // -------------------------------------------------------------------------
    const mobileToggle = document.getElementById('mobile-toggle');
    const navbar = document.getElementById('navbar');
    const navLinks = document.querySelectorAll('.nav-link');
    
    mobileToggle.addEventListener('click', () => {
        navbar.classList.toggle('active');
        mobileToggle.classList.toggle('active');
    });
    
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navbar.classList.remove('active');
            mobileToggle.classList.remove('active');
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
    // 6. Project Category Filtering
    // -------------------------------------------------------------------------
    const filterButtons = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active classes
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const filterValue = btn.getAttribute('data-filter');
            
            projectCards.forEach(card => {
                const category = card.getAttribute('data-category');
                
                if (filterValue === 'all' || category === filterValue) {
                    card.style.display = 'flex';
                    // Animate card entry
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'scale(1)';
                    }, 50);
                } else {
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.95)';
                    // Hide after animation finishes
                    setTimeout(() => {
                        card.style.display = 'none';
                    }, 300);
                }
            });
        });
    });

    // -------------------------------------------------------------------------
    // 7. Interactive 3D Card Tilt Effect
    // -------------------------------------------------------------------------
    projectCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const cardRect = card.getBoundingClientRect();
            const cardWidth = cardRect.width;
            const cardHeight = cardRect.height;
            
            // Calculate mouse coordinates relative to card center
            const mouseX = e.clientX - cardRect.left - cardWidth / 2;
            const mouseY = e.clientY - cardRect.top - cardHeight / 2;
            
            // Calculate rotation amount (-10deg to 10deg)
            const rotateX = -(mouseY / (cardHeight / 2)) * 8;
            const rotateY = (mouseX / (cardWidth / 2)) * 8;
            
            card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'rotateX(0) rotateY(0) translateY(0)';
        });
    });

    // -------------------------------------------------------------------------
    // 8. Contact Form Terminal-Inspired Validation & Messaging
    // -------------------------------------------------------------------------
    const contactForm = document.getElementById('contact-form');
    const formStatus = document.getElementById('form-status');
    const submitBtn = document.getElementById('submit-btn');
    const submitText = submitBtn.querySelector('span');
    
    contactForm.addEventListener('submit', (e) => {
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
        
        // Terminal-style compile animations
        submitBtn.disabled = true;
        formStatus.className = 'form-status';
        
        let steps = [
            'guest@lakshan.dev:~$ compile -f contact_form.cpp',
            'Compiling: [||||||||||] 100% SUCCESS',
            'Linking executable...',
            'guest@lakshan.dev:~$ ./send_message --to="lakshan"',
            'Sending request packets...'
        ];
        
        let stepIdx = 0;
        
        function printSteps() {
            if (stepIdx < steps.length) {
                formStatus.textContent = steps[stepIdx];
                stepIdx++;
                setTimeout(printSteps, 600);
            } else {
                formStatus.className = 'form-status success';
                formStatus.innerHTML = '<i class="fa-solid fa-circle-check"></i> Connection established. Message delivered successfully!';
                contactForm.reset();
                submitBtn.disabled = false;
                
                // Clear state helper for placeholder check
                document.querySelectorAll('.form-group input, .form-group textarea').forEach(el => {
                    el.dispatchEvent(new Event('change'));
                });
            }
        }
        
        printSteps();
    });
});
