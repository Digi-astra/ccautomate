import { Button } from "@/components/ui/button";
import useLocalStorage from "@/_hooks/localstorage";
import { useEffect } from "react";
import CustomCard from "@/components/custom/customcard";

interface StepOneProps {
  onNext: () => void;
}

export default function StepOne({ onNext }: StepOneProps) {
  const [action , setAction, clearAction] = useLocalStorage('action', '');
  useEffect(() => {
    clearAction();
  }, []);
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <CustomCard 
          isLoading={false}
          onClick={() => {
            setAction('scrape');
            onNext();
          }}
          disabled={false}
          title="Start Scraping"
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>}
        />
        <CustomCard 
          isLoading={false}
          onClick={() => {
            setAction('generate');
            onNext();
          }}
          disabled={false}
          title="Start Content Generation"
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
        />
        {/* <Button 
          variant="outline"
          className="flex-1 h-32"
          onClick={() => {
            setAction('scrape');
            onNext();
          }}
        >
          <div className="space-y-2">
            <h3 className="font-medium">Start Scraping</h3>
            <p className="text-sm text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>
            </p>
          </div>
        </Button>
        <Button
          variant="outline" 
          className="flex-1 h-32"
          onClick={() => {
            setAction('generate');
            onNext();
          }}
        >
          <div className="space-y-2">
            <h3 className="font-medium">Start Content Generation</h3>
            <p className="text-sm text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </p>
          </div>
        </Button> */}
      </div>
    </div>
  );
} 