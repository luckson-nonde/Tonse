import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { CheckCircle2, Loader2, ShieldCheck, FileText, Globe } from 'lucide-react';
import AuthSplitLayout from '../components/AuthSplitLayout';
import Button from '../components/Button';
import DynamicProfileForm from '../components/DynamicProfileForm';
import { ProfileSchema } from '../services/userSchemas';

const DOCUMENTS_SCHEMA: ProfileSchema = {
  sections: [
    {
      title: 'Company Registration',
      sectionHeader: 'Business Verification',
      type: 'fields',
      fields: [
        {
          name: 'companyName',
          label: 'Company Legal Name',
          type: 'text',
          required: true,
          placeholder: 'As it appears on PACRA',
        },
        {
          name: 'tpin',
          label: 'TPIN Number',
          type: 'text',
          required: true,
          placeholder: '10-digit TPIN',
        },
        {
          name: 'incorporationCertUrl',
          label: 'PACRA Certificate',
          type: 'image_upload',
          required: true,
          helpText: 'Upload your Certificate of Incorporation (PDF or Image)',
        },
      ],
    },
  ],
};

export default function CompanyDocuments() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const initialData = useMemo(
    () => ({
      companyName: user?.companyName || '',
      tpin: user?.tpin || '',
      incorporationCertUrl: user?.incorporationCertUrl || '',
    }),
    [user]
  );

  const handleSubmit = async (data: any) => {
    setIsLoading(true);
    setError('');
    try {
      // Store company-specific fields in localStorage (backend doesn't support these yet)
      localStorage.setItem(
        'companyProfile',
        JSON.stringify({
          companyName: data.companyName,
          tpin: data.tpin,
          incorporationCertUrl: data.incorporationCertUrl,
        })
      );

      // Only send allowed fields to backend
      await updateUser({
        verificationStatus: 'PENDING',
      });
      if (user?.role === 'BUYER') {
        navigate('/buyer');
      } else if (user?.role === 'LABOUR') {
        navigate('/labour');
      } else {
        navigate('/provider');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update documents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      await updateUser({
        verificationStatus: 'INCOMPLETE',
      });
      if (user?.role === 'BUYER') {
        navigate('/buyer');
      } else if (user?.role === 'LABOUR') {
        navigate('/labour');
      } else {
        navigate('/provider');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to skip');
    }
  };

  const heroContent = {
    title: 'Trust & Verification',
    image: 'https://images.unsplash.com/photo-1454165833767-027ffea9e77b?auto=format&fit=crop&q=80&w=1920&h=1080',
    bullets: [
      'Official PACRA verification',
      'Boost business credibility',
      'Safe and secure environment',
      'Priority support for verified shops'
    ]
  };

  return (
    <AuthSplitLayout
      title="Company Verification"
      subtitle="Upload your PACRA Certificate of Incorporation to activate your business account"
      onBack={() => navigate(-1)}
      stepper={{ current: 4, total: 4, labels: ['ROLE', 'LOCATION', 'BUSINESS', 'VERIFY'] }}
      hero={heroContent}
    >
      <div className="space-y-10">
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
            <div className="bg-[#fffef9] border border-[#C9973A]/20 rounded-2xl p-6 flex flex-col md:flex-row items-center md:items-start gap-5 shadow-sm">
              <div className="w-14 h-14 bg-[#C9973A]/10 rounded-2xl flex items-center justify-center shrink-0">
                <ShieldCheck className="w-7 h-7 text-[#C9973A]" />
              </div>
              <div className="space-y-2 text-center md:text-left">
                <p className="text-[15px] font-sans font-bold text-brand-dark">Account Activation Pending</p>
                <p className="text-[13px] text-brand-dark/60 leading-relaxed font-sans">
                  Document verification typically takes{' '}
                  <span className="font-bold text-brand-dark">24–48 working hours</span>. 
                  You can browse and set up your shop profile while we verify your credentials.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-6">
              <div className="flex flex-col gap-5">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-15 shadow-[0_12px_30px_rgba(201,151,58,0.3)] text-base font-sans font-bold text-brand-dark bg-[#C9973A] hover:bg-[#B08432] transition-all rounded-2xl uppercase tracking-widest flex items-center justify-center gap-3"
                >
                  {isLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      Submit for Verification
                      <CheckCircle2 className="w-5 h-5" />
                    </>
                  )}
                </Button>

                  <button
                    type="button"
                    onClick={handleSkip}
                    className="w-full py-4 text-[13px] font-bold text-[#1a1612]/40 hover:text-[#C9973A] transition-colors uppercase tracking-[0.15em] border border-transparent hover:border-[#C9973A]/10 rounded-xl"
                  >
                    I'll do this later
                  </button>
                </div>
              </div>
            </div>
          </DynamicProfileForm>
        </div>
      </AuthSplitLayout>
  );
}
