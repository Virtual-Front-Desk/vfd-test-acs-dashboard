import { useEffect, useState } from "react";
import { getAcsAuth, getCurrentUser } from "./api";
import {
  CallAgentProvider,
  CallClientProvider,
  CallProvider,
  FluentThemeProvider,
  StatefulCallClient,
  createStatefulCallClient,
} from "@azure/communication-react";
import {
  Call,
  CallAgent,
  LocalVideoStream,
} from "@azure/communication-calling";
import { AzureCommunicationTokenCredential } from "@azure/communication-common";
import VideoCallComponent from "./components/VideoCallComponent";
import { handleSecondCount } from "./helper";
import { updateCall } from "./api/stay";
import { db } from "./config/firebase";
import { onChildChanged, ref, update } from "firebase/database";

function App() {
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [callTimerSerialize, setCallTimerSerialize] = useState<string>("00:00");

  const [statefulCallClient, setStatefulCallClient] =
    useState<StatefulCallClient | null>(null);
  const [callAgent, setCallAgent] = useState<CallAgent | null>(null);
  const [call, setCall] = useState<Call | null>(null);

  const [isCallEnded, setIsCallEnded] = useState<boolean>(false);
  const [isCallError, setIsCallError] = useState<boolean>(false);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [secondTimer, setSecondTimer] = useState<NodeJS.Timeout | null>(null);

  const getMeetingLinkAndTokenFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const callLink = urlParams.get("callLink");
    const token = urlParams.get("token");
    const stayId = urlParams.get("stayId");
    const callKey = urlParams.get("callKey");

    return { callLink, token, stayId, callKey };
  }

  const handleSetCall = async (
    statefulCallClient: StatefulCallClient,
    selectedCamera: string,
    callAgent: CallAgent
  ) => {
    const deviceManager = await statefulCallClient.getDeviceManager();
    const cameras = await deviceManager.getCameras();

    const camera = cameras.find((camera) => camera.name === selectedCamera);

    const localVideoStream2 = new LocalVideoStream(camera!);

    setCall(
      callAgent.join(
        {
          meetingLink:
            getMeetingLinkAndTokenFromUrl().callLink as string
        },
        {
          videoOptions: localVideoStream2
            ? {
              localVideoStreams: [localVideoStream2],
            }
            : undefined,
        }
      )
    );
  };

  const handleSelectCameraAndMicrophone = async (
    statefulCallClient: StatefulCallClient,
    callAgent: CallAgent
  ) => {
    const deviceManager = await statefulCallClient.getDeviceManager();
    const cameras = await deviceManager.getCameras();
    const microphones = await deviceManager.getMicrophones();

    if (cameras.length === 0 || microphones.length === 0 || !selectedCamera) {
      const permission = await deviceManager.askDevicePermission({
        audio: true,
        video: true,
      });

      if (permission && permission.audio && permission.video) {
        const newCameras = await deviceManager.getCameras();
        const newMicrophones = await deviceManager.getMicrophones();

        if (newCameras.length === 0 || newMicrophones.length === 0) {
          alert("No camera or microphone found");
          window.location.reload();
        }

        if (newCameras.length > 0) {
          setSelectedCamera(newCameras[0].name);

          handleSetCall(statefulCallClient, newCameras[0].name, callAgent);
        }
      } else {
        alert("Permission denied");
        window.location.reload();
      }
    } else {
      if (cameras.length > 0) {
        setSelectedCamera(cameras[0].name);

        handleSetCall(statefulCallClient, cameras[0].name, callAgent);
      }
    }
  };

  const handleSetCallClient = async (
    tokenCredential: AzureCommunicationTokenCredential,
    callerId: string
  ) => {
    const statefulCallClient = createStatefulCallClient(
      {
        userId: { communicationUserId: callerId },
      },
    );

    const callAgent = await statefulCallClient.createCallAgent(
      tokenCredential,
      {
        displayName: "Dashboard",
      }
    );

    setStatefulCallClient(statefulCallClient);

    setCallAgent(callAgent);

    handleSelectCameraAndMicrophone(statefulCallClient, callAgent);
  };

  const handleJoinCall = async () => {
    const acsAuth = await getAcsAuth("DashboardData");

    if (acsAuth.userId && acsAuth.token) {
      const tokenCredential = new AzureCommunicationTokenCredential(
        acsAuth.token
      );

      handleSetCallClient(tokenCredential, acsAuth.userId);
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    const { callLink, stayId } = getMeetingLinkAndTokenFromUrl();

    if (!callLink || !stayId) {
      setIsCallError(true);
      return;
    }


    const asynCall = async () => {
      if (!call) {
        const fireOwnerId = !currentUser
          ? 0
          : !!currentUser.Receptionists[0]
            ? currentUser.Receptionists[0].auth0Id
              ? currentUser.Receptionists[0].auth0Id
              : currentUser.Receptionists[0].OwnerId
            : currentUser.Auth0Id
              ? currentUser.Auth0Id
              : currentUser.id;

        const callQuery = ref(db, `calls/${fireOwnerId}/${getMeetingLinkAndTokenFromUrl().callKey}`);

        onChildChanged(callQuery, async (data) => {
          if (data.key === "status") {
            if (data.val() === 3) {
              handleHangUp();
            }
          }
        });

        setTimeout(() => {
          handleSecondCount(setCallTimerSerialize, setSecondTimer);
        }, 1000);

        handleJoinCall();
      }
    }
    asynCall();

    return () => {
      if (call) {
        call.hangUp();
      }
      if (secondTimer) {
        clearInterval(secondTimer);
      }
    };
  }, [call, currentUser]);

  useEffect(() => {
    const token = getMeetingLinkAndTokenFromUrl().token;
    if (!token) {
      setIsCallError(true);
      return;
    }

    const getUser = async () => {
      const { user } = await getCurrentUser(token);

      if (user) {
        setCurrentUser(user);
      } else {
        setIsCallError(true);
        return;
      }
    };

    getUser();
  }, []);

  const handleHangUp = async () => {
    setIsCallEnded(true);

    const ownerId = !currentUser ? 0 : !!currentUser.Receptionists[0] ? currentUser.Receptionists[0].OwnerId : currentUser.id;

    const data = {
      id: parseInt(getMeetingLinkAndTokenFromUrl().stayId as string),
      ownerId: ownerId,
      callDuration: callTimerSerialize,
      receptionist: currentUser.FirstName + " " + currentUser.LastName,
      hangupReason: 2,
    };

    await updateCall(data, getMeetingLinkAndTokenFromUrl().token as string);

    const fireOwnerId = !currentUser
      ? 0
      : !!currentUser.Receptionists[0]
        ? currentUser.Receptionists[0].auth0Id
          ? currentUser.Receptionists[0].auth0Id
          : currentUser.Receptionists[0].OwnerId
        : currentUser.Auth0Id
          ? currentUser.Auth0Id
          : currentUser.id;

    if ((call as any).totalParticipantCount <= 2) {
      const callQuery = ref(db, `calls/${fireOwnerId}/${getMeetingLinkAndTokenFromUrl().callKey}`);

      update(callQuery, {
        status: 3,
      });
    }

    window.location.href = 'myapp://?callEnded=true&callKey=' + getMeetingLinkAndTokenFromUrl().callKey;
  }

  if (isCallEnded) {
    return (
      <div className="w-full flex justify-center items-center h-[100vh]">
        <p className="text-3xl font-bold">
          Call ended
        </p>
      </div>
    );
  }

  if (isCallError) {
    return (
      <div className="w-full flex justify-center items-center h-[100vh]">
        <p className="text-3xl font-bold">
          Error joining call
        </p>

      </div>
    );
  }

  return (
    <>
      <div className="w-full flex justify-center items-center h-[100vh]">
        {statefulCallClient && callAgent && call ? (
          <FluentThemeProvider>
            <CallClientProvider callClient={statefulCallClient}>
              <CallAgentProvider callAgent={callAgent}>
                <CallProvider call={call}>
                  <VideoCallComponent handleHangUp={handleHangUp} />
                </CallProvider>
              </CallAgentProvider>
            </CallClientProvider>
          </FluentThemeProvider>
        ) : (
          <div className="flex justify-center items-center gap-3">
            <p className="text-3xl font-bold">
              Loading call...
            </p>
            <svg aria-hidden="true" className="w-12 h-12 text-gray-200 animate-spin dark:text-gray-600 fill-green-400" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
              <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
            </svg>
          </div>
        )}
      </div>
    </>
  );
}

export default App;
