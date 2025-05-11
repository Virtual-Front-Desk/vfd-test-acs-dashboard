import {
  CameraButton,
  ControlBar,
  DEFAULT_COMPOSITE_ICONS,
  EndCallButton,
  MicrophoneButton,
  ScreenShareButton,
  VideoGallery,
  VideoStreamOptions,
  usePropsFor,
} from "@azure/communication-react";
import { Stack, initializeIcons, registerIcons } from "@fluentui/react";
import { FC, useCallback } from "react";

initializeIcons();
registerIcons({ icons: DEFAULT_COMPOSITE_ICONS });

const classes = {
  stackContainer: "h-[80vh] w-full",
};

interface VideoCallComponentProps {
  handleHangUp: () => void;
}

const VideoCallComponent: FC<VideoCallComponentProps> = ({ handleHangUp }) => {
  const videoGalleryProps = usePropsFor(VideoGallery);
  const endCallProps = usePropsFor(EndCallButton);
  const cameraProps = usePropsFor(CameraButton);
  const microphoneProps = usePropsFor(MicrophoneButton);
  const screenShareProps = usePropsFor(ScreenShareButton);

  const onHangup = useCallback(async () => {
    try {
      await endCallProps.onHangUp();
    } catch (e) {
      console.log("error", e);
    }

    await handleHangUp();
  }, [endCallProps]);

  const remoteVideoViewOptions = {
    scalingMode: "Fit",
    isMirrored: false,
  } as VideoStreamOptions;

  return (
    <>
      <Stack className={classes.stackContainer}>
        {videoGalleryProps && (
          <>
            <VideoGallery
              layout="floatingLocalVideo"
              localVideoViewOptions={remoteVideoViewOptions}
              remoteVideoViewOptions={remoteVideoViewOptions}
              {...videoGalleryProps}
            />
          </>
        )}
      </Stack>
      <div>
        <ControlBar layout="floatingTop">
          {endCallProps && (
            <EndCallButton {...endCallProps} onHangUp={onHangup} />
          )}
          {screenShareProps && <ScreenShareButton {...screenShareProps} />}
          {cameraProps && <CameraButton {...cameraProps} />}
          {microphoneProps && <MicrophoneButton {...microphoneProps} />}
        </ControlBar>
      </div>
    </>
  );
};

export default VideoCallComponent;
