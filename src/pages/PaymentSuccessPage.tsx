import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, Copy } from 'lucide-react';
import successOwl from '../assets/images/empty-states/owl_triumphant.webp';
import { useNavigate, useLocation } from 'react-router-dom';
import QRCode from 'qrcode';
import Button from '../components/Button';

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { amount, quoteId, collectionCode } = location.state || {};
  const [qrCode, setQrCode] = useState('');

  useEffect(() => {
    if (collectionCode && quoteId) {
      QRCode.toDataURL(`NYUWE-COLLECT-QT-${quoteId}-${collectionCode}`, { width: 200 }).then(setQrCode);
    }
  }, [collectionCode, quoteId]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(collectionCode);
    alert('Code copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 flex flex-col items-center justify-center text-center">
      <div className="mb-8 flex justify-center">
        <img src={successOwl} alt="Payment Successful" className="w-48 h-48 sm:w-56 sm:h-56 object-contain" />
      </div>
      <h1 className="text-2xl font-black text-slate-900 mb-4">Payment Successful</h1>
      
      <p className="text-slate-600 mb-8 leading-relaxed max-w-xs">
        Your payment for Quote #{quoteId} (ZMW {amount.toLocaleString()}) was successful.
        Use the following code to collect your item.
      </p>

      {qrCode && (
        <div className="bg-white p-4 rounded-3xl shadow-sm mb-6">
          <img src={qrCode} alt="Collection QR Code" className="w-48 h-48" />
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl shadow-sm mb-8 w-full max-w-xs">
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Digital Collection Code</p>
        <div className="flex items-center justify-center gap-2">
          <span className="text-3xl font-black text-[#d49b35] tracking-widest">{collectionCode}</span>
          <button onClick={copyToClipboard} className="p-2 text-slate-400 hover:text-[#d49b35]">
            <Copy className="w-5 h-5" />
          </button>
        </div>
      </div>

      <Button 
        onClick={() => navigate('/buyer')}
        className="w-full py-4 rounded-2xl font-bold"
      >
        Back to Dashboard
      </Button>
    </div>
  );
}
