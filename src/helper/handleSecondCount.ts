export const handleSecondCount = (
    setCallTimerSerialize: React.Dispatch<React.SetStateAction<string>>,
    setSecondTimer: React.Dispatch<React.SetStateAction<NodeJS.Timeout | null>>
) => {
    const startTime = new Date().getTime();

    const updateTimer = () => {
        const currentTime = new Date().getTime();
        const elapsedTime = Math.floor((currentTime - startTime) / 1000);

        const minutes = String(Math.floor(elapsedTime / 60)).padStart(2, "0");
        const seconds = String(elapsedTime % 60).padStart(2, "0");

        setCallTimerSerialize(`${minutes}:${seconds}`);
    };

    setSecondTimer(setInterval(updateTimer, 1000));
};
