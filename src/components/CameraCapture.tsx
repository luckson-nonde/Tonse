import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, RefreshCw, Check, AlertCircle } from 'lucide-react';
import Button from './Button';

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  initialImage?: string;
  label?: string;
}

export default function CameraCapture({ onCapture, initialImage, label }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(initialImage || null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: false 
      });
      setStream(mediaStream);
      setIsCameraActive(true);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Could not access camera. Please check permissions.');
    }
  };

  // Attach stream to video element when it's ready
  useEffect(() => {
    if (isCameraActive && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [isCameraActive, stream]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  }, [stream]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        onCapture(dataUrl);
        stopCamera();
      }
    }
  };

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <div className="space-y-4">
      {label && (
        <label className="block text-[11px] font-black text-[#1a1612]/40 uppercase tracking-[0.25em] mb-2 ml-1">
          {label}
        </label>
      )}
      
      <div className="relative aspect-video bg-slate-50 rounded-3xl border border-[#e8e4dc] overflow-hidden group transition-all">
        {capturedImage ? (
          <div className="relative w-full h-full animate-in zoom-in-95 duration-300">
            <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-brand-dark/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm">
              <button 
                onClick={retake}
                className="flex items-center gap-2 px-6 py-3 bg-white rounded-full text-brand-dark font-bold shadow-2xl hover:scale-105 active:scale-95 transition-all"
              >
                <RefreshCw size={18} className="text-[#C9973A]" />
                Retake Photo
              </button>
            </div>
            <div className="absolute top-4 right-4 bg-emerald-500 text-white px-3 py-1.5 rounded-full shadow-xl flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest">
              <Check size={12} strokeWidth={3} />
              Identity Verified
            </div>
          </div>
        ) : isCameraActive ? (
          <div className="relative w-full h-full animate-in fade-in duration-500">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
            <div className="absolute inset-0 border-[12px] border-white/10 pointer-events-none"></div>
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
              <button 
                onClick={capturePhoto}
                className="group/btn relative flex items-center justify-center"
              >
                <div className="absolute inset-0 bg-white/20 rounded-full scale-125 animate-pulse"></div>
                <div className="w-16 h-16 bg-white rounded-full border-[6px] border-brand-gold shadow-2xl flex items-center justify-center transition-transform hover:scale-110 active:scale-90">
                  <div className="w-6 h-6 bg-brand-gold rounded-full" />
                </div>
              </button>
              <p className="text-white text-[10px] font-black uppercase tracking-[0.3em] drop-shadow-md">Capture Identity</p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-white to-slate-50">
            <div className="w-20 h-20 bg-brand-white rounded-3xl flex items-center justify-center text-[#C9973A] mb-6 shadow-premium border border-[#e8e4dc]/50 transition-transform hover:scale-110 duration-500">
              <Camera size={40} strokeWidth={1.5} />
            </div>
            {error ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 text-rose-500 text-sm font-bold bg-rose-50 px-4 py-2 rounded-full border border-rose-100">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
                <Button 
                  variant="outline" 
                  onClick={startCamera}
                  className="rounded-full px-8 py-3 text-xs font-black uppercase tracking-widest"
                >
                  Try Again
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <h4 className="text-[#1a1612] font-serif font-bold text-lg mb-2">Live Image Verification</h4>
                <p className="text-[#1a1612]/40 text-[11px] font-medium mb-6 max-w-[200px] mx-auto leading-relaxed">
                  Please enable your camera to take a live photo for secure identity verification.
                </p>
                <Button 
                  onClick={startCamera}
                  className="bg-brand-dark text-white rounded-full px-10 py-4 font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:shadow-brand-gold/20 transition-all"
                >
                  Enable Camera
                </Button>
              </div>
            )}
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
