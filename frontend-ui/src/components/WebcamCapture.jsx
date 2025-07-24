import React, { useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";

const WebcamCapture = ({ onCapture, width = "100%", height = "100%" }) => {
  const webcamRef = useRef(null);
  const [imgSrc, setImgSrc] = useState(null);

  const capture = useCallback(() => {
    const image = webcamRef.current.getScreenshot();
    setImgSrc(image);
    if (onCapture) {
      onCapture(image);
    }
  }, [onCapture]);

  const videoConstraints = {
    facingMode: "user", // Front camera
  };

  return imgSrc ? (
    <div className="relative w-full h-full">
      <img src={imgSrc} alt="captured" className="w-full h-full object-cover" />
      <button
        onClick={() => setImgSrc(null)}
        className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white text-black px-4 py-2 rounded-lg"
      >
        Retake
      </button>
    </div>
  ) : (
    <div className="relative w-full h-full">
      <Webcam
        audio={false}
        mirrored
        screenshotFormat="image/jpeg"
        ref={webcamRef}
        videoConstraints={videoConstraints}
        className="w-full h-full object-cover"
        style={{ width, height }}
      />
      <button
        onClick={capture}
        className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white text-black px-4 py-2 rounded-lg"
      >
        Capture
      </button>
    </div>
  );
};

export default WebcamCapture;
