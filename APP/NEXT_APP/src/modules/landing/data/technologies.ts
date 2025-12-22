export const technologies = [
    // Frontend
    {
        name: "Next.js",
        logo: "/logos/nextjs.svg",
        color: "#000000",
        category: "Frontend",
        level: 95,
        darkMode: true
    },
    {
        name: "React",
        logo: "/logos/react.svg",
        color: "#61DAFB",
        category: "Frontend",
        level: 95
    },
    {
        name: "TypeScript",
        logo: "/logos/typescript.svg",
        color: "#3178C6",
        category: "Frontend",
        level: 90
    },
    {
        name: "Tailwind CSS",
        logo: "/logos/tailwind.svg",
        color: "#06B6D4",
        category: "Frontend",
        level: 95
    },
    {
        name: "GSAP",
        logo: "/logos/gsap.svg",
        color: "#88CE02",
        category: "Frontend",
        level: 85
    },
    {
        name: "Framer Motion",
        logo: "/logos/framer.svg",
        color: "#0055FF",
        category: "Frontend",
        level: 85
    },
    {
        name: "Three.js",
        logo: "/logos/threejs.svg",
        color: "#000000",
        category: "Frontend",
        level: 70,
        darkMode: true
    },

    // Backend
    {
        name: "Node.js",
        logo: "/logos/nodejs.svg",
        color: "#339933",
        category: "Backend",
        level: 90
    },
    {
        name: "PHP",
        logo: "/logos/php.svg",
        color: "#777BB4",
        category: "Backend",
        level: 85
    },
    {
        name: "Laravel",
        logo: "/logos/laravel.svg",
        color: "#FF2D20",
        category: "Backend",
        level: 85
    },
    {
        name: "Python",
        logo: "/logos/python.svg",
        color: "#3776AB",
        category: "Backend",
        level: 80
    },
    {
        name: "PostgreSQL",
        logo: "/logos/postgresql.svg",
        color: "#336791",
        category: "Backend",
        level: 85
    },
    {
        name: "MySQL",
        logo: "/logos/mysql.svg",
        color: "#4479A1",
        category: "Backend",
        level: 85
    },

    // DevOps
    {
        name: "Docker",
        logo: "/logos/docker.svg",
        color: "#2496ED",
        category: "DevOps",
        level: 85
    },
    {
        name: "Git",
        logo: "/logos/git.svg",
        color: "#F05032",
        category: "DevOps",
        level: 90
    },
    {
        name: "Linux",
        logo: "/logos/linux.svg",
        color: "#FCC624",
        category: "DevOps",
        level: 80
    },
    {
        name: "Nginx",
        logo: "/logos/nginx.svg",
        color: "#009639",
        category: "DevOps",
        level: 75
    },

    // AI/Automation
    {
        name: "n8n",
        logo: "/logos/n8n.svg",
        color: "#EA4B71",
        category: "AI/Automation",
        level: 90
    },
    {
        name: "LangChain",
        logo: "/logos/langchain.svg",
        color: "#1C3C3C",
        category: "AI/Automation",
        level: 75,
        darkMode: true
    },
    {
        name: "OpenAI API",
        logo: "/logos/openai.svg",
        color: "#412991",
        category: "AI/Automation",
        level: 85
    },
];

export type Technology = typeof technologies[0];
