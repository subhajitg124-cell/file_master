import { useCallback, useEffect, useRef, useState } from "react";

export type ImageFilterPreset =
  | "none"
  | "grayscale"
  | "sepia"
  | "high-contrast";

export interface ImageEditorApi {
  ready: boolean;
  imageUrl: string | null;
  loadFile: (file: File | null) => void;
  applyBrightness: (value: number) => void;
  applyContrast: (value: number) => void;
  applyRotation: (degrees: number) => void;
  applyFlip: (horizontal: boolean, vertical: boolean) => void;
  applyFilter: (preset: ImageFilterPreset) => void;
  resetAll: () => void;
  exportAs: (format: "jpg" | "png" | "webp" | "pdf") => Promise<Blob>;
}

interface TransformState {
  brightness: number;
  contrast: number;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  filter: ImageFilterPreset;
}

const filterMap: Record<ImageFilterPreset, string> = {
  none: "",
  grayscale: "grayscale(1)",
  sepia: "sepia(1)",
  "high-contrast": "contrast(1.6) brightness(1.05)",
};

export function useImageEditor(canvasRef: React.RefObject<HTMLCanvasElement | null>): ImageEditorApi {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [ready, setReady] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const transformRef = useRef<TransformState>({
    brightness: 0,
    contrast: 0,
    rotation: 0,
    flipX: false,
    flipY: false,
    filter: "none",
  });

  const getFilterStyle = useCallback(() => {
    const brightness = 1 + transformRef.current.brightness / 100;
    const contrast = 1 + transformRef.current.contrast / 100;
    const presetFilter = filterMap[transformRef.current.filter];
    return `brightness(${brightness}) contrast(${contrast}) ${presetFilter}`.trim();
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !image.complete) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) return;

    const naturalWidth = image.naturalWidth;
    const naturalHeight = image.naturalHeight;
    const maxSize = 1200;
    const scale = Math.min(1, maxSize / Math.max(naturalWidth, naturalHeight));
    const width = Math.max(1, Math.round(naturalWidth * scale));
    const height = Math.max(1, Math.round(naturalHeight * scale));

    canvas.width = width;
    canvas.height = height;

    context.save();
    context.clearRect(0, 0, width, height);
    context.filter = getFilterStyle();
    context.translate(width / 2, height / 2);

    const rotation = (transformRef.current.rotation % 360 + 360) % 360;
    context.rotate((rotation * Math.PI) / 180);
    context.scale(transformRef.current.flipX ? -1 : 1, transformRef.current.flipY ? -1 : 1);

    const drawWidth = width;
    const drawHeight = height;

    context.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    context.restore();
  }, [canvasRef, getFilterStyle]);

  const loadFile = useCallback(async (file: File | null) => {
    if (!file) {
      setImageUrl(null);
      imageRef.current = null;
      setReady(false);
      return;
    }

    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setReady(false);

    const image = new Image();
    image.src = url;
    image.crossOrigin = "anonymous";
    image.onload = () => {
      imageRef.current = image;
      transformRef.current = {
        brightness: 0,
        contrast: 0,
        rotation: 0,
        flipX: false,
        flipY: false,
        filter: "none",
      };
      setReady(true);
    };
    image.onerror = () => {
      setReady(false);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    redraw();
  }, [ready, redraw, imageUrl]);

  const applyBrightness = useCallback((value: number) => {
    transformRef.current.brightness = value;
    redraw();
  }, [redraw]);

  const applyContrast = useCallback((value: number) => {
    transformRef.current.contrast = value;
    redraw();
  }, [redraw]);

  const applyRotation = useCallback((degrees: number) => {
    transformRef.current.rotation = (transformRef.current.rotation + degrees) % 360;
    redraw();
  }, [redraw]);

  const applyFlip = useCallback((horizontal: boolean, vertical: boolean) => {
    transformRef.current.flipX = horizontal ? !transformRef.current.flipX : transformRef.current.flipX;
    transformRef.current.flipY = vertical ? !transformRef.current.flipY : transformRef.current.flipY;
    redraw();
  }, [redraw]);

  const applyFilter = useCallback((preset: ImageFilterPreset) => {
    transformRef.current.filter = preset;
    redraw();
  }, [redraw]);

  const resetAll = useCallback(() => {
    transformRef.current = {
      brightness: 0,
      contrast: 0,
      rotation: 0,
      flipX: false,
      flipY: false,
      filter: "none",
    };
    redraw();
  }, [redraw]);

  const exportAs = useCallback(
    async (format: "jpg" | "png" | "webp" | "pdf") => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return new Blob([], { type: "application/octet-stream" });
      }
      const mimeType = format === "jpg" ? "image/jpeg" : format === "png" ? "image/png" : format === "webp" ? "image/webp" : "image/png";
      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to export image"));
              return;
            }
            if (format === "pdf") {
              resolve(new Blob([blob], { type: "application/pdf" }));
            } else {
              resolve(blob);
            }
          },
          mimeType,
          format === "jpg" ? 0.92 : 0.95,
        );
      });
    },
    [canvasRef],
  );

  return {
    ready,
    imageUrl,
    loadFile,
    applyBrightness,
    applyContrast,
    applyRotation,
    applyFlip,
    applyFilter,
    resetAll,
    exportAs,
  };
}
