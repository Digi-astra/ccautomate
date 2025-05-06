import { Button } from "@/components/ui/button";
import { useState } from "react";
import { authenticateGoogle } from "@/_clientfeatures/api";
import useLocalStorage from "@/_hooks/localstorage";
import { toast } from "sonner";
import { errorToast, successToast } from "@/components/custom/customtoast";
import useIndexDB from "@/_hooks/indexdb";

interface StepTwoProps {
  onNext: () => void;
}

export default function StepTwo({ onNext }: StepTwoProps) {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { setValue: setGoogleAuthToken, value: googleAuthToken } = useIndexDB('auth', 'google', 'driveClient');
  const { setValue: setGoogleFiles, value: googleFiles } = useIndexDB('auth', 'google', 'files');
  const [option, setOption, clearOption] = useLocalStorage('option', '');
  const handleGoogleAuth = async () => {
    setIsGoogleLoading(true);
    try {
      const response = await authenticateGoogle();
      if (response.success) {
        await setGoogleAuthToken(response.data.driveClient);
        await setGoogleFiles(response.data.files);
        successToast(response.message || 'Google authentication successful');
        setOption('Aplus');
        onNext();
      } else {
        errorToast(response.message || 'Failed to authenticate with Google');
      }
    } catch (error) {
      errorToast(error instanceof Error ? error.message : 'An error occurred during Google authentication');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Button 
          variant="outline"
          className="flex-1 h-32"
          onClick={handleGoogleAuth}
          disabled={isGoogleLoading}
        >
          <div className="space-y-2">
            <h3 className="font-medium">A+ Content</h3>
            {isGoogleLoading && (
              <div className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
          </div>
        </Button>
        <Button
          variant="outline" 
          className="flex-1 h-32"
          onClick={() => {
            setOption('graphics');
            onNext();
          }}
        >
          <div className="space-y-2">
            <h3 className="font-medium">Infographics</h3>
          </div>
        </Button>
      </div>
    </div>
  );
} 