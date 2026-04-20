import { useState } from 'react';
import type { Household } from '@/types/user';
import { updateHouseholdAddress } from '@/services/householdService';

interface AddressSectionProps {
  household: Household;
  userId: string;
  /** Invoked after a successful update so the parent can refetch household data. */
  onUpdated?: () => Promise<void> | void;
  /** Reports transient feedback (error / success toasts) back to the parent. */
  onFeedback?: (feedback: { error?: string; success?: string }) => void;
}

/**
 * Display + edit mode for the household address. Owns its own form state
 * so the parent only needs to pass the household record.
 */
export function AddressSection({ household, userId, onUpdated, onFeedback }: AddressSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [address, setAddress] = useState(household.address || '');
  const [addressLine2, setAddressLine2] = useState(household.addressLine2 || '');
  const [city, setCity] = useState(household.city || '');
  const [state, setState] = useState(household.state || '');
  const [postalCode, setPostalCode] = useState(household.postalCode || '');
  const [country, setCountry] = useState(household.country || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !city || !state || !postalCode || !country) {
      onFeedback?.({ error: 'Please fill in all required address fields' });
      return;
    }

    setIsLoading(true);
    try {
      const updated = await updateHouseholdAddress(household.id, userId, {
        address,
        addressLine2,
        city,
        state,
        postalCode,
        country,
      });
      setAddress(updated.address || '');
      setAddressLine2(updated.addressLine2 || '');
      setCity(updated.city || '');
      setState(updated.state || '');
      setPostalCode(updated.postalCode || '');
      setCountry(updated.country || '');
      setShowForm(false);
      onFeedback?.({ success: 'Address updated successfully!' });
      await onUpdated?.();
    } catch (err) {
      console.error('Error updating address:', err);
      onFeedback?.({
        error: `Failed to update address: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-300">Address</span>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-xs font-medium text-primary hover:text-primary-dark transition"
        >
          {showForm ? 'Cancel' : household.address ? 'Edit' : 'Add'}
        </button>
      </div>

      {!showForm && <AddressDisplay household={household} />}

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <AddressField id="address" label="Street Address*" value={address} onChange={setAddress} disabled={isLoading} placeholder="123 Main St" required />
          <AddressField id="addressLine2" label="Address Line 2" value={addressLine2} onChange={setAddressLine2} disabled={isLoading} placeholder="Apt, Suite, Unit, etc." />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AddressField id="city" label="City*" value={city} onChange={setCity} disabled={isLoading} placeholder="City" required />
            <AddressField id="state" label="State/Province*" value={state} onChange={setState} disabled={isLoading} placeholder="State/Province" required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AddressField id="postalCode" label="Postal Code*" value={postalCode} onChange={setPostalCode} disabled={isLoading} placeholder="Postal/Zip Code" required />
            <AddressField id="country" label="Country*" value={country} onChange={setCountry} disabled={isLoading} placeholder="Country" required />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Updating...' : 'Update Address'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function AddressDisplay({ household }: { household: Household }) {
  if (!household.address) {
    return (
      <div className="text-sm text-gray-700 dark:text-gray-300">
        <p className="text-gray-500 dark:text-gray-300 italic">
          No address added yet. Guards won&apos;t be able to see where visitors are going.
        </p>
      </div>
    );
  }
  return (
    <div className="text-sm text-gray-700 dark:text-gray-300">
      <div className="space-y-1">
        <p>{household.address}</p>
        {household.addressLine2 && <p>{household.addressLine2}</p>}
        <p>
          {[household.city, household.state, household.postalCode].filter(Boolean).join(', ')}
        </p>
        {household.country && <p>{household.country}</p>}
      </div>
    </div>
  );
}

interface AddressFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  required?: boolean;
}

function AddressField({ id, label, value, onChange, placeholder, disabled, required }: AddressFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input w-full text-sm sm:text-base"
        disabled={disabled}
        required={required}
      />
    </div>
  );
}
