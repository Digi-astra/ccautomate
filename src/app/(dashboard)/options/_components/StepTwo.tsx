import { useState } from "react";
import { authenticateGoogle } from "@/_clientfeatures/api";
import useLocalStorage from "@/_hooks/localstorage";
import { errorToast, successToast } from "@/components/custom/customtoast";
import useIndexDB from "@/_hooks/indexdb";
import CustomCard from "@/components/custom/customcard";

interface StepTwoProps {
  onNext: () => void;
}

export default function StepTwo({ onNext }: StepTwoProps) {
  const [isAPlusLoading, setIsAPlusLoading] = useState(false);
  const [isGraphicsLoading, setIsGraphicsLoading] = useState(false);
  const { setValue: setGoogleAuthToken } = useIndexDB('auth', 'google', 'driveClient');
  const { setValue: setGoogleFiles } = useIndexDB('auth', 'google', 'files');
  const [, setOption] = useLocalStorage('option', '');

  const handleGoogleAuth = async (setOptionValue: string, setLoading: (loading: boolean) => void) => {
    setLoading(true);
    try {
      const response = await authenticateGoogle();
      if (response.success) {
        await Promise.all([
          setGoogleAuthToken(response.data.driveClient),
          setGoogleFiles(response.data.files)
        ]);
        successToast(response.message || 'Google authentication successful');
        setOption(setOptionValue);
        onNext();
      } else {
        errorToast(response.message || 'Failed to authenticate with Google');
      }
    } catch (error) {
      errorToast(error instanceof Error ? error.message : 'An error occurred during Google authentication');
    } finally {
      setLoading(false);
    }
  };

  

  const isAnyLoading = isAPlusLoading || isGraphicsLoading;

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <CustomCard 
          isLoading={isAPlusLoading}
          onClick={() => handleGoogleAuth('A_PLUS', setIsAPlusLoading)}
          disabled={isAnyLoading}
          title="A+ Content"
        
        />
        <CustomCard 
          isLoading={isGraphicsLoading}
          onClick={() => handleGoogleAuth('Graphics', setIsGraphicsLoading)}
          disabled={isAnyLoading}
          title="Infographics"
         
        />
      </div>
    </div>
  );
}