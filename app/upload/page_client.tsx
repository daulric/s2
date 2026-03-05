"use client"

import { useRef } from "react"
import { redirect, useRouter } from "next/navigation"
import { toast } from "sonner"
import { Upload, X, ImageIcon } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Textarea } from "../../components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Progress } from "../../components/ui/progress"
import { Separator } from "../../components/ui/separator"
import { useAuth } from "../../context/AuthProvider"
import { compressAndUpload, uploadThumbnail } from "./MediaManager"
import { categories, visibilites } from "../../lib/videos/details"
import captureThumbnail from "../../lib/videos/captureThumbnail"
import { useSignals, useSignal } from "@preact/signals-react/runtime"
import { useWebHaptics } from "web-haptics/react"

export default function UploadPage() {
  useSignals();
  const router = useRouter()
  const { supabase } = useAuth();
  const { trigger } = useWebHaptics({debug: process.env.NODE_ENV !== "production"});
  const fileInputRef = useRef<HTMLInputElement>(null)
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const videoFile = useSignal<File | null>(null);
  const videoPreview = useSignal<string | null>(null);
  const thumbnailFile = useSignal<File | null>(null);
  const thumbnailPreview = useSignal<string | null>(null);
  const isUploading = useSignal(false);
  const title = useSignal<string>("");
  const description = useSignal<string>("");
  const uploadProgress = useSignal(0);
  const category = useSignal<string>("education");
  const visibility = useSignal<string>("public");

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    const { thumbnailFile: thumb, thumbUrl } = await captureThumbnail(file);

    videoFile.value = file;
    thumbnailFile.value = thumb;
    thumbnailPreview.value = thumbUrl;

    // Create video preview URL
    const videoURL = URL.createObjectURL(file)
    videoPreview.value = videoURL;

    const fileName = file.name.replace(/\.[^/.]+$/, "") // Remove extension
    title.value = fileName
    trigger("success");
  }

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file type
    if (!file.type.startsWith("image/")) {
      toast.error("Invalid file type", {
        description: "Please upload an image file for the thumbnail",
      })
      trigger("error");
      return
    }

    thumbnailFile.value = file;

    // Create thumbnail preview URL
    const imageURL = URL.createObjectURL(file)
    thumbnailPreview.value = imageURL;
    trigger("success");
  }

  const handleUpload = async () => {
    if (!videoFile.value) {
      toast.error("No video selected", {
        description: "Please select a video to upload",
      })
      trigger("error");
      return
    }

    if (!title.value.trim()) {
      toast.error("Title required", {
        description: "Please provide a title for your video",
      })
      trigger("error");
      return
    }

    isUploading.value = true;
    uploadProgress.value = 0;

    try {

      const promised_uplaod = Promise.all([ compressAndUpload(videoFile.value), thumbnailFile.value && uploadThumbnail(thumbnailFile.value)]);

      toast.promise(promised_uplaod, {
        loading: "Uploading...",
        success: () => { trigger("success"); return "Upload Finished" },
        error: (err) => { trigger("error"); return `Upload Failed: ${err.message}` },
      });

      promised_uplaod.then(async ([video_path, thumbnail_path]) => {
        trigger("light");
        const { data, error } = await supabase.from("videos").insert({
          title: title.value,
          description: description.value,
          video_path,
          thumbnail_path,
          visibility: visibility.value,
          category: category.value,
        }).select().single();

        if (error) throw new Error("Upload Data Failed");
        redirect(`/video/${data.video_id}`);
      }).catch(e => {
        throw e
      });

    } catch (error) {
      toast.error("Upload Failed", {
        description: (error instanceof Error ? error.message : "An error occurred during upload"),
      })
      trigger("error");
    } finally {
      isUploading.value = false;
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
                {!videoFile.value ? (
                  <div
                    className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Drag and drop or click to upload</h3>
                    <p className="text-sm text-muted-foreground mb-4">MP4, WebM, or MOV files up to 100MB</p>
                    <Button variant="secondary" onClick={() => trigger("medium")}>Select Video</Button>
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
                          videoFile.value = null;
                          videoPreview.value = null;
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </div>

                    <div className="aspect-video bg-black rounded-lg overflow-hidden">
                      {videoPreview.value && (
                        <video src={videoPreview.value} controls className="w-full h-full object-contain"></video>
                      )}
                    </div>

                    <div className="text-sm text-muted-foreground">
                      <p>Filename: {videoFile.value.name}</p>
                      <p>Size: {(videoFile.value.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">Thumbnail</h3>
                        {thumbnailPreview.value && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              thumbnailFile.value = null;
                              thumbnailPreview.value = null;
                            }}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                        )}
                      </div>

                      {thumbnailPreview.value ? (
                        <div className="relative aspect-video w-48 rounded-lg overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={thumbnailPreview.value}
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
                        Upload a custom thumbnail or we&apos;ll generate one from your video
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
                    onChange={(e) => { title.value = e.target.value; trigger("light") } }
                    placeholder="Add a title that describes your video"
                    maxLength={100}
                  />
                  <div className="text-xs text-muted-foreground text-right">{title.value.length}/100</div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description.value}
                    onChange={(e) => { description.value = e.target.value; trigger("light") } }
                    placeholder="Tell viewers about your video"
                    className="min-h-32"
                    maxLength={5000}
                  />
                  <div className="text-xs text-muted-foreground text-right">{description.value.length}/5000</div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category.value} onValueChange={(e) => { category.value = e; trigger("light") }}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select a category"/>
                    </SelectTrigger>
                    <SelectContent>
                      { categories.map((detail) => <SelectItem key={`${Math.random()}-${detail.toLowerCase()}`} value={detail.toLowerCase()}>{detail}</SelectItem>) }
                    </SelectContent>
                  </Select>
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
            <Button onClick={() => { trigger("light"); handleUpload() }} disabled={isUploading.value || !videoFile.value}>
              {isUploading.value ? "Uploading..." : "Upload Video"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}