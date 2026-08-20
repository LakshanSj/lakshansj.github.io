/**
 * Portfolio Data Source of Truth
 * Generated via Portfolio Studio CMS on 2026-08-20T05:27:57.164Z
 */

const defaultPortfolioData = {
    "hero": {
        "terminalTag": "std::cout << \"Hello World!\";",
        "name": "Lakshan Jayawardana",
        "roles": [
            "Computer Science & Engineering Student",
            "IoT & Embedded Systems Enthusiast",
            "VHDL & FPGA Developer",
            "Full-Stack Web Developer"
        ],
        "description": "A motivated Computer Science & Engineering undergraduate at the University of Moratuwa. Eager to apply technical skills in IoT architectures, hardware design (VHDL), and software development to solve real-world engineering challenges.",
        "viewProjectsText": "View Projects",
        "cvUrl": "assets/CV_Lakshan_Jayawardana.pdf",
        "cvFilename": "CV_Lakshan_Jayawardana.pdf"
    },
    "about": {
        "profileImage": "assets/image.jpg",
        "leadParagraph": "Hello! I am a Computer Science & Engineering undergraduate at the University of Moratuwa with a passion for designing connected hardware systems and building responsive software.",
        "paragraphs": [
            "My academic journey is focused on developing robust and efficient solutions. I have experience designing custom digital systems (such as a VHDL 4-bit nanoprocessor) and implementing IoT architectures complete with real-time dashboards, environmental sensor networks, and solar energy integration.",
            "I enjoy team-based projects and cross-functional collaborations, bringing hands-on experience in planning, design coordination, and customer-facing operations. I am always excited to learn new tools and framework stacks to solve complex technical problems."
        ],
        "stats": [
            {
                "label": "Current GPA",
                "value": "3.70"
            },
            {
                "label": "A/L Physical Science",
                "value": "3As"
            },
            {
                "label": "Projects Built",
                "value": "4"
            }
        ],
        "education": [
            {
                "degree": "B.Sc. in Computer Science & Engineering",
                "school": "University of Moratuwa",
                "period": "2024 — Present (2nd Year)",
                "gradeBadge": "SGPA: 3.70"
            },
            {
                "degree": "GCE Advanced Level (Physical Science)",
                "school": "Govt. Science College, Matale",
                "period": "2019 — 2023",
                "gradeBadge": ""
            },
            {
                "degree": "Secondary & Primary Education",
                "school": "Ovilikanda Maha Vidyalaya, Matale",
                "period": "2010 — 2018",
                "gradeBadge": ""
            }
        ],
        "coursework": [
            "Programming",
            "Data Structures",
            "Software Engineering",
            "Computer Systems",
            "Digital Logic Design",
            "VHDL / FPGA",
            "Database Management",
            "Basic Web Development"
        ]
    },
    "experience": [
        {
            "id": "exp-1",
            "title": "Engineering Intern",
            "subtitle": "Planning",
            "company": "DSP Controls (Pvt) Ltd, Sri Lanka",
            "companyUrl": "https://dspcontrols.lk",
            "period": "2024 (4 months)",
            "details": [
                "Worked as part of an engineering team on multiple projects across the company's portfolio",
                "Contributed to project planning, design coordination, and the preparation of ducting layout plans",
                "Gained hands-on exposure to engineering workflows, technical drawings, and cross-functional collaboration"
            ]
        },
        {
            "id": "exp-2",
            "title": "Trainee",
            "subtitle": "Banking Operations",
            "company": "People's Bank, Matale Branch",
            "companyUrl": "",
            "period": "2024 (6 months)",
            "details": [
                "Assisted with day-to-day banking operations and customer-facing transactions at the Matale branch",
                "Gained practical exposure to financial record-keeping, data management, and customer service workflows",
                "Developed strong attention to detail and organizational skills in a professional work environment"
            ]
        }
    ],
    "skills": [
        {
            "id": "skill-cat-1",
            "category": "Programming & Software",
            "icon": "fa-solid fa-code",
            "items": [
                "Python",
                "Java",
                "C++",
                "React.js",
                "Basic Web Development",
                "Database Management",
                "SQL"
            ]
        },
        {
            "id": "skill-cat-2",
            "category": "Hardware & Systems",
            "icon": "fa-solid fa-microchip",
            "items": [
                "VHDL",
                "BASYS 3 FPGA",
                "Digital Circuit Design",
                "Vivado",
                "VS Code",
                "Git & GitHub"
            ]
        },
        {
            "id": "skill-cat-3",
            "category": "Communication & Tools",
            "icon": "fa-solid fa-language",
            "items": [
                "Sinhala (Native Fluency)",
                "English (Professional)",
                "Microsoft Word",
                "Microsoft Excel",
                "PowerPoint"
            ]
        }
    ],
    "projectCategories": [
        {
            "key": "all",
            "label": "All"
        },
        {
            "key": "ml",
            "label": "Machine Learning"
        },
        {
            "key": "web",
            "label": "Full Stack"
        },
        {
            "key": "iot",
            "label": "IoT & Embedded"
        },
        {
            "key": "hw",
            "label": "Hardware & HDL"
        }
    ],
    "projects": [
        {
            "id": "proj-1",
            "title": "Trading Prediction System",
            "category": "ml",
            "year": "2026",
            "type": "Machine Learning & Finance",
            "icon": "fa-solid fa-chart-line",
            "image": "",
            "description": "AI-powered stock and crypto price prediction using ensemble ML techniques (ARIMA, LSTM, LightGBM) complete with a React dashboard and FastAPI backend.",
            "tags": [
                "FastAPI",
                "React",
                "LSTM",
                "ARIMA",
                "LightGBM",
                "Financial Data"
            ],
            "githubUrl": "https://github.com/LakshanSj/trading-prediction-system",
            "liveUrl": ""
        },
        {
            "id": "proj-2",
            "title": "UniMed: Digital Medical Record System",
            "category": "web",
            "year": "2026",
            "type": "Full Stack & Speech Recognition",
            "icon": "fa-solid fa-microphone-lines",
            "image": "",
            "description": "Web-based system to digitize student medical records. Features a Voice-to-Text interface enabling doctors to record diagnoses verbally with manual correction, and a secure centralized database.",
            "tags": [
                "React",
                "Flask",
                "HTML/CSS",
                "JavaScript",
                "MySQL",
                "Voice-to-Text"
            ],
            "githubUrl": "https://github.com/Kamithaakash/UniMed-MORASHIFT",
            "liveUrl": ""
        },
        {
            "id": "proj-3",
            "title": "Nanoprocessor Design: 4-bit Custom Processor",
            "category": "hw",
            "year": "2026",
            "type": "Hardware Design & HDL",
            "icon": "fa-solid fa-microchip",
            "image": "",
            "description": "Designed and implemented a 4-bit custom nanoprocessor in VHDL capable of executing a custom instruction set (MOVI, ADD, NEG, JZR). Completed as a group project.",
            "tags": [
                "VHDL",
                "Vivado",
                "BASYS 3 FPGA",
                "Digital Design"
            ],
            "githubUrl": "https://github.com/LakshanSj/4bit-nanoprocessor",
            "liveUrl": ""
        },
        {
            "id": "proj-4",
            "title": "Smart Dustbin IoT System",
            "category": "iot",
            "year": "2025",
            "type": "IoT & Waste Management",
            "icon": "fa-solid fa-trash-can",
            "image": "",
            "description": "Waste management system with ultrasonic and weight fill-level sensors, methane odour detection, solar energy harvesting, real-time City Council alerts, and a mobile app.",
            "tags": [
                "IoT Sensors",
                "Solar Energy",
                "ESP32",
                "Mobile Integration",
                "Firebase"
            ],
            "githubUrl": "https://github.com/LakshanSj/smart-dustbin-waste-management-system",
            "liveUrl": ""
        }
    ],
    "contact": {
        "subtitle": "Let's Discuss Collaborations",
        "description": "I'm open to discussing software engineering internships, research collaborations, open-source projects, or systems architecture. Drop me a message and I'll get back to you as soon as possible.",
        "email": "lakshanj.24@cse.mrt.ac.lk",
        "phone": "+94 71 321 5390",
        "location": "No. 44/2, Ovilikanda, Matale, Sri Lanka",
        "socials": {
            "github": "https://github.com/LakshanSj",
            "linkedin": "https://www.linkedin.com/in/lakshan-jayawardana/"
        },
        "emailService": {
            "provider": "web3forms",
            "accessKey": "4f4aabc3-c2b8-4538-a3cf-e600b010c62e",
            "recipientEmail": "lakshanj.24@cse.mrt.ac.lk"
        }
    },
    "meta": {
        "lastUpdated": "2026-08-20",
        "version": "1.0.0"
    }
};

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
                contact: {
                    ...defaultPortfolioData.contact,
                    ...(parsed.contact || {}),
                    socials: { ...(defaultPortfolioData.contact.socials || {}), ...(parsed.contact?.socials || {}) },
                    emailService: { ...(defaultPortfolioData.contact.emailService || {}), ...(parsed.contact?.emailService || {}) }
                },
                meta: { ...defaultPortfolioData.meta, ...(parsed.meta || {}) }
            };
        }
    } catch (e) {
        console.warn('Failed to load portfolio data from localStorage:', e);
    }
    return defaultPortfolioData;
}
