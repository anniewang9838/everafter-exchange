'use client'

import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ImageUploader } from './ImageUploader'

const CATEGORIES = [
  { value: 'centerpieces',  label: 'Centerpieces' },
  { value: 'table_runners', label: 'Table Runners' },
  { value: 'candles',       label: 'Candles' },
  { value: 'signage',       label: 'Signage' },
  { value: 'arch_arbor',    label: 'Arch & Arbor' },
  { value: 'linens',        label: 'Linens' },
  { value: 'lighting',      label: 'Lighting' },
  { value: 'floral',        label: 'Floral' },
  { value: 'other',         label: 'Other' },
] as const

const CONDITIONS = [
  { value: 'like_new',  label: 'Like New' },
  { value: 'excellent', label: 'Excellent' },
  { value: 'good',      label: 'Good' },
  { value: 'fair',      label: 'Fair' },
] as const

const VENUE_STYLES = [
  { value: 'modern',   label: 'Modern' },
  { value: 'rustic',   label: 'Rustic' },
  { value: 'garden',   label: 'Garden' },
  { value: 'vintage',  label: 'Vintage' },
  { value: 'boho',     label: 'Boho' },
  { value: 'ballroom', label: 'Ballroom' },
  { value: 'other',    label: 'Other' },
] as const

const schema = z.object({
  imageUrls: z.array(z.string()).min(1, 'At least one photo is required'),
  title: z.string().min(1, 'Title is required').max(150),
  description: z.string().min(1, 'Description is required').max(2000),
  category: z.enum(['centerpieces', 'table_runners', 'candles', 'signage', 'arch_arbor', 'linens', 'lighting', 'floral', 'other'], {
    required_error: 'Select a category',
  }),
  condition: z.enum(['like_new', 'excellent', 'good', 'fair'], { required_error: 'Select a condition' }),
  venueStyle: z.preprocess(
    v => (v === '' ? null : v),
    z.enum(['modern', 'rustic', 'garden', 'vintage', 'boho', 'ballroom', 'other']).nullable(),
  ),
  price: z.coerce.number({ invalid_type_error: 'Enter a price' }).positive('Must be positive'),
  originalRetailPrice: z.preprocess(
    v => (v === '' || v === null || v === undefined ? null : Number(v)),
    z.number().positive().nullable(),
  ),
})

export type ListingFormValues = z.infer<typeof schema>

interface Props {
  defaultValues?: Partial<ListingFormValues>
  onSubmit: (data: ListingFormValues) => Promise<void>
  submitLabel?: string
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-red-500">{message}</p>
}

export function ListingForm({ defaultValues, onSubmit, submitLabel = 'Publish listing' }: Props) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ListingFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      imageUrls: [],
      venueStyle: null,
      originalRetailPrice: null,
      ...defaultValues,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label className="mb-2 block text-xs font-medium text-stone-600">
          Photos <span className="text-red-400">*</span>
        </label>
        <Controller
          name="imageUrls"
          control={control}
          render={({ field }) => (
            <ImageUploader value={field.value} onChange={field.onChange} />
          )}
        />
        <FieldError message={errors.imageUrls?.message} />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">
          Title <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          placeholder="e.g. Rustic wooden centerpiece set (×12)"
          className="input"
          {...register('title')}
        />
        <FieldError message={errors.title?.message} />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">
          Description <span className="text-red-400">*</span>
        </label>
        <textarea
          rows={4}
          placeholder="Describe the items, quantity, dimensions, and any wear."
          className="input resize-none"
          {...register('description')}
        />
        <FieldError message={errors.description?.message} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">
            Category <span className="text-red-400">*</span>
          </label>
          <select className="input" {...register('category')}>
            <option value="">Select…</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <FieldError message={errors.category?.message} />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">
            Condition <span className="text-red-400">*</span>
          </label>
          <select className="input" {...register('condition')}>
            <option value="">Select…</option>
            {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <FieldError message={errors.condition?.message} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">Venue Style</label>
        <select className="input" {...register('venueStyle')}>
          <option value="">None</option>
          {VENUE_STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">
            Asking Price ($) <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            className="input"
            {...register('price')}
          />
          <FieldError message={errors.price?.message} />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">
            Original Retail Price ($)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Optional"
            className="input"
            {...register('originalRetailPrice')}
          />
          <FieldError message={errors.originalRetailPrice?.message} />
        </div>
      </div>

      <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3">
        {isSubmitting ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}
