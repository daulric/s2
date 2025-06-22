"use client"

import { ProfileCard } from "@/components/profile-card"

// Mock data for demonstration
const featuredCreators = [
  {
    id: "creator1",
    username: "TechGuru",
    description: "Creating amazing tech tutorials and reviews for developers and tech enthusiasts",
    avatar_url: "/logo.jpeg?height=80&width=80",
    subscriber_count: 125000,
    video_count: 89,
    created_at: "2022-03-15",
  },
  {
    id: "creator2",
    username: "CodeMaster",
    description: "Full-stack developer sharing coding tips, tricks, and best practices",
    avatar_url: "/logo.jpeg?height=80&width=80",
    subscriber_count: 87500,
    video_count: 156,
    created_at: "2021-11-08",
  },
  {
    id: "creator3",
    username: "DesignPro",
    description: "UI/UX designer creating beautiful interfaces and sharing design insights",
    avatar_url: "/logo.jpeg?height=80&width=80",
    subscriber_count: 64200,
    video_count: 73,
    created_at: "2022-07-22",
  },
  {
    id: "creator4",
    username: "DataScientist",
    description: "Exploring data science, machine learning, and AI through practical examples",
    avatar_url: "/logo.jpeg?height=80&width=80",
    subscriber_count: 45800,
    video_count: 42,
    created_at: "2023-01-10",
  },
  {
    id: "creator5",
    username: "WebDevNinja",
    description: "Modern web development tutorials focusing on React, Next.js, and TypeScript",
    avatar_url: "/logo.jpeg?height=80&width=80",
    subscriber_count: 92300,
    video_count: 128,
    created_at: "2021-09-14",
  },
  {
    id: "creator6",
    username: "MobileDevExpert",
    description: "Mobile app development for iOS and Android using React Native and Flutter",
    avatar_url: "/logo.jpeg?height=80&width=80",
    subscriber_count: 38900,
    video_count: 67,
    created_at: "2022-12-03",
  },
]

export default function CreatorsPage() {
  return (
    <main className="min-h-screen pt-20 p-4 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Featured Creators</h1>
          <p className="text-muted-foreground">Discover amazing content creators and their channels</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {featuredCreators.map((creator) => (
            <ProfileCard key={creator.id} user={creator} compact />
          ))}
        </div>
      </div>
    </main>
  )
}