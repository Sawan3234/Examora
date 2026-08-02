import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { faceAPI } from '../api/services';
import { Camera, CheckCircle, AlertCircle, Loader } from 'lucide-react';

export default function FaceRegistration() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [faceData, setFaceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    const startCamera = async () => {
      try {
        setIsLoading(true);
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480, facingMode: 'user' } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          setIsReady(true);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Camera error:', err);
        setError('Camera access denied');
        setIsLoading(false);
      }
    };
    
    startCamera();
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const captureFrameAsBase64 = () => {
    if (!videoRef.current || !videoRef.current.videoWidth) return null;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
  };

 const handleCapture = async () => {
  try {
    const frameBase64 = captureFrameAsBase64();
    const response = await faceAPI.registerFace(frameBase64, user._id);
    if (response.data.success) {
      setFaceData({ captured: true });
    }
  } catch (err) {
    setLocalError(err.response?.data?.error || 'Failed to register face');
  }
}
  const handleConfirm = async () => {
    setLoading(true);
    setTimeout(() => {
      navigate(user?.role === 'admin' ? '/admin/dashboard' : '/student/dashboard');
    }, 500);
  };

  const skipForTesting = () => {
    navigate(user?.role === 'admin' ? '/admin/dashboard' : '/student/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-electric to-blue-700 flex items-center justify-center">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-syne font-bold text-white">Face Registration</h1>
          </div>

          <p className="text-slate-400 mb-6">
            Register your face for secure exam authentication. Position your face in the center of the frame.
          </p>

          <div className="text-xs text-slate-500 mb-4 p-2 bg-slate-800/50 rounded">
            Status: {isLoading ? 'Loading camera...' : isReady ? 'Ready' : 'Initializing...'}
          </div>

          {(localError || error) && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
              <p className="text-red-400 text-sm">{localError || error}</p>
            </div>
          )}

          {!faceData ? (
            <div className="space-y-6">
              <div className="relative bg-black rounded-xl overflow-hidden aspect-video border border-slate-700">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
                {!isReady && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                    <Loader className="w-8 h-8 text-electric animate-spin mb-2" />
                    <p className="text-white text-sm">Loading camera...</p>
                  </div>
                )}
              </div>

              <button
                onClick={handleCapture}
                disabled={!isReady || capturing}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-electric to-blue-600 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {capturing ? <Loader className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                {capturing ? 'Capturing...' : 'Capture Face'}
              </button>

              <button onClick={skipForTesting} className="w-full py-3 rounded-lg bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 font-semibold">
                Skip Face Registration (Testing Only)
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <p className="text-green-400 font-semibold">Face captured and sent to Python!</p>
                <p className="text-green-300/70 text-sm mt-1">Your face is being registered with KNN.</p>
              </div>

              <button onClick={handleConfirm} disabled={loading} className="w-full py-3 rounded-lg bg-gradient-to-r from-electric to-blue-600 text-white font-semibold">
                {loading ? 'Processing...' : 'Continue to Dashboard'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}