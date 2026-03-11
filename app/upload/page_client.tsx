"use client"

import { Upload, Music } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UploadForm, type UploadConfig } from "@/components/upload-form"
import { compressAndUpload } from "./MediaManager"
import { categories } from "@/lib/videos/details"
import captureThumbnail from "@/lib/videos/captureThumbnail"
import { useSignals, useSignal } from "@preact/signals-react/runtime"
import { useWebHaptics } from "web-haptics/react"

export default function UploadPage() {
  useSignals()
  const { trigger } = useWebHaptics({ debug: process.env.NODE_ENV !== "production" })
  const category = useSignal<string>("education")

  const config: UploadConfig = {
    title: "Upload Video",
    subtitle: "Share your content with the world",
    cardTitle: "Video Upload",
    cardDescription: "Upload a video file and add details",
    fileTabLabel: "File Upload",
    detailsTabLabel: "Video Details",
    accept: "video/*",
    maxSizeMB: 100,
    fileTypePrefix: "video/",
    fileHint: "MP4, WebM, or MOV files up to 100MB",
    selectLabel: "Select Video",
    selectedLabel: "Selected Video",
    thumbnailLabel: "Thumbnail",
    thumbnailHint: "Upload a custom thumbnail or we'll generate one from your video",
    thumbnailPreviewClass: "aspect-video w-48",
    submitLabel: "Upload Video",
    tableName: "videos",
    pathField: "video_path",
    redirectTo: (id) => `/video/${id}`,
    uploadFn: compressAndUpload,
    onFileSelected: async (file) => {
      const { thumbnailFile, thumbUrl } = await captureThumbnail(file)
      return { thumbnailFile, thumbnailUrl: thumbUrl }
    },
    crossLink: { href: "/upload/music", label: "Upload Music", icon: Music },
    dropZoneIcon: Upload,
    renderPreview: (url) => (
      <div className="aspect-video bg-black rounded-lg overflow-hidden">
        <video src={url} controls className="w-full h-full object-contain" />
      </div>
    ),
    titlePlaceholder: "Add a title that describes your video",
    descriptionPlaceholder: "Tell viewers about your video",
    extraFields: (
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select value={category.value} onValueChange={(e) => { category.value = e ?? "education"; trigger("light") }}>
          <SelectTrigger id="category">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((detail) => (
              <SelectItem key={detail.toLowerCase()} value={detail.toLowerCase()}>{detail}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ),
    extraInsertFields: () => ({ category: category.value }),
  }

  return <UploadForm config={config} />
}
