"use client";

import { useState } from 'react';
import { User } from '@/types/user';

interface CreateHouseholdFormProps {
  onCreateHousehold: (name: string, addressData?: {
    address?: string;
    city?: string;
    state?: string;
  }) => Promise<any>;
  disabled?: boolean;
}

export default function CreateHouseholdForm({ onCreateHousehold, disabled = false }: CreateHouseholdFormProps) {
  const [householdName, setHouseholdName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddressFields, setShowAddressFields] = useState(true);

  // Create a new household
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!householdName.trim()) {
      setError('Please enter a household name');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Prepare address data if address fields are filled
      const addressData = showAddressFields && address ? {
        address,
        city: city || undefined,
        state: state || undefined
      } : undefined;
      
      // Call parent component's onCreateHousehold function
      const result = await onCreateHousehold(householdName, addressData);
      
      if (result) {
        setSuccess('Household created successfully!');
        // Reset form
        setHouseholdName('');
        setAddress('');
        setCity('');
        setState('');
        
        // Reset after a few seconds
        setTimeout(() => {
          setSuccess('');
        }, 3000);
      } else {
        setError('Could not create household. Check console for details.');
      }
    } catch (err) {
      console.error('Error creating household:', err);
      setError(`Failed to create household: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold mb-4">Create a Household</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="householdName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Household Name*
          </label>
          <input
            id="householdName"
            type="text"
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
            placeholder="e.g., Smith Family"
            className="input w-full"
            disabled={isLoading || disabled}
            required
          />
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Address Information</span>
            <button 
              type="button"
              onClick={() => setShowAddressFields(!showAddressFields)}
              className="text-xs font-medium text-primary hover:text-primary-dark transition"
            >
              {showAddressFields ? 'Hide Fields' : 'Show Fields'}
            </button>
          </div>
          
          {showAddressFields && (
            <div className="space-y-4 mt-4">
              <div>
                <label htmlFor="createAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Street Address
                </label>
                <input
                  id="createAddress"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="12 Alabi Johnson street"
                  className="input w-full"
                  disabled={isLoading || disabled}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Guards will see this address when verifying visitor access codes
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="createCity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    City
                  </label>
                  <input
                    id="createCity"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="mende"
                    className="input w-full"
                    disabled={isLoading || disabled}
                  />
                </div>
                
                <div>
                  <label htmlFor="createState" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    State/Province
                  </label>
                  <input
                    id="createState"
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="Lagos"
                    className="input w-full"
                    disabled={isLoading || disabled}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="pt-2">
          <button
            type="submit"
            className="btn-primary w-full"
            disabled={isLoading || disabled}
          >
            {isLoading ? 'Creating...' : 'Create Household'}
          </button>
        </div>
      </form>
    </div>
  );
}
