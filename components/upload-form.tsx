"use client"

import React, { useRef } from "react"
import { redirect, useRouter } from "next/navigation"
import { toast } from "sonner"
import { Upload, X, ImageIcon, type LucideIcon } from "lucide-react"
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
import { uploadThumbnail } from "@/app/upload/MediaManager"
import { visibilites } from "@/lib/videos/details"
import { useSignals, useSignal } from "@preact/signals-react/runtime"
import { useWebHaptics } from "web-haptics/react"
import Link from "next/link"

export type UploadConfig = {
  title: string
  subtitle: string
  cardTitle: string
  cardDescription: string
  fileTabLabel: string
  detailsTabLabel: string
  accept: string
  maxSizeMB: number
  fileTypePrefix: string
  fileHint: string
  selectLabel: string
  selectedLabel: string
  thumbnailLabel: string
  thumbnailHint: string
  thumbnailPreviewClass: string
  submitLabel: string
  tableName: string
  pathField: string
  redirectTo: (id?: string) => string
  uploadFn: (file: File) => Promise<string>
  onFileSelected?: (file: File) => Promise<{ thumbnailFile?: File; thumbnailUrl?: string } | void>
  extraFields?: React.ReactNode
  extraInsertFields?: () => Record<string, unknown>
  crossLink: { href: string; label: string; icon: LucideIcon }
  dropZoneIcon: LucideIcon
  renderPreview: (previewUrl: string) => React.ReactNode
  renderExtraFileInfo?: (file: File) => React.ReactNode
  titlePlaceholder: string
  descriptionPlaceholder: string
}

export function UploadForm({ config }: { config: UploadConfig }) {
  useSignals()
  const router = useRouter()
  const { supabase, user } = useAuth()
  const { trigger } = useWebHaptics({ debug: process.env.NODE_ENV !== "production" })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)

  const mediaFile = useSignal<File | null>(null)
  const mediaPreview = useSignal<string | null>(null)
  const thumbnailFile = useSignal<File | null>(null)
  const thumbnailPreview = useSignal<string | null>(null)
  const isUploading = useSignal(false)
  const title = useSignal<string>("")
  const description = useSignal<string>("")
  const uploadProgress = useSignal(0)
  const visibility = useSignal<string>("public")

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith(config.fileTypePrefix)) {
      toast.error("Invalid file type", {
        description: `Please upload a ${config.fileTypePrefix.replace("/", "")} file`,
      })
      return
    }

    if (file.size > config.maxSizeMB * 1024 * 1024) {
      toast.error("File too large", {
        description: `File size should be less than ${config.maxSizeMB}MB`,
      })
      return
    }

    mediaFile.value = file
    mediaPreview.value = URL.createObjectURL(file)

    if (config.onFileSelected) {
      const result = await config.onFileSelected(file)
      if (result) {
        if (result.thumbnailFile) thumbnailFile.value = result.thumbnailFile
        if (result.thumbnailUrl) thumbnailPreview.value = result.thumbnailUrl
      }
    }

    title.value = file.name.replace(/\.[^/.]+$/, "")
    trigger("success")
  }

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Invalid file type", {
        description: `Please upload an image file for the ${config.thumbnailLabel.toLowerCase()}`,
      })
      trigger("error")
      return
    }

    thumbnailFile.value = file
    thumbnailPreview.value = URL.createObjectURL(file)
    trigger("success")
  }

  const handleUpload = async () => {
    if (!mediaFile.value) {
      toast.error("No file selected", {
        description: `Please select a file to upload`,
      })
      trigger("error")
      return
    }

    if (!title.value.trim()) {
      toast.error("Title required", {
        description: "Please provide a title",
      })
      trigger("error")
      return
    }

    isUploading.value = true
    uploadProgress.value = 0

    try {
      const promised_upload = Promise.all([
        config.uploadFn(mediaFile.value),
        thumbnailFile.value && uploadThumbnail(thumbnailFile.value),
      ])

      toast.promise(promised_upload, {
        loading: "Uploading...",
        success: () => { trigger("success"); return "Upload Finished" },
        error: (err) => { trigger("error"); return `Upload Failed: ${err.message}` },
      })

      promised_upload.then(async ([media_path, thumbnail_path]) => {
        trigger("light")
        const insertData: Record<string, unknown> = {
          userid: user.user?.id,
          title: title.value,
          description: description.value,
          [config.pathField]: media_path,
          thumbnail_path,
          visibility: visibility.value,
          ...config.extraInsertFields?.(),
        }

        const { data, error } = await supabase
          .from(config.tableName)
          .insert(insertData)
          .select()
          .single()

        if (error) throw new Error("Upload Data Failed")
        redirect(config.redirectTo(data?.video_id || data?.audio_id))
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

  const CrossLinkIcon = config.crossLink.icon

  return (
    <main className="min-h-screen pt-5 p-4 bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{config.title}</h1>
            <p className="text-muted-foreground">{config.subtitle}</p>
          </div>
          <Link href={config.crossLink.href}>
            <Button variant="outline" onClick={() => trigger("light")}>
              <CrossLinkIcon className="h-4 w-4 mr-2" />
              {config.crossLink.label}
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{config.cardTitle}</CardTitle>
            <CardDescription>{config.cardDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="file" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="file">{config.fileTabLabel}</TabsTrigger>
                <TabsTrigger value="details">{config.detailsTabLabel}</TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="space-y-4 py-4">
                {!mediaFile.value ? (
                  <div
                    className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <config.dropZoneIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Drag and drop or click to upload</h3>
                    <p className="text-sm text-muted-foreground mb-4">{config.fileHint}</p>
                    <Button variant="secondary" onClick={() => trigger("medium")}>{config.selectLabel}</Button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept={config.accept}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{config.selectedLabel}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          mediaFile.value = null
                          mediaPreview.value = null
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </div>

                    {mediaPreview.value && config.renderPreview(mediaPreview.value)}

                    <div className="text-sm text-muted-foreground">
                      <p>Filename: {mediaFile.value.name}</p>
                      <p>Size: {(mediaFile.value.size / (1024 * 1024)).toFixed(2)} MB</p>
                      {config.renderExtraFileInfo?.(mediaFile.value)}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{config.thumbnailLabel}</h3>
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
                        <div className={`relative rounded-lg overflow-hidden ${config.thumbnailPreviewClass}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={thumbnailPreview.value}
                            alt={`${config.thumbnailLabel} preview`}
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
                          Add {config.thumbnailLabel}
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
                        {config.thumbnailHint}
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
                    placeholder={config.titlePlaceholder}
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
                    placeholder={config.descriptionPlaceholder}
                    className="min-h-32"
                    maxLength={5000}
                  />
                  <div className="text-xs text-muted-foreground text-right">{description.value.length}/5000</div>
                </div>

                {config.extraFields}

                <div className="space-y-2">
                  <Label htmlFor="visibility">Visibility</Label>
                  <Select value={visibility.value} onValueChange={(e) => { visibility.value = e ?? "private"; trigger("light") }}>
                    <SelectTrigger id="visibility">
                      <SelectValue placeholder="Select visibility" onClick={() => trigger("light")} />
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
            <Button onClick={() => { trigger("light"); handleUpload() }} disabled={isUploading.value || !mediaFile.value}>
              {isUploading.value ? "Uploading..." : config.submitLabel}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}
