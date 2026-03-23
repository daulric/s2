"use client"

import { useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { visibilites } from "@/lib/videos/details"
import { type AudioData, type AudioInfoProps } from "@/lib/audios/data-to-audio-format"
import { useSignals, useSignal } from "@preact/signals-react/runtime"
import { useWebHaptics } from "web-haptics/react"
import { Camera, Upload } from "lucide-react"
import { useAuth } from "@/context/AuthProvider"

type MusicEditDialogProps = {
  audio: AudioInfoProps | null
  isOpen: boolean
  onClose: () => void
  onSave: (audioData: AudioData) => Promise<void> | void
}

export function MusicEditDialog({ audio, isOpen, onClose, onSave }: MusicEditDialogProps) {
  useSignals()
  const { supabase } = useAuth()
  const { trigger } = useWebHaptics({ debug: process.env.NODE_ENV !== "production" })
  const isLoading = useSignal(false)
  const isUploadingThumbnail = useSignal(false)
  const formData = useSignal({
    title: "",
    description: "",
    visibility: "public",
    thumbnail: "",
    thumbnail_path: null as string | null,
  })

  useEffect(() => {
    if (!audio) return
    formData.value = {
      title: audio.title || "",
      description: audio.description || "",
      visibility: audio.visibility || "public",
      thumbnail: audio.thumbnail || "/placeholder.png",
      thumbnail_path: audio.thumbnail_path ?? null,
    }
  }, [audio, formData])

  const handleThumbnailUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !audio) return

    if (!file.type.startsWith("image/")) {
      toast.error("Invalid file type", {
        description: "Please upload an image file for cover art",
      })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large", {
        description: "Please choose an image under 5MB",
      })
      return
    }

    isUploadingThumbnail.value = true
    trigger("light")
    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${audio.id}-cover-${Date.now()}.${fileExt}`
      const filePath = `audio-covers/${fileName}`

      const { error: uploadError } = await supabase.storage.from("images").upload(filePath, file, {
        contentType: file.type,
        upsert: true,
      })
      if (uploadError) throw uploadError

      formData.value = {
        ...formData.value,
        thumbnail: URL.createObjectURL(file),
        thumbnail_path: filePath,
      }

      toast.success("Cover art uploaded", {
        description: "Don’t forget to save your changes",
      })
      trigger("success")
    } catch (error) {
      toast.error("Failed to upload cover art", {
        description: "Please try again",
      })
      trigger("error")
    } finally {
      isUploadingThumbnail.value = false
    }
  }

  const handleSave = async () => {
    if (!audio) return
    if (!formData.value.title.trim()) {
      toast.error("Title is required", {
        description: "Please enter a title for your track",
      })
      return
    }

    isLoading.value = true
    try {
      await onSave({
        audio_id: audio.id,
        userid: audio.creator_id,
        title: formData.value.title.trim(),
        description: formData.value.description,
        visibility: formData.value.visibility,
        created_at: audio.created_at,
        listens: audio.listens,
        audio_path: audio.audio_path,
        thumbnail_path: formData.value.thumbnail_path,
      })
      toast.success("Track updated", {
        description: "Your track details have been saved",
      })
      trigger("success")
      onClose()
    } catch (error) {
      toast.error("Failed to update track", {
        description: error instanceof Error ? error.message : "Please try again",
      })
      trigger("error")
    } finally {
      isLoading.value = false
    }
  }

  if (!audio) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Track</DialogTitle>
          <DialogDescription>Update your track details and privacy settings</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Cover Art</Label>
            <div className="mt-2 flex flex-col sm:flex-row gap-4">
              <div className="relative w-full sm:w-40 h-40 bg-muted rounded-lg overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={formData.value.thumbnail} alt="Audio cover art" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <label className="cursor-pointer">
                    <Camera className="h-6 w-6 text-white" />
                    <input type="file" accept="image/*" onChange={handleThumbnailUpload} className="hidden" />
                  </label>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-2">
                  Upload cover art for this track. Recommended square image.
                </p>
                <label>
                  <Button variant="outline" size="sm" disabled={isUploadingThumbnail.value}>
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploadingThumbnail.value ? "Uploading..." : "Upload Cover Art"}
                  </Button>
                  <input type="file" accept="image/*" onChange={handleThumbnailUpload} className="hidden" />
                </label>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="audio-title">Title *</Label>
            <Input
              id="audio-title"
              value={formData.value.title}
              onChange={(e) => {
                formData.value = { ...formData.value, title: e.target.value }
              }}
              placeholder="Track title"
              maxLength={100}
            />
          </div>

          <div>
            <Label htmlFor="audio-description">Description</Label>
            <Textarea
              id="audio-description"
              value={formData.value.description}
              onChange={(e) => {
                formData.value = { ...formData.value, description: e.target.value }
              }}
              placeholder="Tell listeners about this track..."
              rows={4}
              maxLength={5000}
            />
          </div>

          <div>
            <Label>Visibility</Label>
            <Select
              value={formData.value.visibility}
              onValueChange={(value) => {
                formData.value = { ...formData.value, visibility: value ?? "private" }
              }}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select visibility" />
              </SelectTrigger>
              <SelectContent>
                {visibilites
                  .filter(({ type }) => ["public", "private"].includes(type.toLowerCase()))
                  .map(({ type, icon: Icon }) => (
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

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading.value || isUploadingThumbnail.value}>
            {isLoading.value ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
