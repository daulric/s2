"use client"

import type React from "react"

import { useRef, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog"
import { Camera, Upload } from "lucide-react"
import { useAuth } from "@/context/AuthProvider"
import { categories, visibilites } from "@/lib/videos/details"
import type { VideoData, VideoInfoProps } from "@/lib/videos/data-to-video-format"
import { useSignals, useSignal } from "@preact/signals-react/runtime"
import { useWebHaptics } from "web-haptics/react"

type VideoEditDialogProps = {
  video: VideoInfoProps | null
  isOpen: boolean
  onClose: () => void
  onSave: (videoData: VideoData, thumbnail?: File) => void
}

export function VideoEditDialog({ video, isOpen, onClose, onSave }: VideoEditDialogProps) {
  useSignals();
  const { supabase } = useAuth()
  const { trigger } = useWebHaptics({debug: process.env.NODE_ENV !== "production"});
  const isLoading = useSignal(false);
  const thumbnailFile = useSignal<File | null>(null);
  const formData = useSignal({
    title: "",
    description: "",
    thumbnail: "",
    category: "",
    visibility: "",
  });

  const thumbnail_ref = useRef<HTMLImageElement | null>(null)
  const thumb_name = useRef("");

  // Initialize form data when video changes
  useEffect(() => {
    if (video) {
      formData.value = {
        ...formData.value,
        title: video.title || "",
        description: video.description || "",
        thumbnail: video.thumbnail || "",
        category: video.category || "",
        visibility: video.visibility || "public",
      }
      thumbnailFile.value = null;
    }
  }, [video, formData, thumbnailFile])

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
      thumbnail_ref.current.setAttribute("src", URL.createObjectURL(file))
    }

    thumbnailFile.value = file;
    isLoading.value = true;
    trigger("light");

    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${video.id}-thumbnail-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage.from("images").upload(fileName, file, {
        contentType: file.type,
        upsert: true,
      })

      if (uploadError) throw uploadError

      formData.value = { ...formData.value, thumbnail: fileName };
      thumb_name.current = fileName;

      toast.success("Thumbnail uploaded", {
        description: "Don't forget to save your changes",
      })
    } catch (error) {
      toast.error("Failed to upload thumbnail", {
        description: "Please try again",
      })

      trigger("error");
    } finally {
      isLoading.value = false;
      trigger("light");
    }
  }

  const handleSave = async () => {
    if (!video) return

    if (!formData.value.title.trim()) {
      toast.error("Title is required", {
        description: "Please enter a title for your video",
      })
      return
    }

    isLoading.value = true;
    try {
      const updatedVideo: VideoData = {
        video_id: video.id,
        userid: video.creator_id,
        title: formData.value.title, // Fixed: was using formData.description
        description: formData.value.description,
        category: formData.value.category.length !== 0 ? formData.value.category : video.category,
        visibility: formData.value.visibility.length !== 0 ? formData.value.visibility : video.visibility || "public",
        views: video.views,
        created_at: video.created_at,
        ...(thumb_name.current.length !== 0 && { thumbnail_path: thumb_name.current }),
      }

      onSave(updatedVideo, thumbnailFile.value || undefined)
      onClose()

      toast.success("Video updated", {
        description: "Your video information has been saved",
      })
      trigger("success");
    } catch (error) {
      toast.error("Failed to save video", {
        description: "Please try again",
      })
      trigger("error");
    } finally {
      isLoading.value = false;
    }
  }

  const handleClose = () => {
    // Reset form when closing
    if (video) {
      formData.value = {
        ...formData.value,
        title: video.title || "",
        description: video.description || "",
        thumbnail: video.thumbnail || "",
        category: video.category || "",
        visibility: video.visibility || "public",
      }
    }

    thumbnailFile.value = null
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={thumbnail_ref}
                  src={formData.value.thumbnail || video.thumbnail}
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
                  <Button variant="outline" size="sm" disabled={isLoading.value}>
                    <Upload className="h-4 w-4 mr-2" />
                    {isLoading.value ? "Uploading..." : "Upload Thumbnail"}
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
              value={formData.value.title}
              onChange={(e) => {formData.value = { ...formData.value, title: e.target.value } }}
              placeholder="Enter video title"
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground mt-1">{formData.value.title.length}/100 characters</p>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.value.description}
              onChange={(e) =>{formData.value = { ...formData.value, description: e.target.value } }}
              placeholder="Describe your video..."
              rows={4}
              maxLength={5000}
            />
            <p className="text-xs text-muted-foreground mt-1">{formData.value.description.length}/5000 characters</p>
          </div>

          {/* Category and Visibility */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select
                value={ formData.value.category }
                onValueChange={(value) =>{formData.value = { ...formData.value, category: value } }}
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
                value={formData.value.visibility}
                onValueChange={(value) =>{formData.value = { ...formData.value, visibility: value } }}
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
          <Button variant="outline" onClick={() => { handleClose(); trigger("light") }}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading.value}>
            {isLoading.value ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}