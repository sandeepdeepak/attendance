// src/WebcamCapture.js
import React, { useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";

const WebcamCapture = ({ onCapture }) => {
  const webcamRef = useRef(null);
  const [imgSrc, setImgSrc] = useState(null);

  const capture = useCallback(() => {
    const image = webcamRef.current.getScreenshot();
    setImgSrc(image);
    onCapture(image);
  }, [onCapture]);

  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: "user", // 📱 front camera
  };

  return imgSrc ? (
    <div>
      <img src={imgSrc} alt="captured" />
      <br />
      <button onClick={() => setImgSrc(null)}>Retake</button>
    </div>
  ) : (
    <div>
      <Webcam
        audio={false}
        mirrored
        screenshotFormat="image/jpeg"
        ref={webcamRef}
        videoConstraints={videoConstraints}
        style={{ width: "50%", maxWidth: 400 }}
      />
      <br />
      <button onClick={capture}>Capture Photo</button>
    </div>
  );
};

export default WebcamCapture;
