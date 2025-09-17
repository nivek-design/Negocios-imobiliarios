import { useState } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import { DashboardModal } from "@uppy/react";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/contexts/I18nContext";
import { Camera } from "lucide-react";

// API Response types
interface UploadURLResponse {
  uploadURL: string;
}

interface ImageACLResponse {
  objectPath: string;
}

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
  const [uppy] = useState<Uppy>(() => {
    const uppyInstance = new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
        allowedFileTypes: ['image/*'],
      },
      autoProceed: false,
    });

    uppyInstance.use(AwsS3, {
      shouldUseMultipart: false,
      getUploadParameters: async () => {
        const response = await fetch('/api/objects/upload', {
          method: 'POST',
          credentials: 'include',
        });
        if (!response.ok) {
          console.error('Failed to get upload URL:', response.status, response.statusText);
          throw new Error('Failed to get upload URL');
        }
        const data: UploadURLResponse = await response.json();
        console.log('Upload URL received:', data.uploadURL);
        return {
          method: 'PUT' as const,
          url: data.uploadURL,
        };
      },
    });

    uppyInstance.on("complete", async (result) => {
      console.log('Upload complete:', result);
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
                const data: ImageACLResponse = await response.json();
                console.log('Image ACL set, object path:', data.objectPath);
                uploadedUrls.push(data.objectPath);
              } else {
                console.error('Failed to set image ACL:', response.status);
              }
            } catch (error: unknown) {
              console.error('Error setting image ACL:', error instanceof Error ? error.message : String(error));
            }
          }
        }
        
        console.log('Final uploaded URLs:', uploadedUrls);
        onComplete?.(uploadedUrls);
        setShowModal(false);
      }
    });

    uppyInstance.on("error", (error: Error) => {
      console.error('Uppy error:', error.message);
    });

    return uppyInstance;
  });

  return (
    <div>
      <Button 
        type="button"
        onClick={() => setShowModal(true)} 
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