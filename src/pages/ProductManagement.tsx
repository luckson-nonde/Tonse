import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { db } from '../services/api/database';
import { Product } from '../types';
import { Plus, Trash2, Edit2, Package, Image as ImageIcon, Loader2, X } from 'lucide-react';
import { uniqueKey } from '../utils/keyUtils';

export default function ProductManagement() {
  const { user } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    stock: '',
    description: '',
    category: '',
    image: '',
  });

  const products =
    useLiveQuery(async () => {
      if (!user?.id) return [];
      const effectiveProviderId = user.parentProviderId || user.id;
      return await db.products
        .where('providerId')
        .equals(String(effectiveProviderId))
        .reverse()
        .sortBy('createdAt');
    }, [user]) || [];

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setIsSubmitting(true);

    try {
      if (isEditing && editingProductId) {
        await db.products.update(editingProductId, {
          name: formData.name,
          price: Number(formData.price),
          stock: Number(formData.stock) || 0,
          description: formData.description,
          category: formData.category,
          images: [formData.image || 'https://picsum.photos/seed/product/400/400'],
        });
        setIsEditing(false);
        setEditingProductId(null);
      } else {
        const newProduct: Product = {
          providerId: String(user.id),
          name: formData.name,
          price: Number(formData.price),
          stock: Number(formData.stock) || 0,
          description: formData.description,
          category: formData.category,
          images: [formData.image || 'https://picsum.photos/seed/product/400/400'],
          createdAt: Date.now(),
          status: 'ACTIVE',
        };
        await db.products.add(newProduct);
        setIsAdding(false);
      }
      setFormData({ name: '', price: '', stock: '', description: '', category: '', image: '' });
    } catch (error) {
      console.error('Failed to save product:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (product: Product) => {
    setFormData({
      name: product.name,
      price: product.price.toString(),
      stock: product.stock?.toString() || '',
      description: product.description,
      category: product.category,
      image: product.images[0] || '',
    });
    setEditingProductId(product.id!);
    setIsEditing(true);
  };

  const handleDeleteClick = (id: number) => {
    setDeletingProductId(id);
  };

  const confirmDelete = async () => {
    if (deletingProductId) {
      await db.products.delete(deletingProductId);
      setDeletingProductId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex-1"></div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-[#d49b35] hover:brightness-95 text-slate-900 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-[#d49b35]/20"
        >
          <Plus className="w-5 h-5" />
          {user?.role === 'EVENTS' ? 'Add Item' : 'Add Product'}
        </button>
      </div>

      {(isAdding || isEditing) && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-4xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <h3 className="text-xl font-black text-slate-900">
                {isEditing
                  ? user?.role === 'EVENTS'
                    ? 'Edit Equipment'
                    : 'Edit Product'
                  : user?.role === 'EVENTS'
                    ? 'Add New Equipment'
                    : 'Add New Product'}
              </h3>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setIsEditing(false);
                  setEditingProductId(null);
                  setFormData({
                    name: '',
                    price: '',
                    stock: '',
                    description: '',
                    category: '',
                    image: '',
                  });
                }}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <form onSubmit={handleAddProduct} className="p-8 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    {user?.role === 'EVENTS' ? 'Equipment Name' : 'Product Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] outline-none"
                    placeholder={
                      user?.role === 'EVENTS'
                        ? 'e.g. Professional Sound System'
                        : 'e.g. Minimalist Smart Watch'
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Price (ZMW)
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] outline-none"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      {user?.role === 'EVENTS' ? 'Stock Quantity' : 'Quantity'}
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] outline-none"
                      placeholder="e.g. 50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Category
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] outline-none"
                    placeholder={user?.role === 'EVENTS' ? 'e.g. Plastic' : 'e.g. Electronics'}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    {user?.role === 'EVENTS' ? 'Equipment Description' : 'Description'}
                  </label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] outline-none resize-none"
                    placeholder={
                      user?.role === 'EVENTS'
                        ? 'Describe the equipment...'
                        : 'Describe your product...'
                    }
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    {user?.role === 'EVENTS' ? 'Equipment Image' : 'Product Image'}
                  </label>
                  <div
                    onClick={() => document.getElementById('product-image-input')?.click()}
                    className="w-full h-32 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden transition-all hover:border-[#d49b35]/30 cursor-pointer relative group"
                  >
                    {formData.image ? (
                      <>
                        <img
                          src={formData.image}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormData({ ...formData, image: '' });
                          }}
                          className="absolute top-2 right-2 p-1 bg-white/80 backdrop-blur-sm rounded-lg text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-8 h-8 text-slate-300 mb-2" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          Click to upload image
                        </span>
                      </>
                    )}
                    <input
                      id="product-image-input"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setFormData({ ...formData, image: reader.result as string });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#d49b35] hover:brightness-95 text-slate-900 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#d49b35]/20"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isEditing ? (
                    <Edit2 className="w-5 h-5" />
                  ) : (
                    <Plus className="w-5 h-5" />
                  )}
                  {isEditing
                    ? user?.role === 'EVENTS'
                      ? 'Update Equipment'
                      : 'Update Product'
                    : user?.role === 'EVENTS'
                      ? 'List Equipment'
                      : 'List Product'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {products.length === 0 ? (
          <div className="bg-white rounded-4xl p-12 text-center border border-slate-100">
            <Package className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">
              {user?.role === 'EVENTS' ? 'No equipment listed yet.' : 'No products listed yet.'}
            </p>
            <button
              onClick={() => setIsAdding(true)}
              className="text-[#d49b35] font-bold mt-2 hover:underline"
            >
              {user?.role === 'EVENTS' ? 'Add your first item' : 'Add your first product'}
            </button>
          </div>
        ) : (
          products.map((product, idx) => (
            <div
              key={uniqueKey('product', product.id, idx)}
              className="bg-white rounded-3xl p-4 flex items-center gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#f1f5f9] group hover:shadow-md transition-all"
            >
              {/* Thumbnail */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-100 shrink-0 relative">
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0 py-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-[#fdf8f0] text-[#C9973A] px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border border-[#C9973A]/20">
                    {product.category}
                  </span>
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${product.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  ></div>
                </div>
                <h4 className="font-bold text-slate-900 text-sm sm:text-base truncate">
                  {product.name}
                </h4>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-[#C9973A] font-black text-sm sm:text-base">
                    ZMW {product.price.toLocaleString()}
                  </p>
                  <span className="text-slate-300 text-xs">•</span>
                  <p className="text-slate-500 text-xs font-medium">Stock: {product.stock || 0}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0 pr-2">
                <button
                  onClick={() => handleEditClick(product)}
                  className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-50 hover:bg-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:text-[#C9973A] transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteClick(product.id!)}
                  className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-50 hover:bg-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:text-rose-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {deletingProductId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-4xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 p-8 text-center">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8 text-rose-600" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Delete Item?</h3>
            <p className="text-slate-500 mb-8">
              Are you sure you want to remove this item from your inventory? This action cannot be
              undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setDeletingProductId(null)}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-lg shadow-rose-600/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
