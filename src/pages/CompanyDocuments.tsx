import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Upload, CheckCircle2, FileText, X, Building2 } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import Button from '../components/Button';
import { motion, AnimatePresence } from 'motion/react';

export default function CompanyDocuments() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState(user?.companyName || '');
  const [tpin, setTpin] = useState(user?.tpin || '');
  const [pacraCert, setPacraCert] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check type PDF or Image
    if (!file.type.includes('pdf') && !file.type.includes('image')) {
      setError('Please upload a PDF or Image file');
      return;
    }

    setFileName(file.name);
    setFileSize((file.size / (1024 * 1024)).toFixed(2) + ' MB');
    
    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPacraCert(reader.result as string);
      setIsUploading(false);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!pacraCert || !companyName || !tpin) {
      setError('Please fill in all fields and upload your certificate');
      return;
    }

    if (tpin.length !== 10 || !/^\d+$/.test(tpin)) {
      setError('TPIN must be exactly 10 digits');
      return;
    }
    
    setIsLoading(true);
    try {
      await updateUser({
        companyName,
        tpin,
        incorporationCertUrl: pacraCert,
        verificationStatus: 'PENDING'
      });
      navigate('/buyer');
    } catch (err: any) {
      setError(err.message || 'Failed to update documents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      await updateUser({
        verificationStatus: 'INCOMPLETE'
      });
      navigate('/buyer');
    } catch (err: any) {
      setError(err.message || 'Failed to skip');
    }
  };

  return (
    <AuthLayout 
      title="Company Verification Documents" 
      subtitle="Upload your PACRA Certificate of Incorporation to activate your business account"
      headerSubtitle="Business Verification"
      onBack={() => navigate(-1)}
    >
      <div className="space-y-8">
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-[13px] rounded-xl font-medium">
            {error}
          </div>
        )}

        {/* Company Identity Fields */}
        <div className="space-y-5">
          <div>
            <label className="block text-[11px] font-bold text-[#1a1612]/40 uppercase tracking-[0.2em] mb-3 ml-1">Company Name</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <Building2 className="h-4 w-4 text-brand-yellow/40 group-focus-within:text-brand-yellow transition-colors" strokeWidth={2} />
              </div>
              <input 
                type="text" 
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter registered company name" 
                required
                className="block w-full pl-14 pr-5 py-4 bg-[#fcfcfc] border border-[#e8e4dc] rounded-2xl text-[15px] text-[#1a1612] focus:ring-4 focus:ring-brand-yellow/10 focus:border-brand-yellow outline-none transition-all placeholder:text-[#1a1612]/20 font-medium" 
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#1a1612]/40 uppercase tracking-[0.2em] mb-3 ml-1">TPIN Number</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <FileText className="h-4 w-4 text-brand-yellow/40 group-focus-within:text-brand-yellow transition-colors" strokeWidth={2} />
              </div>
              <input 
                type="text" 
                value={tpin}
                onChange={(e) => setTpin(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Enter 10-digit TPIN" 
                required
                pattern="\d{10}"
                maxLength={10}
                className="block w-full pl-14 pr-5 py-4 bg-[#fcfcfc] border border-[#e8e4dc] rounded-2xl text-[15px] text-[#1a1612] focus:ring-4 focus:ring-brand-yellow/10 focus:border-brand-yellow outline-none transition-all placeholder:text-[#1a1612]/20 font-medium" 
              />
            </div>
          </div>
        </div>

        {/* Upload Zone */}
        <div className="relative group">
          <input 
            type="file"
            id="pacra-upload"
            accept=".pdf,image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <label 
            htmlFor="pacra-upload"
            className={`block w-full border-2 border-dashed rounded-[2rem] p-10 text-center transition-all cursor-pointer relative overflow-hidden ${
              pacraCert 
                ? 'border-green-500/30 bg-green-50/30' 
                : 'border-[#e8e4dc] bg-[#fcfcfc] hover:border-brand-yellow/50 hover:bg-brand-yellow/5'
            }`}
          >
            <AnimatePresence mode="wait">
              {isUploading ? (
                <motion.div 
                  key="uploading"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="w-12 h-12 border-4 border-brand-yellow border-t-transparent rounded-full animate-spin"></div>
                  <div className="space-y-1">
                    <span className="block text-[15px] font-bold text-[#1a1612]">Processing Document...</span>
                    <span className="block text-[12px] text-[#1a1612]/40">Securing your file for verification</span>
                  </div>
                </motion.div>
              ) : pacraCert ? (
                <motion.div 
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center shadow-sm">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="space-y-1">
                    <span className="block text-[16px] font-bold text-green-700">Document Uploaded</span>
                    <div className="flex items-center justify-center gap-2 text-[12px] text-green-600/70">
                      <FileText className="w-3.5 h-3.5" />
                      <span>{fileName} ({fileSize})</span>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setPacraCert('');
                    }}
                    className="mt-2 text-[11px] font-bold text-green-700/50 uppercase tracking-widest hover:text-green-700 transition-colors"
                  >
                    Replace File
                  </button>
                </motion.div>
              ) : (
                <motion.div 
                  key="idle"
                  className="flex flex-col items-center gap-4"
                >
                  <div className="w-16 h-16 bg-[#f5f2ee] rounded-full flex items-center justify-center group-hover:bg-brand-yellow/10 transition-all duration-300">
                    <Upload className="w-7 h-7 text-[#1a1612]/30 group-hover:text-brand-yellow transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <span className="block text-[15px] font-bold text-[#1a1612]">Click to upload certificate</span>
                    <span className="block text-[12px] text-[#1a1612]/40">Supports PDF, JPG, PNG (Max 5MB)</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </label>
        </div>

        {/* Status Message */}
        <div className="bg-[#fdf6e9] border border-brand-yellow/10 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 bg-brand-yellow/10 rounded-full flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-brand-yellow" />
          </div>
          <div className="space-y-1">
            <p className="text-[14px] font-bold text-[#1a1612]">Your account is active</p>
            <p className="text-[12px] text-[#1a1612]/60 leading-relaxed">
              Document verification takes <span className="font-bold text-[#1a1612]">24–48 hours</span>. You can start using the platform immediately, but some business features may be limited until verified.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-6 pt-4">
          <Button 
            onClick={handleSubmit}
            disabled={!pacraCert || !companyName || !tpin || isLoading}
            className="w-full py-5 px-4 shadow-lg disabled:opacity-50 text-[18px] font-serif font-normal"
          >
            {isLoading ? 'Submitting...' : 'Submit for Verification'}
          </Button>

          <div className="text-center">
            <button 
              onClick={handleSkip}
              className="text-[13px] font-medium text-[#1a1612]/40 hover:text-brand-yellow transition-colors"
            >
              I'll do this later
            </button>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
