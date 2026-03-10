import React, { useState } from 'react';
import { useGetAddressByPhone } from '@/hooks/useAddressData';
import clsx from 'clsx';

interface GetAddressByPhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (data: any) => void;
}

export const GetAddressByPhoneModal: React.FC<GetAddressByPhoneModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [phone, setPhone] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const { mutate: getAddress, isPending } = useGetAddressByPhone();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Validate phone number
    if (!phone || !/^0+(\d{9,10})$/.test(phone)) {
      setErrorMessage((window.vncheckout_array?.phone_error as string) || 'Invalid phone number');
      return;
    }

    // Check reCAPTCHA if element exists
    const recaptchaElement = document.getElementById('g-recaptcha-response') as HTMLInputElement;
    const recaptchaValue = recaptchaElement ? recaptchaElement.value : '';

    if (recaptchaElement && !recaptchaValue) {
      setErrorMessage('Please complete verification.');
      return;
    }

    getAddress(
      { phone, recaptcha: recaptchaValue },
      {
        onSuccess: (data) => {
          // Fill in the address fields
          if (data.billing) {
            Object.keys(data.billing).forEach((key) => {
              const element = document.getElementById(key) as HTMLInputElement | HTMLSelectElement;
              if (element) {
                if (element.tagName === 'SELECT') {
                  element.value = data.billing[key] || '';
                  // Trigger change event for Select2
                  if (typeof jQuery !== 'undefined') {
                    jQuery(element).trigger('change');
                  }
                } else {
                  element.value = data.billing[key] || '';
                }
              }
            });
          }

          setErrorMessage('');
          onSuccess?.(data);
          onClose();

          // Focus on first name field
          const firstNameField = document.getElementById('billing_first_name') ||
            document.getElementById('billing_last_name');
          if (firstNameField) {
            (firstNameField as HTMLInputElement).focus();
          }
        },
        onError: (error: any) => {
          setErrorMessage(
            error.message ||
            window.vncheckout_array?.loadaddress_error ||
            'Unable to load address'
          );
        },
      }
    );
  };

  const handleCancel = () => {
    setErrorMessage('');
    setPhone('');
    onClose();

    const firstNameField = document.getElementById('billing_first_name') ||
      document.getElementById('billing_last_name');
    if (firstNameField) {
      (firstNameField as HTMLInputElement).focus();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="mfp-wrap mfp-auto-cursor mfp-ready" style={{ overflow: 'hidden auto' }}>
      <div className="mfp-container mfp-inline-holder">
        <div className="mfp-content">
          <div id="get_address_content" className="white-popup">
            <h3>Get address from phone number</h3>

            <form onSubmit={handleSubmit}>
              <div className="get_address_content_form">
                <input
                  type="text"
                  id="sdt_get_address"
                  placeholder="Enter phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isPending}
                />

                {/* reCAPTCHA placeholder - actual implementation in PHP */}
                <div id="recaptcha-container"></div>
              </div>

              {errorMessage && (
                <div className="get_address_content_mess" style={{ color: 'red' }}>
                  {errorMessage}
                </div>
              )}

              {isPending && (
                <div className="get_address_content_mess">
                  {(window.vncheckout_array?.loading_text as string) || 'Loading...'}
                </div>
              )}

              <div className="get_address_content_button">
                <button
                  type="submit"
                  className={clsx('btn_get_address button', {
                    coolbirdzik_loading: isPending,
                  })}
                  disabled={isPending}
                >
                  Get address
                </button>
                <button
                  type="button"
                  className="btn_cancel button"
                  onClick={handleCancel}
                  disabled={isPending}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="mfp-bg mfp-ready" onClick={handleCancel}></div>
    </div>
  );
};
