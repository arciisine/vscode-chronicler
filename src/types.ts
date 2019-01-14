import * as win from '@arcsine/active-win';

export interface Bounds {
  x: number;
  y: number;
  height: number;
  width: number;
}

export interface RecordingOptions {
  ffmpegBinary: string;
  fps: number;
  window: win.Results;
  file: string;

  animatedGif?: boolean;
  audio?: boolean;
  duration?: number;
  countdown?: number;
  transcode?: any;
  flags?: any;
}