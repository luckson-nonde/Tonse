import React from 'react';
import { motion } from 'motion/react';
import {
  ShoppingBag,
  CheckCircle,
  Truck,
  MapPin,
  Calendar,
  ShieldCheck,
  QrCode,
  Printer,
  ArrowRight,
} from 'lucide-react';
import { Quote, Inquiry } from '../types';
import Button from '../components/Button';

interface OrderDetailsProps {
  order: Quote;
  inquiry?: Inquiry;
  onAction: (actionId: string, payload?: any) => void;
}

export default function OrderDetails({ order, inquiry, onAction }: OrderDetailsProps) {
  return (
    <div className="space-y-8">
      {/* Order Status Header */}
      <div className="bg-emerald-50 p-8 rounded-4xl border border-emerald-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <CheckCircle className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-serif font-black text-emerald-900">
              Order Paid & Secured
            </h2>
            <p className="text-emerald-700/70 font-medium">Order ID: ORD-{order.id}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-100"
          >
            <Printer className="w-4 h-4 mr-2" /> Print Receipt
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Collection Details */}
          <div className="bg-white p-8 rounded-4xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-brand-dark mb-6 flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#C9973A]" />
              Collection Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <MapPin className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Pickup Point
                    </p>
                    <p className="text-sm font-bold text-brand-dark">{order.providerName} Store</p>
                    <p className="text-xs text-slate-500">Lusaka, Cairo Road Branch</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <Calendar className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Paid On
                    </p>
                    <p className="text-sm font-bold text-brand-dark">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
                <div className="bg-white p-4 rounded-2xl shadow-sm mb-4">
                  <QrCode className="w-24 h-24 text-brand-dark" />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Collection Code
                </p>
                <p className="text-2xl font-black text-[#C9973A] tracking-[0.2em]">
                  TNS-{order.id?.toString().padStart(4, '0')}
                </p>
              </div>
            </div>
          </div>

          {/* Item Summary */}
          <div className="bg-white p-8 rounded-4xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-brand-dark mb-6">Order Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-4 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-brand-dark">
                      {inquiry?.title || 'Product/Service'}
                    </p>
                    <p className="text-xs text-slate-500">{order.condition}</p>
                  </div>
                </div>
                <span className="font-black text-brand-dark">K{order.price.toLocaleString()}</span>
              </div>

              <div className="pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-bold text-brand-dark">K{order.price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Escrow Fee (1%)</span>
                  <span className="font-bold text-brand-dark">
                    K{(order.price * 0.01).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-lg pt-4 border-t border-slate-100">
                  <span className="font-serif font-bold text-brand-dark">Grand Total</span>
                  <span className="font-black text-[#C9973A]">
                    K{(order.price * 1.01).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar: Protection */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-4xl border border-slate-200 shadow-sm">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 mb-6">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-brand-dark mb-2">Buyer Protection</h4>
            <p className="text-sm text-slate-500 leading-relaxed mb-6">
              Your funds are held in escrow. Only release the collection code to the seller once you
              have verified the items.
            </p>
            <Button variant="outline" className="w-full border-slate-200 text-slate-600">
              How Escrow Works
            </Button>
          </div>

          <div className="bg-brand-dark p-8 rounded-4xl text-white">
            <h4 className="font-serif font-bold text-lg mb-4">Need Assistance?</h4>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              If you encounter any issues during collection, do not release the code and contact us
              immediately.
            </p>
            <Button className="w-full bg-white/10 hover:bg-white/20 text-white border-none">
              Open Dispute
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
