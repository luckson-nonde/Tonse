import React, { useState } from 'react';
import { Plus, Edit2, Trash2, MapPin, Users, Ruler, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Button from '../Button';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { db } from '../../services/api/database';
import { useAuth } from '../../AuthContext';
import { VenueSpace } from '../../types';

export default function VenueManagementView() {
  const { user } = useAuth();
  const effectiveProviderId = user?.parentProviderId || user?.id;

  const venueSpaces = useLiveQuery(
    async () => {
      if (!effectiveProviderId) return [] as VenueSpace[];
      return await db.venueSpaces?.where('providerId').equals(effectiveProviderId).toArray() || [];
    },
    [effectiveProviderId]
  ) || [] as VenueSpace[];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState<VenueSpace | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    capacityStanding: '',
    capacitySeating: '',
    description: '',
    pricePerHour: '',
    pricePerDay: '',
  });

  const handleOpenModal = (space: VenueSpace | null = null) => {
    if (space) {
      setEditingSpace(space);
      setFormData({
        name: space.name,
        capacityStanding: space.capacityStanding.toString(),
        capacitySeating: space.capacitySeating.toString(),
        description: space.description || '',
        pricePerHour: space.pricePerHour?.toString() || '',
        pricePerDay: space.pricePerDay?.toString() || '',
      });
    } else {
      setEditingSpace(null);
      setFormData({
        name: '',
        capacityStanding: '',
        capacitySeating: '',
        description: '',
        pricePerHour: '',
        pricePerDay: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveProviderId || !db.venueSpaces) return;

    const providerIdNum = typeof effectiveProviderId === 'string'
      ? parseInt(effectiveProviderId, 10)
      : effectiveProviderId;

    if (isNaN(providerIdNum)) {
      console.warn('Invalid providerId — cannot save venue space.');
      return;
    }

    const payload: Partial<VenueSpace> = {
      providerId: providerIdNum,
      name: formData.name,
      capacityStanding: parseInt(formData.capacityStanding) || 0,
      capacitySeating: parseInt(formData.capacitySeating) || 0,
      description: formData.description,
      pricePerHour: parseFloat(formData.pricePerHour) || undefined,
      pricePerDay: parseFloat(formData.pricePerDay) || undefined,
    };

    if (editingSpace?.id !== undefined) {
      await db.venueSpaces.update(editingSpace.id, payload);
    } else {
      const newSpace: VenueSpace = {
        ...(payload as VenueSpace),
        amenities: [],
        images: [],
        status: 'ACTIVE',
        createdAt: Date.now(),
      };
      await db.venueSpaces.add(newSpace);
    }

    setIsModalOpen(false);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this venue space?')) {
      if (db.venueSpaces) {
        await db.venueSpaces.delete(id);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-3xl font-serif font-black text-brand-dark">Venue Spaces</h2>
          <p className="text-slate-500">Manage your available rooms, halls, and open spaces.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
          <Plus className="w-5 h-5" /> Add Space
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {venueSpaces.map((space) => (
          <motion.div
            key={space.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="h-40 bg-slate-100 relative">
              {space.images && space.images.length > 0 ? (
                <img src={space.images[0]} alt={space.name} className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                  <ImageIcon className="w-12 h-12 opacity-50" />
                </div>
              )}
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-2">{space.name}</h3>
              <p className="text-sm text-slate-500 mb-4 line-clamp-2">{space.description}</p>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Users className="w-4 h-4 text-[#d49b35]" />
                  <span>Standing: {space.capacityStanding}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Users className="w-4 h-4 text-[#d49b35]" />
                  <span>Seated: {space.capacitySeating}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="text-sm font-bold text-slate-900 flex gap-2 flex-wrap">
                  {space.pricePerDay && <span>K{space.pricePerDay.toLocaleString()}/day</span>}
                  {space.pricePerDay && space.pricePerHour && <span className="text-slate-300">|</span>}
                  {space.pricePerHour && <span>K{space.pricePerHour.toLocaleString()}/hr</span>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleOpenModal(space)} className="p-2 text-slate-400 hover:text-brand-gold transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(space.id!)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {venueSpaces.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
          <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">No Venue Spaces Yet</h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">
            Add your first space to allow clients to view and request bookings for specific areas.
          </p>
          <Button onClick={() => handleOpenModal()}>Add Your First Space</Button>
        </div>
      )}

      {/* Modal for Add/Edit */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-900">
                  {editingSpace ? 'Edit Venue Space' : 'Add Venue Space'}
                </h3>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Space Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] transition-all"
                    placeholder="e.g. Main Hall, Garden, Conference Room A"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Standing Capacity</label>
                    <input
                      type="number"
                      required
                      value={formData.capacityStanding}
                      onChange={e => setFormData({ ...formData, capacityStanding: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] transition-all"
                      placeholder="Max standing"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Seated Capacity</label>
                    <input
                      type="number"
                      required
                      value={formData.capacitySeating}
                      onChange={e => setFormData({ ...formData, capacitySeating: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] transition-all"
                      placeholder="Max seated"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Price Per Day (ZMW)</label>
                    <input
                      type="number"
                      value={formData.pricePerDay}
                      onChange={e => setFormData({ ...formData, pricePerDay: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] transition-all"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Price Per Hour (ZMW)</label>
                    <input
                      type="number"
                      value={formData.pricePerHour}
                      onChange={e => setFormData({ ...formData, pricePerHour: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] transition-all"
                    placeholder="Describe the space and its amenities..."
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingSpace ? 'Save Changes' : 'Add Space'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
