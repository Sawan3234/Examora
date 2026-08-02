import React from 'react';

export function ToastContainer() {
  return (
    <div
      id="toast-container"
      className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-3 sm:right-6 sm:top-6"
    />
  );
}