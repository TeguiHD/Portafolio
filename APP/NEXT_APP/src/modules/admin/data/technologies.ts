export interface Technology {
  id: string;
  name: string;
  category: "Frontend" | "Backend" | "Database" | "DevOps" | "Automation" | "BI" | "Animation" | "ORM";
  icon?: string;
  featured?: boolean;
  order?: number;
}

export const technologies: Technology[] = [
  { id: "nextjs", name: "Next.js", category: "Frontend", featured: true, order: 1 },
  { id: "react", name: "React", category: "Frontend", featured: true, order: 2 },
  { id: "typescript", name: "TypeScript", category: "Frontend", featured: true, order: 3 },
  { id: "nodejs", name: "Node.js", category: "Backend", featured: true, order: 4 },
  { id: "python", name: "Python", category: "Backend", featured: true, order: 5 },
  { id: "postgresql", name: "PostgreSQL", category: "Database", featured: true, order: 6 },
  { id: "docker", name: "Docker", category: "DevOps", featured: true, order: 7 },
  { id: "n8n", name: "n8n", category: "Automation", featured: true, order: 8 },
  { id: "gsap", name: "GSAP", category: "Animation", featured: false, order: 9 },
  { id: "prisma", name: "Prisma", category: "ORM", featured: false, order: 10 },
  { id: "fastapi", name: "FastAPI", category: "Backend", featured: false, order: 11 },
  { id: "powerbi", name: "Power BI", category: "BI", featured: false, order: 12 },
];


