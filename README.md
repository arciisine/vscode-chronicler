<h1>
  <sub><img src="https://github.com/arciisine/vscode-chronicler/raw/master/images/logo.png" height="40"></sub>
  VSCode Chronicler
</h1>

Chronicler is a cross-platform visual studio code plugin for recording sessions within vscode. The application relies upon [FFmpeg](https://www.ffmpeg.org/) being installed. The primary functionality of the plugin is to start and stop recording. The status bar contains an item that will provide you the current state of the recording process, and is an actionable element for starting/stopping a recording.

![Screen Capture in Action](./images/screencast-small.gif)

## How Recording Works
The recording process determines the location and dimensions of your VS Code window, and will start a recording session for that region, immediately.  To prevent the UI from getting in the way, when stopping, use the keyboard shortcuts to terminate the process. The status bar will be your indicator of the current status of your recording.  On completion you can can choose to open the file with your operating system, you can copy the path to your clipboard, or just dismiss.  Additionally, if you are configured your settings for supporting the animated gif production, the file path  will change to point to the `.gif` file instead of the `.mp4` file.

## How to Start Recording
This will initiate a new recording, and will prompt for the FFmpeg installation directory if not set yet.  This can be triggered by:
* Click on the icon in the status bar to launch the recorder
* Accessing the command, via the command palette:
   - `Chronicler Start Recording` - Standard recording
   - `Chronicler Start Timed-Recording` - Recording with a set duration, user will be prompted, with a default of `120` seconds.
   - `Chronicler Start Recording with Audio` - (Experimental) Standard recording with audio support

* Using the predefined shortcut (by default `cmd+alt+shift+r`)

## How to Stop Recording 
This will stop the current recording, and provide a link to the final file location.  This can be triggered by:
* Click on the icon in the status bar to terminate the recorder
* Accessing the command, via the command palette `Chronicler Stop Recording`
* Using the predefined shortcut (by default `cmd+alt+shift+s`)

## Configuration
The available configuration options are:
* `chronicler.ffmpeg-binary` - (optional) This is the path to the FFMpeg binary, this will be used to convert the recordings into animated .gif files, if specified
* `chronicler.dest-folder` - This is the output folder for all recordings, defaults to `$HOME/Recordings`
* `chronicler.recording-defaults` - These are the default parameters for recording, this supports the following:
  * `countdown:number?` - The number of seconds to wait before recordings starts, defaults to `5`.
  * `duration?: number` - How long to record for, defaults to `0` which is indefinite
  * `animatedGif?: boolean` - Flag to determine if we should produce animated GIFs or not.
  * `fps: number` - Number of frames per second, defaults to `12`
  * `flags?: object` - Configuration flags to pass to the FFmpeg process 
* `chronicler.debug` - Run the plugin in debug mode, provides more information when running FFmpeg

## Animated GIFs

Animated GIFs are supported, if you configure `chronicler.ffmpeg-binary` appropriately in your vscode settings.  Once setup, it will produce an additional GIF file of your mp4, encoded as best as possible.

# Requirements

* [FFmpeg](https://www.ffmpeg.org/download.html).

#Acknowledgements

This project was inspired by:
* [vscode-screen-recorder](https://github.com/wk-j/vscode-screen-recorder), providing inspiration and UI patterns.
* [screen-recorder](https://github.com/131/screen-recorder), seeing how they used vlc for recording. 

# Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

# Release Notes

## 0.0.2
Added support for:
* (Experimental) Audio recordings
* Status bar countdown (configurable)
* Timed recordings
* Dropping VLC, using FFmpeg solely, as it supports audio

## 0.0.1
Initial release, support for `vlc`, primarily tested on OSX