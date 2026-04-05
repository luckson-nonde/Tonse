import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Store, Truck, Wrench, Check, Music, Calendar, Smartphone, Armchair, Shirt, Home, Car, Hammer, Tractor, Laptop } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import Button from '../components/Button';

const roles = [
  {
    id: 'BUYER',
    title: 'Buyer',
    description: 'Discover and shop from local stores near you.',
    icon: ShoppingBag
  },
  {
    id: 'SELLER_ELECTRONICS',
    title: 'Electronics Shop',
    description: 'Sell phones, laptops, and home appliances.',
    icon: Smartphone,
    role: 'SELLER',
    category: 'electronics'
  },
  {
    id: 'SELLER_FURNITURE',
    title: 'Furniture Shop',
    description: 'Sell home, office, and outdoor furniture.',
    icon: Armchair,
    role: 'SELLER',
    category: 'furniture'
  },
  {
    id: 'SELLER_FASHION',
    title: 'Fashion & Boutique',
    description: 'Sell clothing, shoes, and accessories.',
    icon: Shirt,
    role: 'SELLER',
    category: 'fashion'
  },
  {
    id: 'SELLER_HOME',
    title: 'Home Decor & Design',
    description: 'Sell lighting, wall art, and decor items.',
    icon: Home,
    role: 'SELLER',
    category: 'home-decor'
  },
  {
    id: 'SELLER_AUTO',
    title: 'Automotive Shop',
    description: 'Sell car parts, accessories, and tools.',
    icon: Car,
    role: 'SELLER',
    category: 'automotive'
  },
  {
    id: 'SELLER_GENERAL',
    title: 'General Shop',
    description: 'Sell groceries, beauty products, and more.',
    icon: Store,
    role: 'SELLER'
  },
  {
    id: 'SERVICE_CONSTRUCTION',
    title: 'Construction & Machinery',
    description: 'Offer construction services, materials, and machinery.',
    icon: Hammer,
    role: 'SERVICE_PROVIDER',
    category: 'construction'
  },
  {
    id: 'SUPPLIER_AGRICULTURE',
    title: 'Agriculture & Farming',
    description: 'Supply agricultural products, livestock, and equipment.',
    icon: Tractor,
    role: 'SUPPLIER',
    category: 'agriculture'
  },
  {
    id: 'SERVICE_IT',
    title: 'IT & Telecom Services',
    description: 'Provide IT support, networking, and telecom services.',
    icon: Laptop,
    role: 'SERVICE_PROVIDER',
    category: 'it-services'
  },
  {
    id: 'SUPPLIER',
    title: 'Supplier',
    description: 'Supply goods in bulk to local retailers.',
    icon: Truck
  },
  {
    id: 'SERVICE_PROVIDER',
    title: 'Service Provider',
    description: 'Offer your professional skills to local customers.',
    icon: Wrench
  },
  {
    id: 'ENTERTAINMENT',
    title: 'Entertainment',
    description: 'Promote events, venues, and live performances.',
    icon: Music
  },
  {
    id: 'EVENTS',
    title: 'Events',
    description: 'Rent out and manage equipment for events and functions.',
    icon: Calendar
  }
];

export default function RoleSelection() {
  const [selectedId, setSelectedId] = useState('BUYER');
  const navigate = useNavigate();

  const handleContinue = () => {
    const selected = roles.find(r => r.id === selectedId);
    if (!selected) return;

    const role = selected.role || selected.id;
    let url = `/register?role=${role}`;
    if (selected.category) {
      url += `&category=${selected.category}`;
    }
    navigate(url);
  };

  return (
    <AuthLayout 
      title="Select Your Role" 
      subtitle={
        <span className="text-[#1a1612]/60">
          Choose how you want to use <span className="text-brand-yellow font-bold">TONSE</span>
        </span>
      }
    >
      <div className="grid grid-cols-1 gap-3 max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide">
        {roles.map((role) => {
          const isSelected = selectedId === role.id;
          const Icon = role.icon;
          
          return (
            <button 
              key={role.id}
              onClick={() => setSelectedId(role.id)}
              className={`group p-5 rounded-2xl border text-left transition-all flex items-center gap-4 ${
                isSelected 
                  ? 'border-brand-yellow bg-brand-yellow/5 shadow-[0_10px_20px_rgba(180,138,53,0.1)]' 
                  : 'border-[#e8e4dc] bg-white hover:border-brand-yellow/30'
              }`}
            >
              <div className={`p-3 rounded-xl transition-colors shrink-0 ${isSelected ? 'bg-brand-yellow text-white' : 'bg-[#f5f2ee] text-[#1e293b] group-hover:text-brand-yellow'}`}>
                <Icon className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 
                  style={{ fontFamily: "'Playfair Display', serif" }}
                  className={`text-[15px] tracking-tight whitespace-nowrap transition-colors ${isSelected ? 'text-[#1a1612] font-bold' : 'text-[#1a1612]/80 font-medium'}`}
                >
                  {role.title}
                </h3>
                <p className="text-[13px] text-[#1a1612]/50 leading-snug mt-0.5 text-left">{role.description}</p>
              </div>
              <div className="w-7 flex justify-end shrink-0">
                {isSelected && (
                  <div className="w-7 h-7 rounded-full bg-brand-yellow flex items-center justify-center shadow-[0_4px_10px_rgba(180,138,53,0.3)]">
                    <Check className="w-5 h-5 text-[#1a1612]" strokeWidth={3} />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="pt-8">
        <Button 
          onClick={handleContinue}
          className="w-full py-5 px-4 shadow-[0_15px_30px_rgba(180,138,53,0.25)] flex justify-center items-center gap-3 text-[18px] font-serif font-bold"
        >
          Continue
          <span className="text-xl leading-none">→</span>
        </Button>
      </div>
    </AuthLayout>
  );
}
