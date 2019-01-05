export interface Bounds {
  x: number;
  y: number;
  height: number;
  width: number;
}

export interface RecordingOptions {
  ffmpegBinary: string;
  fps: number;
  bounds: Bounds;
  file: string;

  animatedGif?: boolean;
  audio?: boolean;
  duration?: number;
  countdown?: number;
  transcode?: any;
  flags?: any;
}