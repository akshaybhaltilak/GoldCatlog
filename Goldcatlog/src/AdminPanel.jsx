import { useState, useEffect } from 'react';
import { ref, push, set, onValue, remove, update } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './Firebase/Config';

export default function AdminPanel() {
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    weight: '',
    description: '',
    category: '',
    image: null,
    imageUrl: '',
    inStock: true,
    price: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    const productsRef = ref(db, 'products');
    onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      setProducts(data ? Object.entries(data).map(([id, item]) => ({ id, ...item })) : []);
    });
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      weight: '',
      description: '',
      category: '',
      image: null,
      imageUrl: '',
      inStock: true
    });
    setEditMode(false);
    setEditId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const { image, ...productData } = formData;
      
      // Validate required fields
      if (!productData.name || !productData.weight || !productData.category) {
        throw new Error('Please fill all required fields');
      }

      let dbRef;
      if (editMode && editId) {
        dbRef = ref(db, `products/${editId}`);
      } else {
        dbRef = push(ref(db, 'products'));
      }
      
      // Handle image upload or use image URL
      if (image) {
        const fileRef = storageRef(storage, `products/${editMode ? editId : dbRef.key}`);
        await uploadBytes(fileRef, image);
        const uploadedImageUrl = await getDownloadURL(fileRef);
        productData.imageUrl = uploadedImageUrl;
      } else if (productData.imageUrl) {
        // Keep the imageUrl from form data
      } else if (editMode && !productData.imageUrl) {
        // If editing and no new image is provided, keep the existing image
        const existingProduct = products.find(p => p.id === editId);
        if (existingProduct && existingProduct.imageUrl) {
          productData.imageUrl = existingProduct.imageUrl;
        }
      }

      if (editMode) {
        await update(dbRef, productData);
        setSuccessMessage('Product updated successfully!');
      } else {
        await set(dbRef, productData);
        setSuccessMessage('Product added successfully!');
      }
      
      resetForm();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error saving product:', error);
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      remove(ref(db, `products/${id}`));
    }
  };

  const handleEdit = (product) => {
    setFormData({
      name: product.name || '',
      weight: product.weight || '',
      description: product.description || '',
      category: product.category || '',
      image: null,
      imageUrl: product.imageUrl || '',
      inStock: product.inStock !== false, // Default to true if not specified
      price: product.price || ''
    });
    setEditMode(true);
    setEditId(product.id);
    window.scrollTo(0, 0);
  };
  
  const handleToggleStock = async (product) => {
    const productRef = ref(db, `products/${product.id}`);
    await update(productRef, { inStock: !product.inStock });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFormData(prev => ({ 
        ...prev, 
        image: e.target.files[0],
        imageUrl: '' // Clear imageUrl when file is selected
      }));
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Gold Shop Admin Panel</h1>
      
      <form onSubmit={handleSubmit} className="mb-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">
          {editMode ? 'Edit Product' : 'Add New Product'}
        </h2>
        
        {successMessage && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
            {successMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Product Name*</label>
            <input
              type="text"
              name="name"
              placeholder="e.g., Gold Necklace"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Weight (grams)*</label>
            <input
              type="text"
              name="weight"
              placeholder="e.g., 10g"
              value={formData.weight}
              onChange={handleInputChange}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
        
          
          <div>
            <label className="block text-sm font-medium mb-1">Category*</label>
            <input
              type="text"
              name="category"
              placeholder="e.g., Necklace, Ring"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              name="description"
              placeholder="Product details..."
              value={formData.description}
              onChange={handleInputChange}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Product Image File</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">OR Image URL</label>
            <input
              type="url"
              name="imageUrl"
              placeholder="https://example.com/image.jpg"
              value={formData.imageUrl}
              onChange={handleInputChange}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="inStock"
              name="inStock"
              checked={formData.inStock}
              onChange={handleInputChange}
              className="mr-2 h-5 w-5"
            />
            <label htmlFor="inStock" className="text-sm font-medium">
              Product In Stock
            </label>
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors disabled:bg-blue-400"
          >
            {isSubmitting ? 'Saving...' : editMode ? 'Update Product' : 'Add Product'}
          </button>
          
          {editMode && (
            <button 
              type="button"
              onClick={resetForm}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-md transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Product List ({products.length})</h2>
        
        {products.length === 0 ? (
          <p className="text-gray-500">No products found</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <div key={product.id} className="border p-4 rounded-lg hover:shadow-md transition-shadow relative">
                {!product.inStock && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    Out of Stock
                  </div>
                )}
                
                {product.imageUrl ? (
                  <img 
                    src={product.imageUrl} 
                    alt={product.name} 
                    className="w-full h-48 object-contain mb-3 bg-gray-100 rounded"
                  />
                ) : (
                  <div className="w-full h-48 flex items-center justify-center bg-gray-100 mb-3 rounded">
                    <span className="text-gray-400">No Image</span>
                  </div>
                )}
                
                <h3 className="font-bold text-lg">{product.name}</h3>
                <p className="text-gray-600">Weight: {product.weight}</p>
                {product.price && (
                  <p className="text-gray-600">Price: {product.price}</p>
                )}
                {product.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{product.description}</p>
                )}
                <p className="text-sm mt-2">Category: {product.category}</p>
                
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleEdit(product)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleStock(product)}
                    className={`${product.inStock ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'} text-white px-3 py-1 rounded text-sm transition-colors`}
                  >
                    {product.inStock ? 'Mark Out of Stock' : 'Mark In Stock'}
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}