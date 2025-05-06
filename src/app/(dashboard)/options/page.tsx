'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import useLocalStorage from "@/_hooks/localstorage";
import { useEffect, useState, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Stepper } from "@/components/custom/stepper";
import { Step } from "./_components/types";

// Lazy load the step components
const StepOne = lazy(() => import("./_components/StepOne"));
const StepTwo = lazy(() => import("./_components/StepTwo")); 
const StepThree = lazy(() => import("./_components/StepThree"));

// Loading fallback component
const LoadingStep = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
  </div>
);

export default function OptionsPage() {
  const [token] = useLocalStorage('token', '');
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<Step[]>([
    {
      title: 'Choose an action',
      description: 'Choose an action to perform',
      status: 'current' as const,
    },
    {
      title: 'Options', 
      description: 'Select your preferences',
      status: 'hidden' as const,
    },
    {
      title: 'Configuration',
      description: 'Set up your settings',
      status: 'hidden' as const,
    },
    {
      title: 'Review',
      description: 'Review and confirm',
      status: 'hidden' as const,
    }
  ]);

  const handleStep = (stepNumber: number) => {
    if (stepNumber >= 0 && stepNumber < steps.length) {
      const updatedSteps = steps.map((step, index) => {
        if (index === stepNumber) {
          return { ...step, status: 'current' as const };
        } else if (index < stepNumber) {
          return { ...step, status: 'complete' as const };
        } else {
          return { ...step, status: 'hidden' as const };
        }
      });

      setSteps(updatedSteps);
      setCurrentStep(stepNumber);
    }
  };

  const handleNextStep = () => {
    handleStep(currentStep + 1);
  };

  useEffect(() => {
    if (!token) {
      router.push('/');
    }
  }, [token, router]);

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Setup Progress</CardTitle>
            <CardDescription className="text-center">Track your setup progress</CardDescription>
          </CardHeader>
          <CardContent>
            <Stepper steps={steps} currentStep={currentStep} onStepClick={handleStep} />
          </CardContent>
        </Card>

        <Card className="p-0 mt-3">
          <CardContent className="p-3">
            <Suspense fallback={<LoadingStep />}>
              {currentStep === 0 && <StepOne onNext={handleNextStep} />}
              {currentStep === 1 && <StepTwo onNext={handleNextStep} />}
              {currentStep === 2 && <StepThree currentStep={currentStep} />}
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
