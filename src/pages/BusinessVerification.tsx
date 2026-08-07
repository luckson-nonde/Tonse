import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, ArrowRight, CheckCircle2, X, Globe, MessageCircle, Facebook, Video } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../AuthContext';
import { useConsentGate } from '../hooks/useConsentGate';
import ConsentModal from '../components/consent/ConsentModal';

export default function BusinessVerification() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const consent = useConsentGate('businessVerification');
  const [facebookLink, setFacebookLink] = useState('');
  const [tiktokLink, setTiktokLink] = useState('');
  const [whatsappLink, setWhatsappLink] = useState('');
  
  // Separate file states for Shop Owners
  const [identityFiles, setIdentityFiles] = useState<{ name: string; data: string }[]>([]);
  const [businessFiles, setBusinessFiles] = useState<{ name: string; data: string }[]>([]);
  
  // Generic file state for other roles
  const [files, setFiles] = useState<{ name: string; data: string }[]>([]);
  
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const identityInputRef = useRef<HTMLInputElement>(null);
  const businessInputRef = useRef<HTMLInputElement>(null);

  const isShopOwner = user?.role === 'SELLER';
  const isServiceProvider = user?.role === 'SERVICE_PROVIDER';
  // Phase 2: ENTERTAINMENT/EVENTS are now category strings on a SELLER, not
  // separate roles. Detect via category-name patterns.
  const isEntertainment = (user?.categories || []).some((c: string) =>
    /\b(events?|venues?|wedding|conference|stage|entertainment|dj|live\s?band|mc|host|dancer|comedian|performer|influencer)\b/i.test(c)
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'generic' | 'identity' | 'business' = 'generic') => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    setIsUploading(true);
    const newFiles: { name: string; data: string }[] = [];
    
    Array.from(selectedFiles).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newFiles.push({
          name: file.name,
          data: reader.result as string
        });
        
        if (newFiles.length === selectedFiles.length) {
          if (type === 'identity') setIdentityFiles(prev => [...prev, ...newFiles]);
          else if (type === 'business') setBusinessFiles(prev => [...prev, ...newFiles]);
          else setFiles(prev => [...prev, ...newFiles]);
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number, type: 'generic' | 'identity' | 'business' = 'generic') => {
    if (type === 'identity') setIdentityFiles(prev => prev.filter((_, i) => i !== index));
    else if (type === 'business') setBusinessFiles(prev => prev.filter((_, i) => i !== index));
    else setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleNext = async () => {
    // Role-based validation
    if (isShopOwner || isEntertainment) {
      if (identityFiles.length === 0) {
        alert('Please upload your NRC or Passport for identity verification.');
        return;
      }
      if (isShopOwner && businessFiles.length === 0) {
        alert('Please upload your Business Registration (PACRA/ZRA) documents.');
        return;
      }
      if (isEntertainment && !whatsappLink) {
        alert('Please provide a WhatsApp link or number.');
        return;
      }
      if (isEntertainment && !facebookLink && !tiktokLink) {
        alert('Please provide at least one social media link (Facebook or TikTok) for verification.');
        return;
      }
    } else {
      if (!whatsappLink) {
        alert('Please provide a WhatsApp link or number.');
        return;
      }
      
      if (isServiceProvider) {
        if (!facebookLink && !tiktokLink) {
          alert('Please provide at least one social media link (Facebook or TikTok) for verification.');
          return;
        }
        if (files.length === 0) {
          alert('Please upload your NRC or Passport for identity verification.');
          return;
        }
      } else {
        // Default validation for other roles (like Supplier)
        if (files.length === 0) {
          alert('Please upload your NRC or any relevant document.');
          return;
        }
      }
    }

    try {
      const allDocs = (isShopOwner || isEntertainment)
        ? [...identityFiles.map(f => f.data), ...businessFiles.map(f => f.data)]
        : files.map(f => f.data);

      await updateUser({
        facebookLink,
        tiktokLink,
        whatsappLink,
        businessDocs: allDocs
      });
      navigate('/verification-pending');
    } catch (err) {
      console.error('Failed to save verification details:', err);
      alert('Failed to save details. Please try again.');
    }
  };

  return (
    <>
      <ConsentModal
        open={consent.needsConsent}
        configKey="businessVerification"
        scope="screen"
        onConsent={consent.grant}
        onBack={() => { consent.dismiss(); navigate('/seller/categories'); }}
      />
      <AuthLayout
      title="Account Verification"
      titleClassName="text-2xl font-normal"
      subtitle={
        isShopOwner 
          ? "Complete your identity and business registration to start trading."
          : isEntertainment 
            ? "Verify your identity and showcase your social presence to the community."
            : "Complete your social media and identity verification to start trading."
      }
      headerSubtitle={`${user?.role?.replace('_', ' ') || 'Seller'} Verification`}
      maxWidth="max-w-[700px]"
      footerText={
        <p className="text-[10px] font-normal text-brand-yellow/60">
          NYUWE ZAMBIA MARKETPLACE ONBOARDING © 2026
        </p>
      }
      onBack={() => navigate('/seller/categories')}
    >
      <div className="space-y-6">

        {/* Social Media Links - Hidden for Shop Owners */}
        {(isServiceProvider || isEntertainment) && (
          <div className="space-y-4">
            <div className="bg-[#fdf6e9] border border-[#d49b35] rounded-2xl p-4 mb-2">
              <p className="text-[12px] text-[#d49b35] font-bold uppercase tracking-wider">
                {isEntertainment ? "Prominent Social Presence Required" : "Social Media Verification"}
              </p>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-2 ml-1 font-sans">
                Facebook Page/Profile <span className="text-[9px] lowercase font-medium opacity-60">({isServiceProvider || isEntertainment ? 'Required' : 'Optional'})</span>
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Facebook className="h-4 w-4 text-[#d49b35] group-focus-within:text-brand-yellow transition-colors" />
                </div>
                <input 
                  type="url" 
                  value={facebookLink}
                  onChange={(e) => setFacebookLink(e.target.value)}
                  placeholder="https://facebook.com/yourbusiness" 
                  className="block w-full pl-11 pr-4 py-3.5 bg-white border border-[#e8e4dc] rounded-2xl text-[14px] focus:ring-4 focus:ring-brand-yellow/10 focus:border-brand-yellow outline-none transition-all placeholder:text-slate-300 font-medium" 
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-2 ml-1 font-sans">
                TikTok Profile <span className="text-[9px] lowercase font-medium opacity-60">({isServiceProvider || isEntertainment ? 'Required' : 'Optional'})</span>
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Video className="h-4 w-4 text-[#d49b35] group-focus-within:text-brand-yellow transition-colors" />
                </div>
                <input 
                  type="url" 
                  value={tiktokLink}
                  onChange={(e) => setTiktokLink(e.target.value)}
                  placeholder="https://tiktok.com/@yourbusiness" 
                  className="block w-full pl-11 pr-4 py-3.5 bg-white border border-[#e8e4dc] rounded-2xl text-[14px] focus:ring-4 focus:ring-brand-yellow/10 focus:border-brand-yellow outline-none transition-all placeholder:text-slate-300 font-medium" 
                />
              </div>
            </div>
          </div>
        )}

        {/* WhatsApp - Hidden for Shop Owners per request */}
        {!isShopOwner && (
          <div>
            <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-2 ml-1 font-sans">WhatsApp Link / Number</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MessageCircle className="h-4 w-4 text-[#d49b35] group-focus-within:text-brand-yellow transition-colors" />
              </div>
              <input 
                type="text" 
                value={whatsappLink}
                onChange={(e) => setWhatsappLink(e.target.value)}
                placeholder="https://wa.me/260..." 
                className="block w-full pl-11 pr-4 py-3.5 bg-white border border-[#e8e4dc] rounded-2xl text-[14px] focus:ring-4 focus:ring-brand-yellow/10 focus:border-brand-yellow outline-none transition-all placeholder:text-slate-300 font-medium" 
              />
            </div>
          </div>
        )}

        {/* Required Documents Checklist */}
        <div className="bg-[#fcfcfc] border border-slate-100 rounded-2xl p-6">
          <h3 className="text-[15px] font-bold text-slate-900 mb-4">Verification Requirements</h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3 text-sm text-slate-600">
              <CheckCircle2 className="w-5 h-5 text-brand-yellow flex-shrink-0" />
              <span><strong>Identity Verification:</strong> NRC or Passport is required.</span>
            </li>
            
            {isShopOwner && (
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <CheckCircle2 className="w-5 h-5 text-brand-yellow flex-shrink-0" />
                <span><strong>Business Registration:</strong> PACRA/ZRA documents are <strong>required</strong> for Shops.</span>
              </li>
            )}

            {!isShopOwner && (isServiceProvider || isEntertainment) && (
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <CheckCircle2 className="w-5 h-5 text-brand-yellow flex-shrink-0" />
                <span><strong>Social Media:</strong> Facebook or TikTok links are <strong>required</strong> to verify your professional presence.</span>
              </li>
            )}

            {!isShopOwner && !isServiceProvider && !isEntertainment && (
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <CheckCircle2 className="w-5 h-5 text-brand-yellow flex-shrink-0" />
                <span><strong>Business Registration:</strong> Upload PACRA/ZRA docs if available (Optional).</span>
              </li>
            )}
          </ul>
        </div>

        {/* Shop Owner & Entertainment Specific Upload Sections */}
        {(isShopOwner || isEntertainment) ? (
          <div className="space-y-8">
            {/* Section 1: Identity Verification */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1 whitespace-nowrap overflow-hidden">
                <div className="w-1 h-4 bg-brand-yellow rounded-full flex-shrink-0"></div>
                <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider truncate">SECTION 1 — IDENTITY VERIFICATION</h4>
              </div>
              
              <input 
                type="file" 
                multiple 
                ref={identityInputRef} 
                onChange={(e) => handleFileChange(e, 'identity')} 
                className="hidden" 
                accept=".pdf,.png,.jpg,.jpeg"
              />
              <div 
                onClick={() => identityInputRef.current?.click()}
                className="border-2 border-dashed border-brand-yellow/30 rounded-[1.5rem] p-4 text-center hover:border-brand-yellow transition-colors cursor-pointer bg-brand-yellow/5"
              >
                <div className="w-12 h-12 bg-brand-yellow/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6 text-brand-yellow" />
                </div>
                <h3 className="text-[15px] font-bold text-slate-900 mb-0.5">
                  Upload NRC or Passport
                </h3>
                <p className="text-[12px] text-slate-500">PDF, PNG or JPG (Max 5MB)</p>
              </div>

              {/* Identity Files List */}
              {identityFiles.length > 0 && (
                <div className="space-y-2">
                  {identityFiles.map((file, index) => (
                    <div key={file.name} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-5 h-5 text-brand-yellow flex-shrink-0" />
                        <span className="text-sm text-slate-700 truncate">{file.name}</span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeFile(index, 'identity'); }}
                        className="p-1 hover:bg-slate-200 rounded-full transition-colors"
                      >
                        <X className="w-4 h-4 text-slate-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 2: Business Registration */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1 whitespace-nowrap overflow-hidden">
                <div className="w-1 h-4 bg-brand-yellow rounded-full flex-shrink-0"></div>
                <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider truncate">SECTION 2 — BUSINESS REGISTRATION (OPTIONAL)</h4>
              </div>
              
              <input 
                type="file" 
                multiple 
                ref={businessInputRef} 
                onChange={(e) => handleFileChange(e, 'business')} 
                className="hidden" 
                accept=".pdf,.png,.jpg,.jpeg"
              />
              <div 
                onClick={() => businessInputRef.current?.click()}
                className="border-2 border-dashed border-brand-yellow/30 rounded-[1.5rem] p-4 text-center hover:border-brand-yellow transition-colors cursor-pointer bg-brand-yellow/5"
              >
                <div className="w-12 h-12 bg-brand-yellow/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-6 h-6 text-brand-yellow" />
                </div>
                <h3 className="text-[15px] font-bold text-slate-900 mb-0.5">
                  Upload Business Documents
                </h3>
                <p className="text-[12px] text-slate-500">PACRA / ZRA (Max 5MB)</p>
              </div>

              {/* Business Files List */}
              {businessFiles.length > 0 && (
                <div className="space-y-2">
                  {businessFiles.map((file, index) => (
                    <div key={file.name} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-5 h-5 text-brand-yellow flex-shrink-0" />
                        <span className="text-sm text-slate-700 truncate">{file.name}</span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeFile(index, 'business'); }}
                        className="p-1 hover:bg-slate-200 rounded-full transition-colors"
                      >
                        <X className="w-4 h-4 text-slate-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Generic Upload Area for other roles */
          <div className="space-y-6">
            <input 
              type="file" 
              multiple 
              ref={fileInputRef} 
              onChange={(e) => handleFileChange(e, 'generic')} 
              className="hidden" 
              accept=".pdf,.png,.jpg,.jpeg"
            />
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-brand-yellow/30 rounded-[1.5rem] p-4 text-center hover:border-brand-yellow transition-colors cursor-pointer bg-brand-yellow/5"
            >
              <div className="w-12 h-12 bg-brand-yellow/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Upload className="w-6 h-6 text-brand-yellow" />
              </div>
              <h3 className="text-[15px] font-bold text-slate-900 mb-0.5">
                {isUploading ? 'Processing files...' : 'Upload NRC / Business Documents'}
              </h3>
              <p className="text-[12px] text-slate-500">PDF, PNG or JPG (Max 5MB)</p>
            </div>

            {/* Uploaded Documents List */}
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <h4 className="text-sm font-bold text-slate-800">Uploaded Documents</h4>
                <span className="bg-brand-yellow/10 text-brand-yellow text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {files.length}
                </span>
              </div>
              
              {files.length > 0 ? (
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div key={file.name} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-5 h-5 text-brand-yellow flex-shrink-0" />
                        <span className="text-sm text-slate-700 truncate">{file.name}</span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeFile(index, 'generic'); }}
                        className="p-1 hover:bg-slate-200 rounded-full transition-colors"
                      >
                        <X className="w-4 h-4 text-slate-500" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                  <FileText className="w-10 h-10 text-[#c5bfb8] mb-3" />
                  <p className="text-sm text-slate-400 italic">No documents uploaded yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          <button 
            onClick={handleNext}
            disabled={isUploading || (isShopOwner ? (identityFiles.length === 0 || businessFiles.length === 0) : (isEntertainment ? (identityFiles.length === 0 || !whatsappLink || (!facebookLink && !tiktokLink)) : (files.length === 0 || !whatsappLink)))}
            className="w-full py-4 px-4 bg-[#d49b35] hover:brightness-95 text-[#1a1612] text-[15px] font-bold rounded-2xl shadow-lg shadow-brand-yellow/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
          >
            Submit for Verification
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <p className="text-[11px] text-slate-400 text-center font-medium leading-relaxed">
          Verification usually takes 24-48 hours after submission.
        </p>
      </div>
      </AuthLayout>
    </>
  );
}
