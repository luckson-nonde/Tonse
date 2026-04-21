import React from 'react';
import { X, Play } from 'lucide-react';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
}

export default function VerificationModal({ isOpen, onClose, itemName }: VerificationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold text-slate-900">Verification: {itemName}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100">
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 scrollbar-hide">
          <div className="space-y-4">
            <div className="aspect-video bg-slate-200 rounded-2xl flex items-center justify-center relative">
              <Play className="w-12 h-12 text-white opacity-80" fill="currentColor" />
              <span className="absolute bottom-4 left-4 font-bold text-white bg-black/50 px-2 py-1 rounded-lg text-xs">
                Video Proof
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((img) => (
                <div
                  key={img}
                  className="aspect-square bg-slate-200 rounded-2xl flex items-center justify-center text-slate-400 font-bold text-sm"
                >
                  Img {img}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
