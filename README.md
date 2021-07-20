<h1>
  <sub><img src="https://github.com/arciisine/vscode-chronicler/raw/master/images/logo.png" height="40"></sub>
  VS Code Chronicler
</h1>

Chronicler is a cross-platform plugin for recording screens (windows) within VS Code. The application relies upon [FFmpeg](https://www.ffmpeg.org/) as the base for recording. The primary functionality of the plugin is to start and stop recording. The status bar contains an item that will provide you the current state of the recording process, and is an actionable element for starting/stopping a recording.

![Screen Capture in Action](./images/screencast-small.gif)

## How Recording Works
The recording process determines the location and dimensions of your VS Code window, and will start a recording session for that region, immediately.  To prevent the UI from getting in the way, when stopping, use the keyboard shortcuts to terminate the process. The status bar will be your indicator of the current status of your recording.  On completion you can can choose to open the file with your operating system, you can copy the path to your clipboard, or just dismiss.  Additionally, if you are configured your settings for supporting the animated gif production, the file path  will change to point to the `.gif` file instead of the `.mp4` file.

### Caveats
The underlying tools for screen recording, rely upon FFmpeg.  This has a distinct limitation of only being able to record a portion of the screen.  This means that the recording does not follow windows as they move, but specifically the initial location/size of the VS Code window.

## How to Start Recording
This will initiate a new recording, and will prompt for the FFmpeg installation if not set yet. This prompt will allow you to specify the location or to download the latest version as needed.

This can be triggered by:
* Click on the icon in the status bar to launch the recorder
* Accessing the command, via the command palette:
   - `Chronicler Start Recording` - Standard recording
   - `Chronicler Start Recording GIF` - Standard recording, that also produces an animated GIF of the output.
   - `Chronicler Start Timed-Recording` - Recording with a set duration, user will be prompted, with a default of `120` seconds.
   - `Chronicler Start Recording with Audio` - Standard recording with audio support (OSX requires a [custom build of FFmpeg](https://github.com/arciisine/vscode-chronicler/binaries/osx/ffmpeg) to bypass choppy audio.  More information on the custom build can be found [here](https://trac.ffmpeg.org/ticket/4513))

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
  * `countdown? :number` - The number of seconds to wait before recordings starts, defaults to `5`.
  * `duration? :number` - How long to record for, defaults to `0` which is indefinite
  * `animatedGif? :boolean` - Flag to determine if we should produce animated GIFs or not.
  * `gifScale? :number` - What ratio each dimension of the GIF should be scaled by, defaults to `1`. 
  * `fps: number` - Number of frames per second, defaults to `12`
  * `flags? :object` - Configuration flags to pass to the FFmpeg process 
    * `pix_fmt ?:string` - The format flag to pass to ffmpeg, defaults to `yuvj444p`.  Set to `yuv420p` if you want to support QuickTime on osx.
    * `c:v ?:string` - The video codec to use for encoding, defaults to `libx264`
    * `preset ?:string` - The ffmpeg recording preset, defaults to `ultrafast`. Supported: (`ultrafast`, `superfast`, `veryfast`, `faster`, `fast`, `medium`, `slow`, `slower`, `veryslow`)
     
* `chronicler.auto-record-live-share` - Determines the state for auto recording live share sessions, defaults to `false`.  
* `chronicler.debug` - Run the plugin in debug mode, provides more information when running FFmpeg

## Animated GIFs

Animated GIFs are supported, if you configure `chronicler.ffmpeg-binary` appropriately in your vscode settings.  Once setup, it will produce an additional GIF file of your mp4, encoded as best as possible.

# Requirements

* [FFmpeg](https://www.ffmpeg.org/download.html), 4.1+ with libx264 support.

# Acknowledgements

This project was inspired by:
* [vscode-screen-recorder](https://github.com/wk-j/vscode-screen-recorder), providing inspiration and UI patterns.
* [screen-recorder](https://github.com/131/screen-recorder), inspiration for how to encode the desktop.

# Known Issues

Currently, wayland support is missing


# Release Notes

## 0.1.14
Resolving reverted localization fix for windows.

## 0.1.12
Bugfix for win32 scale detection and for handling spaces in ffmpeg path in win32
Bugfix for x11, allow for host display environment variable to be honored

## 0.1.11
Bugfix for win32 non-US locales (different decimal point symbol).

## 0.1.10
Bugfix that broke darwin-based screen lookups

## 0.1.9
Updating screen-recorder/win-info to 0.2.x line, to support win32 desktop scaling.

## 0.1.8
Resolving a bug in which copying the file deletes the file as well. Additionally deleting mp4 files when deleting the animated gif.

## 0.1.6
Updating recording icons to use debug set, which provides color.  Updating documentation.

## 0.1.5
Removed color styling from status bar, to better support themes.  Added ability to open a recording's containing folder, or delete it on termination of recording.

## 0.1.4
Adding in support for `${workspaceFolder}` as a valid substitution for the recording destination.  Additionally, clarified and documented 
how to set ffmpeg flags for `pix_fmt` and `c:v` codecs.  Also documented the behavior of recording, with respect to window moving.

## 0.1.3
Adding in new osx binary, statically compiled, and upgrading screen-recorder to 0.1.6. Additionally merged changes in for the output directory to be a properly configurable element.  

## 0.1.2
Added in support for auto recording VS Live Share session. Added in flag to support scaling of generated GIFs.  Special thanks to @lostintangent for the live share integration.

## 0.1.0
Exposed download functionality from @arciisine/screen-recorder, and provide ability for user to set required configuration in a guide manner.  Special thanks to @DonJayamanne for the feedback.

## 0.0.9
Externalized the ffmpeg interactions into @arcsine/screen-recorder, fixing default recording folder

## 0.0.8
Aligned screen support with @arcsine/active-win, pulling in support for X11 vs linux.  Additionally support for multiple displays.

## 0.0.6
Bug fix with respect to binary location detection, and handling.

## 0.0.5
Released windows compatibility, reworked ffmpeg argument generation to tailor to each platform better.

## 0.0.4
Issue with linux launching (odd/even pixel issue) as  well as better results launching

## 0.0.3
Cleaned up linux support
Provided link for ffmpeg 4.1 with patch applied for audio capture during screen recording
UI improvements

## 0.0.2
Added support for:
* Audio recordings
* Status bar countdown (configurable)
* Timed recordings
* Dropping VLC, using FFmpeg solely, as it supports audio

## 0.0.1
Initial release, support for `vlc`, primarily tested on OSX
