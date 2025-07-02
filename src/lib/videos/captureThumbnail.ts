export default async function captureThumbnail(videoFile: File): Promise<{thumbnailFile: File; videoName: string; thumbUrl: string;}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const videoUrl = URL.createObjectURL(videoFile);

    video.src = videoUrl;
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.currentTime = 1;
    video.crossOrigin = 'anonymous'; // optional, safe for local files

    const cleanup = () => {
      URL.revokeObjectURL(videoUrl);
    };

    // Step 1: Wait until the video can decode frames
    video.addEventListener('loadeddata', () => {
      if (isNaN(video.duration) || video.duration === 0) {
        reject(new Error('Invalid video duration'));
        return;
      }

      // Step 2: Seek to a safe time (e.g., 1s or middle of video)
      video.currentTime = Math.min(1, video.duration / 2);
    });

    // Step 3: Once seeked, draw to canvas
    video.addEventListener('seeked',() => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) {
          cleanup();
          reject(new Error('Could not get canvas context'));
          return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            cleanup();
            if (!blob) {
              return reject(new Error('Failed to create thumbnail blob'));
            }

            const videoName = videoFile.name.split('.')[0] || 'video';
            const thumbnailFile = new File([blob], `${videoName}_thumbnail.webp`, {
              type: 'image/webp',
              lastModified: Date.now(),
            });

            const thumbUrl = URL.createObjectURL(thumbnailFile);
            resolve({ thumbnailFile, videoName, thumbUrl });
          },
          'image/webp',
          0.8
        );
      },
      { once: true }
    );

    // Handle video load failure
    video.addEventListener('error', (e) => {
      cleanup();
      reject(new Error('Failed to load video file'));
    });
  });
}