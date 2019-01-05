Chronicler
----------------------------------

Chronicler is a visual studio code plugin for recording sessions within vscode. The application relies upon [VLC](https://www.videolan.org/vlc/) being installed, with access to the screen device.  The primary functionality of the plugin is to start and stop recording. The status bar contains an item that will provide you the current state of the recording process, and is an actionable element for starting/stopping a recording.

![Screen Capture in Action](./images/session.gif)

## Start Recording
This will initiate a new recording, and will prompt for the VLC installation directory if not set yet.  This can be triggered by:
* Click on the icon in the status bar to launch the recorder
* Accessing the command, via the command palette `Chronicler Start Recording`
* Using the predefined shortcut (by default `cmd+alt+shift+r`)

## Stop Recording 
This will stop the current recording, and provide a link to the final file location.  This can be triggered by:
* Click on the icon in the status bar to terminate the recorder
* Accessing the command, via the command palette `Chronicler Stop Recording`
* Using the predefined shortcut (by default `cmd+alt+shift+s`)

## Configuration
The available configuration options are:
* `chronicler.vlc-home` - This is the path to the VLC Installation Directory, will default appropriately by platform
* `chronicler.dest-folder` - This is the output folder for all recordings, defaults to `$HOME/Recordings`
* `chronicler.recording-defaults` - These are the default parameters for recording, this supports the following:
  * `port: number` - The telnet port used by vlc, defaults to `8080`
  * `duration?: number` - How long to record for, defaults to `0` which is indefinite
  * `fps: number` - Number of frames per second, defaults to `12`
  * `transcode?: object` - Configuration parameters to pass to the VLC transcode process
  * `flags?: object` - Configuration flags to pass to the VLC process

* `chronicler.debug` - Run the plugin in debug mode, provides more information when running vlc

# Requirements

* [VLC](https://www.videolan.org/vlc/) must be installed, with the access plugins for screen recording

# Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

# Release Notes

## 0.0.1
Initial release, support for `vlc`, primarily tested on OSX