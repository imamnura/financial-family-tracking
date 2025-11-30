/**
 * Form Validation Hook
 * Integrates Zod schema validation with react-hook-form
 */

import {
  useForm,
  UseFormReturn,
  FieldValues,
  UseFormProps,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

/**
 * Enhanced useForm hook with Zod validation
 */
export function useZodForm<TSchema extends z.ZodType<any, any, any>>(
  schema: TSchema,
  options?: Omit<UseFormProps<z.infer<TSchema>>, "resolver">
): UseFormReturn<z.infer<TSchema>> {
  return useForm<z.infer<TSchema>>({
    ...options,
    resolver: zodResolver(schema),
  });
}

/**
 * Helper to get error message from form state
 */
export function getErrorMessage(
  errors: any,
  fieldName: string
): string | undefined {
  const fieldError = fieldName
    .split(".")
    .reduce((obj, key) => obj?.[key], errors);
  return fieldError?.message;
}

/**
 * Field validation state helper
 */
export function getFieldState(
  errors: any,
  touchedFields: any,
  fieldName: string
): {
  isInvalid: boolean;
  isTouched: boolean;
  errorMessage?: string;
} {
  const isTouched = fieldName
    .split(".")
    .reduce((obj, key) => obj?.[key], touchedFields);
  const errorMessage = getErrorMessage(errors, fieldName);

  return {
    isInvalid: !!errorMessage,
    isTouched: !!isTouched,
    errorMessage,
  };
}

/**
 * Async validation helper
 */
export async function validateAsync<T>(
  value: T,
  validatorFn: (value: T) => Promise<boolean>,
  errorMessage: string
): Promise<string | true> {
  try {
    const isValid = await validatorFn(value);
    return isValid ? true : errorMessage;
  } catch (error) {
    return errorMessage;
  }
}

/**
 * Example: Email uniqueness validator
 */
export async function validateEmailUnique(email: string): Promise<boolean> {
  try {
    const response = await fetch(
      `/api/validate/email?email=${encodeURIComponent(email)}`
    );
    const data = await response.json();
    return data.available;
  } catch (error) {
    return false;
  }
}

/**
 * Example: Username uniqueness validator
 */
export async function validateUsernameUnique(
  username: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `/api/validate/username?username=${encodeURIComponent(username)}`
    );
    const data = await response.json();
    return data.available;
  } catch (error) {
    return false;
  }
}
