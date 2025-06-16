"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { VideoCard, VideoProps } from "@/components/video-card"
import { Filter, Search, Video } from "lucide-react"
import GetSearchDetails from "@/lib/videos/GetSearchDetails";
import { useSignal, useComputed } from "@preact/signals-react"

export default function SearchPage() {
  const searchParams = useSearchParams()
  const query = searchParams.get("q") || ""

  // Results Data
  const results = useSignal<VideoProps[]>([]);
  const results_length = useComputed(() => results.value.length);

  const [sortBy, setSortBy] = useState("relevance")
  const [uploadTime, setUploadTime] = useState("any")
  const [duration, setDuration] = useState("any")
  const [type, setType] = useState("all")
  const [showFilters, setShowFilters] = useState(false)

  // Simulate search results based on query
  useEffect(() => {
    async function getVideoData() {
      if (query) {
        // In a real app, this would be an API call
        const filteredResults = await GetSearchDetails(query);

        if (filteredResults) {
          results.value = filteredResults;
        }
      }
    }

    document.title = `Searching for ${query} - s2`
    getVideoData();

    return () => {
      document.title = "s2";
      results.value = [];
    }
  }, [query])

  const handleSortChange = (value: string) => {
    setSortBy(value)
    // In a real app, this would trigger a new search with sorting
    const sortedResults = [...results.value]

    switch (value) {
      case "upload_date":
        sortedResults.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())
        break
      case "view_count":
        sortedResults.sort((a, b) => {
          const aViews =
            Number.parseFloat(a.views.replace(/[KM]/g, "")) *
            (a.views.includes("M") ? 1000000 : a.views.includes("K") ? 1000 : 1)
          const bViews =
            Number.parseFloat(b.views.replace(/[KM]/g, "")) *
            (b.views.includes("M") ? 1000000 : b.views.includes("K") ? 1000 : 1)
          return bViews - aViews
        })
        break
      /*case "duration":
        sortedResults.sort((a, b) => {
          const aDuration = a.duration.split(":").reduce((acc, time) => 60 * acc + +time, 0)
          const bDuration = b.duration.split(":").reduce((acc, time) => 60 * acc + +time, 0)
          return bDuration - aDuration
        })
        break*/
      default:
        // Keep original order for relevance
        break
    }

    results.value = sortedResults
  }

  const clearFilters = () => {
    setSortBy("relevance")
    setUploadTime("any")
    setDuration("any")
    setType("all")
  }

  const hasActiveFilters = sortBy !== "relevance" || uploadTime !== "any" || duration !== "any" || type !== "all"

  return (
    <main className="min-h-screen pt-20 p-4 bg-background">
      <div className="max-w-6xl mx-auto">
        {/* Search Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center">
                <Search className="h-6 w-6 mr-2" />
                Search Results
              </h1>
              {query && (
                <p className="text-muted-foreground mt-1">
                  Results for "{query}" • {results_length} videos found
                </p>
              )}
            </div>
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Filters */}
          {showFilters && (
            <Card className="p-4 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Sort by</label>
                  <Select value={sortBy} onValueChange={handleSortChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">Relevance</SelectItem>
                      <SelectItem value="upload_date">Upload date</SelectItem>
                      <SelectItem value="view_count">View count</SelectItem>
                      <SelectItem value="duration">Duration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Upload time</label>
                  <Select value={uploadTime} onValueChange={setUploadTime}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any time</SelectItem>
                      <SelectItem value="hour">Last hour</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This week</SelectItem>
                      <SelectItem value="month">This month</SelectItem>
                      <SelectItem value="year">This year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Duration</label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any duration</SelectItem>
                      <SelectItem value="short">Under 4 minutes</SelectItem>
                      <SelectItem value="medium">4-20 minutes</SelectItem>
                      <SelectItem value="long">Over 20 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Type</label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="channel">Channel</SelectItem>
                      <SelectItem value="playlist">Playlist</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {hasActiveFilters && (
                <div className="mt-4 pt-4 border-t">
                  <Button variant="ghost" onClick={clearFilters} className="text-sm">
                    Clear all filters
                  </Button>
                </div>
              )}
            </Card>
          )}

          <Separator />
        </div>

        {/* Search Results */}
        {useComputed(() => {
          if (results.value.length > 0) return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              { results.value.map((video) => <VideoCard key={video.id} video={video} />) }
            </div>
          )

          return (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <Search className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No results found</h3>
                <p className="text-muted-foreground mb-6">
                  {query
                    ? `No videos found for "${query}". Try different keywords or check your spelling.`
                    : "Enter a search term to find videos."}
                </p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Try searching for:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Different keywords</li>
                    <li>More general terms</li>
                    <li>Creator names</li>
                  </ul>
                </div>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters} className="mt-4">
                    Clear filters
                  </Button>
                )}
              </div>
            </div>
          )
        })}

      </div>
    </main>
  )
}
