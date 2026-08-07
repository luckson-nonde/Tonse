import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Home, ShieldCheck, ArrowRight, X } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../AuthContext';
import { useConsentGate } from '../hooks/useConsentGate';
import ConsentModal from '../components/consent/ConsentModal';

export default function StoreVerification() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const consent = useConsentGate('store');
  const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
  const [interiorPhoto, setInteriorPhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const interiorInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'front' | 'interior'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'front') setFrontPhoto(reader.result as string);
      else setInteriorPhoto(reader.result as string);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleComplete = async () => {
    if (!frontPhoto || !interiorPhoto) {
      alert('Please upload both front and interior photos of your store.');
      return;
    }

    try {
      await updateUser({
        storePhotos: {
          front: frontPhoto,
          interior: interiorPhoto,
        },
        verificationStatus: 'PENDING',
      });
      navigate('/verification-pending');
    } catch (err) {
      console.error('Failed to save store photos:', err);
      alert('Failed to save photos. Please try again.');
    }
  };

  return (
    <>
      <ConsentModal
        open={consent.needsConsent}
        configKey="store"
        scope="screen"
        onConsent={consent.grant}
        onBack={() => { consent.dismiss(); navigate('/seller/location'); }}
      />
      <AuthLayout
        title="Store Verification"
        subtitle="Upload photos of your physical store to verify your location."
        headerSubtitle="Store Verification"
        maxWidth="max-w-[700px]"
        footerText={
          <p className="text-[10px] font-bold text-indigo-200/60">
            NYUWE ZAMBIA MARKETPLACE ONBOARDING © 2026
          </p>
        }
        onBack={() => navigate('/seller/location')}
      >
      <div className="space-y-6">
        {/* Front View Section */}
        <div>
          <div className="flex justify-between items-center mb-3 px-1">
            <h4 className="text-sm font-bold text-slate-800">Front View</h4>
            <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Required
            </span>
          </div>
          <input
            type="file"
            ref={frontInputRef}
            onChange={(e) => handlePhotoChange(e, 'front')}
            className="hidden"
            accept="image/*"
          />
          {frontPhoto ? (
            <div className="relative rounded-[2rem] overflow-hidden group h-48 border-2 border-slate-100">
              <img src={frontPhoto} alt="Store Front" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={() => setFrontPhoto(null)}
                  className="bg-white/20 hover:bg-white/40 p-3 rounded-full backdrop-blur-md transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => frontInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-[2rem] p-8 text-center hover:border-brand-blue/50 transition-colors cursor-pointer bg-slate-50/50"
            >
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-[16px] font-bold text-slate-700 mb-1">Capture Store Front</h3>
              <p className="text-xs text-slate-400">Include signage if possible</p>
            </div>
          )}
        </div>

        {/* Interior View Section */}
        <div>
          <div className="flex justify-between items-center mb-3 px-1">
            <h4 className="text-sm font-bold text-slate-800">Interior View</h4>
            <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Required
            </span>
          </div>
          <input
            type="file"
            ref={interiorInputRef}
            onChange={(e) => handlePhotoChange(e, 'interior')}
            className="hidden"
            accept="image/*"
          />
          {interiorPhoto ? (
            <div className="relative rounded-[2rem] overflow-hidden group h-48 border-2 border-slate-100">
              <img
                src={interiorPhoto}
                alt="Store Interior"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={() => setInteriorPhoto(null)}
                  className="bg-white/20 hover:bg-white/40 p-3 rounded-full backdrop-blur-md transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => interiorInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-[2rem] p-8 text-center hover:border-brand-blue/50 transition-colors cursor-pointer bg-slate-50/50"
            >
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Home className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-[16px] font-bold text-slate-700 mb-1">Capture Store Interior</h3>
              <p className="text-xs text-slate-400">Show products or workspace</p>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 flex gap-3">
          <ShieldCheck className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
          <p className="text-xs text-indigo-700 leading-relaxed">
            Verification usually takes 24-48 hours. Please ensure photos are bright and clear to
            avoid rejection.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            onClick={handleComplete}
            disabled={!frontPhoto || !interiorPhoto || isUploading}
            className="w-full py-4 px-4 bg-brand-blue hover:bg-brand-blue/90 text-white text-[15px] font-bold rounded-2xl shadow-lg shadow-brand-blue/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
          >
            Complete Submission
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
      </AuthLayout>
    </>
  );
}
