import { useCallback, useRef, useState } from 'react';

/**
 * Conversational form validation — feedback that helps rather than punishes.
 *
 * The timing rules this hook enforces:
 *  1. No early screaming — fields are NOT validated on load or while a
 *     pristine field is being typed into.
 *  2. Validate on blur — the first check for a field runs when it loses
 *     focus (the user has finished their thought).
 *  3. Instant forgiveness — once a field has failed, it switches to live
 *     validation so the error clears the moment the value becomes valid,
 *     without waiting for another blur or a submit.
 *  4. Positive reinforcement — `valid` turns true once a non-empty field
 *     passes, so the UI can show a green check / border.
 *  5. No hunting on submit — `validateAll` turns every invalid field red at
 *     once and smooth-scrolls to (and focuses) the first invalid one.
 *
 * Values live in the caller's own state (e.g. the onboarding draft); this
 * hook only owns validation metadata + the display errors.
 */

export type Validator = (value: string) => string; // '' means valid

export interface FieldValidationView {
  /** Error message to display ('' = none). */
  error: string;
  /** True once a non-empty field has been validated and is currently valid. */
  valid: boolean;
  /** Attach to the field's wrapper element so submit can scroll to it. */
  ref: (el: HTMLElement | null) => void;
  /** Call from the field's onBlur. */
  onBlur: () => void;
  /** Call from the field's onChange with the NEW value. */
  onChange: (nextValue: string) => void;
}

export interface UseFieldValidation {
  field: (name: string, value: string) => FieldValidationView;
  /** Re-check a field that's already been validated — for cross-field deps
   *  (e.g. re-validate "confirm password" when "password" changes). */
  revalidate: (name: string, value: string) => void;
  /** Submit guard: validate every listed field IN ORDER, flip invalid ones
   *  to live+red, smooth-scroll to the first invalid, and return true only
   *  when all are valid. */
  validateAll: (fields: Array<{ name: string; value: string }>) => boolean;
  /** Clear all validation state (e.g. after a successful submit). */
  reset: () => void;
}

export function useFieldValidation(validators: Record<string, Validator>): UseFieldValidation {
  // Keep the latest validators (they close over live values like `password`)
  // so the stable callbacks below never validate against a stale closure.
  const validatorsRef = useRef(validators);
  validatorsRef.current = validators;

  // Behavioural flags live in refs — the accompanying `errors` state update
  // always drives the re-render, so these don't need to be state themselves.
  const liveRef = useRef<Record<string, boolean>>({}); // switched to on-change validation
  const validatedRef = useRef<Record<string, boolean>>({}); // has run at least once
  const elRefs = useRef<Record<string, HTMLElement | null>>({});

  const [errors, setErrors] = useState<Record<string, string>>({});

  const setError = useCallback((name: string, err: string) => {
    setErrors((prev) => (prev[name] === err ? prev : { ...prev, [name]: err }));
  }, []);

  const onBlur = useCallback(
    (name: string, value: string) => {
      const err = validatorsRef.current[name]?.(value) ?? '';
      validatedRef.current[name] = true;
      if (err) liveRef.current[name] = true; // Rule 2 → 3: failed blur switches to live
      setError(name, err);
    },
    [setError]
  );

  const onChange = useCallback(
    (name: string, value: string) => {
      if (!liveRef.current[name]) return; // Rule 1/2: pristine fields stay silent
      const err = validatorsRef.current[name]?.(value) ?? ''; // Rule 3: instant forgiveness
      validatedRef.current[name] = true;
      setError(name, err);
    },
    [setError]
  );

  const revalidate = useCallback(
    (name: string, value: string) => {
      if (!liveRef.current[name] && !validatedRef.current[name]) return;
      setError(name, validatorsRef.current[name]?.(value) ?? '');
    },
    [setError]
  );

  const validateAll = useCallback((fields: Array<{ name: string; value: string }>) => {
    const next: Record<string, string> = {};
    let firstInvalid: string | null = null;
    for (const { name, value } of fields) {
      const err = validatorsRef.current[name]?.(value) ?? '';
      next[name] = err;
      validatedRef.current[name] = true;
      if (err) {
        liveRef.current[name] = true;
        if (!firstInvalid) firstInvalid = name;
      }
    }
    setErrors((prev) => ({ ...prev, ...next }));

    if (firstInvalid) {
      const el = elRefs.current[firstInvalid];
      if (el?.scrollIntoView) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const focusable = el.querySelector(
          'input, select, textarea, [tabindex]'
        ) as HTMLElement | null;
        // Focus after the smooth scroll settles; preventScroll so it doesn't jump.
        window.setTimeout(() => focusable?.focus?.({ preventScroll: true }), 400);
      }
      return false;
    }
    return true;
  }, []);

  const reset = useCallback(() => {
    liveRef.current = {};
    validatedRef.current = {};
    setErrors({});
  }, []);

  const field = (name: string, value: string): FieldValidationView => {
    const error = errors[name] || '';
    const valid = !!validatedRef.current[name] && !error && value.trim().length > 0;
    return {
      error,
      valid,
      ref: (el: HTMLElement | null) => {
        elRefs.current[name] = el;
      },
      onBlur: () => onBlur(name, value),
      onChange: (nextValue: string) => onChange(name, nextValue),
    };
  };

  return { field, revalidate, validateAll, reset };
}
