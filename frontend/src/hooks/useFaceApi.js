import { useState, useEffect, useRef, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

export const useFaceApi = () => {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastDetection, setLastDetection] = useState(null);
  const [headPose, setHeadPose] = useState({ yaw: 0, pitch: 0, roll: 0 });
  const [gazeAngle, setGazeAngle] = useState({ x: 0, y: 0 });
  const [faceCount, setFaceCount] = useState(0);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);
  const faceMeshRef = useRef(null);
  const cameraRef = useRef(null);

  // Load models
  useEffect(() => {
    const loadModels = async () => {
      try {
        console.log('Starting face-api initialization...');
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
        
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        
        console.log('✅ Face-api models loaded');
        
        // Load MediaPipe for eye tracking
        await loadMediaPipe();
        
        setIsReady(true);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load models:', err);
        setError('Failed to load face detection models');
        setIsLoading(false);
      }
    };
    
    loadModels();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (faceMeshRef.current) {
        faceMeshRef.current.close();
      }
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
    };
  }, []);

  // Load MediaPipe
  const loadMediaPipe = async () => {
    try {
      const faceMesh = new FaceMesh({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        }
      });
      
      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      
      faceMesh.onResults((results) => {
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
          const landmarks = results.multiFaceLandmarks[0];
          
          // Get iris landmarks (468 = left iris, 473 = right iris)
          const leftIris = landmarks[468];
          const rightIris = landmarks[473];
          const leftEyeInner = landmarks[133];
          const leftEyeOuter = landmarks[33];
          const rightEyeInner = landmarks[362];
          const rightEyeOuter = landmarks[263];
          
          if (leftIris && rightIris && leftEyeInner && leftEyeOuter) {
            // Calculate gaze based on iris position
            const leftEyeWidth = leftEyeOuter.x - leftEyeInner.x;
            const rightEyeWidth = rightEyeOuter.x - rightEyeInner.x;
            
            if (leftEyeWidth > 0 && rightEyeWidth > 0) {
              const gazeX = ((leftIris.x - leftEyeInner.x) / leftEyeWidth * 0.5 +
                            (rightIris.x - rightEyeInner.x) / rightEyeWidth * 0.5) * 200 - 100;
              
              const leftEyeCenterY = (leftEyeInner.y + leftEyeOuter.y) / 2;
              const rightEyeCenterY = (rightEyeInner.y + rightEyeOuter.y) / 2;
              const gazeY = ((leftIris.y - leftEyeCenterY) +
                            (rightIris.y - rightEyeCenterY)) * 25;
              
              setGazeAngle({
                x: Math.min(Math.max(gazeX, -50), 50),
                y: Math.min(Math.max(gazeY, -30), 30)
              });
            }
          }
        }
      });
      
      faceMeshRef.current = faceMesh;
      console.log('✅ MediaPipe loaded for eye tracking');
      
    } catch (err) {
      console.warn('⚠️ MediaPipe not available, using fallback', err);
    }
  };

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        stopCamera();
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        await videoRef.current.play();
        
        // Start MediaPipe
        if (faceMeshRef.current && videoRef.current) {
          const camera = new Camera(videoRef.current, {
            onFrame: async () => {
              try {
                await faceMeshRef.current.send({ image: videoRef.current });
              } catch (err) {
                // Silently handle frame errors
              }
            },
            width: 640,
            height: 480
          });
          camera.start();
          cameraRef.current = camera;
        }
        
        // Start face-api detection loop
        startDetectionLoop();
      }
    } catch (err) {
      console.error('Failed to start camera:', err);
      setError('Camera access denied or unavailable');
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Calculate head pose
  const calculateHeadPose = (landmarks) => {
    if (!landmarks) return { yaw: 0, pitch: 0, roll: 0 };
    
    try {
      const nose = landmarks.getNose();
      const jawOutline = landmarks.getJawOutline();
      
      if (nose.length > 0 && jawOutline.length > 0) {
        const noseTip = nose[0];
        const leftJaw = jawOutline[0];
        const rightJaw = jawOutline[jawOutline.length - 1];
        
        if (leftJaw && rightJaw && noseTip) {
          const jawWidth = rightJaw.x - leftJaw.x;
          const faceCenterX = (leftJaw.x + rightJaw.x) / 2;
          
          const yaw = ((noseTip.x - faceCenterX) / jawWidth) * 60;
          
          const eyeY = (landmarks.getLeftEye()[0]?.y + landmarks.getRightEye()[0]?.y) / 2 || 0;
          const pitch = ((noseTip.y - eyeY) / 50) * 30;
          
          return {
            yaw: Math.min(Math.max(yaw, -45), 45),
            pitch: Math.min(Math.max(pitch, -30), 30),
            roll: 0
          };
        }
      }
    } catch (err) {
      console.warn('Head pose error:', err);
    }
    
    return { yaw: 0, pitch: 0, roll: 0 };
  };

  // Start detection loop
  const startDetectionLoop = useCallback(() => {
    const detect = async () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) {
        animationRef.current = requestAnimationFrame(detect);
        return;
      }
      
      try {
         const detections = await faceapi
          .detectAllFaces(videoRef.current, new faceapi.SsdMobilenetv1Options())
          .withFaceLandmarks()
          .withFaceDescriptor()
          .withFaceExpressions();

        setFaceCount(detections.length);

        if (detections.length > 0) {
          const primary = detections[0];
          const pose = calculateHeadPose(primary.landmarks);

          setHeadPose(pose);
          setLastDetection({
            detections,
            timestamp: Date.now(),
            headPose: pose,
            expressions: primary.expressions
          });
        } else {
          setLastDetection({
            detections: [],
            timestamp: Date.now(),
            headPose: { yaw: 0, pitch: 0, roll: 0 }
          });
        }
      } catch (err) {
        console.warn('Detection error:', err);
      }
      
      animationRef.current = requestAnimationFrame(detect);
    };
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    animationRef.current = requestAnimationFrame(detect);
  }, []);

  // Capture face descriptor
  const captureFaceDescriptor = useCallback(async () => {
    if (!videoRef.current || !isReady) {
      return null;
    }
    
    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options())
        .withFaceLandmarks()
        .withFaceDescriptor();
      
      if (!detection) {
        console.log('No face detected');
        return null;
      }
      
      return Array.from(detection.descriptor);
    } catch (err) {
      console.error('Failed to capture face descriptor:', err);
      return null;
    }
  }, [isReady]);

  // Capture photo
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current) {
      return null;
    }
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.8);
    } catch (err) {
      console.error('Failed to capture photo:', err);
      return null;
    }
  }, []);

  return {
    isReady,
    isLoading,
    error,
    videoRef,
    lastDetection,
    headPose,
    gazeAngle,
    faceCount,
    startCamera,
    stopCamera,
    captureFaceDescriptor,
    capturePhoto
  };
};