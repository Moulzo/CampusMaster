"use client";

import { useState, useCallback } from "react";

interface DropzoneProps {
  onFileUpload: (file: File) => void;
  accept?: string;
  maxSize?: number; // en bytes
  className?: string;
  children?: React.ReactNode;
}

export function Dropzone({ 
  onFileUpload, 
  accept = "application/pdf,.doc,.docx,.txt,.jpg,.jpeg,.png",
  maxSize = 10 * 1024 * 1024, // 10MB par défaut
  className = "",
  children 
}: DropzoneProps) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    if (!file) return;

    // Vérifier la taille
    if (file.size > maxSize) {
      alert(`Fichier trop volumineux. Taille maximale: ${Math.round(maxSize / 1024 / 1024)}MB`);
      return;
    }

    // Vérifier le type
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const acceptedExtensions = accept.split(',').map(ext => ext.trim().replace('.', ''));
    
    if (fileExtension && !acceptedExtensions.includes(fileExtension)) {
      alert(`Type de fichier non autorisé. Types acceptés: ${accept}`);
      return;
    }

    // Simuler l'upload (dans un vrai cas, on enverrait à une API)
    setUploadProgress(0);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (result && typeof result === 'string') {
        // Simuler un upload progressif
        let progress = 0;
        const progressInterval = setInterval(() => {
          progress = Math.min(100, progress + 10);
          setUploadProgress(progress);
          if (progress >= 100) {
            clearInterval(progressInterval);
            onFileUpload(file);
          }
        }, 100);
      }
    };
    
    reader.readAsDataURL(file);
  }, [onFileUpload, accept, maxSize]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const file = files?.[0];
    if (!file) return;

    // Vérifier la taille
    if (file.size > maxSize) {
      alert(`Fichier trop volumineux. Taille maximale: ${Math.round(maxSize / 1024 / 1024)}MB`);
      return;
    }

    // Vérifier le type
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const acceptedExtensions = accept.split(',').map(ext => ext.trim().replace('.', ''));
    
    if (fileExtension && !acceptedExtensions.includes(fileExtension)) {
      alert(`Type de fichier non autorisé. Types acceptés: ${accept}`);
      return;
    }

    // Simuler l'upload
    setUploadProgress(0);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (result && typeof result === 'string') {
        let progress = 0;
        const progressInterval = setInterval(() => {
          progress = Math.min(100, progress + 10);
          setUploadProgress(progress);
          if (progress >= 100) {
            clearInterval(progressInterval);
            onFileUpload(file);
          }
        }, 100);
      }
    };
    
    reader.readAsDataURL(file);
  }, [onFileUpload, accept, maxSize]);

  return (
    <div className={`relative ${className}`}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400 bg-white'
          }
          ${uploadProgress > 0 && uploadProgress < 100 ? 'pointer-events-none opacity-75' : ''}
        `}
      >
        <input 
          type="file"
          accept={accept}
          onChange={handleFileInput}
          className="hidden" 
        />
        
        {uploadProgress === 0 && (
          <div className="space-y-4">
            <div className="text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v4m0 0h16m-16 0h16m-16 0h16m-16 0h16" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="mt-2">Glissez-déposez un fichier ici</p>
              <p className="text-sm">ou cliquez pour sélectionner</p>
            </div>
          </div>
        )}

        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="space-y-4">
            <div className="text-blue-600">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2">Upload en cours... {uploadProgress}%</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {uploadProgress === 100 && (
          <div className="space-y-4">
            <div className="text-green-600">
              <svg className="mx-auto h-12 w-12 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 1.414l8-8a1 1 0 01-1.414-1.414z" clipRule="evenodd" />
              </svg>
              <p className="mt-2">Fichier uploadé avec succès!</p>
            </div>
          </div>
        )}

        {children && (
          <div className="mt-4">
            {children}
          </div>
        )}
      </div>
      
      {isDragging && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-10 rounded-lg pointer-events-none" />
      )}
    </div>
  );
}
