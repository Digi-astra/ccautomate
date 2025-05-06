'use client';

import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Login } from '../../_clientfeatures/api';
import { toast } from 'sonner';
import useLocalStorage from '../../_hooks/localstorage';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import useIndexDB from '../../_hooks/indexdb';

type FormValues = {
  environment: 'UAT' | 'PROD';
  email: string;
  password: string;
};

export default function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [storedValue, setLocalStorageValue, clearLocalStorageValue] = useLocalStorage('token', '');
  const [currentEnv, setCurrentEnv, clearCurrentEnv] = useLocalStorage('currentEnv', '');
  // const { setValue: setGoogleAuthToken, value: googleAuthToken, clearValue: clearGoogleAuthToken } = useIndexDB('auth', 'google', 'logintoken');
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<FormValues>({
    defaultValues: {
      environment: 'UAT',
      email: '',
      password: ''
    }
  });

  useEffect(() => {
    if (storedValue && currentEnv) {
      router.push('/options');
    }
  }, [storedValue, currentEnv, router]);

  // Watch the environment value
  const environment = watch('environment');

  const onSubmit = async (data: FormValues) => {
    try {
      setIsLoading(true);
      const response = await Login(data.email, data.password, data.environment);
      // console.log({response});/
      if (response.success) {
        if(response.data.x_access_token){
          setLocalStorageValue(response.data.x_access_token);
          setCurrentEnv(data.environment);
          toast.success(response.message, {
            style: {
              background: '#22c55e',
              color: 'white',
              border: '1px solid #16a34a'
            }
          });
          router.push('/options');
        }
      } else {
        toast.error(response.message, {
          style: {
            background: '#ef4444',
            color: 'white',
            border: '1px solid #dc2626'
          }
        });
        clearLocalStorageValue();
        clearCurrentEnv();
      }
    } catch (error) {
      toast.error('An error occurred during login', {
        style: {
          background: '#ef4444',
          color: 'white',
          border: '1px solid #dc2626'
        }
      });
      clearLocalStorageValue();
      clearCurrentEnv();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-[400px]">
      <CardHeader>
        <CardTitle className='text-center'>Login</CardTitle>
        <CardDescription className='text-center'>Enter your credentials to access your account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Environment</Label>
              <RadioGroup 
                value={environment}
                onValueChange={(value) => setValue('environment', value as 'UAT' | 'PROD')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="UAT"
                    id="uat"
                  />
                  <Label htmlFor="uat">UAT</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="PROD"
                    id="prod"
                  />
                  <Label htmlFor="prod">PROD</Label>
                </div>
              </RadioGroup>
              {errors.environment && (
                <p className="text-destructive text-sm">Please select an environment</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
                placeholder="Enter your email"
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-destructive text-sm">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters'
                  }
                })}
                placeholder="Enter your password"
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-destructive text-sm">{errors.password.message}</p>
              )}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
