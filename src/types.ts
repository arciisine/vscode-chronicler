import * as win from '@arcsine/process-win';

export interface Bounds {
  x: number;
  y: number;
  height: number;
  width: number;
}

export interface RecordingOptions {
  ffmpegBinary: string;
  fps: number;
  window: win.Response;
  file: string;

  animatedGif?: boolean;
  audio?: boolean;
  duration?: number;
  countdown?: number;
  transcode?: any;
  flags?: any;
}