"use client"

import { useRef } from "react"
import { redirect, useRouter } from "next/navigation"
import { toast } from "sonner"
import { Upload, X, ImageIcon, Music, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/context/AuthProvider"
import { uploadAudio, uploadThumbnail } from "../MediaManager"
import { visibilites } from "@/lib/videos/details"
import { useSignals, useSignal } from "@preact/signals-react/runtime"
import { useWebHaptics } from "web-haptics/react"
import Link from "next/link"

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

export default function UploadMusicPage() {
  useSignals()
  const router = useRouter()
  const { supabase } = useAuth()
  const { trigger } = useWebHaptics({ debug: process.env.NODE_ENV !== "production" })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)
  const audioPreviewRef = useRef<HTMLAudioElement>(null)

  const audioFile = useSignal<File | null>(null)
  const audioPreview = useSignal<string | null>(null)
  const audioDuration = useSignal<string | null>(null)
  const thumbnailFile = useSignal<File | null>(null)
  const thumbnailPreview = useSignal<string | null>(null)
  const isUploading = useSignal(false)
  const title = useSignal<string>("")
  const description = useSignal<string>("")
  const uploadProgress = useSignal(0)
  const visibility = useSignal<string>("public")

  const handleAudioChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("audio/")) {
      toast.error("Invalid file type", {
        description: "Please upload an audio file (MP3, WAV, FLAC, etc.)",
      })
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error("File too large", {
        description: "Audio size should be less than 50MB",
      })
      return
    }

    audioFile.value = file
    const audioURL = URL.createObjectURL(file)
    audioPreview.value = audioURL

    const audio = new Audio(audioURL)
    audio.onloadedmetadata = () => {
      audioDuration.value = formatDuration(audio.duration)
    }

    const fileName = file.name.replace(/\.[^/.]+$/, "")
    title.value = fileName
    trigger("success")
  }

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Invalid file type", {
        description: "Please upload an image file for the cover art",
      })
      trigger("error")
      return
    }

    thumbnailFile.value = file
    const imageURL = URL.createObjectURL(file)
    thumbnailPreview.value = imageURL
    trigger("success")
  }

  const handleUpload = async () => {
    if (!audioFile.value) {
      toast.error("No audio selected", {
        description: "Please select an audio file to upload",
      })
      trigger("error")
      return
    }

    if (!title.value.trim()) {
      toast.error("Title required", {
        description: "Please provide a title for your track",
      })
      trigger("error")
      return
    }

    isUploading.value = true
    uploadProgress.value = 0

    try {
      const promised_upload = Promise.all([
        uploadAudio(audioFile.value),
        thumbnailFile.value && uploadThumbnail(thumbnailFile.value),
      ])

      toast.promise(promised_upload, {
        loading: "Uploading...",
        success: () => { trigger("success"); return "Upload Finished" },
        error: (err) => { trigger("error"); return `Upload Failed: ${err.message}` },
      })

      promised_upload.then(async ([audio_path, thumbnail_path]) => {
        trigger("light")
        const { data, error } = await supabase.from("audios").insert({
          title: title.value,
          description: description.value,
          audio_path,
          thumbnail_path,
          visibility: visibility.value,
        }).select().single()

        if (error) throw new Error("Upload Data Failed")
        redirect(`/music`)
      }).catch(e => {
        throw e
      })

    } catch (error) {
      toast.error("Upload Failed", {
        description: (error instanceof Error ? error.message : "An error occurred during upload"),
      })
      trigger("error")
    } finally {
      isUploading.value = false
    }
  }

  return (
    <main className="min-h-screen pt-5 p-4 bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Upload Music</h1>
            <p className="text-muted-foreground">Share your tracks with the world</p>
          </div>
          <Link href="/upload">
            <Button variant="outline" onClick={() => trigger("light")}>
              <Video className="h-4 w-4 mr-2" />
              Upload Video
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Music Upload</CardTitle>
            <CardDescription>Upload an audio file and add details</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="file" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="file">Audio File</TabsTrigger>
                <TabsTrigger value="details">Track Details</TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="space-y-4 py-4">
                {!audioFile.value ? (
                  <div
                    className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Drag and drop or click to upload</h3>
                    <p className="text-sm text-muted-foreground mb-4">MP3, WAV, FLAC, or OGG files up to 50MB</p>
                    <Button variant="secondary" onClick={() => trigger("medium")}>Select Audio</Button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAudioChange}
                      accept="audio/*"
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Selected Audio</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          audioFile.value = null
                          audioPreview.value = null
                          audioDuration.value = null
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4">
                      {audioPreview.value && (
                        <audio
                          ref={audioPreviewRef}
                          src={audioPreview.value}
                          controls
                          className="w-full"
                        />
                      )}
                    </div>

                    <div className="text-sm text-muted-foreground">
                      <p>Filename: {audioFile.value.name}</p>
                      <p>Size: {(audioFile.value.size / (1024 * 1024)).toFixed(2)} MB</p>
                      {audioDuration.value && <p>Duration: {audioDuration.value}</p>}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">Cover Art</h3>
                        {thumbnailPreview.value && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              thumbnailFile.value = null
                              thumbnailPreview.value = null
                            }}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                        )}
                      </div>

                      {thumbnailPreview.value ? (
                        <div className="relative w-48 h-48 rounded-lg overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={thumbnailPreview.value}
                            alt="Cover art preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => thumbnailInputRef.current?.click()}
                          className="h-auto py-2"
                        >
                          <ImageIcon className="h-4 w-4 mr-2" />
                          Add Cover Art
                        </Button>
                      )}
                      <input
                        type="file"
                        ref={thumbnailInputRef}
                        onChange={handleThumbnailChange}
                        accept="image/*"
                        className="hidden"
                      />
                      <p className="text-xs text-muted-foreground">
                        Upload album artwork or cover art for your track
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="details" className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title.value}
                    onChange={(e) => { title.value = e.target.value; trigger("light") }}
                    placeholder="Add a title for your track"
                    maxLength={100}
                  />
                  <div className="text-xs text-muted-foreground text-right">{title.value.length}/100</div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description.value}
                    onChange={(e) => { description.value = e.target.value; trigger("light") }}
                    placeholder="Tell listeners about your track"
                    className="min-h-32"
                    maxLength={5000}
                  />
                  <div className="text-xs text-muted-foreground text-right">{description.value.length}/5000</div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="visibility">Visibility</Label>
                  <Select value={visibility.value} onValueChange={(e) => { visibility.value = e; trigger("light") }}>
                    <SelectTrigger id="visibility">
                      <SelectValue placeholder="Select visibility" onClick={() => trigger("light")} />
                    </SelectTrigger>
                    <SelectContent>
                      {visibilites.map(({ type, icon: Icon }) => (
                        <SelectItem key={`${type}-${Math.random()}`} value={type.toLowerCase()}>
                          <div className="flex items-center">
                            <Icon className="h-4 w-4 mr-2" />
                            {type}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>

          {isUploading.value && (
            <div className="px-6 py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Uploading...</span>
                <span className="text-sm text-muted-foreground">{uploadProgress.value}%</span>
              </div>
              <Progress value={uploadProgress.value} className="h-2" />
            </div>
          )}

          <Separator />

          <CardFooter className="flex justify-between py-4">
            <Button variant="ghost" onClick={() => { trigger("error"); router.back() }}>
              Cancel
            </Button>
            <Button onClick={() => { trigger("light"); handleUpload() }} disabled={isUploading.value || !audioFile.value}>
              {isUploading.value ? "Uploading..." : "Upload Track"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}
