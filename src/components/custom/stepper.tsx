'use client';

import { useEffect } from 'react';
import { Step } from "@/app/(dashboard)/options/_components/types";
import { cn } from "@/lib/utils";

interface StepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (stepNumber: number) => void;
}

export function Stepper({ steps, currentStep, onStepClick }: StepperProps) {
  // Filter out hidden steps
  const visibleSteps = steps.filter(step => step.status !== 'hidden');

  return (
    <div className="relative">
      <div className="relative flex justify-start gap-4">
        {visibleSteps.map((step, index) => (
          <div
            key={step.title}
            className={cn(
              "flex flex-col items-center",
              onStepClick && "cursor-pointer"
            )}
            onClick={() => onStepClick?.(index)}
          >
            <div
              className={cn(
                "z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 bg-white transition-all duration-500 ease-in-out",
                step.status === "complete" && "border-primary bg-primary text-white",
                step.status === "current" && "border-primary",
                step.status === "upcoming" && "border-gray-300"
              )}
            >
              {step.status === "complete" ? (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <span className="text-sm font-medium">{index + 1}</span>
              )}
            </div>
            <div className="mt-2 text-center">
              <p
                className={cn(
                  "text-sm font-medium",
                  step.status === "current" && "text-primary",
                  step.status === "complete" && "text-primary",
                  step.status === "upcoming" && "text-gray-500"
                )}
              >
                {step.title}
              </p>
              <p className="text-xs text-gray-500">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}