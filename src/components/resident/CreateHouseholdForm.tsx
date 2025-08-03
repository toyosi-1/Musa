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
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');

  // Get user's current location and reverse geocode to address
  const getCurrentLocation = async () => {
    setIsLoadingLocation(true);
    setLocationError('');
    
    try {
      // Check if geolocation is supported
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser');
      }
      
      // Get current position
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          }
        );
      });
      
      const { latitude, longitude } = position.coords;
      console.log('Got coordinates:', { latitude, longitude });
      
      // Use reverse geocoding to get address
      // Using OpenStreetMap Nominatim API (free, no API key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'Musa-Security-App/1.0'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to get address from coordinates');
      }
      
      const data = await response.json();
      console.log('Reverse geocoding result:', data);
      
      if (data && data.address) {
        const addressComponents = data.address;
        
        // Extract address components
        const streetNumber = addressComponents.house_number || '';
        const streetName = addressComponents.road || addressComponents.street || '';
        const neighborhood = addressComponents.neighbourhood || addressComponents.suburb || '';
        const city = addressComponents.city || addressComponents.town || addressComponents.village || 
                    addressComponents.state_district || addressComponents.county || '';
        const state = addressComponents.state || addressComponents.region || '';
        
        // Construct full street address
        let fullAddress = '';
        if (streetNumber && streetName) {
          fullAddress = `${streetNumber} ${streetName}`;
        } else if (streetName) {
          fullAddress = streetName;
        } else if (neighborhood) {
          fullAddress = neighborhood;
        }
        
        // If we have a display name but no constructed address, use part of display name
        if (!fullAddress && data.display_name) {
          const parts = data.display_name.split(',');
          fullAddress = parts[0]?.trim() || '';
        }
        
        // Update form fields
        if (fullAddress) setAddress(fullAddress);
        if (city) setCity(city);
        if (state) setState(state);
        
        setSuccess('Location detected and address filled automatically!');
        setTimeout(() => setSuccess(''), 3000);
        
      } else {
        throw new Error('No address found for this location');
      }
      
    } catch (error: any) {
      console.error('Error getting location:', error);
      let errorMessage = 'Failed to get your location. ';
      
      if (error.code === 1) {
        errorMessage += 'Please allow location access and try again.';
      } else if (error.code === 2) {
        errorMessage += 'Location unavailable. Please enter address manually.';
      } else if (error.code === 3) {
        errorMessage += 'Location request timed out. Please try again.';
      } else {
        errorMessage += error.message || 'Please enter address manually.';
      }
      
      setLocationError(errorMessage);
      setTimeout(() => setLocationError(''), 5000);
    } finally {
      setIsLoadingLocation(false);
    }
  };

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
        setError('Could not create household. Please try again.');
      }
    } catch (err) {
      console.error('Error creating household:', err);
      
      // Convert technical error messages to user-friendly ones
      let userFriendlyMessage = 'Could not create household. Please try again.';
      
      if (err instanceof Error) {
        const errorMessage = err.message;
        
        if (errorMessage.includes('permission-denied') || errorMessage.includes('permission denied')) {
          userFriendlyMessage = 'You do not have permission to create a household.';
        } else if (errorMessage.includes('name-already-exists') || errorMessage.includes('already exists')) {
          userFriendlyMessage = 'A household with this name already exists. Please choose another name.';
        } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
          userFriendlyMessage = 'Network error. Please check your internet connection and try again.';
        } else if (errorMessage.includes('already-in-household') || errorMessage.includes('already in a household')) {
          userFriendlyMessage = 'You are already a member of a household. Please leave your current household first.';
        }
      }
      
      setError(userFriendlyMessage);
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
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="createAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Street Address
                  </label>
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    disabled={isLoadingLocation || isLoading || disabled}
                    className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoadingLocation ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Getting location...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Use my location
                      </>
                    )}
                  </button>
                </div>
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
                {locationError && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {locationError}
                  </p>
                )}
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
