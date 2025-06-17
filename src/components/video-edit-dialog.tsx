"use client"

import type React from "react"

import { useRef, useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Camera, Upload } from "lucide-react"
import { useAuth } from "@/context/AuthProvider"
import { categories, visibilites, capitalizeFirstLetter } from "@/lib/videos/details"
import type { VideoData, VideoInfoProps } from "@/lib/videos/data-to-video-format"

type VideoEditDialogProps = {
  video: VideoInfoProps | null
  isOpen: boolean
  onClose: () => void
  onSave: (videoData: VideoData, thumbnail?: File) => void
}

export function VideoEditDialog({ video, isOpen, onClose, onSave }: VideoEditDialogProps) {
  const { supabase } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    thumbnail: "",
    category: "",
    visibility: "",
  })

  const thumbnail_ref = useRef<HTMLImageElement | null>(null)
  const thumb_name = useRef("");

  // Initialize form data when video changes
  useEffect(() => {
    if (video) {
      setFormData({
        title: video.title || "",
        description: video.description || "",
        thumbnail: video.thumbnail || "",
        category: video.category || "",
        visibility: video.visibility || "public",
      })
      setThumbnailFile(null)
    }
  }, [video])

  const handleThumbnailUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !video) return

    if (file.size > 5 * (1024 * 1024)) {
      toast.error("File too large", {
        description: "Please choose an image under 5MB",
      })
      return
    }

    // Preview the image immediately
    if (thumbnail_ref.current) {
      thumbnail_ref.current.src = URL.createObjectURL(file)
    }

    setThumbnailFile(file)
    setIsLoading(true)

    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${video.id}-thumbnail-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage.from("images").upload(fileName, file, {
        contentType: file.type,
        upsert: true,
      })

      if (uploadError) throw uploadError

      setFormData((prev) => ({ ...prev, thumbnail: fileName }));
      thumb_name.current = fileName;

      toast.success("Thumbnail uploaded", {
        description: "Don't forget to save your changes",
      })
    } catch (error) {
      console.error("Error uploading thumbnail:", error)
      toast.error("Failed to upload thumbnail", {
        description: "Please try again",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!video) return

    if (!formData.title.trim()) {
      toast.error("Title is required", {
        description: "Please enter a title for your video",
      })
      return
    }

    setIsLoading(true)
    try {
      const updatedVideo: VideoData = {
        video_id: video.id,
        userid: video.creator_id,
        title: formData.title, // Fixed: was using formData.description
        description: formData.description,
        thumbnail_path: thumb_name.current.length !== 0 && thumb_name.current || "",
        category: formData.category.length !== 0 ? formData.category : video.category,
        visibility: formData.visibility.length !== 0 ? formData.visibility : video.visibility || "public",
        views: video.views,
        created_at: video.created_at,
      }

      onSave(updatedVideo, thumbnailFile || undefined)
      onClose()

      toast.success("Video updated", {
        description: "Your video information has been saved",
      })
    } catch (error) {
      console.error("Error saving video:", error)
      toast.error("Failed to save video", {
        description: "Please try again",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    // Reset form when closing
    if (video) {
      setFormData({
        title: video.title || "",
        description: video.description || "",
        thumbnail: video.thumbnail || "",
        category: video.category || "",
        visibility: video.visibility || "public",
      })
    }
    setThumbnailFile(null)
    onClose()
  }

  if (!video) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Video</DialogTitle>
          <DialogDescription>Update your video information and settings</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Thumbnail Section */}
          <div>
            <Label>Thumbnail</Label>
            <div className="mt-2 flex flex-col sm:flex-row gap-4">
              <div className="relative w-full sm:w-48 h-32 bg-muted rounded-lg overflow-hidden">
                <img
                  ref={thumbnail_ref}
                  src={formData.thumbnail || video.thumbnail}
                  alt="Video thumbnail"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <label className="cursor-pointer">
                    <Camera className="h-6 w-6 text-white" />
                    <input type="file" accept="image/*" onChange={handleThumbnailUpload} className="hidden" />
                  </label>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-2">
                  Upload a custom thumbnail for your video. Recommended size: 1280x720px
                </p>
                <label>
                  <Button variant="outline" size="sm" disabled={isLoading}>
                    <Upload className="h-4 w-4 mr-2" />
                    {isLoading ? "Uploading..." : "Upload Thumbnail"}
                  </Button>
                  <input type="file" accept="image/*" onChange={handleThumbnailUpload} className="hidden" />
                </label>
              </div>
            </div>
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Enter video title"
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground mt-1">{formData.title.length}/100 characters</p>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your video..."
              rows={4}
              maxLength={5000}
            />
            <p className="text-xs text-muted-foreground mt-1">{formData.description.length}/5000 characters</p>
          </div>

          {/* Category and Visibility */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select
                value={ formData.category }
                onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category.toLowerCase()}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Visibility</Label>
              <Select
                value={formData.visibility}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, visibility: value }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  {visibilites.map(({ type, icon: Icon }) => (
                    <SelectItem key={type} value={type.toLowerCase()}>
                      <div className="flex items-center">
                        <Icon className="h-4 w-4 mr-2" />
                        {type}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}