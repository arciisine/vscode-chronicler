import { RecordingOptions as RecOp } from '@arcsine/screen-recorder';

export interface RecordingOptions extends RecOp {
  countdown: number;
  animatedGif: boolean;
  gifScale: number;
  flags: {
    pix_fmt: string;
    'c:v': string;
  };
}
