import {
  Controller,
  type Control,
  type FieldPath,
  type FieldPathByValue,
  type FieldValues,
} from 'react-hook-form';
import type { ComponentProps } from 'react';
import { Field } from './Field';

type Props<T extends FieldValues> = Omit<
  ComponentProps<typeof Field>,
  'value' | 'onChangeText' | 'onBlur' | 'error' | 'ref'
> & {
  control: Control<T>;
  name: FieldPathByValue<T, string>;
  deps?: FieldPath<T>[];
};
export function FormField<T extends FieldValues>({
  control,
  name,
  deps,
  ...props
}: Props<T>) {
  return (
    <Controller
      control={control}
      name={name}
      rules={{ deps }}
      render={({ field, fieldState }) => (
        <Field
          {...props}
          ref={field.ref}
          value={field.value}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
        />
      )}
    />
  );
}
