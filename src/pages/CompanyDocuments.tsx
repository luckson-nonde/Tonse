import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { CheckCircle2, Loader2 } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import Button from '../components/Button';
import DynamicProfileForm from '../components/DynamicProfileForm';
import { ProfileSchema } from '../services/userSchemas';

const DOCUMENTS_SCHEMA: ProfileSchema = {
  sections: [
    {
      title: "Business Verification",
      type: "fields",
      fields: [
        { name: "companyName", label: "Company Legal Name", type: "text", required: true, placeholder: "As it appears on PACRA" },
        { name: "tpin", label: "TPIN Number", type: "text", required: true, placeholder: "10-digit TPIN" },
        { name: "incorporationCertUrl", label: "PACRA Certificate", type: "image_upload", required: true, helpText: "Upload your Certificate of Incorporation (PDF or Image)" }
      ]
    }
  ]
};

export default function CompanyDocuments() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const initialData = useMemo(() => ({
    companyName: user?.companyName || '',
    tpin: user?.tpin || '',
    incorporationCertUrl: user?.incorporationCertUrl || ''
  }), [user]);

  const handleSubmit = async (data: any) => {
    setIsLoading(true);
    setError('');
    try {
      await updateUser({
        ...data,
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

        <DynamicProfileForm
          schema={DOCUMENTS_SCHEMA}
          initialData={initialData}
          onSubmit={handleSubmit}
          isSubmitting={isLoading}
        >
          <div className="space-y-8 mt-8">
            {/* Status Message */}
            <div className="bg-[#fdf6e9] border border-[#C9973A]/10 rounded-2xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 bg-[#C9973A]/10 rounded-full flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-[#C9973A]" />
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
                type="submit"
                disabled={isLoading}
                className="w-full py-5 px-4 shadow-lg disabled:opacity-50 text-[18px] font-serif font-normal"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Submit for Verification'}
              </Button>

              <div className="text-center">
                <button 
                  type="button"
                  onClick={handleSkip}
                  className="text-[13px] font-medium text-[#1a1612]/40 hover:text-[#C9973A] transition-colors"
                >
                  I'll do this later
                </button>
              </div>
            </div>
          </div>
        </DynamicProfileForm>
      </div>
    </AuthLayout>
  );
}
