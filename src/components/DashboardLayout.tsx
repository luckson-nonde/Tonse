import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, Home, ClipboardCheck, List, Store, X, ChevronLeft, PlusCircle, MessageSquare, FileText, User, Users, Truck, QrCode, ChevronRight, Archive, Calendar, MapPin } from 'lucide-react';
import Logo from './Logo';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'motion/react';

import { useDashboard } from '../DashboardContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { activeTab, setActiveTab } = useDashboard();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);

  const handleTabClick = React.useCallback((tab: string) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
    
    const isBuyer = user?.role === 'BUYER';
    const basePath = isBuyer ? '/buyer' : '/provider';

    if (tab === 'suppliers') {
      navigate(`${basePath}/suppliers`);
    } else if (tab === 'archived') {
      navigate(`${basePath}/archived`);
    } else if (tab === 'profile') {
      navigate(`${basePath}/profile`);
    } else if (tab === 'schedule') {
      navigate('/schedule');
    } else if (tab === 'venue-spaces') {
      navigate('/provider/venue-spaces');
    } else {
      navigate(basePath);
    }
  }, [setActiveTab, navigate, user?.role]);

  React.useEffect(() => {
    console.log('DashboardLayout activeTab state:', activeTab);
  }, [activeTab]);

  const getPageTitle = () => {
    const isBookingBased = user?.role === 'ENTERTAINMENT' || user?.role === 'EVENTS';
    switch(activeTab) {
      case 'home': return 'HOME';
      case 'quotes': return 'RECEIVED QUOTATIONS';
      case 'inquiries': return 'MY INQUIRIES';
      case 'create-inquiry': return 'EVENT BOOKING REQUEST';
      case 'inquiry-items': return 'ITEM LIST';
      case 'category-selection': return 'SELECT CATEGORY';
      case 'shops': return 'SHOPS & RETAILERS';
      case 'suppliers': return 'VERIFIED SUPPLIERS';
      case 'paid-orders': 
        if (user?.role === 'EVENTS') return 'PAID RENTALS';
        return isBookingBased ? 'PAID BOOKINGS' : 'PAID ORDERS (ESCROW)';
      case 'collection': return 'PARCEL COLLECTION';
      case 'products': return user?.role === 'EVENTS' ? 'INVENTORY' : 'MY PRODUCTS';
      case 'venue-spaces': return 'VENUE SPACES';
      case 'archived': return 'ARCHIVED QUOTES';
      case 'profile': return 'SHOP PROFILE';
      case 'leads': 
        if (user?.role === 'EVENTS') return 'RENTAL REQUESTS';
        return isBookingBased ? 'BOOKING REQUESTS' : 'INCOMING LEADS';
      case 'my-quotes': return 'MY QUOTES';
      default: return 'HOME';
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavLink = ({ tab, icon: Icon, label, isActive }: { tab: string, icon: any, label: string, isActive: boolean }) => (
    <button 
      onClick={() => handleTabClick(tab)}
      className={`flex items-center w-full px-4 py-3 text-[14px] font-medium font-sans transition-all duration-200 ${
        isActive 
          ? 'border-l-[3px] border-[#C9973A] bg-[#fdf8f0] text-[#1e293b]' 
          : 'text-[#64748b] hover:bg-slate-50 hover:text-[#1e293b] border-l-[3px] border-transparent'
      }`}
    >
      <Icon className="w-[18px] h-[18px] mr-4 stroke-[1.8]" /> {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#f5f2ed] noise-bg flex relative font-sans">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/70 z-[100] md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-[199] w-64 bg-[#ffffff] text-[#1e293b] flex flex-col transform transition-transform duration-300 ease-in-out md:sticky md:top-0 md:h-screen md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} border-r border-[#f1f5f9] shadow-[4px_0_24px_rgba(26,22,18,0.02)]`}>
        <div 
          className="p-4 border-b border-[#f1f5f9] flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors h-[73px]"
          onClick={() => handleTabClick('home')}
        >
          <div className="flex items-center space-x-3 hidden md:flex">
            <div className="flex flex-col">
              <span className="font-serif font-bold text-2xl leading-none tracking-[-0.06em]">
                <span className="text-[#1e293b]">TON</span>
                <span className="text-[#C9973A] -ml-[0.04em]">SE</span>
              </span>
              <span className="text-[10px] font-sans text-[#9ca3af] tracking-wider uppercase mt-1">
                {getPageTitle()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsMobileMenuOpen(false);
              }} 
              className="md:hidden p-1 text-[#1e293b]/60 hover:text-[#1e293b]"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <div className="py-4 flex-1 overflow-y-auto scrollbar-hide">
          <nav className="space-y-1">
            <button 
              onClick={() => handleTabClick('profile')}
              className={`flex items-center w-full px-4 py-3 text-[14px] font-medium font-sans transition-all duration-200 mb-2 ${
                activeTab === 'profile' 
                  ? 'border-l-[3px] border-[#C9973A] bg-[#fdf8f0] text-[#1e293b]' 
                  : 'text-[#64748b] hover:bg-slate-50 hover:text-[#1e293b] border-l-[3px] border-transparent'
              }`}
            >
              <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center mr-4">
                {user?.logo ? (
                  <img src={user.logo} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User className="w-[18px] h-[18px] stroke-[1.8] text-[#64748b]" />
                )}
              </div>
              Profile
            </button>
            
            <NavLink tab="home" icon={Home} label="Home" isActive={activeTab === 'home'} />
            
            {user?.role === 'BUYER' ? (
              <>
                <NavLink tab="inquiries" icon={FileText} label="My Inquiries" isActive={['inquiries', 'create-inquiry', 'inquiry-items', 'category-selection', 'inquiry-preferences', 'location-details'].includes(activeTab)} />
                <NavLink tab="quotes" icon={MessageSquare} label="Quotes Received" isActive={activeTab === 'quotes'} />
                <NavLink tab="shops" icon={Store} label="Saved Shops" isActive={activeTab === 'shops'} />
                <NavLink tab="suppliers" icon={Users} label="Suppliers" isActive={activeTab === 'suppliers'} />
                <NavLink tab="paid-orders" icon={Truck} label="Paid Orders" isActive={activeTab === 'paid-orders'} />
                <NavLink tab="schedule" icon={Calendar} label="My Schedule" isActive={activeTab === 'schedule'} />
                <NavLink tab="archived" icon={Archive} label="Archived Quotes" isActive={window.location.pathname === '/buyer/archived'} />
              </>
            ) : (
              <>
                <NavLink tab="leads" icon={List} label={(user?.role === 'ENTERTAINMENT' || user?.role === 'EVENTS') ? 'Incoming Booking Requests' : 'Incoming Leads'} isActive={activeTab === 'leads'} />
                <NavLink tab="my-quotes" icon={ClipboardCheck} label="My Quotes" isActive={activeTab === 'my-quotes'} />
                <NavLink tab="schedule" icon={Calendar} label="My Schedule" isActive={activeTab === 'schedule'} />
                {user?.role === 'EVENTS' && (
                  <NavLink tab="venue-spaces" icon={MapPin} label="Venue Spaces" isActive={activeTab === 'venue-spaces'} />
                )}
                <NavLink tab="paid-orders" icon={Truck} label={(user?.role === 'ENTERTAINMENT' || user?.role === 'EVENTS') ? 'Paid Bookings' : 'Paid Orders'} isActive={activeTab === 'paid-orders'} />
                <NavLink tab="collection" icon={QrCode} label="Collection" isActive={activeTab === 'collection'} />
                {user?.role === 'EVENTS' && user?.categories?.some(c => c.toLowerCase().includes('equipment rental')) ? (
                  <NavLink tab="products" icon={Store} label="Inventory" isActive={activeTab === 'products'} />
                ) : user?.role === 'EVENTS' ? (
                  // For other event types, maybe they don't need inventory? 
                  // But the user said "This account allows the user to have an inventory" specifically for equipment rental.
                  // For now, I'll keep it visible for all EVENTS but maybe rename it if not rental?
                  // Actually, let's stick to the user's request: "specifically Late event equipment lenders This account allows the user to have an inventory"
                  null 
                ) : user?.role !== 'ENTERTAINMENT' && (
                  <NavLink tab="products" icon={Store} label="My Products" isActive={activeTab === 'products'} />
                )}
              </>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-[#f1f5f9] bg-[#ffffff]">
          <LogoutToggle user={user} onLogout={handleLogout} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeTab !== 'create-inquiry' && (
          <header className="sticky top-0 bg-[#ffffff] text-[#1e293b] z-50 py-4 border-b border-[#f1f5f9] h-[73px] flex items-center">
            <div className="px-4 sm:px-6 lg:px-8 flex items-center justify-between w-full">
              {/* Left Section: Mobile Menu */}
              <div className="flex items-center">
                <button 
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="md:hidden w-10 h-10 bg-white border border-[#f1f5f9] rounded-lg flex items-center justify-center text-[#1e293b] mr-4 hover:bg-slate-50 transition-colors"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </div>
              
              {/* Center Section: Mobile Logo & Title */}
              <div className="flex flex-col items-center justify-center flex-1 md:hidden">
                <span className="font-serif font-bold text-2xl leading-none tracking-[-0.06em]">
                  <span className="text-[#1e293b]">TON</span>
                  <span className="text-[#C9973A] -ml-[0.04em]">SE</span>
                </span>
                <span className="text-[11px] font-normal text-[#9ca3af] mt-1 font-sans">
                  Good morning, {user?.name?.split(' ')[0] || 'Luckson'}
                </span>
              </div>

              {/* Right Section: User Info & Notifications */}
              <div className="flex items-center space-x-4 ml-auto">
                <div className="hidden sm:flex flex-col items-end mr-2">
                  <span className="text-[11px] font-normal font-sans text-[#9ca3af] leading-none mb-1">Good morning,</span>
                  <span className="text-sm font-medium font-sans text-[#1e293b] leading-none">{user?.name}</span>
                </div>
                
                <div className="relative flex items-center gap-3">
                  <button 
                    onClick={() => setIsNotificationPanelOpen(true)}
                    className="w-10 h-10 bg-transparent flex items-center justify-center text-[#1e293b] hover:bg-slate-50 transition-colors relative rounded-full"
                  >
                    <Bell className="w-[18px] h-[18px] stroke-[1.8]" />
                    <span className="absolute top-[11px] right-[11px] w-[6px] h-[6px] bg-[#C9973A] rounded-full"></span>
                  </button>
                </div>
              </div>
            </div>
          </header>
        )}
        
        <main className="flex-1 px-4 sm:px-8 pt-4 sm:pt-7 pb-24 md:pb-8 relative">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#1a1612]/5 flex justify-around items-center h-[70px] z-[110] px-2 pb-safe shadow-[0_-10px_30px_rgba(26,22,18,0.05)]">
          <button 
            onClick={() => handleTabClick('home')}
            className={`flex flex-col items-center justify-center w-full h-full transition-all ${activeTab === 'home' ? 'text-[#C9973A]' : 'text-[#9ca3af]'}`}
          >
            <Home className="w-[22px] h-[22px] mb-1" strokeWidth={2} />
            <span className="text-[11px] font-medium font-sans uppercase tracking-wider">Home</span>
          </button>
          
          {user?.role === 'BUYER' ? (
            <>
              <button 
                onClick={() => handleTabClick('inquiries')}
                className={`flex flex-col items-center justify-center w-full h-full transition-all ${['inquiries', 'create-inquiry', 'inquiry-items', 'category-selection', 'inquiry-preferences', 'location-details'].includes(activeTab) ? 'text-[#C9973A]' : 'text-[#9ca3af]'}`}
              >
                <FileText className="w-[22px] h-[22px] mb-1" strokeWidth={2} />
                <span className="text-[11px] font-medium font-sans uppercase tracking-wider">Inquiries</span>
              </button>
              <button 
                onClick={() => handleTabClick('quotes')}
                className={`flex flex-col items-center justify-center w-full h-full transition-all ${activeTab === 'quotes' ? 'text-[#C9973A]' : 'text-[#9ca3af]'}`}
              >
                <MessageSquare className="w-[22px] h-[22px] mb-1" strokeWidth={2} />
                <span className="text-[11px] font-medium font-sans uppercase tracking-wider">Quotes</span>
              </button>
              <button 
                onClick={() => handleTabClick('shops')}
                className={`flex flex-col items-center justify-center w-full h-full transition-all ${activeTab === 'shops' ? 'text-[#C9973A]' : 'text-[#9ca3af]'}`}
              >
                <Store className="w-[22px] h-[22px] mb-1" strokeWidth={2} />
                <span className="text-[11px] font-medium font-sans uppercase tracking-wider">Shops</span>
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => handleTabClick('my-quotes')}
                className={`flex flex-col items-center justify-center w-full h-full transition-all ${activeTab === 'my-quotes' ? 'text-[#C9973A]' : 'text-[#9ca3af]'}`}
              >
                <ClipboardCheck className="w-[22px] h-[22px] mb-1" strokeWidth={2} />
                <span className="text-[11px] font-medium font-sans uppercase tracking-wider">My Quotes</span>
              </button>
              <button 
                onClick={() => handleTabClick('leads')}
                className={`flex flex-col items-center justify-center w-full h-full transition-all ${activeTab === 'leads' ? 'text-[#C9973A]' : 'text-[#9ca3af]'}`}
              >
                <List className="w-[22px] h-[22px] mb-1" strokeWidth={2} />
                <span className="text-[11px] font-medium font-sans uppercase tracking-wider">Inquiries</span>
              </button>
              <button 
                onClick={() => handleTabClick('suppliers')}
                className={`flex flex-col items-center justify-center w-full h-full transition-all ${activeTab === 'suppliers' ? 'text-[#C9973A]' : 'text-[#9ca3af]'}`}
              >
                <Users className="w-[22px] h-[22px] mb-1" strokeWidth={2} />
                <span className="text-[11px] font-medium font-sans uppercase tracking-wider">Suppliers</span>
              </button>
            </>
          )}
        </div>

        {/* Notification Side Panel */}
        <AnimatePresence>
          {isNotificationPanelOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsNotificationPanelOpen(false)}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200]"
              />
              {/* Panel */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-white z-[201] shadow-2xl flex flex-col"
              >
                <div className="p-6 border-b border-[#f1f5f9] flex items-center justify-between bg-[#fffaf5]">
                  <div>
                    <h3 className="font-serif font-bold text-2xl text-[#1e293b]">Notifications</h3>
                    <p className="text-[10px] font-sans font-bold text-[#C9973A] uppercase tracking-widest mt-1">Stay updated with your activity</p>
                  </div>
                  <button 
                    onClick={() => setIsNotificationPanelOpen(false)}
                    className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
                  <div className="flex items-center justify-between px-2 mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Recent</span>
                    <button className="text-[11px] font-bold text-[#C9973A] uppercase tracking-wider hover:underline">Mark all read</button>
                  </div>

                  {/* Notification Items */}
                  <div className="p-4 rounded-2xl bg-[#fffaf5] border border-[#C9973A]/10 hover:border-[#C9973A]/30 transition-all cursor-pointer group">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#C9973A]/10 flex items-center justify-center flex-shrink-0 text-xl">
                        💬
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-sm font-bold text-[#1e293b]">New Quote Received</p>
                          <span className="text-[10px] font-bold text-[#C9973A]">2m</span>
                        </div>
                        <p className="text-xs text-[#64748b] leading-relaxed">SolarTech Zambia sent a quote for your "50 Solar Panels" inquiry.</p>
                        <div className="mt-3 flex items-center gap-2">
                          <button className="text-[10px] font-bold text-[#C9973A] uppercase tracking-wider px-3 py-1.5 bg-white border border-[#C9973A]/20 rounded-lg hover:bg-[#C9973A] hover:text-white transition-all">
                            View Quote
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-100 hover:border-[#C9973A]/20 transition-all cursor-pointer group">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0 text-xl">
                        ⏳
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-sm font-bold text-[#1e293b]">Inquiry Expiring Soon</p>
                          <span className="text-[10px] font-bold text-slate-400">1h</span>
                        </div>
                        <p className="text-xs text-[#64748b] leading-relaxed">Your inquiry for "Office Laptops" expires in 24 hours.</p>
                        <div className="mt-3 flex items-center gap-2">
                          <button className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg hover:bg-slate-100 transition-all">
                            Extend
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-100 hover:border-[#C9973A]/20 transition-all cursor-pointer group">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0 text-xl">
                        📦
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-sm font-bold text-[#1e293b]">Order Dispatched</p>
                          <span className="text-[10px] font-bold text-slate-400">3h</span>
                        </div>
                        <p className="text-xs text-[#64748b] leading-relaxed">Your order #ORD-7721 has been dispatched by the supplier.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-[#f1f5f9] bg-[#fffaf5]">
                  <button className="w-full py-4 bg-[#1e293b] text-white rounded-2xl font-bold text-sm hover:bg-[#2d3a4f] transition-all shadow-lg shadow-slate-200 uppercase tracking-widest">
                    View All Activity
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function LogoutToggle({ user, onLogout }: { user: any, onLogout: () => void }) {
  const x = useMotionValue(0);
  const xSpring = useSpring(x, { stiffness: 400, damping: 30 });
  
  // Track width: 160px. Thumb width: 38px. Padding: 5px.
  // Max travel = 160 - 38 - 10 = 112px.
  const maxDrag = 112;
  
  const labelOpacity = useTransform(x, [0, maxDrag * 0.6], [1, 0]);
  const [isSuccess, setIsSuccess] = useState(false);

  const initials = user?.name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2) || 'JD';

  return (
    <div className="mt-auto w-full border-t border-[#f1f5f9] pt-4 pb-4 px-5 flex justify-center">
      <div 
        className="relative w-[160px] h-[48px] rounded-full border-2 border-white overflow-hidden cursor-pointer"
        style={{ 
          background: "linear-gradient(145deg, #c9973a, #b8832a)",
          boxShadow: "0 4px 12px rgba(201,151,58,0.25), 0 1px 3px rgba(0,0,0,0.1), inset 0 3px 8px rgba(0,0,0,0.2), inset 0 -1px 4px rgba(255,255,255,0.1)"
        }}
      >
        {/* Slide to Logout Text */}
        <motion.div 
          className="absolute inset-0 flex items-center justify-end pr-4 pointer-events-none z-10"
          style={{ opacity: labelOpacity }}
        >
          <span className="text-[9px] font-bold font-sans text-white/85 uppercase tracking-widest text-right leading-tight">
            SLIDE TO<br/>LOGOUT
          </span>
        </motion.div>

        {/* Draggable Thumb */}
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: maxDrag }}
          dragElastic={0.05}
          dragMomentum={false}
          onDrag={(event, info) => {
            x.set(info.offset.x);
          }}
          onDragEnd={(event, info) => {
            if (info.offset.x >= maxDrag - 8) {
              setIsSuccess(true);
              setTimeout(onLogout, 400);
            } else {
              x.set(0);
            }
          }}
          style={{ x: xSpring }}
          className="absolute inset-y-0 left-[4px] flex items-center z-30 cursor-grab active:cursor-grabbing"
        >
          <motion.div 
            className="w-[38px] h-[38px] rounded-full flex items-center justify-center border border-white/90 relative overflow-hidden"
            style={{
              background: "linear-gradient(145deg, #ffffff, #f0ece4)",
              boxShadow: "0 4px 10px rgba(0,0,0,0.20), 0 1px 3px rgba(0,0,0,0.10), inset 0 -2px 3px rgba(0,0,0,0.05)"
            }}
          >
            {isSuccess ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center"
              >
                <ClipboardCheck className="w-4 h-4 text-[#C9973A]" />
              </motion.div>
            ) : user?.logo ? (
              <img 
                src={user.logo} 
                alt="Profile" 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer" 
              />
            ) : (
              <span className="text-[13px] font-bold font-serif text-[#C9973A] flex items-center justify-center h-full w-full">
                {initials}
              </span>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
