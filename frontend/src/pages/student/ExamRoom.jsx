import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { sessionAPI, proctoringAPI, faceAPI } from "../../api/services";
import AudioMonitor from "../../services/AudioMonitor";
import {
  Camera,
  Shield,
  Eye,
  Monitor,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Headphones,
  GripHorizontal,
} from "lucide-react";
import { showToast } from "../../hooks/useToast";

// Load face-api dynamically
let faceapi;
const loadFaceApi = async () => {
  if (!faceapi) {
    faceapi = await import("face-api.js");
  }
  return faceapi;
};

const CAMERA_MARGIN = 16;

const getDefaultCameraPos = () => ({
  x: Math.max(
    CAMERA_MARGIN,
    window.innerWidth - 224 - CAMERA_MARGIN,
  ),
  y: Math.max(
    CAMERA_MARGIN,
    window.innerHeight - 168 - CAMERA_MARGIN,
  ),
});

export default function ExamRoom() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const studentId = user?._id || user?.id;
  const [session, setSession] = useState(null);
  const [exam, setExam] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [audioLevel, setAudioLevel] = useState(-100);
  const [audioViolations, setAudioViolations] = useState([]);
  const [proctoringStatus, setProctoringStatus] = useState({
    faceDetected: false,
    faceVerified: false,
    headStable: true,
    headYaw: 0,
    headPitch: 0,
    gazeX: 0,
    gazeY: 0,
    violations: 0,
    audioViolations: 0,
  });
  const [showAlert, setShowAlert] = useState(null);
  const [recentViolations, setRecentViolations] = useState([]);
  const [cameraPos, setCameraPos] = useState(getDefaultCameraPos);
  const [isDraggingCamera, setIsDraggingCamera] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const proctoringIntervalRef = useRef(null);
  const audioMonitorRef = useRef(null);
  const isCheckingRef = useRef(false);
  const cameraContainerRef = useRef(null);
  const cameraDragRef = useRef({ startX: 0, startY: 0, posX: 0, posY: 0 });
  const isDraggingCameraRef = useRef(false);
  const cameraPosRef = useRef(cameraPos);
  cameraPosRef.current = cameraPos;
  const examEndTimeRef = useRef(null);

  // Tracking refs for violations
  const gazeOffScreenStartTime = useRef(null);
  const totalHeadMovement = useRef(0);
  const lastViolationTime = useRef(0);
  const lastGazeX = useRef(0);
  const lastGazeY = useRef(0);
  const eyeMovementCount = useRef(0);
  const verifyCycleCount = useRef(0); // throttles identity verification calls

  const clampCameraPos = (x, y) => {
    const width = cameraContainerRef.current?.offsetWidth || 224;
    const height = cameraContainerRef.current?.offsetHeight || 168;

    return {
      x: Math.max(
        CAMERA_MARGIN,
        Math.min(window.innerWidth - width - CAMERA_MARGIN, x),
      ),
      y: Math.max(
        CAMERA_MARGIN,
        Math.min(window.innerHeight - height - CAMERA_MARGIN, y),
      ),
    };
  };

  const handleCameraDragStart = (e) => {
    if (e.button !== undefined && e.button !== 0) return;

    e.preventDefault();
    isDraggingCameraRef.current = true;
    setIsDraggingCamera(true);

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    cameraDragRef.current = {
      startX: clientX,
      startY: clientY,
      posX: cameraPosRef.current.x,
      posY: cameraPosRef.current.y,
    };
  };

  useEffect(() => {
    const handleCameraDragMove = (e) => {
      if (!isDraggingCameraRef.current) return;

      if ("touches" in e) e.preventDefault();

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const { startX, startY, posX, posY } = cameraDragRef.current;

      setCameraPos(
        clampCameraPos(posX + clientX - startX, posY + clientY - startY),
      );
    };

    const handleCameraDragEnd = () => {
      isDraggingCameraRef.current = false;
      setIsDraggingCamera(false);
    };

    window.addEventListener("mousemove", handleCameraDragMove);
    window.addEventListener("mouseup", handleCameraDragEnd);
    window.addEventListener("touchmove", handleCameraDragMove, {
      passive: false,
    });
    window.addEventListener("touchend", handleCameraDragEnd);

    return () => {
      window.removeEventListener("mousemove", handleCameraDragMove);
      window.removeEventListener("mouseup", handleCameraDragEnd);
      window.removeEventListener("touchmove", handleCameraDragMove);
      window.removeEventListener("touchend", handleCameraDragEnd);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setCameraPos((prev) => clampCameraPos(prev.x, prev.y));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Capture current video frame as base64
  const captureFrameAsBase64 = () => {
    if (!videoRef.current || !videoRef.current.videoWidth) return null;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.5);
  };

  // ========== AUDIO MONITORING SETUP ==========
  const setupAudioMonitoring = async () => {
    if (!audioEnabled) return;

    try {
      audioMonitorRef.current = new AudioMonitor();
      const started = await audioMonitorRef.current.start();

      if (started) {
        console.log("✅ Audio monitoring active");

        audioMonitorRef.current.on("AudioLevel", (data) => {
          setAudioLevel(data.average);
        });

        audioMonitorRef.current.on("Violation", async (violation) => {
          console.log("🔊 Audio violation:", violation);

          setRecentViolations((prev) =>
            [
              {
                id: Date.now(),
                type: violation.type,
                severity: violation.severity,
                message: violation.message,
                timestamp: new Date().toLocaleTimeString(),
              },
              ...prev,
            ].slice(0, 5),
          );

          setProctoringStatus((prev) => ({
            ...prev,
            audioViolations: prev.audioViolations + 1,
            violations: prev.violations + 1,
          }));

          setAudioViolations((prev) => [...prev, violation]);

          try {
            await proctoringAPI.logAudioViolation(sessionId, violation);
          } catch (err) {
            console.error("Failed to log audio violation:", err);
          }

          const severityColors = {
            high: "bg-red-500",
            medium: "bg-yellow-500",
            low: "bg-blue-500",
          };
          setShowAlert({
            message: violation.message,
            type: severityColors[violation.severity] || "bg-yellow-500",
            timestamp: Date.now(),
          });
          setTimeout(() => setShowAlert(null), 5000);
        });
      }
    } catch (err) {
      console.error("Failed to setup audio monitoring:", err);
      setAudioEnabled(false);
    }
  };

  const stopAudioMonitoring = () => {
    if (audioMonitorRef.current) {
      audioMonitorRef.current.stop();
      audioMonitorRef.current = null;
    }
  };
  // ========== END AUDIO MONITORING ==========

  // Load face-api models
  useEffect(() => {
    const initFaceApi = async () => {
      try {
        const faceapiModule = await loadFaceApi();
        const MODEL_URL =
          "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/";

        await Promise.all([
          faceapiModule.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapiModule.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapiModule.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);

        console.log(" Face-api models loaded");
        setModelsLoaded(true);
        startCamera();
      } catch (err) {
        console.error("Failed to load face-api:", err);
      }
    };

    initFaceApi();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (proctoringIntervalRef.current)
        clearInterval(proctoringIntervalRef.current);
      stopAudioMonitoring();
    };
  }, []);

  // startCamera with audio permission
  const startCamera = async () => {
    try {
      console.log("📷 Starting camera with audio...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: true, // Request audio permission
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;

        // Wait for video to be ready
        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = () => resolve();
        });

        await videoRef.current.play();
        console.log("✅ Camera started with audio");

        setTimeout(async () => {
          await setupAudioMonitoring();
        }, 1000);
      }
    } catch (err) {
      console.error("Camera error:", err);
      // Try without audio if video fails
      if (err.name === "NotAllowedError" || err.name === "NotFoundError") {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: "user" },
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            streamRef.current = stream;
            await videoRef.current.play();
            console.log("✅ Camera started (without audio)");
            setAudioEnabled(false);
          }
        } catch (retryErr) {
          console.error("Camera retry failed:", retryErr);
        }
      }
    }
  };

  // Load session data
  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      try {
        const res = await sessionAPI.getById(sessionId);
        if (cancelled) return;

        const sessionData = res.data.session;
        setSession(sessionData);
        setExam(sessionData.exam);

        const savedAnswers = {};
        if (sessionData.answers) {
          sessionData.answers.forEach((ans) => {
            if (ans.questionId) savedAnswers[ans.questionId] = ans.answer;
          });
        }
        setAnswers(savedAnswers);

        if (sessionData.startedAt && sessionData.exam?.duration) {
          const startedAt = new Date(sessionData.startedAt).getTime();
          const durationSeconds = sessionData.exam.duration * 60;
          examEndTimeRef.current = startedAt + durationSeconds * 1000;

          const syncTimer = () => {
            const remaining = Math.max(
              0,
              Math.floor((examEndTimeRef.current - Date.now()) / 1000),
            );
            setTimeLeft(remaining);

            if (remaining <= 0) {
              if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
              }
              handleSubmitExam();
            }
          };

          syncTimer();

          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = setInterval(syncTimer, 1000);
        }

        setLoading(false);
      } catch (err) {
        console.error("Failed to load session:", err);
        if (!cancelled) navigate("/student/dashboard");
      }
    };

    if (sessionId) loadSession();

    return () => {
      cancelled = true;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [sessionId]);

  // ========== PROCTORING CHECK WITH RELAXED VIOLATIONS ==========
  const performProctoringCheck = async () => {
    if (!modelsLoaded || !videoRef.current) return;

    if (!modelsLoaded || !videoRef.current || isCheckingRef.current) {
      return;
    }

    isCheckingRef.current = true;

    try {
      const faceapiModule = await loadFaceApi();
      const frameImage = captureFrameAsBase64();

      const detections = await faceapiModule
        .detectAllFaces(
          videoRef.current,
          new faceapiModule.SsdMobilenetv1Options(),
        )
        .withFaceLandmarks()
        .withFaceDescriptors();

      const faceCount = detections.length;
      const hasFace = faceCount > 0;

      const detection = hasFace ? detections[0] : null;
      let faceDescriptor = null;
      let headYaw = 0,
        headPitch = 0;
      let gazeX = 0,
        gazeY = 0;

      if (detection) {
        faceDescriptor = Array.from(detection.descriptor);
        const landmarks = detection.landmarks;

        // ===== HEAD POSE CALCULATION =====
        const nose = landmarks.getNose();
        const jawOutline = landmarks.getJawOutline();

        if (nose.length > 0 && jawOutline.length > 0) {
          const noseX = nose[0].x;
          const leftJaw = jawOutline[0].x;
          const rightJaw = jawOutline[jawOutline.length - 1].x;
          const faceCenter = (leftJaw + rightJaw) / 2;

          headYaw = ((noseX - faceCenter) / (rightJaw - leftJaw)) * 60;
          const noseY = nose[0].y;
          const eyeY =
            (landmarks.getLeftEye()[0]?.y + landmarks.getRightEye()[0]?.y) / 2;
          headPitch = ((noseY - eyeY) / 50) * 30;

          headYaw = Math.min(Math.max(headYaw, -45), 45);
          headPitch = Math.min(Math.max(headPitch, -30), 30);
        }

        // ===== GAZE CALCULATION =====
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();

        if (leftEye.length > 0 && rightEye.length > 0) {
          const leftEyeCenter = {
            x: leftEye.reduce((sum, p) => sum + p.x, 0) / leftEye.length,
            y: leftEye.reduce((sum, p) => sum + p.y, 0) / leftEye.length,
          };
          const rightEyeCenter = {
            x: rightEye.reduce((sum, p) => sum + p.x, 0) / rightEye.length,
            y: rightEye.reduce((sum, p) => sum + p.y, 0) / rightEye.length,
          };

          const leftEyeCorner = leftEye[0];
          const rightEyeCorner = rightEye[rightEye.length - 1];

          gazeX =
            ((leftEyeCenter.x - leftEyeCorner.x) /
              (rightEyeCorner.x - leftEyeCorner.x) -
              0.5) *
            40;
          gazeY = ((leftEyeCenter.y - leftEyeCorner.y) / 20) * 30;

          gazeX = Math.min(Math.max(gazeX, -30), 30);
          gazeY = Math.min(Math.max(gazeY, -20), 20);
        }
      }

      // RELAXED: Head stability thresholds increased
      const isHeadStable = Math.abs(headYaw) < 40 && Math.abs(headPitch) < 30;

      // ===== UPDATE UI =====
      setProctoringStatus((prev) => ({
        ...prev,
        faceDetected: hasFace,
        headStable: isHeadStable,
        headYaw: headYaw,
        headPitch: headPitch,
        gazeX: gazeX,
        gazeY: gazeY,
      }));

      // ===== LOG VALUES =====
      console.log(
        `📊 Face: ${hasFace ? "✅" : "❌"} | Yaw: ${headYaw.toFixed(1)}° | Pitch: ${headPitch.toFixed(1)}° | Gaze: (${gazeX.toFixed(1)}, ${gazeY.toFixed(1)}) | Stable: ${isHeadStable}`,
      );

      // ===== CHECK VIOLATIONS - RELAXED MODE =====
      let violations = [];
      const now = Date.now();

      // 1. No Face → High violation (keep strict)
      if (!hasFace) {
        violations.push({
          type: "no_face",
          severity: "high",
          score: 10,
          message: "No face detected - please look at camera",
        });
      }

      // 2. Multiple Faces → High violation (keep strict)
      if (faceCount > 1) {
        violations.push({
          type: "multiple_faces",
          severity: "high",
          score: 10,
          message: "Multiple faces detected - only you should be visible",
        });
      }

      // 3. Head Turned - RELAXED: increased from 9° to 15°
      if (Math.abs(headYaw) > 15) {
        violations.push({
          type: "head_turned",
          severity: "medium",
          score: 4,
          value: headYaw,
          message: `Head turned ${headYaw > 0 ? "right" : "left"} ${Math.abs(headYaw).toFixed(1)}°`,
        });
      }

      // 4. Head Tilted - RELAXED: increased from 9° to 15°
      if (Math.abs(headPitch) > 15) {
        violations.push({
          type: "head_tilted",
          severity: "medium",
          score: 4,
          value: headPitch,
          message: `Head tilted ${headPitch > 0 ? "up" : "down"} ${Math.abs(headPitch).toFixed(1)}°`,
        });
      }

      // 5. Head Movement Warning - RELAXED: 10°-15° range
      if (
        (Math.abs(headYaw) > 10 || Math.abs(headPitch) > 10) &&
        Math.abs(headYaw) <= 15 &&
        Math.abs(headPitch) <= 15
      ) {
        violations.push({
          type: "head_movement_warning",
          severity: "low",
          score: 1,
          message: "Head moving - please try to stay still",
        });
      }

      // 6. Excessive Head Movement - RELAXED
      if (hasFace) {
        const headMovement = Math.abs(headYaw) + Math.abs(headPitch);
        if (headMovement > 25) {
          totalHeadMovement.current += headMovement;
          if (totalHeadMovement.current > 150) {
            violations.push({
              type: "excessive_head_movement",
              severity: "medium",
              score: 4,
              message: "Excessive head movement detected",
            });
            totalHeadMovement.current = 0;
          }
        } else {
          totalHeadMovement.current = Math.max(
            0,
            totalHeadMovement.current - 5,
          );
        }
      }

      // ===== EYE/GAZE VIOLATIONS - RELAXED =====
      if (hasFace) {
        const gazeMagnitude = Math.sqrt(gazeX * gazeX + gazeY * gazeY);

        // 1. Eye Movement Tracking - RELAXED
        const gazeChange =
          Math.abs(gazeX - lastGazeX.current) +
          Math.abs(gazeY - lastGazeY.current);
        lastGazeX.current = gazeX;
        lastGazeY.current = gazeY;

        // Increased threshold from 5 to 10, and from 3 to 5 consecutive movements
        if (gazeChange > 10) {
          eyeMovementCount.current += 1;
          if (eyeMovementCount.current > 5) {
            violations.push({
              type: "rapid_eye_movement",
              severity: "low",
              score: 3,
              message: "👀 Rapid eye movement detected",
            });
            eyeMovementCount.current = 0;
          }
        } else {
          eyeMovementCount.current = Math.max(0, eyeMovementCount.current - 1);
        }

        // 2. Eyes Not Looking at Screen - RELAXED: increased from 15 to 25
        if (gazeMagnitude > 25) {
          violations.push({
            type: "gaze_off_screen",
            severity: "low",
            score: 3,
            value: gazeMagnitude,
            message: `👀 Eyes looking away`,
          });
        }

        // 3. Prolonged Gaze Off Screen - RELAXED: 20 threshold, 5s duration
        if (gazeMagnitude > 20) {
          if (gazeOffScreenStartTime.current === null) {
            gazeOffScreenStartTime.current = now;
          } else if (now - gazeOffScreenStartTime.current > 5000) {
            violations.push({
              type: "prolonged_gaze_off_screen",
              severity: "medium",
              score: 5,
              message: "⏰ Eyes off screen for 5+ seconds",
            });
            gazeOffScreenStartTime.current = null;
          }
        } else {
          gazeOffScreenStartTime.current = null;
        }

        // 4. Eye Direction - RELAXED: increased thresholds
        if (Math.abs(gazeX) > 28) {
          violations.push({
            type: "eye_direction",
            severity: "low",
            score: 3,
            message: `Eyes looking ${gazeX > 0 ? "RIGHT" : "LEFT"}`,
          });
        }

        if (Math.abs(gazeY) > 22) {
          violations.push({
            type: "eye_direction",
            severity: "low",
            score: 3,
            message: `Eyes looking ${gazeY > 0 ? "DOWN" : "UP"}`,
          });
        }
      }

      // ===== IDENTITY VERIFICATION AGAINST ENROLLED FACE =====
      // Throttled to every 2nd cycle (~every 6s at a 3s interval) since
      // server-side face_recognition extraction is heavier than the
      // client-side pose/gaze math above.
      verifyCycleCount.current += 1;
      if (frameImage && studentId && verifyCycleCount.current % 2 === 0) {
        try {
          const verifyResult = await faceAPI.verifyFace(frameImage, studentId);
          const { verified, confidence } = verifyResult.data;

          setProctoringStatus((prev) => ({
            ...prev,
            faceVerified: verified,
          }));

          if (!verified) {
            violations.push({
              type: "identity_mismatch",
              severity: "high",
              score: 10,
              message: `Face does not match registered student (confidence: ${((confidence || 0) * 100).toFixed(0)}%)`,
            });
          }
        } catch (err) {
          console.warn("Identity verification failed:", err.message);
        }
      }

      // ===== PROCESS VIOLATIONS =====
      if (violations.length > 0) {
        if (now - lastViolationTime.current > 3000) {
          console.log("Violations detected:", violations);

          const newViolations = violations.map((v) => ({
            id: Date.now() + Math.random(),
            type: v.type,
            severity: v.severity,
            message: v.message,
            value: v.value,
            timestamp: new Date().toLocaleTimeString(),
            score: v.score,
          }));

          setRecentViolations((prev) =>
            [...newViolations, ...prev].slice(0, 10),
          );

          setProctoringStatus((prev) => ({
            ...prev,
            violations: prev.violations + violations.length,
          }));

          const firstViolation = violations[0];
          setShowAlert({
            message: ` ${firstViolation.message}`,
            type:
              firstViolation.severity === "high"
                ? "bg-red-500"
                : "bg-yellow-500",
            timestamp: Date.now(),
          });
          setTimeout(() => setShowAlert(null), 4000);

          lastViolationTime.current = now;

          try {
            for (const v of violations) {
              await proctoringAPI.logAudioViolation(sessionId, v);
            }
          } catch (err) {
            console.error("Failed to log violations:", err);
          }
        }
      }

      // ===== SEND TO BACKEND =====
      try {
        const proctoringData = {
          sessionId,
          liveDescriptor: faceDescriptor || [],
          faceCount,
          headPose: { yaw: headYaw, pitch: headPitch, roll: 0 },
          gazeAngle: { x: gazeX, y: gazeY },
          isFullscreen: !!document.fullscreenElement,
          hasFocus: document.hasFocus(),
          frameImage: frameImage,
          violations: violations,
        };

        const result = await proctoringAPI.verify(proctoringData);
        if (result.data.violations > 0) {
          setProctoringStatus((prev) => ({
            ...prev,
            violations: result.data.violations,
          }));
        }
      } catch (backendErr) {
        console.warn("Backend proctoring check failed:", backendErr.message);
      }
    } catch (err) {
      console.error("Proctoring check failed:", err);
    } finally {
      isCheckingRef.current = false;
    }
  };
  // ========== END PROCTORING CHECK ==========

  // Start periodic proctoring
  useEffect(() => {
    if (!modelsLoaded || !sessionId) return;
    setTimeout(performProctoringCheck, 2000);
    proctoringIntervalRef.current = setInterval(performProctoringCheck, 3000);
    return () => {
      if (proctoringIntervalRef.current)
        clearInterval(proctoringIntervalRef.current);
    };
  }, [modelsLoaded, sessionId]);

  // Keep audio context alive
  useEffect(() => {
    const keepAlive = setInterval(() => {
      if (audioMonitorRef.current?.audioContext) {
        const ctx = audioMonitorRef.current.audioContext;
        if (ctx.state === "suspended") {
          console.log("Audio context suspended, resuming...");
          ctx.resume().catch((err) => console.warn("Failed to resume:", err));
        }
      }
    }, 5000);

    return () => clearInterval(keepAlive);
  }, [audioEnabled]);

  // Tab switch detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && sessionId) {
        proctoringAPI.logTabSwitch(sessionId);
        setShowAlert({
          message: "⚠️ Tab switch detected! Stay on exam tab.",
          type: "bg-red-500",
          timestamp: Date.now(),
        });
        setTimeout(() => setShowAlert(null), 5000);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
  }, [sessionId]);

  const handleSaveAnswer = async (questionId, answer) => {
    if (!questionId) return;
    try {
      await sessionAPI.submitAnswer(sessionId, questionId, answer);
      setAnswers((prev) => ({ ...prev, [questionId]: answer }));
    } catch (err) {
      console.error("Failed to save answer:", err);
    }
  };

  const handleSubmitExam = async () => {
    if (submitting) return;
    setSubmitting(true);
    stopAudioMonitoring();
    try {
      if (session && session.student && user) {
        const sessionStudentId = String(
          session.student._id || session.student,
        );
        const currentUserId = String(user._id || user.id || user._id);
        console.debug(
          "Submitting exam — session student:",
          sessionStudentId,
          "current user:",
          currentUserId,
        );
        if (sessionStudentId !== currentUserId) {
          showToast(
            "error",
            "Cannot submit",
            `You are not the student for this session (session student: ${sessionStudentId})`,
          );
          setSubmitting(false);
          return;
        }
      }

      await sessionAPI.complete(sessionId);
      showToast("success", "Exam submitted successfully!");
      navigate("/student/dashboard");
    } catch (err) {
      console.error("Failed to submit exam:", err);
      showToast(
        "error",
        "Error submitting exam",
        err.response?.data?.message || err.message || "",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAudio = () => {
    if (audioEnabled) {
      stopAudioMonitoring();
      setAudioEnabled(false);
    } else {
      setAudioEnabled(true);
      setupAudioMonitoring();
    }
  };

  const getAudioLevelColor = (level) => {
    if (level > -30) return "bg-red-500";
    if (level > -50) return "bg-yellow-500";
    if (level > -70) return "bg-green-500";
    return "bg-gray-500";
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const currentQuestion = exam?.questions?.[currentQuestionIndex];
  const currentAnswer = currentQuestion?._id
    ? answers[currentQuestion._id] || ""
    : "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900">
      {/* Proctoring Status Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 shadow-lg">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Face Status */}
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  proctoringStatus.faceDetected
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse"
                }`}
              >
                <Shield className="w-3 h-3" />
                <span>
                  {proctoringStatus.faceDetected ? "Face Detected" : "No Face"}
                </span>
              </div>

              {/* Identity Verification Status */}
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  proctoringStatus.faceVerified
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse"
                }`}
              >
                <Shield className="w-3 h-3" />
                <span>
                  {proctoringStatus.faceVerified
                    ? "Identity Verified"
                    : "Identity Not Verified"}
                </span>
              </div>

              {/* Head Stability */}
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  proctoringStatus.headStable
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                }`}
              >
                <Monitor className="w-3 h-3" />
                <span>
                  {proctoringStatus.headStable
                    ? "Head Stable"
                    : "Head Movement"}
                </span>
              </div>

              {/* Head Pose Values */}
              {proctoringStatus.faceDetected && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <span>Yaw: {proctoringStatus.headYaw?.toFixed(1) || 0}°</span>
                  <span className="text-slate-600">|</span>
                  <span>
                    Pitch: {proctoringStatus.headPitch?.toFixed(1) || 0}°
                  </span>
                </div>
              )}

              {/* Gaze Values */}
              {proctoringStatus.faceDetected && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <Eye className="w-3 h-3" />
                  <span>
                    Gaze: ({proctoringStatus.gazeX?.toFixed(1) || 0},{" "}
                    {proctoringStatus.gazeY?.toFixed(1) || 0})
                  </span>
                </div>
              )}

              {/* Audio Status with Meter */}
              <div className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    audioEnabled
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      : "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                  }`}
                >
                  {audioEnabled ? (
                    <Mic className="w-3 h-3" />
                  ) : (
                    <MicOff className="w-3 h-3" />
                  )}
                  <span>{audioEnabled ? "Audio Active" : "Audio Off"}</span>
                </div>

                {audioEnabled && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-100 ${getAudioLevelColor(audioLevel)}`}
                        style={{
                          width: `${Math.min(100, Math.max(0, ((audioLevel + 100) / 100) * 100))}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {Math.round(audioLevel)} dB
                    </span>
                    {audioLevel > -30 && (
                      <Volume2 className="w-3 h-3 text-red-400 animate-pulse" />
                    )}
                  </div>
                )}
              </div>

              {/* Violation Counter */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
                <Eye className="w-3 h-3" />
                <span>
                  Violations:{" "}
                  {proctoringStatus.violations +
                    proctoringStatus.audioViolations}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleAudio}
                className={`p-1.5 rounded-lg transition-all duration-200 ${
                  audioEnabled
                    ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30"
                    : "bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 border border-slate-600"
                }`}
                title={
                  audioEnabled
                    ? "Disable audio monitoring"
                    : "Enable audio monitoring"
                }
              >
                {audioEnabled ? (
                  <Mic className="w-4 h-4" />
                ) : (
                  <MicOff className="w-4 h-4" />
                )}
              </button>

              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800/50 border border-slate-700">
                <Camera
                  className={`w-3.5 h-3.5 ${modelsLoaded ? "text-green-400" : "text-yellow-400"}`}
                />
                <span className="text-[11px] text-slate-300 font-medium">
                  {modelsLoaded ? "Proctoring Active" : "Loading..."}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div
        ref={cameraContainerRef}
        className="fixed z-50 group select-none"
        style={{ left: cameraPos.x, top: cameraPos.y }}
      >
        <div
          className={`relative w-56 rounded-xl overflow-hidden border-2 border-blue-500/50 shadow-2xl bg-slate-800 transition-shadow duration-200 ${
            isDraggingCamera
              ? "shadow-blue-500/40 cursor-grabbing"
              : "hover:shadow-blue-500/25"
          }`}
        >
          <div
            className="flex items-center justify-center gap-1.5 py-1.5 bg-slate-900/90 cursor-grab active:cursor-grabbing border-b border-slate-700/50 touch-none"
            onMouseDown={handleCameraDragStart}
            onTouchStart={handleCameraDragStart}
          >
            <GripHorizontal className="w-4 h-4 text-slate-400" />
            <span className="text-[10px] text-slate-400">Drag to move</span>
          </div>

          <div className="aspect-[4/3] relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5 pointer-events-none">
              <div className="flex justify-between items-center text-[10px] text-white">
                <span className="flex items-center gap-1">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${proctoringStatus.faceDetected ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
                  />
                  {proctoringStatus.faceDetected ? "Face Detected" : "No Face"}
                </span>
                {audioEnabled && audioLevel > -40 && (
                  <span className="flex items-center gap-1 text-red-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    Recording
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 pt-20">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-white">{exam?.title}</h1>
              <p className="text-slate-400 text-sm">{exam?.description}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-xs">Time Remaining</p>
              <p
                className={`text-3xl font-bold ${timeLeft < 60 ? "text-red-400" : "text-blue-400"} font-mono`}
              >
                {formatTime(timeLeft || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
          <div className="mb-6">
            <div className="flex justify-between text-sm text-slate-400 mb-2">
              <span>
                Question {currentQuestionIndex + 1} of{" "}
                {exam?.questions?.length}
              </span>
              <span>Points: {currentQuestion?.points || 0}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${((currentQuestionIndex + 1) / (exam?.questions?.length || 1)) * 100}%`,
                }}
              />
            </div>
          </div>

          <h3 className="text-xl font-semibold text-white mb-6">
            {currentQuestion?.text}
          </h3>

          {currentQuestion?.type === "multiple-choice" &&
            currentQuestion?.options && (
              <div className="space-y-3">
                {currentQuestion.options.map((option) => (
                  <label
                    key={option.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                      currentAnswer === String(option.id)
                        ? "bg-blue-500/20 border border-blue-500/50 shadow-lg"
                        : "bg-slate-700/30 border border-slate-600 hover:bg-slate-700/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="question"
                      value={option.id}
                      checked={currentAnswer === String(option.id)}
                      onChange={(e) => {
                        if (currentQuestion?._id) {
                          handleSaveAnswer(currentQuestion._id, e.target.value);
                          setAnswers((prev) => ({
                            ...prev,
                            [currentQuestion._id]: e.target.value,
                          }));
                        }
                      }}
                      className="w-4 h-4 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="text-slate-300">{option.text}</span>
                  </label>
                ))}
              </div>
            )}

          {currentQuestion?.type === "writing" && (
            <textarea
              value={currentAnswer}
              onChange={(e) => {
                if (currentQuestion?._id) {
                  setAnswers((prev) => ({
                    ...prev,
                    [currentQuestion._id]: e.target.value,
                  }));
                }
              }}
              onBlur={() =>
                currentQuestion?._id &&
                handleSaveAnswer(currentQuestion._id, currentAnswer)
              }
              placeholder="Type your answer here..."
              rows={6}
              className="w-full p-3 bg-slate-700/30 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
          )}

          {currentQuestion?.type === "coding" && (
            <textarea
              value={currentAnswer}
              onChange={(e) => {
                if (currentQuestion?._id) {
                  setAnswers((prev) => ({
                    ...prev,
                    [currentQuestion._id]: e.target.value,
                  }));
                }
              }}
              onBlur={() =>
                currentQuestion?._id &&
                handleSaveAnswer(currentQuestion._id, currentAnswer)
              }
              placeholder="Write your code here..."
              rows={8}
              className="w-full p-3 bg-slate-700/30 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-sm"
            />
          )}
        </div>

        <div className="flex justify-between mt-6 gap-4">
          <button
            onClick={() => {
              if (currentQuestion?._id)
                handleSaveAnswer(currentQuestion._id, currentAnswer);
              if (currentQuestionIndex > 0)
                setCurrentQuestionIndex((prev) => prev - 1);
            }}
            disabled={currentQuestionIndex === 0}
            className="px-6 py-2.5 rounded-lg bg-slate-700 text-white font-medium disabled:opacity-50 hover:bg-slate-600 transition-all duration-200 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>

          <button
            onClick={() => {
              if (currentQuestionIndex + 1 === exam?.questions?.length) {
                handleSubmitExam();
              } else {
                if (currentQuestion?._id)
                  handleSaveAnswer(currentQuestion._id, currentAnswer);
                setCurrentQuestionIndex((prev) => prev + 1);
              }
            }}
            disabled={submitting}
            className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium disabled:opacity-50 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/25 disabled:cursor-not-allowed"
          >
            {currentQuestionIndex + 1 === exam?.questions?.length
              ? "Submit Exam →"
              : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}