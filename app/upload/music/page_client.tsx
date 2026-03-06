"use client"

import { Music, Video } from "lucide-react"
import { UploadForm, type UploadConfig } from "@/components/upload-form"
import { uploadAudio } from "../MediaManager"

export default function UploadMusicPage() {
  const config: UploadConfig = {
    title: "Upload Music",
    subtitle: "Share your tracks with the world",
    cardTitle: "Music Upload",
    cardDescription: "Upload an audio file and add details",
    fileTabLabel: "Audio File",
    detailsTabLabel: "Track Details",
    accept: "audio/*",
    maxSizeMB: 50,
    fileTypePrefix: "audio/",
    fileHint: "MP3, WAV, FLAC, or OGG files up to 50MB",
    selectLabel: "Select Music",
    selectedLabel: "Selected Audio",
    thumbnailLabel: "Cover Art",
    thumbnailHint: "Upload album artwork or cover art for your track",
    thumbnailPreviewClass: "w-48 h-48",
    submitLabel: "Upload Track",
    tableName: "audios",
    pathField: "audio_path",
    redirectTo: () => "/music",
    uploadFn: uploadAudio,
    crossLink: { href: "/upload", label: "Upload Video", icon: Video },
    dropZoneIcon: Music,
    renderPreview: (url) => (
      <div className="bg-muted/50 rounded-lg p-4">
        <audio src={url} controls className="w-full" />
      </div>
    ),
    titlePlaceholder: "Add a title for your track",
    descriptionPlaceholder: "Tell listeners about your track",
  }

  return <UploadForm config={config} />
}
