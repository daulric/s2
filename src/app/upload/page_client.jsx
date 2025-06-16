"use client"

import { useState, useRef } from "react"
import { redirect, useRouter } from "next/navigation"
import { toast } from "sonner"
import { Upload, X, ImageIcon, Tag, Globe, Lock, Link } from "lucide-react"
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
import { compressAndUpload, uploadThumbnail } from "./MediaManager"
import { categories, visibilites } from "@/lib/videos/details"

export default function UploadPage() {
  const router = useRouter()
  const { supabase } = useAuth()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [videoFile, setVideoFile] = useState(null)
  const [thumbnailFile, setThumbnailFile] = useState(null)
  const [thumbnailPreview, setThumbnailPreview] = useState(null)
  const [videoPreview, setVideoPreview] = useState(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("education")
  const [visibility, setVisibility] = useState("public")
  const [tags, setTags] = useState([])
  const [currentTag, setCurrentTag] = useState("")
  const fileInputRef = useRef(null)
  const thumbnailInputRef = useRef(null);

  const handleVideoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file type
    if (!file.type.startsWith("video/")) {
      toast.error("Invalid file type", {
        description: "Please upload a video file",
      })
      return
    }

    // Check file size (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
      toast.error("File too large", {
        description: "Video size should be less than 100MB",
      })
      return
    }

    setVideoFile(file)

    // Create video preview URL
    const videoURL = URL.createObjectURL(file)
    setVideoPreview(videoURL)

    // Auto-generate title from filename if empty
    if (!title) {
      const fileName = file.name.replace(/\.[^/.]+$/, "") // Remove extension
      setTitle(fileName)
    }
  }

  const handleThumbnailChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file type
    if (!file.type.startsWith("image/")) {
      toast.error("Invalid file type", {
        description: "Please upload an image file for the thumbnail",
      })
      return
    }

    setThumbnailFile(file)

    // Create thumbnail preview URL
    const imageURL = URL.createObjectURL(file)
    setThumbnailPreview(imageURL)
  }

  const handleAddTag = () => {
    if (currentTag && !tags.includes(currentTag) && tags.length < 5) {
      setTags([...tags, currentTag])
      setCurrentTag("")
    }
  }

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleUpload = async () => {
    if (!videoFile) {
      toast.error("No video selected", {
        description: "Please select a video to upload",
      })
      return
    }

    if (!title.trim()) {
      toast.error("Title required", {
        description: "Please provide a title for your video",
      })
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {

      const promised_uplaod = Promise.all([ compressAndUpload(videoFile), thumbnailFile && uploadThumbnail(thumbnailFile)]);

      toast.promise(promised_uplaod, {
        loading: "Uploading...",
        success: () => "Upload Finished",
        error: (err) => ({ title: 'Upload Failed', description: err.message }),
      });

      promised_uplaod.then(async ([video_path, thumbnail_path]) => {
        const { data, error } = await supabase.schema("meetup-app").from("videos").insert({
          title,
          description,
          video_path,
          thumbnail_path,
          visibility,
          category
        }).select().single();

        if (error) throw new Error("Upload Data Failed");
        redirect(`/video/${data.video_id}`);
      }).catch(e => {
        throw e
      });

    } catch (error) {
      toast.error("Upload Failed", {
        description: error.message || "An error occurred during upload",
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <main className="min-h-screen pt-5 p-4 bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Upload Video</h1>
          <p className="text-muted-foreground">Share your content with the world</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Video Upload</CardTitle>
            <CardDescription>Upload a video file and add details</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="file" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="file">File Upload</TabsTrigger>
                <TabsTrigger value="details">Video Details</TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="space-y-4 py-4">
                {!videoFile ? (
                  <div
                    className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Drag and drop or click to upload</h3>
                    <p className="text-sm text-muted-foreground mb-4">MP4, WebM, or MOV files up to 100MB</p>
                    <Button variant="secondary">Select Video</Button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleVideoChange}
                      accept="video/*"
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Selected Video</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setVideoFile(null)
                          setVideoPreview(null)
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </div>

                    <div className="aspect-video bg-black rounded-lg overflow-hidden">
                      {videoPreview && (
                        <video src={videoPreview} controls className="w-full h-full object-contain"></video>
                      )}
                    </div>

                    <div className="text-sm text-muted-foreground">
                      <p>Filename: {videoFile.name}</p>
                      <p>Size: {(videoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">Thumbnail</h3>
                        {thumbnailPreview && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setThumbnailFile(null)
                              setThumbnailPreview(null)
                            }}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                        )}
                      </div>

                      {thumbnailPreview ? (
                        <div className="relative aspect-video w-48 rounded-lg overflow-hidden">
                          <img
                            src={thumbnailPreview}
                            alt="Thumbnail preview"
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
                          Add Thumbnail
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
                        Upload a custom thumbnail or we'll generate one from your video
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
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Add a title that describes your video"
                    maxLength={100}
                  />
                  <div className="text-xs text-muted-foreground text-right">{title.length}/100</div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell viewers about your video"
                    className="min-h-32"
                    maxLength={5000}
                  />
                  <div className="text-xs text-muted-foreground text-right">{description.length}/5000</div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      { categories.map((detail) => <SelectItem value={detail.toLowerCase()}>{detail}</SelectItem>) }
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="visibility">Visibility</Label>
                  <Select value={visibility} onValueChange={setVisibility}>
                    <SelectTrigger id="visibility">
                      <SelectValue placeholder="Select visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      {visibilites.map(({ type, icon: Icon }) => (
                        <SelectItem key={`${type}-${Math.random()}`} value={type.toLowerCase()}>
                          <div className="flex items-center">
                            <Icon className="h-4 w-4 mr-2" />
                            { type }
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>

          {isUploading && (
            <div className="px-6 py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Uploading...</span>
                <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          <Separator />

          <CardFooter className="flex justify-between py-4">
            <Button variant="ghost" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={isUploading || !videoFile}>
              {isUploading ? "Uploading..." : "Upload Video"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}