import useIndexDB from "@/_hooks/indexdb";
import ReactSelectComponent from "@/components/custom/reactselect";
import { useState, useEffect } from "react";
import { clearProgress, scrapeSheetData , generateContent } from "@/_clientfeatures/api";
import { errorToast, successToast } from "@/components/custom/customtoast";
import useLocalStorage from "@/_hooks/localstorage";
import StatusDiv from "@/components/custom/statusdiv";
import { authenticateGoogle } from "@/_clientfeatures/api";

interface StepThreeProps {
  currentStep: number;
}

interface StatusData {
  id?: string;
  status: "success" | "pending" | "failed";
  message: string;
}

export default function StepThree({ currentStep }: StepThreeProps) {
  const { value: googleFiles, setValue: setGoogleFiles } = useIndexDB('auth', 'google', 'files');
  const [selectedFile, setSelectedFile] = useState<{ value: string; label: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentEnv] = useLocalStorage('currentEnv', '');
  const [token] = useLocalStorage('token', '');
  const [option] = useLocalStorage('option', '');
  const [action] = useLocalStorage('action', '');
  const [status, setStatus] = useState<StatusData[]>([]);
  const [progressBool, setProgressBool] = useState<boolean>(false);
  // Transform the files data into the correct format for ReactSelect
  const formattedOptions = Array.isArray(googleFiles) 
    ? googleFiles.map(file => ({
        value: file.id || '',
        label: file.name || ''
      }))
    : [];

  useEffect(() => {
    // Set loading to false once we have the files data
    if (googleFiles !== undefined) {
      setIsLoading(false);
    }
  }, [googleFiles]);


  useEffect(() => {
    if(progressBool){
      let checktheStatus = setInterval(async() => {
        const progress = await authenticateGoogle("progress");
        if(progress.success){
          console.log({progress});
          setStatus(progress.data.progress);
          // Check for stop or error status in progress array
          const shouldStop = progress.data.progress.some((item: any) => 
            item.id === "stop"
          );
          console.log("shouldStop", shouldStop)
          if (shouldStop) {
            clearInterval(checktheStatus);
            clearProgress();
            setProgressBool(false);
          }
          if(progress.data.progress.length === 0){
            setProgressBool(false);
          }
        }
      }, 5000);
      return () => clearInterval(checktheStatus);
    }
  }, [progressBool]);

  const handleFileChange = (selectedOption: any) => {
    setSelectedFile(selectedOption);
    // You can add additional logic here when a file is selected
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Select File</h2>
        <p className="text-gray-500">Choose a file from your Google Drive to process</p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Google Drive Files</label>
        <ReactSelectComponent 
          options={formattedOptions} 
          onChange={handleFileChange}
          value={selectedFile}
          disabled={progressBool}
        />
      </div>
      {formattedOptions.length === 0 && (
        <p className="text-sm text-gray-500">No files available. Please make sure you have files in your Google Drive.</p>
      )}
      {selectedFile && (
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Selected File</h2>
          <p className="text-gray-500">{selectedFile.label}</p>
          <button
            className="bg-primary text-white px-4 py-2 rounded-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={async () => {
              setIsGenerating(true);
              let result;
              if(action === "generate"){
                result = await generateContent(selectedFile?.value || '', 'start_content_generation', option, currentEnv, token);
              }else{
                result = await scrapeSheetData(selectedFile?.value || '', 'generatetransactionid', option, currentEnv, token);
              }
              setIsGenerating(false);
              if (result?.success) {
                successToast(result?.message);
                setProgressBool(true);
              } else {
                errorToast(result?.message);
              }
            }}
            disabled={isGenerating || !selectedFile || progressBool}
          >
            {isGenerating ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                Generating...
              </>
            ) : (
              action === "generate" ? "Start generating content" : "Start scraping"
            )}
          </button>
        </div>
      )}
      <StatusDiv data={status} />
      {/* <button 
        onClick={() => {
          clearProgress();
          setProgressBool(false);
        }}
        className="text-primary hover:text-primary-dark"
      >
        Clear Progress
      </button> */}
    </div>
  );
} 