import { useState } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import { DashboardModal } from "@uppy/react";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/contexts/I18nContext";
import { Camera } from "lucide-react";

interface ImageUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onComplete?: (uploadedUrls: string[]) => void;
  buttonClassName?: string;
  children?: ReactNode;
  disabled?: boolean;
}

/**
 * Componente de upload de imagens que renderiza como um botão e fornece uma interface modal para
 * gerenciamento de arquivos.
 * 
 * Funcionalidades:
 * - Renderiza como um botão personalizável que abre um modal de upload de arquivos
 * - Fornece uma interface modal para:
 *   - Seleção de arquivos
 *   - Visualização de arquivos
 *   - Acompanhamento do progresso do upload
 *   - Exibição do status do upload
 * 
 * O componente usa Uppy internamente para lidar com toda a funcionalidade de upload de arquivos.
 * Todas as funcionalidades de gerenciamento de arquivos são automaticamente tratadas pelo modal do Uppy.
 */
export function ImageUploader({
  maxNumberOfFiles = 10,
  maxFileSize = 10485760, // 10MB default
  onComplete,
  buttonClassName,
  children,
  disabled = false,
}: ImageUploaderProps) {
  const { t } = useI18n();
  const [showModal, setShowModal] = useState(false);
  
  console.log('ImageUploader render, showModal:', showModal);
  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
        allowedFileTypes: ['image/*'],
      },
      autoProceed: false,
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: async () => {
          const response = await fetch('/api/objects/upload', {
            method: 'POST',
            credentials: 'include',
          });
          if (!response.ok) {
            throw new Error('Failed to get upload URL');
          }
          const data = await response.json();
          return {
            method: 'PUT' as const,
            url: data.uploadURL,
          };
        },
      })
      .on("complete", async (result) => {
        if (result.successful && result.successful.length > 0) {
          const uploadedUrls: string[] = [];
          
          for (const file of result.successful) {
            const uploadURL = file.uploadURL;
            if (uploadURL) {
              try {
                // Set ACL policy for the uploaded image
                const response = await fetch('/api/property-images', {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  credentials: 'include',
                  body: JSON.stringify({ imageURL: uploadURL }),
                });
                
                if (response.ok) {
                  const data = await response.json();
                  uploadedUrls.push(data.objectPath);
                }
              } catch (error) {
                console.error('Error setting image ACL:', error);
              }
            }
          }
          
          onComplete?.(uploadedUrls);
          setShowModal(false);
        }
      })
  );

  return (
    <div>
      <Button 
        type="button"
        onClick={() => {
          console.log('Button clicked, setting modal to true');
          setShowModal(true);
        }} 
        className={buttonClassName}
        disabled={disabled}
        data-testid="button-upload-images"
      >
        {children || (
          <>
            <Camera className="w-4 h-4 mr-2" />
            {t('form.uploadImages')}
          </>
        )}
      </Button>

      <DashboardModal
        uppy={uppy}
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        proudlyDisplayPoweredByUppy={false}
        note={t('form.imageUploadNote')}
      />
    </div>
  );
}