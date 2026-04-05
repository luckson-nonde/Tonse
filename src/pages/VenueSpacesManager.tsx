import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { VenueSpace } from '../types';
import { Plus, Trash2, Edit2, MapPin, Users, DollarSign, Image as ImageIcon, Check, X } from 'lucide-react';

const AMENITIES_LIST = [
  'WiFi', 'AV Equipment', 'Parking', 'Kitchen/Catering Prep', 
  'Wheelchair Accessible', 'Stage', 'Bar', 'Air Conditioning', 
  'Outdoor Area', 'Security'
];

export default function VenueSpacesManager() {
  const { user } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingSpaceId, setEditingSpaceId] = useState<number | null>(null);
  const [deletingSpaceId, setDeletingSpaceId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    capacityStanding: '',
    capacitySeating: '',
    pricePerHour: '',
    pricePerDay: '',
    amenities: [] as string[],
    image: ''
  });

  const spaces = useLiveQuery(
    async () => {
      if (!user?.id) return [];
      return await db.venueSpaces.where('providerId').equals(user.id).reverse().sortBy('createdAt');
    },
    [user]
  ) || [];

  const toggleAmenity = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handleSaveSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      const spaceData = {
        providerId: user.id,
        name: formData.name,
        description: formData.description,
        capacityStanding: Number(formData.capacityStanding) || 0,
        capacitySeating: Number(formData.capacitySeating) || 0,
        pricePerHour: formData.pricePerHour ? Number(formData.pricePerHour) : undefined,
        pricePerDay: formData.pricePerDay ? Number(formData.pricePerDay) : undefined,
        amenities: formData.amenities,
        images: [formData.image || `https://picsum.photos/seed/${formData.name.replace(/\s+/g, '')}/800/600`],
        status: 'ACTIVE' as const,
      };

      if (isEditing && editingSpaceId) {
        await db.venueSpaces.update(editingSpaceId, spaceData);
      } else {
        await db.venueSpaces.add({
          ...spaceData,
          createdAt: Date.now()
        });
      }
      
      resetForm();
    } catch (error) {
      console.error('Failed to save venue space:', error);
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setIsEditing(false);
    setEditingSpaceId(null);
    setFormData({
      name: '',
      description: '',
      capacityStanding: '',
      capacitySeating: '',
      pricePerHour: '',
      pricePerDay: '',
      amenities: [],
      image: ''
    });
  };

  const handleEditClick = (space: VenueSpace) => {
    setFormData({
      name: space.name,
      description: space.description,
      capacityStanding: space.capacityStanding.toString(),
      capacitySeating: space.capacitySeating.toString(),
      pricePerHour: space.pricePerHour?.toString() || '',
      pricePerDay: space.pricePerDay?.toString() || '',
      amenities: space.amenities || [],
      image: space.images[0] || ''
    });
    setEditingSpaceId(space.id!);
    setIsEditing(true);
    setIsAdding(true);
  };

  const confirmDelete = async () => {
    if (deletingSpaceId) {
      await db.venueSpaces.delete(deletingSpaceId);
      setDeletingSpaceId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1612] font-serif">Venue Spaces</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your bookable rooms, areas, and capacities.</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-[#d49b35] text-white px-4 py-2.5 rounded-xl font-bold hover:bg-[#d49b35]/90 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Add Space
          </button>
        )}
      </div>

      {isAdding ? (
        <div className="bg-white rounded-2xl border border-[#e8e4dc] p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-[#e8e4dc]">
            <h2 className="text-lg font-bold text-[#1a1612] font-serif">
              {isEditing ? 'Edit Venue Space' : 'Add New Venue Space'}
            </h2>
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSaveSpace} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Venue Space Name</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Main Banquet Hall, Outdoor Garden"
                    className="w-full px-4 py-3 bg-slate-50 border border-[#e8e4dc] rounded-xl focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] outline-none transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Maximum Standing Capacity</label>
                    <input 
                      type="number" 
                      required
                      value={formData.capacityStanding}
                      onChange={e => setFormData({...formData, capacityStanding: e.target.value})}
                      placeholder="e.g., 200 people"
                      className="w-full px-4 py-3 bg-slate-50 border border-[#e8e4dc] rounded-xl focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Maximum Seating Capacity</label>
                    <input 
                      type="number" 
                      required
                      value={formData.capacitySeating}
                      onChange={e => setFormData({...formData, capacitySeating: e.target.value})}
                      placeholder="e.g., 150 people"
                      className="w-full px-4 py-3 bg-slate-50 border border-[#e8e4dc] rounded-xl focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Hourly Rental Price (ZMW)</label>
                    <input 
                      type="number" 
                      value={formData.pricePerHour}
                      onChange={e => setFormData({...formData, pricePerHour: e.target.value})}
                      placeholder="e.g., 500 (Optional)"
                      className="w-full px-4 py-3 bg-slate-50 border border-[#e8e4dc] rounded-xl focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Full Day Rental Price (ZMW)</label>
                    <input 
                      type="number" 
                      value={formData.pricePerDay}
                      onChange={e => setFormData({...formData, pricePerDay: e.target.value})}
                      placeholder="e.g., 5000 (Optional)"
                      className="w-full px-4 py-3 bg-slate-50 border border-[#e8e4dc] rounded-xl focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] outline-none transition-all"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Venue Image Link (URL)</label>
                  <input 
                    type="url" 
                    value={formData.image}
                    onChange={e => setFormData({...formData, image: e.target.value})}
                    placeholder="e.g., https://example.com/venue-photo.jpg (Optional)"
                    className="w-full px-4 py-3 bg-slate-50 border border-[#e8e4dc] rounded-xl focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Detailed Space Description</label>
                  <textarea 
                    required
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Describe the space, atmosphere, best uses, and any special features..."
                    className="w-full px-4 py-3 bg-slate-50 border border-[#e8e4dc] rounded-xl focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] outline-none transition-all h-24 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Available Amenities & Features</label>
                  <div className="flex flex-wrap gap-2">
                    {AMENITIES_LIST.map(amenity => {
                      const isSelected = formData.amenities.includes(amenity);
                      return (
                        <button
                          key={amenity}
                          type="button"
                          onClick={() => toggleAmenity(amenity)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border
                            ${isSelected 
                              ? 'bg-[#d49b35]/10 border-[#d49b35] text-[#d49b35]' 
                              : 'bg-white border-[#e8e4dc] text-slate-600 hover:border-slate-300'
                            }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          {amenity}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#e8e4dc]">
              <button 
                type="button"
                onClick={resetForm}
                className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-6 py-2.5 bg-[#d49b35] text-white rounded-xl font-bold hover:bg-[#d49b35]/90 transition-colors shadow-sm"
              >
                {isEditing ? 'Save Changes' : 'Create Space'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {spaces.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl border border-[#e8e4dc] p-12 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-[#1a1612] mb-2">No Spaces Added Yet</h3>
              <p className="text-slate-500 mb-6">Create your first bookable space to start receiving inquiries.</p>
              <button 
                onClick={() => setIsAdding(true)}
                className="inline-flex items-center gap-2 bg-[#d49b35] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#d49b35]/90 transition-colors shadow-sm"
              >
                <Plus className="w-5 h-5" />
                Add Your First Space
              </button>
            </div>
          ) : (
            spaces.map(space => (
              <div key={space.id} className="bg-white rounded-2xl border border-[#e8e4dc] overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                <div className="h-48 relative overflow-hidden bg-slate-100">
                  {space.images[0] ? (
                    <img src={space.images[0]} alt={space.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <ImageIcon className="w-12 h-12" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <button 
                      onClick={() => handleEditClick(space)}
                      className="p-2 bg-white/90 backdrop-blur-sm rounded-lg text-slate-700 hover:text-[#d49b35] transition-colors shadow-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setDeletingSpaceId(space.id!)}
                      className="p-2 bg-white/90 backdrop-blur-sm rounded-lg text-slate-700 hover:text-red-600 transition-colors shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-[#1a1612] font-serif mb-1">{space.name}</h3>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-4">{space.description}</p>
                  
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded-lg">
                      <Users className="w-4 h-4 text-[#d49b35]" />
                      <span className="font-medium">{space.capacityStanding} <span className="text-xs text-slate-400">Stand</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded-lg">
                      <Users className="w-4 h-4 text-[#d49b35]" />
                      <span className="font-medium">{space.capacitySeating} <span className="text-xs text-slate-400">Seat</span></span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {space.amenities.slice(0, 3).map(amenity => (
                      <span key={amenity} className="text-[10px] font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-md">
                        {amenity}
                      </span>
                    ))}
                    {space.amenities.length > 3 && (
                      <span className="text-[10px] font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-md">
                        +{space.amenities.length - 3} more
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-[#e8e4dc]">
                    <div className="flex items-center gap-1.5 text-[#d49b35] font-bold">
                      <DollarSign className="w-4 h-4" />
                      {space.pricePerHour ? `${space.pricePerHour}/hr` : space.pricePerDay ? `${space.pricePerDay}/day` : 'Custom Price'}
                    </div>
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md">
                      {space.status}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingSpaceId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-[#1a1612] mb-2">Delete Space?</h3>
            <p className="text-slate-500 mb-6">Are you sure you want to delete this space? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeletingSpaceId(null)}
                className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
              >
                Delete Space
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
